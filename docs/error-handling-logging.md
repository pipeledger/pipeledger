# PipeLedger Error Handling & Logging

PIPELEDGER AI
Error Handling & Logging Strategy
Audience: Contract developers building the MVP with Claude Code • March 2026
This document defines how PipeLedger handles errors across the pipeline lifecycle and how logging, monitoring, and alerting work together to give both the development team and the customer visibility into system health. The core philosophy is hybrid: auto-retry for transient infrastructure errors, fail fast for data integrity errors.

# 1. Error Classification
Every error in PipeLedger falls into one of two categories. The category determines whether the system retries automatically or halts the pipeline immediately. There is no ambiguity — every error type maps to exactly one category.

## 1.1 Transient Errors (Auto-Retry)
Infrastructure or external service failures that are likely to resolve on their own. The system retries with exponential backoff: 1s, 4s, 16s (3 attempts). If all retries fail, the pipeline moves to failed status.

| Error Type | Source | Example | Retry Config |
| --- | --- | --- | --- |
| ERP connection timeout | NetSuite / Dynamics / SAP API | SuiteQL query exceeds 30s response | 3 retries, exponential backoff |
| ERP rate limit (429) | NetSuite / Dynamics / SAP API | Too many concurrent requests | 3 retries, respect Retry-After header |
| BigQuery quota exceeded | BigQuery API | Concurrent query limit hit during transform | 3 retries, 30s base delay |
| GCS write failure | Google Cloud Storage | Transient network error during Parquet export | 3 retries, exponential backoff |
| Supabase connection error | Supabase PostgreSQL | Connection pool exhausted | 3 retries, 2s base delay |
| Dagster worker crash | Dagster / Cloud Run | OOM kill on worker container | 1 retry (Dagster auto-restart) |


## 1.2 Data Errors (Fail Fast)
Data integrity or logic errors that will not resolve on retry. These indicate a real problem with the source data, transformation logic, or configuration. The pipeline halts immediately — no retry. The error is recorded and the pipeline run moves to failed status.

| Error Type | Source | Example | Behavior |
| --- | --- | --- | --- |
| dbt test failure | dbt-core test run | not_null test fails on account_id in staging | Halt pipeline, no retry. Log failing test name and row count. |
| dbt model compilation error | dbt-core | SQL syntax error in a dbt model | Halt pipeline, no retry. Log model name and error. |
| Record count mismatch | custom dbt test | Staging output has fewer rows than raw input | Halt pipeline, no retry. Log expected vs. actual count. |
| Control total mismatch | custom dbt test | Debits ≠ credits after balance decomposition | Halt pipeline, no retry. Log imbalance amount. |
| Unmapped critical accounts | custom dbt test | Income/expense accounts with taxonomy_path = UNMAPPED | Halt pipeline, no retry. Log unmapped account list. |
| Schema drift | Pipeline Worker | ERP API returns unexpected column or missing required field | Halt extraction, no retry. Log expected vs. actual schema. |
| Invalid credentials | Connector | NetSuite OAuth token expired and cannot refresh | Halt pipeline, no retry. Notify admin to re-authenticate. |
| RLS policy conflict | sec_rls_tags model | Overlapping security rules produce contradictory access levels | Halt pipeline, no retry. Log conflicting rule IDs. |


# 2. Error Handling by Pipeline Stage
Each pipeline stage has specific error handling behavior. Dagster orchestrates the retry logic and status transitions. On failure, the pipeline_runs.status moves to failed and an audit_log entry is written with the error details.

| Stage | Status On Entry | Transient Errors | Data Errors | On Final Failure |
| --- | --- | --- | --- | --- |
| Extraction | extracting | Retry API calls with backoff. Resume from last successful page (paginated extraction). | Schema drift or auth failure → halt immediately. | status → failed. error_message populated. audit_log: extraction_failed. |
| Input Review | input_review | N/A (human stage) | Rejection → status → failed. Cancellation → status → cancelled. |  |
| Transformation | transforming | Retry BigQuery queries if quota/timeout. dbt retries handled by Dagster. | dbt test failure or model error → halt immediately. No partial transform. | status → failed. All intermediate BigQuery tables from this run are dropped (no partial output). |
| Output Review | output_review | N/A (human stage) | Rejection → status → failed. Cancellation → status → cancelled. |  |
| Delivery | delivering | Retry MCP/API registration and GCS writes with backoff. | N/A (data already validated). | status → failed. Partial deliveries are rolled back: any endpoints that received data are revoked. |


