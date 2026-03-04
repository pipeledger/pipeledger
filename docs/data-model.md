# PipeLedger Data Model

PIPELEDGER AI
Data Model & Schema Document
Audience: Contract developers • Covers Supabase (operational), BigQuery (analytical), and dbt lineage • March 2026 • v3

# 1. Data Architecture Overview
PipeLedger uses two databases with distinct responsibilities. Supabase PostgreSQL stores operational data (users, configs, mappings, audit trail) and serves the UI/API with low-latency reads. BigQuery stores financial data (raw GL extracts, dbt transformations, output marts) and serves analytical queries for the MCP server and REST API. Data flows from ERPs into BigQuery via the Pipeline Worker, is transformed by dbt, and is served to LLMs from BigQuery mart tables. Supabase holds the configuration that governs how data is transformed and who can access what.

| Database | Engine | Stores | Accessed By | Isolation |
| --- | --- | --- | --- | --- |
| Supabase | PostgreSQL 15 (on GCP) | Organizations, users, roles, pipeline configs, connector credentials, taxonomy mappings, dimension labels, security rules, budget dimension mappings, document metadata, review checkpoints, export versions, delivery records, audit logs, usage events, billing state | Web App (UI + API), MCP Server (key validation + FIQ events), Pipeline Worker (read configs + FCU events), Dagster (pipeline state + billing jobs) | Supabase RLS: every query scoped to org_id via auth.uid() → org membership |
| BigQuery | Google BigQuery | Raw ERP extracts, dbt staging/intermediate/security/mart tables, shared reference data (GAAP taxonomy, FX rates) | dbt (transform), MCP Server (data queries), REST API (data queries), Web App (data preview), Worker (file export) | Dataset-level isolation ({org_id}_raw, {org_id}_transform, {org_id}_mart) + row-level access policies on mart tables |


# 2. Supabase Schema (Operational Database)
All tables belong to the public schema. RLS is enabled on every table. The org_id column is the universal tenant key. Foreign keys enforce referential integrity. Timestamps use timestamptz (UTC).

## 2.1 Identity & Access

| Table | Key Columns | Purpose | RLS Policy |
| --- | --- | --- | --- |
| organizations | id (uuid PK), name, industry, reporting_currency, fiscal_year_end, accounting_standard, default_delivery_format, created_at, plan_id (enum: premium, pro, enterprise, custom), chargebee_customer_id (text), chargebee_subscription_id (text), fcu_included (int), fiq_included (int), billing_status (enum: active, grace_period, read_only, suspended, terminated), billing_status_changed_at (timestamptz) | Root tenant entity. Every other table references org_id. Billing columns store the current plan allocation and Chargebee references. billing_status drives the payment failure lifecycle (see Commercial Framework Section 7). fcu_included and fiq_included are updated by Chargebee webhook subscription_changed. | Users see only orgs they belong to via org_members join. |
| org_members | id (uuid PK), org_id (FK → organizations), user_id (FK → auth.users), role (enum: owner, admin, approver, operator, viewer), invited_by, joined_at | Maps users to organizations with their role. A user can belong to multiple orgs. | User sees only their own memberships. Role determines action permissions in application code. |
| api_keys | id (uuid PK), org_id (FK), key_hash (text, unique), label, access_level (enum: owner, admin, approver, operator, viewer), created_by (FK → auth.users), created_at, revoked_at | API keys for MCP server and REST API access. Keys are hashed (bcrypt). access_level determines which BigQuery RLS level applies. | Scoped to org_id. Only admin+ can create/revoke. |


## 2.2 Pipeline Configuration

