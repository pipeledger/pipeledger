"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/patterns/status-badge";
// ─── Types ────────────────────────────────────────────────────────────────────

export type TaxonomyRow = {
  id: string;
  account_number: string;
  account_name: string | null;
  account_type: string | null;
  taxonomy_path: string | null;
  confidence_score: number | null;
  status: string;
  connector_configs: { name: string } | null;
};

export type DimensionRow = {
  id: string;
  dimension_type: string;
  dimension_code: string;
  erp_name: string | null;
  auto_label_path: string | null;
  override_label: string | null;
  hierarchy_level: number;
  connector_configs: { name: string } | null;
};

export type BudgetMappingRow = {
  id: string;
  dimension_type: string;
  fpa_value: string;
  gl_value: string;
  confidence_score: number | null;
  status: string;
  connector_configs: { name: string } | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ConfidenceBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-muted-foreground text-xs">—</span>;
  const pct = Math.round(score * 100);
  const color =
    pct >= 90
      ? "text-status-succeeded"
      : pct >= 70
        ? "text-status-warning"
        : "text-status-failed";
  return <span className={`text-xs font-medium tabular-nums ${color}`}>{pct}%</span>;
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-border bg-card flex flex-col items-center justify-center gap-2 py-16 text-center">
      <p className="text-sm font-medium text-foreground">No {label} yet</p>
      <p className="text-xs text-muted-foreground max-w-xs">
        Mappings are generated automatically when pipelines run and can be
        reviewed or overridden here.
      </p>
    </div>
  );
}

function ConnectorBadge({ name }: { name: string | null | undefined }) {
  if (!name) return null;
  return (
    <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
      {name}
    </Badge>
  );
}

// ─── Taxonomy tab ─────────────────────────────────────────────────────────────

function TaxonomyTab({ rows }: { rows: TaxonomyRow[] }) {
  if (rows.length === 0) return <EmptyState label="taxonomy mappings" />;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                Account #
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                Account Name
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground hidden sm:table-cell">
                Type
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                Taxonomy Path
              </th>
              <th className="px-4 py-2.5 text-center text-xs font-medium text-muted-foreground hidden md:table-cell">
                Confidence
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground hidden md:table-cell">
                Status
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground hidden lg:table-cell">
                Connector
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-border last:border-0 hover:bg-muted/20"
              >
                <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground whitespace-nowrap">
                  {row.account_number}
                </td>
                <td className="px-4 py-2.5 text-foreground">
                  {row.account_name ?? <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-4 py-2.5 text-muted-foreground text-xs hidden sm:table-cell">
                  {row.account_type ?? "—"}
                </td>
                <td className="px-4 py-2.5 font-mono text-xs text-foreground">
                  {row.taxonomy_path ?? (
                    <span className="text-muted-foreground italic">unmapped</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-center hidden md:table-cell">
                  <ConfidenceBadge score={row.confidence_score} />
                </td>
                <td className="px-4 py-2.5 hidden md:table-cell">
                  <StatusBadge status={row.status} />
                </td>
                <td className="px-4 py-2.5 hidden lg:table-cell">
                  <ConnectorBadge name={row.connector_configs?.name} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Dimensions tab ───────────────────────────────────────────────────────────

const DIMENSION_LABELS: Record<string, string> = {
  department: "Department",
  class: "Class",
  location: "Location",
  project: "Project",
  custom_segment: "Custom Segment",
};

function DimensionsTab({ rows }: { rows: DimensionRow[] }) {
  if (rows.length === 0) return <EmptyState label="dimension labels" />;

  // Group by dimension_type
  const grouped = rows.reduce<Record<string, DimensionRow[]>>((acc, r) => {
    (acc[r.dimension_type] ??= []).push(r);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([type, typeRows]) => (
        <div key={type}>
          <h3 className="text-sm font-medium text-foreground mb-3">
            {DIMENSION_LABELS[type] ?? type}
            <span className="ml-2 text-xs text-muted-foreground font-normal">
              ({typeRows.length})
            </span>
          </h3>
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                      Code
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                      ERP Name
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                      Label
                    </th>
                    <th className="px-4 py-2.5 text-center text-xs font-medium text-muted-foreground hidden sm:table-cell">
                      Level
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground hidden lg:table-cell">
                      Connector
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {typeRows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-border last:border-0 hover:bg-muted/20"
                    >
                      <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                        {row.dimension_code}
                      </td>
                      <td className="px-4 py-2.5 text-foreground text-xs">
                        {row.erp_name ?? <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-foreground text-xs">
                        {row.override_label ??
                          row.auto_label_path ??
                          <span className="text-muted-foreground italic">unlabelled</span>}
                      </td>
                      <td className="px-4 py-2.5 text-center text-xs text-muted-foreground hidden sm:table-cell">
                        {row.hierarchy_level}
                      </td>
                      <td className="px-4 py-2.5 hidden lg:table-cell">
                        <ConnectorBadge name={row.connector_configs?.name} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Budget Mapping tab ───────────────────────────────────────────────────────

function BudgetTab({ rows }: { rows: BudgetMappingRow[] }) {
  if (rows.length === 0) return <EmptyState label="budget dimension mappings" />;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                Dimension
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                FP&amp;A Value
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                GL Value
              </th>
              <th className="px-4 py-2.5 text-center text-xs font-medium text-muted-foreground hidden md:table-cell">
                Confidence
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground hidden md:table-cell">
                Status
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground hidden lg:table-cell">
                Connector
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-border last:border-0 hover:bg-muted/20"
              >
                <td className="px-4 py-2.5 text-xs text-muted-foreground">
                  {DIMENSION_LABELS[row.dimension_type] ?? row.dimension_type}
                </td>
                <td className="px-4 py-2.5 font-mono text-xs text-foreground">
                  {row.fpa_value}
                </td>
                <td className="px-4 py-2.5 font-mono text-xs text-foreground">
                  {row.gl_value}
                </td>
                <td className="px-4 py-2.5 text-center hidden md:table-cell">
                  <ConfidenceBadge score={row.confidence_score} />
                </td>
                <td className="px-4 py-2.5 hidden md:table-cell">
                  <StatusBadge status={row.status} />
                </td>
                <td className="px-4 py-2.5 hidden lg:table-cell">
                  <ConnectorBadge name={row.connector_configs?.name} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function SchemasTabs({
  taxonomy,
  dimensions,
  budget,
}: {
  taxonomy: TaxonomyRow[];
  dimensions: DimensionRow[];
  budget: BudgetMappingRow[];
}) {
  return (
    <Tabs defaultValue="taxonomy">
      <TabsList className="mb-6">
        <TabsTrigger value="taxonomy">
          Taxonomy
          {taxonomy.length > 0 && (
            <span className="ml-2 text-[10px] text-muted-foreground">
              {taxonomy.length}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="dimensions">
          Dimensions
          {dimensions.length > 0 && (
            <span className="ml-2 text-[10px] text-muted-foreground">
              {dimensions.length}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="budget">
          Budget Mapping
          {budget.length > 0 && (
            <span className="ml-2 text-[10px] text-muted-foreground">
              {budget.length}
            </span>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="taxonomy">
        <TaxonomyTab rows={taxonomy} />
      </TabsContent>
      <TabsContent value="dimensions">
        <DimensionsTab rows={dimensions} />
      </TabsContent>
      <TabsContent value="budget">
        <BudgetTab rows={budget} />
      </TabsContent>
    </Tabs>
  );
}
