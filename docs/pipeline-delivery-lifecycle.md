# PipeLedger Pipeline Delivery Lifecycle

PIPELEDGER AI
Pipeline & Delivery Lifecycle
Audience: Contract developers building the MVP with Claude Code • March 2026 • v2
This document defines the status lifecycles for three distinct objects: the pipeline run (extraction through delivery), the GL export version (the versioned snapshot of transformed data), and the delivery record (who received what data, when, and via which channel). Together they provide a complete chain of custody from ERP extraction to LLM consumption — and from LLM consumption to billing.

# 1. Pipeline Run Lifecycle
Table: pipeline_runs.status — single flat enum. Each value tells the developer both where the run is in the pipeline and whether it is still in progress, waiting for human action, or terminal.

| Status | Type | Description | Transitions To |
| --- | --- | --- | --- |
| queued | In progress | Pipeline created, waiting for worker to pick up. | extracting, cancelled |
| extracting | In progress | Worker is pulling data from the ERP connector. | input_review, failed |
| input_review | Blocked | Extraction complete. Paused for Approver to verify the input data. | transforming, failed, cancelled |
| transforming | In progress | dbt models running in BigQuery. | output_review, failed |
| output_review | Blocked | Transformation complete. Paused for Approver to verify output quality. | delivering, failed, cancelled |
| delivering | In progress | Writing to MCP server, REST API, and/or file export. Writing FCU usage event. | succeeded, failed |
| succeeded | Terminal | All deliveries confirmed. Export version created. FCU usage event recorded. | — |
| failed | Terminal | Error at any stage. error_message column has detail. | — (new run required) |
| cancelled | Terminal | Manually cancelled by Approver or Admin during a blocked stage. | — |





State machine flow: 
queued → extracting → input_review → transforming → output_review → delivering → succeeded
                │              │                 │                │                │
                └─── failed ───┴─── cancelled ───┴──── failed ───┴──── failed ──┘
Key rules: Only input_review and output_review accept human input (approve/reject/cancel). All other transitions are system-driven. The cancelled status is only reachable from blocked stages or queued — you cannot cancel a run that is actively extracting, transforming, or delivering.
1.1 Delivery & Metering Transaction (delivering → succeeded)
When the output review is approved, the Pipeline Worker executes the delivery phase. The transition from delivering to succeeded is the most critical transaction in PipeLedger because it commits five things atomically:

| # | Write | Detail | Failure Behavior |
| --- | --- | --- | --- |
| 1 | delivery_records | One row per delivery endpoint (MCP, API, Parquet, CSV). Status = delivered. | If any endpoint fails, all previous deliveries for this run are revoked. Transaction rolls back. |
| 2 | gl_export_versions | Status → delivered. delivered_at set. Supersession logic runs. | If version update fails, delivery_records roll back. Pipeline remains in delivering. |
| 3 | usage_events (FCU) | One row: event_type = fcu, quantity = record_count_out, actor_type = system, pipeline_run_id = current run, billing_period = current month. UPSERT to handle re-runs. | If usage event write fails, entire transaction rolls back. Pipeline does NOT reach succeeded. This ensures billing completeness. |
| 4 | audit_logs | Action = delivery_complete. Details: {record_count, delivery_endpoints, export_version_id, fcu_quantity}. | If audit write fails, entire transaction rolls back. |
| 5 | pipeline_runs | Status → succeeded. completed_at set. | Final write. If this fails, transaction rolls back to delivering. |


Key principle: A pipeline run cannot succeed without a corresponding FCU usage event. This is enforced by the database transaction, not by application code trust. If the usage_event INSERT fails, the pipeline stays in delivering status and is retried by Dagster.



# 2. GL Export Version Lifecycle
Table: gl_export_versions. Each row represents a versioned snapshot of transformed GL data that was approved for delivery. This is the audit object that answers: “what data was served, in what state, and who approved it?”

## 2.1 Table Schema

| Column | Type | Description |
| --- | --- | --- |
| id | uuid PK | Primary key. |
| org_id | uuid FK | References organizations. RLS scoped. |
| pipeline_run_id | uuid FK | The pipeline run that produced this version. |
| version_number | integer | Auto-incrementing per pipeline_config. v1, v2, v3, etc. |
| status | enum | draft → approved → delivered → retracted | superseded | expired |
| record_count | integer | Number of GL rows in this version. |
| period_start | date | Earliest fiscal period covered. |
| period_end | date | Latest fiscal period covered. |
| taxonomy_version | integer | Which taxonomy_mappings version was applied. |
| approved_by | uuid FK | User who approved the output review checkpoint. |
| approved_at | timestamptz | When output review was approved. |
| delivered_at | timestamptz | When delivery completed (status → delivered). |
| retracted_by | uuid FK, nullable | User who retracted. Null unless retracted. |
| retracted_at | timestamptz, nullable | When retraction occurred. |
| retraction_reason | text, nullable | Required free-text reason on retraction. |
| purged | boolean | Default false. True = mart data deleted (hard purge). |
| purged_by | uuid FK, nullable | Admin/Owner who executed hard purge. |
| purged_at | timestamptz, nullable | When hard purge was executed. |
| created_at | timestamptz | Row creation timestamp. |