| Table | Key Columns | Purpose | RLS Policy |
| --- | --- | --- | --- |
| connector_configs | id (uuid PK), org_id (FK), connector_type (enum: netsuite, dynamics365, sap, csv, pigment, adaptive, anaplan), name, credentials_encrypted (jsonb), data_scope (jsonb), last_sync_at, status (enum: connected, error, disconnected), created_at | Stores ERP and FP&A connection credentials and scope. Credentials encrypted at rest. data_scope defines which entities/periods to extract. | Scoped to org_id. Only admin+ can view credentials. |
| pipeline_configs | id (uuid PK), org_id (FK), name, description, connector_id (FK → connector_configs), delivery_type (enum: mcp, api, parquet, csv), delivery_config (jsonb), schedule_type (enum: manual, daily, hourly, weekly, cron), schedule_config (jsonb), is_active (bool), budget_connector_id (FK, nullable), created_at, updated_at | Defines a pipeline: which connector, what delivery, what schedule. One pipeline = one extraction → transformation → delivery workflow. | Scoped to org_id. |
| pipeline_runs | id (uuid PK), org_id (FK), pipeline_id (FK), status (enum: queued, extracting, input_review, transforming, output_review, delivering, succeeded, failed, cancelled), started_at, completed_at, record_count_in, record_count_out, error_message, triggered_by (enum: schedule, manual, webhook), dagster_run_id | Tracks each execution of a pipeline. Status enum drives the state machine (see Pipeline & Delivery Lifecycle doc). dagster_run_id links to Dagster Cloud for debugging. | Scoped to org_id. |


## 2.3 Review, Approval & Delivery

| Table | Key Columns | Purpose | RLS Policy |
| --- | --- | --- | --- |
| review_checkpoints | id (uuid PK), org_id (FK), pipeline_run_id (FK), checkpoint_type (enum: input, output), status (enum: pending, approved, rejected, cancelled), quality_checks (jsonb), record_count, sample_data (jsonb), reviewed_by (FK → auth.users, nullable), reviewed_at, rejection_reason, created_at | Each pipeline run creates up to 2 checkpoints (input + output). quality_checks stores the automated check results as structured JSON. sample_data holds the first 20 records for preview. | Scoped to org_id. Only approver+ can update status. |
| gl_export_versions | id (uuid PK), org_id (FK), pipeline_run_id (FK → pipeline_runs), version_number (int, auto-increment per pipeline_config), status (enum: draft, approved, delivered, retracted, superseded, expired), record_count, period_start (date), period_end (date), taxonomy_version (int), approved_by (FK), approved_at, delivered_at, retracted_by (FK, nullable), retracted_at, retraction_reason (text, nullable), purged (bool default false), purged_by (FK, nullable), purged_at, created_at | Versioned snapshot of transformed GL data. One row per successful pipeline output. Status lifecycle: draft → approved → delivered → retracted | superseded | expired. Only one version per pipeline_config can be “delivered” at a time. See Pipeline & Delivery Lifecycle doc for full state machine. | Scoped to org_id. Only admin+ can retract or purge. |
| delivery_records | id (uuid PK), org_id (FK), pipeline_run_id (FK), export_version_id (FK → gl_export_versions), delivery_type (enum: mcp_server, rest_api, parquet_export, csv_export), delivery_target (text), status (enum: delivering, delivered, failed, revoked), record_count, delivered_at, revoked_at, revoked_by (FK, nullable), created_at | Tracks what was delivered, where, and when. Links to gl_export_versions for version tracking and audit. On revocation: MCP/API returns 410 Gone, GCS file ACLs removed. See Pipeline & Delivery Lifecycle doc for revocation cascade rules. | Scoped to org_id. |


## 2.4 Transformation Configuration (Customer-Mapped & Customer-Defined)

