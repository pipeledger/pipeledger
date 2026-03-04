import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/supabase/session";
import { SchemasTabs } from "./_components/schemas-tabs";
import type { TaxonomyRow, DimensionRow, BudgetMappingRow } from "./_components/schemas-tabs";

const CORE_TRANSFORMS = [
  {
    title: "GL Extraction",
    desc: "Pulls journal entries, account balances, and trial balance from the ERP connector.",
  },
  {
    title: "Account Normalisation",
    desc: "Maps raw chart-of-accounts codes to your taxonomy path hierarchy.",
  },
  {
    title: "Dimension Enrichment",
    desc: "Attaches department, class, location, and project labels to each GL line.",
  },
  {
    title: "Budget Alignment",
    desc: "Reconciles FP&A budget dimension codes to GL dimension codes.",
  },
  {
    title: "Period Aggregation",
    desc: "Rolls up journal lines into monthly period totals by account and dimension.",
  },
  {
    title: "Security Masking",
    desc: "Applies security rules to restrict sensitive accounts before delivery.",
  },
  {
    title: "Export Versioning",
    desc: "Snapshots the approved output as a versioned, immutable export record.",
  },
  {
    title: "Delivery Formatting",
    desc: "Serialises the export to the configured delivery format (MCP, API, Parquet, CSV).",
  },
] as const;

export default async function SchemasPage() {
  const { orgId } = await getSession();
  const supabase = createClient();

  const [{ data: taxRaw }, { data: dimRaw }, { data: budgetRaw }] =
    await Promise.all([
      supabase
        .from("taxonomy_mappings")
        .select(
          "id, account_number, account_name, account_type, taxonomy_path, confidence_score, status, connector_configs ( name )"
        )
        .eq("org_id", orgId)
        .order("account_number")
        .limit(500),

      supabase
        .from("dimension_labels")
        .select(
          "id, dimension_type, dimension_code, erp_name, auto_label_path, override_label, hierarchy_level, connector_configs ( name )"
        )
        .eq("org_id", orgId)
        .order("dimension_type")
        .order("hierarchy_level")
        .order("dimension_code")
        .limit(500),

      supabase
        .from("budget_dimension_mappings")
        .select(
          "id, dimension_type, fpa_value, gl_value, confidence_score, status, connector_configs ( name )"
        )
        .eq("org_id", orgId)
        .order("dimension_type")
        .limit(500),
    ]);

  const taxonomy = (taxRaw ?? []) as unknown as TaxonomyRow[];
  const dimensions = (dimRaw ?? []) as unknown as DimensionRow[];
  const budget = (budgetRaw ?? []) as unknown as BudgetMappingRow[];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Schemas</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Transformation models, account taxonomy mapping, and dimension management
        </p>
      </div>

      {/* Core Transformations — system-managed, read-only */}
      <div>
        <p className="text-sm font-medium text-foreground mb-3">
          Core Transformations
          <span className="ml-2 text-xs text-muted-foreground font-normal">
            system-managed · {CORE_TRANSFORMS.length} models
          </span>
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {CORE_TRANSFORMS.map(({ title, desc }) => (
            <div
              key={title}
              className="rounded-lg border border-border bg-card p-3 space-y-1"
            >
              <p className="text-xs font-medium text-foreground">{title}</p>
              <p className="text-xs text-muted-foreground leading-snug">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* User-configured mappings */}
      <SchemasTabs
        taxonomy={taxonomy}
        dimensions={dimensions}
        budget={budget}
      />
    </div>
  );
}
