import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/supabase/session";
import { StatusBadge } from "@/components/patterns/status-badge";
import { NewPipelineSheet } from "./_components/new-pipeline-sheet";
import type { ErpType, ConnectorStatus, PipelineStatus, ScheduleType, DeliveryType } from "@/lib/supabase/types";

export interface ConnectorConfig {
  id: string;
  name: string;
  connector_type: ErpType;
  status: ConnectorStatus;
}

interface PipelineConfig {
  id: string;
  name: string;
  description: string | null;
  connector_id: string;
  delivery_type: DeliveryType;
  schedule_type: ScheduleType;
  is_active: boolean;
  created_at: string;
  connector_configs: {
    name: string;
    connector_type: ErpType;
    status: ConnectorStatus;
  } | null;
  latest_run: {
    status: PipelineStatus;
    started_at: string;
  } | null;
}

const SCHEDULE_LABELS: Record<ScheduleType, string> = {
  manual: "Manual",
  hourly: "Hourly",
  daily: "Daily",
  weekly: "Weekly",
  cron: "Custom",
};

const DELIVERY_LABELS: Record<DeliveryType, string> = {
  mcp: "MCP Server",
  api: "REST API",
  parquet: "Parquet",
  csv: "CSV",
};

export default async function PipelinesPage() {
  const { orgId } = await getSession();
  const supabase = createClient();

  const [{ data: pipelines }, { data: connectors }] = await Promise.all([
    supabase
      .from("pipeline_configs")
      .select(
        "id, name, description, connector_id, delivery_type, schedule_type, is_active, created_at, connector_configs(name, connector_type, status)"
      )
      .eq("org_id", orgId)
      .order("created_at", { ascending: false }),
    supabase
      .from("connector_configs")
      .select("id, name, connector_type, status")
      .eq("org_id", orgId)
      .order("name"),
  ]);

  // Fetch latest run for each pipeline
  const pipelineIds = (pipelines ?? []).map((p) => p.id);
  const { data: latestRuns } =
    pipelineIds.length > 0
      ? await supabase
          .from("pipeline_runs")
          .select("pipeline_id, status, started_at")
          .in("pipeline_id", pipelineIds)
          .order("started_at", { ascending: false })
      : { data: [] };

  // Map latest run per pipeline
  const latestRunMap = new Map<string, { status: PipelineStatus; started_at: string }>();
  for (const run of latestRuns ?? []) {
    if (!latestRunMap.has(run.pipeline_id)) {
      latestRunMap.set(run.pipeline_id, {
        status: run.status as PipelineStatus,
        started_at: run.started_at,
      });
    }
  }

  const enriched: PipelineConfig[] = (pipelines ?? []).map((p) => ({
    ...p,
    connector_configs: Array.isArray(p.connector_configs)
      ? (p.connector_configs[0] ?? null)
      : (p.connector_configs ?? null),
    latest_run: latestRunMap.get(p.id) ?? null,
  }));

  const isEmpty = enriched.length === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Pipelines</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage and monitor your data pipelines
          </p>
        </div>
        <NewPipelineSheet orgId={orgId} connectors={connectors ?? []} />
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center px-4">
            <p className="text-sm font-medium text-foreground">No pipelines configured</p>
            <p className="text-xs text-muted-foreground">
              {(connectors ?? []).length === 0
                ? "Connect an ERP source first, then create your first pipeline."
                : 'Click "New pipeline" to define your first extraction job.'}
            </p>
            {(connectors ?? []).length === 0 && (
              <a
                href="/connectors"
                className="mt-1 text-xs rounded-md border border-border px-3 py-1.5 hover:bg-accent/5 hover:text-accent transition-colors"
              >
                Connect ERP →
              </a>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                    Name
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                    Connector
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                    Delivery
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                    Schedule
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                    Last Run
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                    Active
                  </th>
                </tr>
              </thead>
              <tbody>
                {enriched.map((pipeline) => (
                  <tr
                    key={pipeline.id}
                    className="border-b border-border last:border-0 hover:bg-muted/40"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground text-sm">{pipeline.name}</p>
                      {pipeline.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {pipeline.description}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground capitalize">
                      {pipeline.connector_configs?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {DELIVERY_LABELS[pipeline.delivery_type]}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {SCHEDULE_LABELS[pipeline.schedule_type]}
                    </td>
                    <td className="px-4 py-3">
                      {pipeline.latest_run ? (
                        <StatusBadge status={pipeline.latest_run.status} />
                      ) : (
                        <span className="text-xs text-muted-foreground">Never run</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block h-2 w-2 rounded-full ${
                          pipeline.is_active ? "bg-status-succeeded" : "bg-muted-foreground/40"
                        }`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
