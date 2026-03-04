import type { TableField } from "@google-cloud/bigquery";

// Schema definitions for pipeledger_shared tables.
// Source of truth for table structure — used by both the init script and any future migrations.

export const GAAP_TAXONOMY_SCHEMA: TableField[] = [
  { name: "id", type: "STRING", mode: "REQUIRED" },
  { name: "level_1", type: "STRING", mode: "REQUIRED", description: "Top-level category, e.g. Assets" },
  { name: "level_2", type: "STRING", mode: "NULLABLE", description: "e.g. Current Assets" },
  { name: "level_3", type: "STRING", mode: "NULLABLE", description: "e.g. Cash and Cash Equivalents" },
  { name: "level_4", type: "STRING", mode: "NULLABLE", description: "Most granular level" },
  { name: "account_type", type: "STRING", mode: "REQUIRED", description: "asset | liability | equity | revenue | expense" },
  { name: "is_income_statement", type: "BOOL", mode: "REQUIRED" },
  { name: "description", type: "STRING", mode: "NULLABLE" },
];

export const IFRS_TAXONOMY_SCHEMA: TableField[] = [
  { name: "id", type: "STRING", mode: "REQUIRED" },
  { name: "level_1", type: "STRING", mode: "REQUIRED" },
  { name: "level_2", type: "STRING", mode: "NULLABLE" },
  { name: "level_3", type: "STRING", mode: "NULLABLE" },
  { name: "level_4", type: "STRING", mode: "NULLABLE" },
  { name: "account_type", type: "STRING", mode: "REQUIRED", description: "asset | liability | equity | revenue | expense" },
  { name: "is_income_statement", type: "BOOL", mode: "REQUIRED" },
  { name: "description", type: "STRING", mode: "NULLABLE" },
];

export const INDUSTRY_TEMPLATES_SCHEMA: TableField[] = [
  { name: "id", type: "STRING", mode: "REQUIRED" },
  { name: "industry", type: "STRING", mode: "REQUIRED", description: "saas | manufacturing | professional_services | financial_services" },
  { name: "accounting_framework", type: "STRING", mode: "REQUIRED", description: "US GAAP | IFRS" },
  { name: "account_pattern", type: "STRING", mode: "REQUIRED", description: "Account code range or regex pattern" },
  { name: "taxonomy_path", type: "STRING", mode: "REQUIRED", description: "e.g. Revenue > Subscription Revenue" },
  { name: "description", type: "STRING", mode: "NULLABLE" },
];

export const FX_RATES_MARKET_SCHEMA: TableField[] = [
  { name: "from_currency", type: "STRING", mode: "REQUIRED" },
  { name: "to_currency", type: "STRING", mode: "REQUIRED" },
  { name: "rate_date", type: "DATE", mode: "REQUIRED" },
  { name: "rate_type", type: "STRING", mode: "REQUIRED", description: "period_end | average" },
  { name: "rate", type: "FLOAT64", mode: "REQUIRED" },
  { name: "_imported_at", type: "TIMESTAMP", mode: "REQUIRED" },
];

export const FISCAL_CALENDAR_TEMPLATES_SCHEMA: TableField[] = [
  { name: "id", type: "STRING", mode: "REQUIRED" },
  { name: "name", type: "STRING", mode: "REQUIRED", description: "e.g. standard_calendar | 4-4-5 | 4-5-4 | 5-4-4" },
  { name: "year_end_month", type: "INT64", mode: "REQUIRED", description: "1–12, e.g. 12 for December" },
  { name: "period_pattern", type: "STRING", mode: "REQUIRED", description: "JSON-serialized period structure" },
  { name: "description", type: "STRING", mode: "NULLABLE" },
];

export const SHARED_TABLES: Record<string, TableField[]> = {
  gaap_taxonomy: GAAP_TAXONOMY_SCHEMA,
  ifrs_taxonomy: IFRS_TAXONOMY_SCHEMA,
  industry_templates: INDUSTRY_TEMPLATES_SCHEMA,
  fx_rates_market: FX_RATES_MARKET_SCHEMA,
  fiscal_calendar_templates: FISCAL_CALENDAR_TEMPLATES_SCHEMA,
};
