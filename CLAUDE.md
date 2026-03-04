# PipeLedger AI — Claude Code Instructions

## What This Project Is
B2B SaaS financial data intelligence platform. Solo founder, bootstrapped. Extracts GL data from ERPs, transforms via dbt/BigQuery, delivers via MCP server + REST API.

Read `/docs/` before making architectural decisions. Key docs:
- `docs/tech-stack.md` — full stack decisions and rationale
- `docs/frontend-strategy.md` — design system, component tiers, rules
- `docs/system-architecture.md` — services, data flow, security
- `docs/data-model.md` — Supabase schema and BigQuery layout
- `docs/prd.md` — product scope and priorities

---

## Package Manager
**Always use `pnpm`.** Never npm or yarn.
- Run commands from workspace root: `pnpm --filter web <command>`
- Install to workspace root: `pnpm add -w <pkg>`
- Install to a specific app: `pnpm --filter web add <pkg>`

---

## Repository Structure
```
apps/web/          ← Next.js 14 (primary focus)
apps/worker/       ← Pipeline worker (not yet built)
apps/mcp/          ← MCP server (not yet built)
packages/shared/   ← Shared TypeScript types
packages/dbt/      ← dbt project (stub)
packages/dagster/  ← Dagster orchestration (stub)
packages/connectors/ ← ERP connectors (stub)
supabase/migrations/ ← SQL migration files (applied in order)
docs/              ← All planning documents (read these)
```

---

## Frontend Rules (non-negotiable)

### 1. No hardcoded colors — ever
Every color must reference a design token via Tailwind class.
✅ `bg-primary`, `text-foreground`, `border-border`, `text-accent`
❌ `bg-[#0B1F3A]`, `text-blue-600`, `style={{ color: '#3B82F6' }}`

All tokens live in `apps/web/app/globals.css`.

### 2. Component tier hierarchy — strict
```
Pages (app/) → Features (components/features/) → Patterns (components/patterns/) → Primitives (components/ui/)
```
- Pages compose Features. Features compose Patterns and Primitives.
- Never import upward. No circular dependencies.
- shadcn/ui primitives in `components/ui/` — never add business logic there.

### 3. Every data-fetching component handles three states
Loading (skeleton) → Success (render data) → Error (ErrorMessage with tiered visibility).
No blank screens. No spinners without context.

### 4. All forms: React Hook Form + Zod
No uncontrolled inputs for non-trivial forms. Schema validation via Zod. Field-level errors shown inline.

### 5. Virtual scrolling for 100+ rows
Use `@tanstack/react-virtual`. The `DataTable` pattern includes this. Custom lists must add it explicitly.

### 6. State management: TanStack Query v5 only
No Redux, no Zustand, no Context for server state. TanStack Query handles caching, background refetch, and loading states.
**No optimistic updates for approval or rejection mutations** — audit safety.

### 7. Dark mode tested on every component
The token system makes this automatic if Rule 1 is followed, but verify visually before considering a component done.

### 8. Responsive minimum: 1024px
Test at `md` (1024px), `lg` (1024px), `xl` (1280px). Sidebar collapses at `md`.

---

## Supabase Patterns 
### Admin client must use supabase-js directly
```typescript
// ✅ CORRECT — for service role operations (bypasses RLS)
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// ❌ WRONG — createServerClient from @supabase/ssr breaks service role auth
import { createServerClient } from "@supabase/ssr"; // DO NOT use for admin
```

### Running migrations
Direct DB host (`db.gvzcqmyvdzbjwoiisbhr.supabase.co`) is unreachable from local.
Use the **session pooler**: `aws-1-us-east-2.pooler.supabase.com:5432`
User: `postgres.gvzcqmyvdzbjwoiisbhr`
Use Node.js `pg` client (psql is not installed). Migration scripts live in `supabase/migrations/`.

### RLS is always on
New users have no `org_id` — the anon client cannot INSERT into `organizations`. Always use `createAdminClient()` for org creation in the onboarding API route.

---

## Design System

| Token | Value | Use |
|---|---|---|
| Primary | #0B1F3A (deep navy) | Sidebar, buttons, logo background |
| Accent | #3B82F6 (blue) | CTAs, active states, "AI" wordmark highlight |
| Background | #FFFFFF light / dark variant | Page background |

Logo on auth pages: text-based `PL` badge in a `bg-primary rounded-xl` square.
Logo in sidebar: same pattern, smaller (`h-7 w-7 rounded-md`).
No image dependency for the logo — text only.

---