## 2.2 Status Lifecycle

| Status | Meaning | Who Can Trigger | Transitions To |
| --- | --- | --- | --- |
| draft | Transformation complete, awaiting output review. Not yet deliverable to any endpoint. | System (auto-set) | approved, — (deleted if run fails) |
| approved | Output review passed. System proceeds to deliver. | Approver+ | delivered |
| delivered | Live on MCP server, REST API, and/or file export. Actively queryable. | System (auto-set) | retracted, superseded, expired |
| retracted | Pulled from all delivery endpoints. MCP/API return 404 for this version. Data preserved in BigQuery for audit unless purged. | Admin, Owner | purged (optional) |
| superseded | A newer version for the same pipeline has reached delivered status. Automatically set. Endpoints serve the newer version. | System (auto-set) | retracted (manual) |
| expired | Manually expired by Admin/Owner. Same behavior as retracted but signals intentional end-of-life rather than a correction. | Admin, Owner | purged (optional) |


State machine flow: 
draft → approved → delivered → retracted ───┐
                            │                         │
                            ├─→ superseded (auto)      ├─→ purged (hard delete)
                            │                         │
                            └─→ expired (manual)  ────┘
Supersession rule: When a new export version for the same pipeline_config reaches delivered status, all previous versions in delivered status are automatically moved to superseded. Only one version per pipeline can be delivered at any time.
Hard purge: Only Admin or Owner can trigger. Deletes the transformed data from BigQuery mart tables. Sets purged = true with purged_by and purged_at. The gl_export_versions row itself is never deleted — it remains as the audit record that data once existed and was purged. The audit_log captures the purge event.

# 3. Delivery Records
The delivery_records table captures each write to a delivery endpoint (MCP, API, file export). It links to gl_export_versions to trace exactly which data version was delivered where. MCP query-level access logging is handled by the audit_logs table (action = mcp_query) and GCP Cloud Monitoring infrastructure logs.

## 3.1 delivery_records Schema

| Column | Type | Description |
| --- | --- | --- |
| id | uuid PK | Primary key. |
| org_id | uuid FK | References organizations. RLS scoped. |
| pipeline_run_id | uuid FK | The pipeline run that triggered this delivery. |
| export_version_id | uuid FK | References gl_export_versions. Links delivery to the exact data version. |
| delivery_type | enum | mcp_server | rest_api | parquet_export | csv_export |
| delivery_target | text | Endpoint detail: MCP resource path, API URL, GCS file path. |
| status | enum | delivering | delivered | failed | revoked |
| record_count | integer | Number of rows delivered to this specific endpoint. |
| delivered_at | timestamptz | When delivery to this endpoint completed. |
| revoked_at | timestamptz, nullable | When access was revoked (on retraction/expiry of export version). |
| revoked_by | uuid FK, nullable | User who triggered the revocation. |
| created_at | timestamptz | Row creation timestamp. |


Revocation cascade: When an export version moves to retracted, expired, or purged, all associated delivery_records are set to revoked. For MCP and REST API deliveries, revocation means the endpoint returns 410 Gone. For file exports, revocation means the GCS object ACL is removed (file becomes inaccessible).

# 4. How the Tables Connect
pipeline_runs (1) ──→ (1) gl_export_versions    “This run produced this version”
                            │
gl_export_versions (1) ──→ (N) delivery_records    “This version was delivered to N endpoints”
pipeline_runs (1) ──→ (1) usage_events (FCU)      "This run generated this billing event"

MCP/API queries ──→ (N) usage_events (FIQ)        "Each query is a billing event" 

MCP query access is logged in audit_logs (action = mcp_query, details jsonb carries
api_key_id, mcp_resource, rows_returned, rows_redacted).
Audit trail query: “Show me every human and system that touched the January 2026 GL data" → Join pipeline_runs (who triggered, who approved input/output) → gl_export_versions (what version, what status) → delivery_records (where it went) → audit_logs filtered by mcp_query (who queried it, how many rows they saw, how many were redacted) → usage_events (what was billed for this data).

# 5. Developer Rules