| Table | Key Columns | Purpose | RLS Policy |
| --- | --- | --- | --- |
| taxonomy_mappings | id (uuid PK), org_id (FK), connector_id (FK), version (int), status (enum: draft, approved, archived), account_number (text), account_name (text), account_type (text), taxonomy_path (text), confidence_score (decimal), mapped_by (FK, nullable), approved_by (FK, nullable), approved_at, created_at | One row per account per mapping version. PipeLedger writes auto-suggested rows (confidence_score populated, mapped_by null). Customer edits via UI (mapped_by set). Approver locks the version (approved_by set). dbt reads only the latest approved version. | Scoped to org_id. |
| dimension_labels | id (uuid PK), org_id (FK), connector_id (FK), dimension_type (enum: department, class, location, project, custom_segment), dimension_code (text), erp_name (text), auto_label_path (text), override_label (text, nullable), description (text, nullable), parent_code (text, nullable), hierarchy_level (int), updated_by (FK, nullable), updated_at | One row per dimension value. auto_label_path built from parent-child hierarchy. override_label is the customer’s correction. dbt uses COALESCE(override_label, auto_label_path) as the final label. | Scoped to org_id. |
| security_rules | id (uuid PK), org_id (FK), rule_type (enum: account_range, dimension_value, project_code, custom_tag), rule_config (jsonb), access_level (enum: admin_owner, owner_only), label (text), is_active (bool), created_by (FK), created_at | Defines which GL records are sensitive. rule_config examples: {"account_from": "6100", "account_to": "6199"} or {"dimension": "project", "value": "M&A Due Diligence"}. The dbt sec_rls_tags model reads active rules and tags matching GL records. | Scoped to org_id. Only admin+ can create/edit. |
| budget_dimension_mappings | id (uuid PK), org_id (FK), budget_connector_id (FK), dimension_type (enum: account, department, class, period), fpa_value (text), gl_value (text), confidence_score (decimal), status (enum: suggested, approved, unmapped), mapped_by (FK, nullable), created_at | Maps FP&A dimension values to GL dimension values. Same pattern as taxonomy mapping: auto-suggest, customer reviews, approves. dbt int_budget_vs_actual reads approved mappings. | Scoped to org_id. |


## 2.5 Documents & Enrichment

| Table | Key Columns | Purpose | RLS Policy |
| --- | --- | --- | --- |
| company_documents | id (uuid PK), org_id (FK), filename (text), document_type (enum: company_overview, accounting_procedures, organizational_context), file_path_gcs (text), page_count (int), snippet_count (int), status (enum: parsing, active, inactive, error), parsed_at, uploaded_by (FK), created_at | Metadata for uploaded PDFs. Actual file stored in GCS. Parsed snippets stored in document_snippets table. | Scoped to org_id. Only admin+ can upload/manage. |
| document_snippets | id (uuid PK), org_id (FK), document_id (FK → company_documents), chunk_index (int), content (text), metadata (jsonb), embedding_vector (vector, nullable) | Parsed text chunks from company documents. metadata contains source page, section heading, document type. Optional embedding for future semantic search. dbt int_context_enrichment queries relevant snippets during transformation. | Scoped to org_id. |


## 2.6 Audit Trail

| Table | Key Columns | Purpose | RLS Policy |
| --- | --- | --- | --- |
| audit_logs | id (uuid PK), org_id (FK), timestamp (timestamptz), user_id (FK, nullable — null for system events), action (enum: extraction_started, extraction_complete, input_approved, input_rejected, transform_started, transform_complete, transform_failed, output_approved, output_rejected, delivery_started, delivery_complete, delivery_revoked, pipeline_cancelled, export_version_created, export_version_retracted, export_version_expired, export_version_purged, mcp_query, schema_updated, security_rule_changed, document_uploaded, user_invited, api_key_created, api_key_revoked), , plan_upgraded, plan_downgraded, usage_overage_billed, payment_failed, payment_succeeded, billing_grace_period, account_read_only, account_suspended, account_terminated, pipeline_run_id (FK, nullable), record_count (int, nullable), details (jsonb), ip_address (inet, nullable) | Immutable append-only audit trail. No UPDATE or DELETE triggers exist on this table. details jsonb stores action-specific context (e.g., for schema_updated: {"table": "taxonomy_mappings", "version_from": 2, "version_to": 3, "accounts_changed": 3}; for mcp_query: {"api_key_id": "...", "mcp_resource": "gl_movements", "rows_returned": 11400, "rows_redacted": 600}). ip_address captured for compliance. • plan_upgraded: {old_plan, new_plan, old_fcu, new_fcu, old_fiq, new_fiq, chargebee_subscription_id} • payment_failed: {chargebee_invoice_id, amount, currency, failure_reason} • usage_overage_billed: {billing_period, fcu_consumed, fcu_allocation, fcu_overage, fiq_consumed, fiq_allocation, fiq_overage, chargebee_invoice_id} | Scoped to org_id. All roles can read (viewer+). No role can update or delete. |