## Build Health
- Always verify `pnpm --filter web build` passes before declaring work done.
- Target: shared JS bundle < 150KB gzipped (currently ~87.3KB ✅).
- Dynamic import Recharts, Framer Motion, and dnd-kit — never statically import.

---

## Security Rules
- Never commit `.env.local` or any file containing secrets.
- Service role key is **server-side only** — never in client components or exposed to the browser.
- Never disable RLS on any Supabase table.
- Credentials for ERP connectors go in `connector_configs.connection_params` (encrypted JSONB in Supabase), never in env vars.

## Financial Data Invariants (never violate)

These are mathematical and audit properties of the financial data. Violating them means the output is wrong and cannot be trusted by CFOs or auditors.

1. **Debits equal credits per period.** Sum of period-movement debits must equal sum of credits for any account/period. The dbt test `custom: control_total` on `int_balance_decomposition` enforces this. If it fails, the pipeline halts.

2. **Record count in = record count out** at every transformation stage. No records are silently dropped between raw → staging → intermediate → mart. The dbt test `custom: record_count_match` runs on every intermediate model.

3. **Period movements only — never cumulative balances.** Mart tables serve movements (deltas), not running totals. `int_balance_decomposition` strips cumulative balances. Downstream models never re-introduce balance semantics. LLMs receive `period_movement`, not `closing_balance`.

4. **No partial transforms.** If any dbt model fails, all intermediate tables from that pipeline run are dropped. The mart tables from the previous successful run remain untouched. The customer never sees half-transformed data.

5. **Every GL record must have `rls_access_level` assigned** (never null). Even records matching no security rules get `rls_access_level = 'all'`. The dbt test `custom: rls_coverage` enforces this. A null is a security gap.

6. **No critical accounts may be UNMAPPED.** Income and expense accounts must have a non-null `taxonomy_path` after `int_account_normalization`. Unmapped P&L accounts halt the pipeline; unmapped balance sheet accounts are a warning.

7. **Amounts in mart tables are always in reporting currency.** `amount_reporting` is the authoritative field. Original currency is preserved in `original_currency` and `fx_rate_used`. Never sum across currencies.

8. **LLMs enrich — they never modify.** The authoritative dbt chain contains zero LLM calls. LLM-generated content (`nl_description`, variance commentary) is advisory only and lives downstream of the mart. It is never included in record counts, control totals, or `gl_export_versions` reconciliation.

9. **Every successful pipeline delivery has a corresponding FCU usage event.** Enforced by database transaction — the pipeline cannot reach `succeeded` without the FCU write committing. If the `usage_events` INSERT fails, the whole delivery transaction rolls back.

10. **Never expose raw GL tables to MCP or API endpoints.** Only `{org_id}_mart` tables are queryable. Raw (`{org_id}_raw`) and intermediate (`{org_id}_transform`) datasets have no external access. RLS access policies on mart tables enforce `rls_access_level` at query time.

---

## BigQuery Modeling Rules

All work in `packages/dbt/`. Financial transformation logic is core IP and audit evidence — it must be deterministic, layered, and fully tested.

1. **Strict layer ordering — no skipping.** Dependency chain: `staging → intermediate → security → mart`. A mart model may not read from staging. An intermediate model may not read from mart. No circular dependencies.

2. **Pure SQL only inside dbt models.** No LLM API calls, no external HTTP, no Python UDFs, no randomness. Every model must produce identical output given identical input. Always.

3. **No time-dependent functions.** Never use `CURRENT_TIMESTAMP()`, `NOW()`, or `CURRENT_DATE()`. Pipeline run timestamps come from `pipeline_runs.started_at`, not from the transformation itself.

4. **Every model requires a `schema.yml` entry** with column descriptions, data types, and test definitions. Minimum tests: `not_null` on required fields, `unique` on primary keys, `custom: record_count_match`.

5. **Read only `approved` versions from Supabase config tables.** When joining `taxonomy_mappings`, `dimension_labels`, `security_rules`, or `budget_dimension_mappings`, always filter `WHERE status = 'approved'`. Never read `draft` or `archived` rows.

6. **Dataset naming convention is mandatory:** `{org_id}_raw`, `{org_id}_transform`, `{org_id}_mart`, `pipeledger_shared`. Never mix org data across datasets. Never write to `pipeledger_shared` from org-specific models.

7. **Failed model = full rollback for that run.** Dagster drops all intermediate tables if any model fails. Do not write recovery logic that allows partial mart updates. The previous successful mart remains the source of truth.

8. **dbt branch prefix required.** Any PR changing dbt model logic uses the `dbt/` branch prefix. The PR description must state: what changed, why, and whether existing `gl_export_versions` will be superseded on the next run.

---

## Pipeline Safety