Critical rule — no partial transforms: If any dbt model or test fails during the transformation stage, all intermediate tables produced by that run are dropped from BigQuery. The pipeline never leaves half-transformed data in the transform dataset. This prevents downstream consumers from accidentally querying incomplete data.
Critical rule — delivery rollback: If delivery fails partway through (e.g., MCP registration succeeds but Parquet export fails), all successful deliveries for that run are revoked. Delivery is atomic across all configured endpoints — either all succeed or all are rolled back.

# 3. Logging Architecture
PipeLedger uses three logging layers, each serving a different audience and retention need. All layers emit structured JSON. No layer contains financial data.

| Layer | Tool | Audience | Retention | Purpose |
| --- | --- | --- | --- | --- |
| Application audit trail | Supabase audit_logs table | Customer (via Activity page), auditors | 7 years (configurable) | Every status transition, approval, delivery, revocation, and mcp_query. Immutable. Customer-visible. |
| Infrastructure logging | GCP Cloud Logging | PipeLedger engineering team | 30 days default, exportable to GCS for longer | Structured logs from all Cloud Run services. Request/response metadata, latency, container metrics. Debug-level detail. |
| Error tracking & alerting | Sentry | PipeLedger engineering team | 90 days | Exception capture with stack traces, breadcrumbs, and context. Alerts to engineering Slack on new/recurring errors. |
| Pipeline observability | Dagster UI | PipeLedger engineering team + customer (Activity tab) | Dagster Cloud retention (90 days) | DAG execution history, asset materialization timeline, sensor triggers, retry attempts. Visual pipeline debugging. |


# 4. Log Data Allow-List
PipeLedger processes sensitive financial data. Logs must never contain financial content. Instead of defining what to exclude (which risks gaps), the allow-list defines the only data fields that may appear in any log entry across any layer. Everything not on this list is forbidden.

## 4.1 Allowed in Logs

| Category | Allowed Fields | Example Log Value |
| --- | --- | --- |
| Identifiers | org_id, pipeline_id, pipeline_run_id, connector_id, export_version_id, user_id, api_key_id (never the key itself), dagster_run_id | org_id: "a1b2c3d4-..." |
| Status & state | pipeline status, checkpoint status, export version status, delivery status, connector status | status: "transforming" → "failed" |
| Counts (never values) | record_count_in, record_count_out, rows_returned, rows_redacted, snippet_count, page_count | record_count_in: 847231 |
| Timing | started_at, completed_at, duration_ms, response_time_ms, retry_attempt, retry_delay_ms | duration_ms: 134200 |
| Error metadata | error_code, error_category (transient/data), error_stage, dbt_test_name, dbt_model_name, http_status_code | error_code: "DBT_TEST_FAILURE" |
| Configuration (non-sensitive) | connector_type, delivery_type, schedule_type, taxonomy_version, dimension_type | connector_type: "netsuite" |
| Infrastructure | service_name, container_id, cloud_run_revision, memory_usage_mb, cpu_usage_pct | service_name: "pipeledger-worker" |


## 4.2 Never Allowed in Logs

| Forbidden Data | Why | What to Log Instead |
| --- | --- | --- |
| GL amounts (debit, credit, balance, variance) | Financial data is the customer’s most sensitive asset | Record count only |
| Account names or numbers | Reveals chart of accounts structure | account_id (opaque UUID) or record count |
| Dimension values (department names, class names, project names) | Reveals organizational structure | dimension_type only (e.g., "department") |
| Taxonomy paths or mappings | Reveals financial categorization strategy | taxonomy_version number only |
| NL descriptions or record summaries | Contains synthesized financial context | Never log — exists only in BigQuery mart |
| ERP credentials, tokens, API keys | Security — credential exposure | connector_id or api_key_id (never the credential) |
| Security rule configurations | Reveals what the customer considers sensitive | rule_id and is_active only |
| Budget amounts or variance figures | Financial planning data | Record count only |
| Company document content or snippets | Proprietary company knowledge | document_id and snippet_count only |
| Sample data or data previews | Raw financial records | Never log — served only via authenticated UI/API |