## 2.6 Usage & Billing
Usage metering is the foundation of PipeLedger's subscription + usage revenue model. Every billable interaction (pipeline row processed or financial query served) generates an immutable usage event. These events are the source of truth for billing calculations, customer-facing usage dashboards, dispute resolution, and SOC 2 audit evidence (see Security/SOC 2 doc ITACs AC-09 through AC-11).


| Column | Type | Description |
| --- | --- | --- |
| id | uuid PK | Primary key |
| org_id | uuid FK → organizations | Tenant key |
| actor_type | enum: human, agent, system | Who triggered the interaction |
| actor_id | uuid FK → org_members or api_keys | Identity of the actor |
| event_type | enum: fcu, fiq | Financial Compute Unit or Financial Intelligence Query |
| quantity | integer | For FCU: number of rows processed. For FIQ: always 1 |
| fiq_weight | integer, nullable | Null for FCU events. 1–20+ for FIQ events based on interaction complexity |
| pipeline_run_id | uuid FK, nullable | Set for FCU events; null for FIQ events |
| mcp_resource | text, nullable | Null for FCU; the MCP resource or REST endpoint queried |
| bq_bytes_scanned | bigint, nullable | BigQuery bytes processed for this interaction |
| token_count | integer, nullable | LLM tokens consumed if LLM enrichment was involved; null otherwise |
| rows_processed | integer, nullable | For FCU: same as quantity; null for FIQ |
| billing_period | text | Format '2026-03'. The billing cycle this event belongs to |
| created_at | timestamptz | Event timestamp |


Purpose: Append-only, immutable usage event log. One row per billable interaction.
FCU events: Written by Pipeline Worker after pipeline_runs.status → succeeded. quantity = pipeline_runs.record_count_out. Written in the same transaction as the delivery_complete audit_log entry and delivery_records.
FIQ events: Written by MCP Server and REST API on every authenticated query. fiq_weight determined by interaction complexity (see Commercial Framework Section 4.2). Written in the same transaction as the mcp_query audit_log entry.
Deduplication: FCU events are keyed on (org_id, pipeline_run_id, billing_period). Re-running the same pipeline in the same month replaces the previous FCU event. FIQ events are never deduplicated — every query is a distinct billable interaction.
RLS Policy: Scoped to org_id. Append-only: no UPDATE or DELETE. Viewer+ can read (usage dashboard). Only system service accounts (Pipeline Worker, MCP Server) can INSERT. No human user or API key can write to this table. This is ITAC AC-11 (Metering authorization).

Table: usage_daily_summary

| Column | Type | Description |
| --- | --- | --- |
| id | uuid PK | Primary key |
| org_id | uuid FK → organizations | Tenant key |
| billing_period | text | Format '2026-03' |
| summary_date | date | The day being summarized |
| fcu_quantity | integer | Total FCU rows processed this day |
| fiq_quantity | integer | Total FIQ events this day |
| fiq_weighted_total | integer | Sum of fiq_weight for all FIQ events this day |
| created_at | timestamptz | Row creation |
| updated_at | timestamptz | Last regeneration |


Purpose: Daily aggregation of usage_events. Written by a scheduled Dagster job (daily sensor). Source for the customer-facing usage dashboard and billing calculations. This table is regenerated nightly from usage_events — it is a derived view, not a source of truth. If a discrepancy is found, usage_events is authoritative.
RLS Policy: Scoped to org_id. Viewer+ can read. Only the Dagster billing service account can write.

2.7.1 Usage Event Write Rules

