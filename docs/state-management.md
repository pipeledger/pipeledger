# PipeLedger State Management

PIPELEDGER AI
State Management Document
Audience: Contract developers building the MVP with Claude Code • March 2026

# 1. Architecture Decision
PipeLedger uses TanStack Query (React Query v5) as the sole state management layer. There is no Zustand, Redux, or standalone Context-based global store. The rationale: PipeLedger is a server-state-dominant application — nearly every piece of UI state originates from Supabase (operational data) or BigQuery (financial data). TanStack Query handles fetching, caching, invalidation, and background refetching out of the box. The small amount of true client state (active page, modal open/closed, form drafts) lives in local useState or is colocated inside the component that owns it.
Key principle: If the data comes from the server, it belongs in a TanStack Query cache. If the data is purely ephemeral UI state (a dropdown is open, a tab is selected), it belongs in useState at the nearest parent. Nothing else.

# 2. TanStack Query Configuration
A single QueryClientProvider wraps the application at the root layout. The QueryClient is configured with defaults appropriate for a financial data application: conservative stale times, no automatic refetching on window focus for mutation-heavy pages, and retry logic that respects rate limits.
// app/providers.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,        // 30s before data considered stale
      gcTime: 5 * 60_000,       // 5 min garbage collection
      retry: 2,                 // Retry failed requests twice
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,                 // Never auto-retry mutations
    },
  },
});
Why refetchOnWindowFocus is off: In an approval-critical workflow, stale data should be explicitly refreshed (via polling or Realtime), not silently replaced when a user tabs back. This prevents the UI from shifting under an approver mid-review.

# 3. Query Key Convention
All query keys follow a hierarchical, array-based convention. This enables granular cache invalidation — invalidating a parent key automatically invalidates all children. Every key is scoped by org_id to ensure tenant isolation at the cache layer.

| Domain | Query Key Pattern | Invalidation Scope |
| --- | --- | --- |
| Auth / Session | ["auth", "session"] | Full auth tree |
| Pipelines (list) | ["pipelines", org_id] | All pipelines for org |
| Pipeline (detail) | ["pipelines", org_id, pipeline_id] | Single pipeline |
| Pipeline runs | ["runs", org_id, pipeline_id] | Runs for one pipeline |
| Review queue | ["reviews", org_id] | All pending reviews |
| Review detail | ["reviews", org_id, run_id] | Single review checkpoint |
| Taxonomy mappings | ["schemas", org_id, "taxonomy"] | Taxonomy config |
| Dimension labels | ["schemas", org_id, "dimensions"] | Dimension config |
| Security policies | ["schemas", org_id, "security"] | RLS policy config |
| Connectors | ["connectors", org_id] | All connectors |
| Activity log | ["activity", org_id, { page }] | Paginated activity |
| Settings | ["settings", org_id] | Org settings |


Invalidation example: When an approval mutation succeeds, invalidate ["reviews", org_id] to refresh the entire review queue, and ["runs", org_id, pipeline_id] to update the pipeline’s run status. TanStack Query handles the refetch automatically.

# 4. State Domains & Data Fetching Patterns

## 4.1 Auth & User Session
Authentication state is the only state that uses a React Context wrapper around TanStack Query. The AuthProvider at the app root calls Supabase Auth, caches the session in TanStack Query, and exposes the user object, org_id, and role via useAuth(). Every other query depends on this — if the auth query is not yet resolved, downstream queries are disabled (enabled: !!user).
// hooks/useAuth.ts
export function useAuth() {
  const { data: session } = useQuery({
    queryKey: ["auth", "session"],
    queryFn: () => supabase.auth.getSession(),
    staleTime: Infinity,  // Session managed by Supabase listener
  });
  // Supabase onAuthStateChange listener invalidates this query
  return { user: session?.user, orgId: session?.org_id, role: session?.role };
}
Role is resolved from the user_roles Supabase table (not the JWT) to ensure real-time role changes are reflected. The role value drives permission checks throughout the UI: Viewer, Operator, Approver, Admin, Owner.