Enforcement: A shared sanitizeForLog() utility function in the monorepo’s shared package strips any object to only allowed fields before passing it to any logger (GCP, Sentry, or Dagster). Developers must never call console.log() or logger.info() with raw data objects — always pass through sanitizeForLog() first.

# 5. Customer-Facing Error Messages
Errors displayed in the PipeLedger UI follow a tiered visibility model. All users see a sanitized, human-readable message. Technical detail is accessible only to Admin and Owner roles via the Activity page detail view. This protects Operator and Viewer users from confusing technical output while giving administrators the information they need to triage.

| Role | What They See on Pipeline Failure | Activity Page Detail View |
| --- | --- | --- |
| Viewer | Status badge: Failed. No further detail. | Sanitized message only (same as Operator). |
| Operator | Sanitized message: "Extraction failed: ERP connection timed out after 3 retry attempts. Contact your administrator or retry." | Sanitized message only. |
| Approver | Same sanitized message as Operator. | Sanitized message only. |
| Admin | Same sanitized message as Operator. | Full technical detail: error_code, error_stage, dbt_test_name, retry_count, stack trace summary, dagster_run_id link. |
| Owner | Same sanitized message as Operator. | Full technical detail (same as Admin). |


## 5.1 Error Message Templates
The Pipeline Worker and Dagster produce structured error objects. The UI maps each error_code to a sanitized template. The technical detail is stored in the pipeline_runs.error_message column (jsonb) and the audit_logs.details column.

| Error Code | Sanitized Message (All Roles) | Technical Detail (Admin/Owner) |
| --- | --- | --- |
| ERP_TIMEOUT | Extraction failed: ERP connection timed out. Please retry or check your connector status. | SuiteQL query timeout after 60s on batch {n}/{total}. 3 retries exhausted. Last HTTP status: 504. |
| ERP_RATE_LIMIT | Extraction failed: ERP rate limit reached. The system will retry automatically on the next scheduled run. | NetSuite 429 response. Retry-After: {n}s. 3 retries exhausted. Concurrent request count: {n}. |
| ERP_AUTH_FAILURE | Extraction failed: ERP authentication error. An administrator needs to reconnect this connector. | OAuth token refresh failed. HTTP 401. Token expiry: {timestamp}. Connector ID: {id}. |
| ERP_SCHEMA_DRIFT | Extraction failed: unexpected data format from ERP. Please contact support. | Expected column {name} not found in API response. Schema version mismatch. Connector type: {type}. |
| DBT_TEST_FAILURE | Transformation failed: data quality check did not pass. Review the Data Quality section for details. | dbt test {test_name} failed on model {model_name}. {n} rows failed. Severity: error. |
| DBT_MODEL_ERROR | Transformation failed: transformation logic error. Please contact support. | dbt model {model_name} compilation/runtime error: {error_message}. BigQuery job ID: {id}. |
| BQ_QUOTA | Transformation delayed: BigQuery resource limit. Retrying automatically. | BigQuery concurrent query quota exceeded. Retry {n}/3. Project: {project_id}. |
| DELIVERY_FAILED | Delivery failed: could not complete delivery to all endpoints. Any partial deliveries have been rolled back. | Endpoint {delivery_target} returned {http_status}. Rollback initiated for {n} successful deliveries. |
| RLS_CONFLICT | Transformation failed: security policy conflict detected. An administrator should review security rules. | Rules {rule_id_1} and {rule_id_2} produce contradictory access levels for {n} records. |


# 6. Notification Channels
Pipeline failures trigger notifications through three channels. All channels deliver the sanitized message only — never technical detail. The customer configures which channels are active in Settings > Notifications.