| # | Rule | Detail | Enforcement |
| --- | --- | --- | --- |
| 1 | Atomic writes (FCU) | FCU usage_event, audit_log (delivery_complete), and delivery_records are written in the same database transaction. If any write fails, all roll back. The pipeline does not reach succeeded status until all three writes are confirmed. | Supabase RPC: complete_pipeline_delivery(). Single transaction. |
| 2 | Atomic writes (FIQ) | FIQ usage_event and audit_log (mcp_query) are written in the same database transaction. The MCP/API response is returned to the caller regardless of whether the write succeeds (non-blocking for query performance), but a failed write triggers a Sentry alert for reconciliation. | Supabase RPC: record_fiq_event(). Async with retry. |
| 3 | System-only writes | Only the Pipeline Worker service account and MCP/API service account can INSERT into usage_events. No human user, no admin, no API key can write. | RLS policy: auth.uid() must match service account UUIDs in a system_accounts allowlist. |
| 4 | FCU deduplication | If a pipeline is re-run in the same billing period, the new FCU event replaces the previous one for that (org_id, pipeline_run_id, billing_period) tuple. Only the most recent successful run's row count is billed. | Unique constraint + UPSERT on (org_id, pipeline_run_id, billing_period, event_type = fcu). |
| 5 | Reconciliation | The Dagster daily aggregation job runs a reconciliation check: for every pipeline_run with status = succeeded in the current billing period, there must be a corresponding FCU usage_event. Missing events are flagged and trigger a Sentry alert. | Dagster sensor: reconcile_fcu_events. Runs daily after aggregation. |


2.7.2 FIQ Weighting Model (Internal Reference)
FIQ weighting is determined by interaction complexity. The weighting model is internal (not customer-visible) and is used to calculate the billing value of each query.

| Interaction Type | Weight | Description |
| --- | --- | --- |
| Simple resource read | 1 | Single MCP resource (e.g., chart_of_accounts). Typical: human browsing. |
| Filtered aggregation | 2 | Resource with filters (period, department). Typical: agent pulling a slice. |
| Multi-resource join | 3 | Query spanning multiple mart tables. Typical: agent building composite view. |
| LLM-enriched analysis | 5 | Query involving LLM token consumption. Typical: variance analysis with narrative. |
| Deep analysis | 10–20 | Multi-period comparison, trend analysis, large-dataset aggregation. Typical: board report. |
| Agentic workflow | 20+ | Multi-step orchestrated workflow. Weight = sum of individual interactions. Typical: monthly close agent. |





# 3. BigQuery Schema (Financial Data)
Each organization gets three datasets: {org_id}_raw, {org_id}_transform, {org_id}_mart. Tables within each dataset are created by the Pipeline Worker (raw) or dbt (transform, mart). A shared dataset pipeledger_shared holds global reference data.

## 3.1 Raw Dataset: {org_id}_raw
Written by the Pipeline Worker during extraction. Schema mirrors the source ERP structure with standardized column names. One table per source object.

