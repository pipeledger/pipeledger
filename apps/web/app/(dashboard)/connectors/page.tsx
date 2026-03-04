import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/supabase/session";
import { StatusBadge } from "@/components/patterns/status-badge";
import { AddConnectorWizard } from "./_components/add-connector-wizard";
import type { ErpType, ConnectorStatus } from "@/lib/supabase/types";

interface ConnectorRow {
  id: string;
  name: string;
  connector_type: ErpType;
  status: ConnectorStatus;
  last_sync_at: string | null;
  created_at: string;
}

const ERP_LABELS: Record<ErpType, string> = {
  netsuite: "NetSuite",
  dynamics365: "Dynamics 365",
  sap: "SAP S/4HANA",
  coupa: "Coupa",
  csv: "CSV",
  pigment: "Pigment",
  adaptive: "Adaptive Insights",
  anaplan: "Anaplan",
};

function formatDate(iso: string | null) {
  if (!iso) return "Never";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function ConnectorsPage() {
  const { orgId } = await getSession();
  const supabase = createClient();

  const { data: connectors } = await supabase
    .from("connector_configs")
    .select("id, name, connector_type, status, last_sync_at, created_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  const rows = (connectors as ConnectorRow[] | null) ?? [];
  const isEmpty = rows.length === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Connectors</h1>
          <p className="text-sm text-muted-foreground mt-1">ERP and data source connections</p>
        </div>
        <AddConnectorWizard orgId={orgId} />
      </div>

      {/* Connector list */}
      {isEmpty ? (
        <div className="rounded-lg border border-border bg-card">
          <div className="flex flex-col items-center justify-center gap-4 py-16 text-center px-4">
            <p className="text-sm font-medium text-foreground">No connectors yet</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              Add your first ERP connection to start extracting GL data. NetSuite is supported
              today — more ERPs coming soon.
            </p>
            <AddConnectorWizard orgId={orgId} />
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((connector) => (
            <div
              key={connector.id}
              className="rounded-lg border border-border bg-card p-4 space-y-3 hover:border-accent/40 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{connector.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {ERP_LABELS[connector.connector_type]}
                  </p>
                </div>
                <StatusBadge status={connector.status} className="shrink-0" />
              </div>

              <div className="border-t border-border pt-3 text-xs text-muted-foreground space-y-1">
                <div className="flex justify-between">
                  <span>Last sync</span>
                  <span className="text-foreground">{formatDate(connector.last_sync_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Added</span>
                  <span className="text-foreground">{formatDate(connector.created_at)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Supported ERPs info */}
      <div className="rounded-lg border border-border bg-card/50 p-4">
        <p className="text-xs font-medium text-foreground mb-3">Supported ERP sources</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {[
            { name: "NetSuite", available: true },
            { name: "Dynamics 365", available: false },
            { name: "SAP S/4HANA", available: false },
            { name: "QuickBooks Online", available: false },
            { name: "Coupa", available: false },
            { name: "Pigment", available: false },
            { name: "Adaptive Insights", available: false },
            { name: "Anaplan", available: false },
          ].map(({ name, available }) => (
            <div key={name} className="flex items-center gap-2 text-xs">
              <span
                className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                  available ? "bg-status-succeeded" : "bg-muted-foreground/40"
                }`}
              />
              <span className={available ? "text-foreground" : "text-muted-foreground"}>
                {name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
