import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/supabase/session";
import { StatusBadge } from "@/components/patterns/status-badge";
import type { PipelineStatus, TriggerType } from "@/lib/supabase/types";

interface RecentRun {
  id: string;
  status: PipelineStatus;
  started_at: string;
  record_count_in: number | null;
  record_count_out: number | null;
  triggered_by: TriggerType;
  pipeline_id: string;
}

function formatDuration(startedAt: string, completedAt: string | null) {
  if (!completedAt) return "—";
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  return `${Math.round(ms / 60_000)}m`;
}

export default async function HomePage() {
  const { orgId } = await getSession();
  const supabase = createClient();

  const [
    { count: activePipelines },
    { count: pendingReviews },
    { count: connectedERPs },
    { data: recentRuns },
  ] = await Promise.all([
    supabase
      .from("pipeline_configs")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("is_active", true),
    supabase
      .from("review_checkpoints")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("status", "pending"),
    supabase
      .from("connector_configs")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("status", "connected"),
    supabase
      .from("pipeline_runs")
      .select(
        "id, status, started_at, completed_at, record_count_in, record_count_out, triggered_by, pipeline_id"
      )
      .eq("org_id", orgId)
      .order("started_at", { ascending: false })
      .limit(10),
  ]);

  const isEmpty = !recentRuns || recentRuns.length === 0;
  const hasPendingReviews = (pendingReviews ?? 0) > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pipeline activity and system health
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link
          href="/pipelines"
          className="rounded-lg border border-border bg-card p-4 space-y-1 hover:border-accent/50 transition-colors"
        >
          <p className="text-xs text-muted-foreground">Active Pipelines</p>
          <p className="text-2xl font-semibold text-foreground">{activePipelines ?? 0}</p>
        </Link>

        <Link
          href="/data-review"
          className="rounded-lg border border-border bg-card p-4 space-y-1 hover:border-accent/50 transition-colors"
        >
          <p className="text-xs text-muted-foreground">Pending Reviews</p>
          <p
            className={`text-2xl font-semibold ${hasPendingReviews ? "text-status-blocked" : "text-foreground"}`}
          >
            {pendingReviews ?? 0}
          </p>
        </Link>

        <Link
          href="/connectors"
          className="rounded-lg border border-border bg-card p-4 space-y-1 hover:border-accent/50 transition-colors"
        >
          <p className="text-xs text-muted-foreground">Connected ERPs</p>
          <p className="text-2xl font-semibold text-foreground">{connectedERPs ?? 0}</p>
        </Link>
      </div>

      {/* Recent pipeline runs */}
      <div className="rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-medium text-foreground">Recent Pipeline Runs</h2>
          {!isEmpty && (
            <Link href="/pipelines" className="text-xs text-accent hover:underline">
              View all
            </Link>
          )}
        </div>

        {isEmpty ? (
          <div className="flex flex-col items-center justify-center gap-4 py-12 text-center px-4">
            <p className="text-sm text-muted-foreground">No pipeline runs yet</p>
            <div className="flex gap-2">
              <Link
                href="/connectors"
                className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent/5 hover:text-accent transition-colors"
              >
                Connect ERP
              </Link>
              <Link
                href="/pipelines"
                className="rounded-md bg-accent text-accent-foreground px-3 py-1.5 text-xs hover:bg-accent/90 transition-colors"
              >
                Create pipeline
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                    Run ID
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">
                    Records In
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">
                    Records Out
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                    Duration
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                    Trigger
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                    Started
                  </th>
                </tr>
              </thead>
              <tbody>
                {(recentRuns as (RecentRun & { completed_at: string | null })[]).map((run) => (
                  <tr
                    key={run.id}
                    className="border-b border-border last:border-0 hover:bg-muted/40"
                  >
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                      {run.id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={run.status} />
                    </td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground">
                      {run.record_count_in?.toLocaleString() ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground">
                      {run.record_count_out?.toLocaleString() ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {formatDuration(run.started_at, run.completed_at)}
                    </td>
                    <td className="px-4 py-2.5 capitalize text-muted-foreground text-xs">
                      {run.triggered_by}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">
                      {new Date(run.started_at).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick actions — shown when no runs yet */}
      {isEmpty && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            {
              title: "Connect ERP",
              desc: "Link your accounting system (NetSuite, QuickBooks, etc.)",
              href: "/connectors",
            },
            {
              title: "Create Pipeline",
              desc: "Define extraction, transformation, and delivery settings",
              href: "/pipelines",
            },
            {
              title: "Invite Team",
              desc: "Add approvers, operators, and viewers",
              href: "/settings",
            },
          ].map(({ title, desc, href }) => (
            <Link
              key={title}
              href={href}
              className="rounded-lg border border-border bg-card p-4 hover:border-accent/50 hover:bg-accent/5 transition-colors"
            >
              <p className="text-sm font-medium text-foreground">{title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