| Table | Key Columns | Source | Notes |
| --- | --- | --- | --- |
| gl_transactions | transaction_id, line_id, transaction_date, period, account_id, subsidiary_id, department_id, class_id, location_id, project_id, custom_segment_ids (jsonb), debit_amount, credit_amount, currency, memo, created_date, transaction_type, _extracted_at | NetSuite SuiteQL: TransactionLine + Transaction join. Dynamics: GeneralJournalAccountEntry. SAP: ACDOCA. | _extracted_at column tracks when the row was loaded. Used for incremental extraction. |
| chart_of_accounts | account_id, account_number, account_name, account_type, parent_id, description, is_active, _extracted_at | NetSuite: Account. Dynamics: MainAccount. SAP: SKA1/SKB1. | Hierarchical: parent_id enables tree traversal for denormalization. |
| departments | department_id, code, name, parent_id, is_active, _extracted_at | NetSuite: Department. Dynamics: OperatingUnit. SAP: Cost Center. | Same hierarchical pattern as CoA. |
| classes | class_id, code, name, parent_id, is_active, _extracted_at | NetSuite: Classification. Dynamics: Financial Dimension. SAP: Profit Center. | Profit center / business line dimension. |
| locations | location_id, code, name, parent_id, is_active, _extracted_at | NetSuite: Location. Dynamics: Site. SAP: Plant. | Physical or virtual location. |
| projects | project_id, code, name, status, budget_amount, start_date, end_date, manager, customer, _extracted_at | NetSuite: Job/Project. Dynamics: Project. | Project metadata joined to GL via project custom segment. |
| subsidiaries | subsidiary_id, name, base_currency, country, tax_id, parent_id, is_active, _extracted_at | NetSuite: Subsidiary (OneWorld). Dynamics: Legal Entity. SAP: Company Code. | Legal entity for multi-entity companies. |
| custom_segments | segment_id, segment_type, code, name, parent_id, is_active, _extracted_at | NetSuite: Custom Segments with GL Impact. | Dynamic: schema varies per org based on their custom segment configuration. |
| budget_data | account_id, department_id, class_id, period, amount, budget_version, _extracted_at | FP&A system (Pigment/Adaptive/Anaplan/CSV). | Dimension values may not match GL — aligned by budget_dimension_mappings in Supabase. |
| fx_rates | from_currency, to_currency, period, rate_type (enum: period_end, average), rate, _extracted_at | Market data provider or customer-uploaded rate table. | Used by int_currency_conversion for multi-currency standardization. |


## 3.2 Transform Dataset: {org_id}_transform
Written by dbt during transformation. Each table corresponds to a dbt model in the intermediate/ or security/ folder. These are intermediate results — not exposed externally.

| Table (dbt model) | Key Columns Added/Modified | Input | Transformation Logic Summary |
| --- | --- | --- | --- |
| int_balance_decomposition | period_movement (decimal), opening_balance, closing_balance, is_movement (bool) | raw.gl_transactions | Strips cumulative balances. Computes: period_movement = closing_balance - opening_balance per account/dimension/period. Only rows where is_movement = true flow downstream. |
| int_account_normalization | taxonomy_path (text), taxonomy_level_1 through taxonomy_level_4, standard_account_type | int_balance_decomposition + Supabase taxonomy_mappings (latest approved version) | Joins GL records to approved taxonomy mappings. Adds standardized hierarchy path and account type classification. Unmapped accounts flagged with taxonomy_path = ‘UNMAPPED’. |
| int_dimension_flattening | department_label, class_label, location_label, project_label, custom_segment_labels (jsonb) | int_account_normalization + Supabase dimension_labels | Replaces dimension codes with COALESCE(override_label, auto_label_path) for each dimension. Output records are fully self-describing. |
| int_currency_conversion | amount_reporting (decimal), original_currency, reporting_currency, fx_rate_used, rate_type | int_dimension_flattening + raw.fx_rates | Converts period_movement to reporting currency. BS accounts use period_end rate, P&L accounts use average rate. Tags all currency metadata. |
| int_period_alignment | calendar_month, calendar_quarter, fiscal_month, fiscal_quarter, fiscal_year, days_in_period, period_end_date | int_currency_conversion + org fiscal calendar config | Normalizes period to both calendar and fiscal representations. Adds explicit temporal context for LLM consumption. |
| int_context_enrichment | nl_description (text), record_summary (text) | int_period_alignment + Supabase document_snippets | Generates NL description: combines account taxonomy name, dimension labels, amount, period, currency context, and relevant company document snippets into a human-readable sentence. |
| int_budget_vs_actual | budget_amount, variance_amount, variance_pct, favorability (enum: favorable, unfavorable, neutral), run_rate_projection, period_trend | int_context_enrichment + raw.budget_data + Supabase budget_dimension_mappings | Joins actuals to budget via aligned dimensions. Computes variance metrics. Only records with matching budget entries get budget columns populated; others are null. |
| sec_rls_tags | rls_access_level (enum: all, admin_owner, owner_only), rls_rule_ids (array), is_sensitive (bool) | int_budget_vs_actual + Supabase security_rules | Evaluates each GL record against all active security rules. Tags with the most restrictive matching access level. Records matching no rules get rls_access_level = ‘all’. |