## 4.2 Pipeline Runs & Live Status
Pipeline status uses a hybrid strategy: Supabase Realtime subscriptions for active/running pipelines, and TanStack Query polling for historical data. This gives instant UI updates when a pipeline transitions between stages (extracting → transforming → awaiting review → delivered) without hammering the database for idle pipelines.
// hooks/usePipelineRuns.ts
export function usePipelineRuns(orgId: string, pipelineId: string) {
  const query = useQuery({
    queryKey: ["runs", orgId, pipelineId],
    queryFn: () => fetchPipelineRuns(orgId, pipelineId),
    refetchInterval: 60_000,  // Poll every 60s for historical
  });

  // Realtime subscription for active runs
  useEffect(() => {
    const channel = supabase
      .channel(`runs:${pipelineId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'pipeline_runs',
          filter: `pipeline_id=eq.${pipelineId}` },
        () => queryClient.invalidateQueries({
          queryKey: ["runs", orgId, pipelineId]
        })
      ).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [orgId, pipelineId]);

  return query;
}

## 4.3 Approval Workflow (Confirmation-Based)
Approval actions (approve input, reject input, approve output, reject output) use TanStack Query mutations with confirmation-based UI. The UI does not update optimistically — it shows a loading/pending state and waits for the server to confirm the action succeeded before reflecting the change. This is intentional for audit safety: every approval state transition must be recorded in the audit_log table before the UI acknowledges it.
// hooks/useApproval.ts
export function useApproval(orgId: string) {
  return useMutation({
    mutationFn: (action: ApprovalAction) =>
      supabase.rpc('process_approval', action),
    onSuccess: (_, variables) => {
      // Only invalidate AFTER server confirms
      queryClient.invalidateQueries({ queryKey: ["reviews", orgId] });
      queryClient.invalidateQueries({
        queryKey: ["runs", orgId, variables.pipelineId]
      });
      queryClient.invalidateQueries({ queryKey: ["activity", orgId] });
    },
    // No onMutate (no optimistic update)
    // No onError rollback needed
  });
}
UI pattern: The Approve/Reject buttons enter a disabled + spinner state during mutation.isPending. On success, the cache invalidation triggers a refetch and the review queue updates. On error, a toast notification shows the failure reason. The button returns to its enabled state.

## 4.4 Schema & Mapping Editor (Dirty Tracking)
The Schemas page (taxonomy mapping, dimension labels, security policies) is the most stateful part of the UI. Users edit mappings in a table interface, and changes must be tracked locally until explicitly saved. This is the one area where local component state (useState) works alongside TanStack Query.
Pattern: TanStack Query loads the current mapping configuration from Supabase. The component copies this into local state (useState) as the “working draft.” Edits modify the local draft only. A isDirty flag (computed by deep-comparing draft vs. cached server data) controls the Save/Discard buttons. On Save, a mutation writes the draft to Supabase, and onSuccess invalidation replaces the cached data with the server’s confirmed state. On Discard, the local draft resets to the cached query data.
// Simplified pattern for taxonomy mapping editor
const { data: serverMappings } = useQuery({
  queryKey: ["schemas", orgId, "taxonomy"],
  queryFn: () => fetchTaxonomyMappings(orgId),
});

const [draft, setDraft] = useState(serverMappings);
const isDirty = !isEqual(draft, serverMappings);

const save = useMutation({
  mutationFn: () => saveTaxonomyMappings(orgId, draft),
  onSuccess: () => queryClient.invalidateQueries(["schemas", orgId, "taxonomy"]),
});

const discard = () => setDraft(serverMappings);
Version control: Each save creates a new version in the taxonomy_mappings table (version column increments). The UI shows the current version number. The approval workflow references the locked version — in-progress edits to mappings do not affect running pipelines.

# 5. Supabase Realtime Integration
Supabase Realtime channels push database changes to the UI without polling. PipeLedger uses Realtime for two high-value cases where immediate feedback matters: pipeline run status transitions and review queue updates. All Realtime subscriptions follow the same pattern — on receiving a change event, they invalidate the corresponding TanStack Query key, which triggers a refetch. Realtime never writes directly to component state.

| Channel | Table | Events | Invalidates |
| --- | --- | --- | --- |
| runs:{pipeline_id} | pipeline_runs | INSERT, UPDATE | ["runs", orgId, pipelineId] |
| reviews:{org_id} | review_checkpoints | INSERT, UPDATE | ["reviews", orgId] |
| activity:{org_id} | audit_log | INSERT | ["activity", orgId] |


Lifecycle: Channels are subscribed in useEffect hooks within the relevant page or layout component, and unsubscribed on cleanup. The Home page subscribes to both runs and reviews channels. Individual pipeline detail pages subscribe only to their specific runs channel.

# 6. Data Flow Summary
The following diagram shows how data flows through the state management layer. Every arrow represents either a TanStack Query fetch, a Supabase Realtime push, or a mutation. There are no side channels.
Supabase DB ─── TanStack Query Cache ─── React Components
     │               ▲                          │
     │               │ invalidate               │ user action
     │               │                          ▼
     ├── Realtime ───┘                    useMutation()
     │                                         │
     │───────── write to Supabase ─────────┘

BigQuery ─── API Routes ─── TanStack Query Cache ─── Data Review UI
  (read-only, no Realtime, polling only for large datasets)

# 7. Rules for Developers

| # | Rule |
| --- | --- |
| 1 | Never store server data in useState or useContext. Use useQuery. The TanStack Query cache is the single source of truth for all server-originated data. |
| 2 | Never fetch inside useEffect. Use useQuery with enabled flags for conditional fetching. Supabase Realtime listeners in useEffect only invalidate query keys — they never set state directly. |
| 3 | Never mutate without invalidation. Every useMutation must define onSuccess with the appropriate queryClient.invalidateQueries calls. |
| 4 | Approval mutations are confirmation-based. No onMutate optimistic updates for any action that writes to audit_log or changes pipeline/review status. |
| 5 | Scope all query keys by org_id. This prevents cross-tenant cache leakage if a user switches organizations. On logout, call queryClient.clear() to wipe the entire cache. |
| 6 | Schema editors are the exception. Taxonomy mappings, dimension labels, and security policies use a local draft in useState alongside the TanStack Query cache. All other pages read directly from the cache. |
| 7 | Realtime channels must clean up. Every Supabase channel subscription must have a corresponding removeChannel in the useEffect cleanup function. |


END OF STATE MANAGEMENT DOCUMENT — v1.0