| Channel | Recipients | Trigger | Configuration |
| --- | --- | --- | --- |
| In-app badge | All roles (badge on Home page) | Any pipeline run reaches failed or cancelled status. | Always on. Cannot be disabled. Badge clears when user views the failed run. |
| Email | Org Admins and Owner by default. Configurable. | Pipeline failure after all retries exhausted. | Settings > Notifications. Per-pipeline toggle. Sends sanitized message + link to Activity detail. |
| Slack webhook | Customer-configured channel. | Pipeline failure after all retries exhausted. | Settings > Integrations. Customer provides Slack webhook URL. Sends sanitized message + pipeline name + timestamp. |


Notification timing: Notifications are sent only after all retry attempts are exhausted. A transient error that resolves on retry 2 of 3 produces no notification — only a debug-level log entry in GCP Cloud Logging. This prevents alert fatigue for self-healing failures.

# 7. Sentry Configuration
Sentry captures unhandled exceptions and explicitly reported errors from all Cloud Run services (Web App, MCP Server, Pipeline Worker). Sentry is for the PipeLedger engineering team only — customers never see Sentry data.
// shared/lib/sentry.ts
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,  // production, staging, development
  tracesSampleRate: 0.1,              // 10% of transactions traced
  beforeSend(event) {
    // Strip any financial data that might be in error context
    event.contexts = sanitizeForLog(event.contexts);
    event.extra = sanitizeForLog(event.extra);
    return event;
  },
});
Sentry alerts: New unresolved errors trigger an alert to the PipeLedger engineering Slack channel (#alerts-pipeline). Recurring errors (same fingerprint) alert once per 24 hours. Volume spikes (≥10 errors in 5 minutes) trigger an escalation alert. These thresholds are configured in Sentry’s alert rules, not in application code.

# 8. Structured Log Format
All services emit structured JSON logs to stdout, which GCP Cloud Logging captures automatically. Every log entry follows the same schema. This enables consistent querying across services in Cloud Logging and Log Analytics.
{
  "severity": "ERROR",
  "timestamp": "2026-03-15T14:23:07.442Z",
  "service": "pipeledger-worker",
  "org_id": "a1b2c3d4-...",
  "pipeline_run_id": "e5f6g7h8-...",
  "stage": "transforming",
  "error_code": "DBT_TEST_FAILURE",
  "error_category": "data",
  "message": "dbt test not_null_stg_netsuite_gl_account_id failed",
  "retry_attempt": 0,
  "duration_ms": 45230,
  "dagster_run_id": "abc123-...",
  "trace_id": "4a8b9c0d-..."
}
Severity levels: DEBUG (retry attempts, pagination progress), INFO (stage transitions, successful completions), WARNING (non-critical dbt test warnings, approaching quota limits), ERROR (pipeline failures, unhandled exceptions), CRITICAL (security-related failures, data corruption detected). Production services log at INFO and above. DEBUG is enabled per-service via environment variable for troubleshooting.

# 9. Developer Rules

| # | Rule |
| --- | --- |
| 1 | Every data object passed to any logger must go through sanitizeForLog() first. This function is in shared/lib/logging.ts. It strips everything not on the allow-list. No exceptions. |
| 2 | Never call console.log() in production code. Use the shared logger (shared/lib/logger.ts) which enforces structured JSON format and routes to GCP Cloud Logging. |
| 3 | Classify every new error as transient or data before writing the handler. Transient errors get retries. Data errors get fail-fast. If unsure, default to fail-fast — a false retry on bad data wastes time and creates confusing logs. |
| 4 | Sentry captures should never include financial data. The beforeSend hook runs sanitizeForLog(), but developers should also avoid setting Sentry context/breadcrumbs with raw data objects. |
| 5 | Customer-facing error messages come from the error template map (shared/lib/error-templates.ts), never from raw exception messages. The template maps error_code to a sanitized string. |
| 6 | Notifications fire only after all retries are exhausted. Never trigger email/Slack on a retryable error that has remaining attempts. |
| 7 | Pipeline failures must write to both pipeline_runs.error_message (jsonb with full technical detail for Admin/Owner UI) and audit_logs (with error_code and sanitized context). Both writes happen in the same transaction. |
| 8 | Delivery failures trigger rollback of all endpoints for that run. The rollback logic lives in the deliver_export_version() RPC. Partial delivery is never acceptable. |


END OF ERROR HANDLING & LOGGING STRATEGY — v1.0