| # | Rule |
| --- | --- |
| 1 | Status transitions are enforced in application code (Supabase RPC functions). Direct UPDATE on status columns is blocked by RLS policy. Use the transition functions: advance_pipeline_run(), approve_checkpoint(), retract_export_version(), purge_export_version(). |
| 2 | Every status transition writes to audit_log. No exceptions. The audit_log entry includes: old_status, new_status, triggered_by (user or system), and timestamp. |
| 3 | Only one gl_export_version per pipeline_config can have status = delivered at any time. The supersession logic runs inside the deliver_export_version() RPC as a transaction. |
| 4 | Hard purge requires Admin or Owner role and is a two-step confirmation in the UI. The RPC checks role before executing. Purge is irreversible. |
| 5 | MCP query access is logged in audit_logs with action = mcp_query. The details jsonb carries: api_key_id, mcp_resource, query_params, rows_returned, rows_redacted. Infrastructure-level request logging is handled by GCP Cloud Monitoring. |
| 6 | When the MCP server or REST API receives a query, it must check gl_export_versions.status = delivered before serving data. If the version is retracted, superseded, or expired, return HTTP 410 Gone with the retraction reason. |
| 7 | File export deliveries (Parquet/CSV) write to GCS with org-scoped IAM. On revocation, the GCS object ACL is removed. The file is not deleted (audit preservation) but becomes inaccessible. |
| 8 | FCU usage_event, audit_log (delivery_complete), delivery_records, gl_export_version update, and pipeline_run status update are written in a single database transaction via complete_pipeline_delivery() RPC. If any write fails, the entire transaction rolls back and the pipeline remains in delivering status. A pipeline run CANNOT reach succeeded without a corresponding FCU usage event. This is ITAC AC-09 (metering accuracy) |
| 9 | FIQ usage_event and audit_log (mcp_query) are written atomically via record_fiq_event() RPC on every authenticated MCP/REST query. The FIQ write is async with retry — a failed write does not block the query response but triggers a Sentry alert for reconciliation. Only system service accounts can INSERT into usage_events — no human user or API key. This is ITAC AC-11 (metering authorization). |
| 10 | The Dagster daily reconciliation sensor (reconcile_fcu_events) verifies that every pipeline_run with status = succeeded in the current billing period has a corresponding FCU usage_event with matching record_count. Missing or mismatched events trigger a Sentry alert and appear in the monthly billing reconciliation report. This is ITAC AC-10 (metering completeness). |



6. Billing Pipeline

The billing pipeline is a set of Dagster-managed jobs that aggregate usage events and sync billing data to Chargebee. These jobs are defined in dagster/billing/ alongside the financial data pipeline definitions.

6.1 Dagster Billing Jobs


| Job | Schedule | Action | Output |
| --- | --- | --- | --- |
| aggregate_daily_usage | Daily sensor (02:00 UTC) | Aggregates usage_events into usage_daily_summary. Calculates total FCU rows, total FIQ events, total FIQ weighted sum per org. Runs FCU reconciliation. | usage_daily_summary rows. Sentry alert on reconciliation mismatch. |
| calculate_monthly_billing | Monthly sensor (billing cycle close) | For each org: sum usage_daily_summary for closing period. Compare FCU vs. fcu_included → overage. Compare FIQ weighted total vs. fiq_included → overage. Apply tiered pricing. | Billing calculation record. Inputs to Chargebee sync. audit_log: usage_overage_billed. |
| sync_chargebee_overages | Runs after calculate_monthly_billing | Pushes metered billing line items to Chargebee via API for FCU and FIQ overages. Chargebee generates combined invoice. | Chargebee invoice. Webhook triggers billing_status update if payment fails. |
| reconcile_fcu_events | Daily (part of aggregate_daily_usage) | Verifies every succeeded pipeline_run has a corresponding FCU usage_event with matching record_count. Flags missing/mismatched events. | Reconciliation report. Sentry alert on mismatch. Monthly report for SOC 2 auditors (ITAC AC-10). |


6.2 Billing State Lifecycle
The organizations.billing_status field drives the payment failure lifecycle. Transitions are triggered by Chargebee webhooks. Every transition writes to audit_logs.


| Status | Day | Customer Impact | System Behavior |
| --- | --- | --- | --- |
| active | 0 | Normal operation. All features available. | Full service. Usage metering active. |
| grace_period | 14 | Chargebee retries exhausted. "Update payment method" banner. | Normal operation continues. In-app banner shown. |
| read_only | 14 | Can view data. Cannot run pipelines, create exports, or modify configs. | Pipeline scheduling paused. MCP/API return 402 Payment Required. |
| suspended | 30 | Cannot access application. Login redirects to payment page. | All services suspended. Data retained for 90 days. |
| terminated | 120 | Data deleted per retention policy. 30-day advance notice. | Automated data cleanup. audit_logs preserved for 7 years. |



END OF PIPELINE & DELIVERY LIFECYCLE DOCUMENT — v2