Rules governing the state machines in `pipeline_runs`, `gl_export_versions`, and `delivery_records`. Incorrect transitions corrupt the audit trail.

1. **Status transitions via RPC functions only — never direct SQL UPDATE.** Use: `advance_pipeline_run()`, `approve_checkpoint()`, `retract_export_version()`, `purge_export_version()`. Direct `UPDATE` on status columns is blocked by RLS. Do not try to work around this.

2. **Every status transition writes to `audit_logs` — no exceptions.** Every code path that changes pipeline, checkpoint, or export version status must write an audit entry with: `old_status`, `new_status`, `triggered_by`, `timestamp`. Use the shared audit utility — never write directly to `audit_logs` from feature code.

3. **`delivering → succeeded` is a single atomic transaction.** Five writes commit together via `complete_pipeline_delivery()` RPC: `delivery_records`, `gl_export_versions` (status update), `usage_events` (FCU), `audit_logs` (delivery_complete), `pipeline_runs` (status → succeeded). If any write fails, all roll back. Pipeline stays in `delivering` for Dagster retry.

4. **Only `input_review` and `output_review` accept human input.** All other transitions are system-driven. Never build UI that lets a user manually trigger transitions outside of review stages.

5. **`cancelled` is only reachable from blocked stages or `queued`.** Cannot cancel a run that is actively `extracting`, `transforming`, or `delivering`. The Cancel button must be disabled during active stages.

6. **Only one `delivered` version per `pipeline_config` at a time.** Supersession logic in `deliver_export_version()` RPC automatically moves all previous `delivered` versions to `superseded` when a new one lands. Never manually set a version to `delivered` outside this RPC.

7. **MCP and REST API must verify `gl_export_versions.status = 'delivered'` before serving.** If the version is `retracted`, `superseded`, or `expired`, return `HTTP 410 Gone` with the retraction reason. Never serve data from a non-delivered version.

8. **Hard purge requires Admin/Owner role and two-step UI confirmation.** The RPC checks role before executing. Purge deletes BigQuery mart data but never deletes the `gl_export_versions` row — that row is the permanent audit record.

9. **On revocation, remove GCS file ACLs — do not delete files.** Files are preserved for audit. Inaccessibility is achieved by removing the ACL. `delivery_records` rows are set to `revoked` with `revoked_at` and `revoked_by`.

---

## Code Generation Rules

1. **TypeScript everywhere.** No `.js` files in `apps/` or `packages/`. Run `tsc --noEmit` to verify type correctness. Never use `any` — use `unknown` and narrow.

2. **Shared Zod schemas in `packages/shared/lib/schemas/`.** Frontend form validation and API route validation use the same schema. Never duplicate validation logic. Import the shared schema into both layers.

3. **Logs never contain financial data.** All log entries go through `sanitizeForLog()` from `packages/shared`. The allow-list defines what can appear. A log printing a GL amount, account number, or customer record is a security incident.

4. **User-facing error messages are always sanitized.** Never expose raw database errors, stack traces, or internal IDs to the browser. Use `packages/shared/lib/error-templates.ts` to map internal codes to sanitized messages. Role-tiered visibility: Admins/Owners see more detail; Viewers see none.

5. **When in doubt, halt — not retry.** Ambiguous errors default to fail-fast. A false halt is an inconvenience. A false retry on corrupt data creates confusing audit entries and potentially bills for bad work.

6. **`audit_logs` is append-only.** Never write UPDATE or DELETE logic targeting `audit_logs`. Historical entries are immutable by design.

7. **`usage_events` is system-account-only.** Never write INSERT logic for `usage_events` in UI components, user-facing API routes, or any code running in user session context. Only `Pipeline Worker` (FCU) and `MCP Server` (FIQ) service accounts may write to this table.

8. **Supabase migrations are additive-only in production.** Never write `DROP TABLE` or `DROP COLUMN` without explicit founder approval. Add, extend, rename — never remove.

9. **Branch naming convention:**
   - `feat/` — new feature
   - `fix/` — bug fix
   - `dbt/` — transformation logic change (extra review scrutiny)
   - `sec/` — RLS or security rule change (extra review scrutiny)
   - `refactor/` — no behavior change
   - `infra/` — CI/CD, Dockerfile, Cloud Run
   - `docs/` — documentation only

## What to Check Before Starting Any Session
1. Read `memory/MEMORY.md` (auto-loaded) for current build status and completed phases.
2. For architectural work: read the relevant doc in `docs/` before proposing changes.
3. For DB changes: check `supabase/migrations/` to understand current schema before writing new migrations.
4. Run `pnpm --filter web build` if uncertain about current build health.