## 3.3 Mart Dataset: {org_id}_mart
Written by dbt. These are the output tables queried by the MCP server, REST API, and file export. BigQuery row-level access policies are applied to these tables.

| Table (dbt model) | Description | Key Columns | Queried By |
| --- | --- | --- | --- |
| mart_gl_movements | The primary output table. Every row is a single GL movement (one account, one period, one dimension intersection) with full enrichment. | transaction_id, line_id, period, calendar_month, fiscal_year, fiscal_quarter, account_number, account_name, taxonomy_path, taxonomy_level_1–4, standard_account_type, department_label, class_label, location_label, project_label, subsidiary_name, subsidiary_currency, amount_reporting, original_currency, fx_rate_used, period_movement, nl_description, record_summary, budget_amount, variance_amount, variance_pct, favorability, rls_access_level, _transformed_at | MCP Server (all financial queries), REST API (/gl/movements, /gl/trial-balance), Web App (data preview), File Export (Parquet/CSV) |
| mart_chart_of_accounts | Enriched Chart of Accounts with taxonomy mapping and usage statistics. | account_id, account_number, account_name, account_type, taxonomy_path, taxonomy_level_1–4, parent_account, hierarchy_depth, is_active, total_movements_current_period, total_amount_current_period | MCP Server (chart_of_accounts resource), REST API (/gl/accounts) |
| mart_budget_variance | Pre-aggregated budget vs. actual by account, department, and period. Optimized for the #1 CFO question. | period, account_number, account_name, taxonomy_path, department_label, class_label, actual_amount, budget_amount, variance_amount, variance_pct, favorability, run_rate_annual, ytd_actual, ytd_budget, ytd_variance, trend_direction | MCP Server (budget_variance resource, variance_analysis tool), REST API (/gl/budget-variance) |
| mart_project_profitability | Project-level P&L with metadata. Revenue and cost by project, with margin and budget comparison. | project_id, project_name, project_status, project_budget, project_start, project_end, project_manager, customer, total_revenue, total_cost, margin_amount, margin_pct, budget_utilization_pct, period | MCP Server (project_profitability tool), REST API (/gl/projects) |


## 3.4 Shared Dataset: pipeledger_shared

| Table | Contents | Maintained By |
| --- | --- | --- |
| gaap_taxonomy | Standard US GAAP account hierarchy: level_1 through level_4, account_type, description. ~500 rows. | PipeLedger admin. Updated when accounting standards change. |
| ifrs_taxonomy | Standard IFRS account hierarchy. Same structure as GAAP. ~400 rows. | PipeLedger admin. |
| industry_templates | Industry-specific taxonomy overrides and common account mappings. SaaS, manufacturing, professional services, financial services. | PipeLedger admin. Grows with customer base. |
| fx_rates_market | Daily market FX rates for major currency pairs. Used as default if customer doesn’t provide custom rates. | Automated daily import from ECB or similar public source. |
| fiscal_calendar_templates | Common fiscal calendar configurations: standard calendar, 4-4-5, 4-5-4, 5-4-4, and common non-December year-ends. | PipeLedger admin. |


# 4. dbt Transformation Lineage
The dbt project follows a strict layered architecture. Each model reads from the layer above it. No model skips layers. External configuration (Supabase tables) is joined at the appropriate layer. The full lineage from raw ERP extract to delivered mart table is traceable.

## 4.1 Model Dependency Chain

| Layer | Model | Reads From | Joins With (External) | Writes To |
| --- | --- | --- | --- | --- |
| Staging | stg_netsuite_gl | raw.gl_transactions | (none) | transform.stg_netsuite_gl |
| Staging | stg_netsuite_coa | raw.chart_of_accounts | (none) | transform.stg_netsuite_coa |
| Staging | stg_netsuite_departments | raw.departments | (none) | transform.stg_netsuite_departments |
| Staging | stg_netsuite_classes | raw.classes | (none) | transform.stg_netsuite_classes |
| Staging | stg_netsuite_locations | raw.locations | (none) | transform.stg_netsuite_locations |
| Staging | stg_netsuite_projects | raw.projects | (none) | transform.stg_netsuite_projects |
| Staging | stg_netsuite_subsidiaries | raw.subsidiaries | (none) | transform.stg_netsuite_subsidiaries |
| Staging | stg_budget | raw.budget_data | (none) | transform.stg_budget |
| Intermediate | int_balance_decomposition | stg_netsuite_gl | (none) | transform.int_balance_decomposition |
| Intermediate | int_account_normalization | int_balance_decomposition, stg_netsuite_coa | Supabase: taxonomy_mappings (approved version) | transform.int_account_normalization |
| Intermediate | int_dimension_flattening | int_account_normalization, stg_netsuite_departments, stg_netsuite_classes, stg_netsuite_locations, stg_netsuite_projects | Supabase: dimension_labels (override labels) | transform.int_dimension_flattening |
| Intermediate | int_currency_conversion | int_dimension_flattening | raw.fx_rates or shared.fx_rates_market | transform.int_currency_conversion |
| Intermediate | int_period_alignment | int_currency_conversion | Supabase: organizations (fiscal calendar) or shared.fiscal_calendar_templates | transform.int_period_alignment |
| Intermediate | int_context_enrichment | int_period_alignment | Supabase: document_snippets (active docs) | transform.int_context_enrichment |
| Intermediate | int_budget_vs_actual | int_context_enrichment, stg_budget | Supabase: budget_dimension_mappings (approved) | transform.int_budget_vs_actual |
| Security | sec_rls_tags | int_budget_vs_actual | Supabase: security_rules (active rules) | transform.sec_rls_tags |
| Mart | mart_gl_movements | sec_rls_tags | (none) | mart.mart_gl_movements |
| Mart | mart_chart_of_accounts | stg_netsuite_coa, mart_gl_movements | Supabase: taxonomy_mappings | mart.mart_chart_of_accounts |
| Mart | mart_budget_variance | mart_gl_movements (filtered to budget-matched records) | (none) | mart.mart_budget_variance |
| Mart | mart_project_profitability | mart_gl_movements, stg_netsuite_projects | (none) | mart.mart_project_profitability |


Key lineage principle: Every column in mart_gl_movements can be traced back through the exact chain of dbt models to the original raw ERP field. The nl_description column in the mart is built from: account_name (raw.chart_of_accounts → stg_netsuite_coa → int_account_normalization), taxonomy_path (Supabase taxonomy_mappings), dimension labels (Supabase dimension_labels → int_dimension_flattening), amount and currency (raw.gl_transactions → int_currency_conversion), period context (int_period_alignment), and company document snippets (Supabase document_snippets → int_context_enrichment). This lineage is what makes PipeLedger’s output auditable and trustworthy.

## 4.2 dbt Tests

| Test Type | Applied To | What It Checks |
| --- | --- | --- |
| not_null | All staging models: transaction_id, account_id, period, amount columns | No null values in required fields after extraction |
| unique | stg_netsuite_gl: (transaction_id, line_id) composite | No duplicate GL lines |
| accepted_values | stg_netsuite_coa: account_type | Account types match expected NetSuite enum values |
| relationships | int_account_normalization: account_id references stg_netsuite_coa.account_id | Every GL record maps to a valid account |
| custom: record_count_match | Every intermediate model | Output record count = input record count (no records lost in transformation) |
| custom: control_total | int_balance_decomposition | Sum of period_movement debits = sum of period_movement credits per period |
| custom: no_unmapped_critical | int_account_normalization | No income or expense accounts have taxonomy_path = ‘UNMAPPED’ (warning for others) |
| custom: rls_coverage | sec_rls_tags | Every record has an rls_access_level assigned (no nulls) |


END OF DATA MODEL & SCHEMA DOCUMENT — v3