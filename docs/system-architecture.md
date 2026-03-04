# PipeLedger System Architecture

PIPELEDGER AI
System Architecture Document
Audience: Contract developers building the MVP with Claude Code • March 2026

# 1. Architecture Overview
PipeLedger runs as four services inside a monorepo, deployed to Google Cloud Platform. All services share a single codebase for type safety and code reuse, but deploy as separate containers with distinct responsibilities.


| Service | Runtime | Responsibility | Scales To |
| --- | --- | --- | --- |
| Web App | Cloud Run (Next.js 14) | Frontend UI, REST API routes (/api/*), Supabase client, webhook handlers. Serves all UI pages (Home, Pipelines, Data Review, Connectors, Schemas, Activity, Settings). Handles user authentication via Supabase Auth. Webhook handlers include Chargebee webhooks (subscription_changed, payment_failed, payment_succeeded). Serves Settings > Usage dashboard | 0 → N instances (auto-scale, scale to zero when idle) |
| MCP Server | Cloud Run (TypeScript) | Dedicated MCP endpoint serving financial data to Claude and other LLMs via Model Context Protocol. Reads from BigQuery mart tables. Enforces RLS at query time. Separate service for independent scaling and security boundary. Writes FIQ usage_events on every authenticated query (see Data Model v4, Section 2.7). Separate service for independent scaling and security boundary. | 0 → N instances (independent of web app traffic) |
| Pipeline Worker | Cloud Run Jobs (TypeScript) | ERP extraction (SuiteQL, OData), FP&A import, document parsing (PDF → chunks), file export generation (Parquet/CSV to GCS). Triggered by Dagster. Long-running jobs (up to 60 min timeout). Writes FCU usage_events on successful delivery (see Pipeline Lifecycle v3, Section 1.1). Triggered by Dagster. Long-running jobs (up to 60 min timeout). | 1 instance per job (Dagster manages concurrency) |
| Dagster Cloud | Managed (dagster.cloud) | Pipeline orchestration: defines DAGs for extract → load → dbt run → checkpoint → deliver → meter. Schedules (daily, hourly, manual). Sensors for webhook triggers. Native dbt integration via dagster-dbt. Billing pipeline: daily usage aggregation, monthly billing calculation, Chargebee sync, FCU reconciliation. | Managed — $0 dev, ~$100/mo at scale |
| Chargebee | Managed SaaS | Subscription management, payment processing, invoicing (subscription + FCU/FIQ overages + tax), revenue recognition, dunning (automated payment retry). PipeLedger pushes metered usage via API; Chargebee pushes events back via webhooks. | Managed — ~$250/mo at scale |

# 2. Monorepo Structure
Single GitHub repository. All services share TypeScript types, utility functions, and configuration. Each service has its own Dockerfile and deploys independently via GitHub Actions.


| Path | Contents | Deploys As |
| --- | --- | --- |
| apps/web/ | Next.js 14 application. Pages, API routes, React components, Tailwind styles, Supabase client. | Cloud Run — Web App |
| apps/mcp/ | TypeScript MCP server. MCP SDK, BigQuery client, RLS query builder, tool/resource definitions. FIQ usage event writer. | Cloud Run — MCP Server |
| apps/worker/ | TypeScript pipeline worker. ERP connectors (SuiteQL, OData), CSV parser, PDF parser, Parquet/CSV exporter, GCS client. FIQ usage event writer. | Cloud Run Jobs — Pipeline Worker |
| packages/shared/ | Shared TypeScript types, constants, utility functions, Supabase client factory, BigQuery client factory. Used by all three apps. | Not deployed — imported by apps |
| packages/db/ | Supabase schema definitions, migration files, seed data, RLS policy definitions. Source of truth for the operational database. Includes usage_events and usage_daily_summary tables. | Applied via supabase db push |
| dbt/ | dbt-core project. models/ (staging, intermediate, security, marts), tests/, macros/, seeds/, profiles.yml, dbt_project.yml. | Executed by Dagster via dagster-dbt |
| dagster/pipelines/ | Pipeline DAGs, asset definitions, schedules, sensors, resources (BigQuery, Supabase, GCS). dagster-dbt integration config. | Deployed to Dagster Cloud |
| dagster/billing/ | Billing-specific Dagster jobs: aggregate_daily_usage, calculate_monthly_billing, sync_chargebee_overages, reconcile_fcu_events. Chargebee API client. | Deployed to Dagster Cloud |
| infra/ | Terraform or Pulumi IaC. Cloud Run service definitions, BigQuery datasets, GCS buckets, IAM roles, VPC config. | Applied via terraform apply |
| .github/workflows/ | CI/CD pipelines. Lint, type-check, test, build, deploy per service. dbt test against dev dataset. | GitHub Actions |


# 3. Data Flow
Every pipeline run follows a six-phase flow. Dagster orchestrates the sequence, pausing at human checkpoints and resuming on approval. Phase 6 (Meter) runs atomically with Phase 5 for FCU events, and continuously for FIQ events.

| Phase | Service | Action | Data Movement | Checkpoint |
| --- | --- | --- | --- | --- |
| 1. Extract | Pipeline Worker | ERP connector pulls GL data via SuiteQL (NetSuite) or OData (Dynamics). FP&A import reads CSV or API. PDF parser chunks company documents. | ERP API → Worker memory → BigQuery staging dataset (raw_netsuite.gl_transactions, raw_netsuite.chart_of_accounts, etc.) | None — automatic |
| 2. Stage & Validate | Pipeline Worker | Validate extracted data: record counts, schema conformance, null checks. Write validation summary to Supabase review_checkpoints table. | Worker → Supabase (checkpoint record) | INPUT REVIEW: Pipeline pauses. Approver reviews in Data Review UI. Approve → continue. Reject → stop. |
| 3. Transform | Dagster + dbt | Dagster triggers dbt run against BigQuery. All 8 transformations execute as SQL models in sequence: staging → intermediate → security → marts. dbt tests run after each model. | BigQuery staging → BigQuery intermediate → BigQuery marts (mart_gl_movements, mart_chart_of_accounts, mart_budget_variance, mart_project_profitability) | None — automatic (dbt test failures halt pipeline) |
| 4. Review | Web App | Write quality check results to Supabase. Approver reviews in Data Review UI: quality checks grid, data preview with “Viewing as” role selector. | BigQuery marts → Web App (preview queries) → Supabase (checkpoint record) | OUTPUT REVIEW: Pipeline pauses. Approver reviews quality checks + data preview. Approve & Deliver → continue. Reject → stop. |
| 5. Deliver | MCP Server + Worker | On approval: MCP server starts serving new dataset version. REST API exposes new data. Worker generates Parquet/CSV to GCS if configured. Audit log records delivery. | BigQuery marts → MCP Server (live queries), BigQuery marts → REST API (live queries), BigQuery marts → GCS (file export) | None — automatic after approval. Revocation available post-delivery. |
| 6. Meter | Worker + MCP + Dagster | FCU: Pipeline Worker writes usage_event (fcu) atomically with delivery — pipeline cannot succeed without it. FIQ: MCP Server and REST API write usage_event (fiq) on every authenticated query. Dagster: daily aggregation into usage_daily_summary, monthly billing, Chargebee sync. | usage_events → usage_daily_summary → Dagster billing calculation → Chargebee API → invoice | None — automatic. FCU atomic with Phase 5. FIQ continuous. Dagster on daily/monthly schedule. |








# 4. Service Communication


| From | To | Protocol | Purpose |
| --- | --- | --- | --- |
| Web App | Supabase | PostgREST (HTTP) + Realtime (WebSocket) | CRUD for pipeline configs, review checkpoints, audit logs, user management. Realtime subscription for pipeline status updates in UI. |
| Web App | BigQuery | BigQuery Client (gRPC) | Data preview queries during output review. Runs with reviewer’s access level for RLS enforcement. |
| Web App | Dagster Cloud | Dagster GraphQL API (HTTP) | Trigger pipeline runs (manual), query pipeline status, cancel runs. |
| Web App | Chargebee | Chargebee REST API (HTTPS) | Create customers, create/update subscriptions, redirect to Chargebee-hosted checkout for upgrades. |
| MCP Server | BigQuery | BigQuery Client (gRPC) | All financial data queries. Every query runs through BigQuery RLS. Connection pool with org-scoped service accounts. |
| MCP Server | Supabase | PostgREST (HTTP) | Validate API keys, resolve org context, read security policy config. |
| Pipeline Worker | ERP APIs | HTTPS (SuiteQL, OData, RFC) | Extract GL data, CoA, dimensions, projects, subsidiaries from source ERPs. |
| Pipeline Worker | BigQuery | BigQuery Client (gRPC) | Write extracted data to staging tables. Load FX rates, fiscal calendar config. |
| Pipeline Worker | Supabase | PostgREST (HTTP) | Read pipeline config, write checkpoint records, read approved mappings/labels/security rules. |
| Pipeline Worker | GCS | GCS Client (gRPC) | Write Parquet/CSV exports. Store raw file archives. Read uploaded company documents. |
| Dagster Cloud | Pipeline Worker | Cloud Run Jobs API (HTTP) | Trigger extraction jobs, monitor job status, pass pipeline run parameters. |
| Dagster Cloud | BigQuery | BigQuery Client (gRPC) | Execute dbt run (dagster-dbt). dbt models run as BigQuery SQL queries. |
| Dagster Cloud | Supabase | PostgREST (HTTP) | Read pipeline config, write pipeline run status, update checkpoint state. |
| Dagster Cloud | Chargebee | Chargebee REST API (HTTPS) | Push metered usage (FCU/FIQ overages) at end of billing cycle. Read subscription status. |
| GitHub Actions | Cloud Run | gcloud CLI | Deploy container images to Cloud Run services. |
| GitHub Actions | Dagster Cloud | dagster-cloud CLI | Deploy Dagster definitions to Dagster Cloud workspace. |
| Chargebee | Web App | Webhooks (HTTPS POST to /api/webhooks/chargebee) | subscription_changed (plan allocation update), payment_failed / payment_succeeded (billing_status transition), invoice_generated. |


# 5. BigQuery Dataset Layout
BigQuery is organized into datasets by pipeline phase. Each customer org gets isolated datasets via naming convention: {org_id}_{dataset}. Row-level security policies are applied to mart datasets.


| Dataset Pattern | Purpose | Written By | Read By | RLS |
| --- | --- | --- | --- | --- |
| {org_id}_raw | Staging tables: raw ERP extracts exactly as received. One table per source object (gl_transactions, chart_of_accounts, departments, classes, locations, projects, subsidiaries, custom_segments, budget_data). | Pipeline Worker | dbt (staging models) | No — raw data, not exposed externally |
| {org_id}_transform | Intermediate and security model outputs. dbt writes here during transformation. Tables: int_balance_decomposition, int_account_normalization, int_dimension_flattening, int_currency_conversion, int_period_alignment, int_context_enrichment, int_budget_vs_actual, sec_rls_tags. | dbt (via Dagster) | dbt (downstream models) | No — intermediate, not exposed externally |
| {org_id}_mart | Business-ready output tables: mart_gl_movements, mart_chart_of_accounts, mart_budget_variance, mart_project_profitability. These are what MCP server and API query. | dbt (via Dagster) | MCP Server, REST API, Web App (preview), File Export Worker | Yes — BigQuery row-level access policies enforced. Queries run at the requesting user’s access level. |
| pipeledger_shared | Global reference data: standard GAAP/IFRS taxonomy, FX rate tables, fiscal calendar templates, industry templates. Shared across all orgs. Read-only for org-scoped queries. | PipeLedger admin | dbt (all orgs) | No — reference data, no sensitive content |

# 6. Security Boundaries

## 6.1 Network
All Cloud Run services run within a VPC with private networking. BigQuery and GCS are accessed via private Google APIs (no public internet). Supabase is accessed via its public API with row-level security enforced at the database layer. External-facing endpoints (Web App, MCP Server) terminate TLS at Cloud Run’s load balancer. Pipeline Worker has no external-facing endpoint — it is triggered only by Dagster via Cloud Run Jobs API.

## 6.2 Authentication & Authorization


| Layer | Mechanism | What It Protects |
| --- | --- | --- |
| User → Web App | Supabase Auth (JWT). Email/password or magic link. JWT contains org_id and role. SSO/SAML as future Enterprise feature. | Access to PipeLedger UI and REST API. Role determines what actions are available (Viewer, Operator, Approver, Admin, Owner). |
| User → MCP Server | API key (generated per org in Settings > Delivery). Key resolves to org_id and access level. Passed as bearer token in MCP handshake. | Access to financial data via MCP. API key scoping ensures org isolation. Access level determines which BigQuery RLS policies apply. |
| User → REST API | API key (same as MCP) or Supabase JWT. Both resolve to org_id and access level. | Same as MCP — org-scoped, RLS-enforced access to financial data. |
| Web App → Supabase | Supabase service role key (server-side) or anon key + JWT (client-side). Supabase RLS policies enforce org isolation on every query. | Operational data: pipeline configs, checkpoints, audit logs, user records, security policies, mapping tables. No cross-org leakage possible. |
| MCP / API → BigQuery | GCP service account per org (or shared service account with org_id parameter). BigQuery row-level access policies filter rows based on org_id and user access level. | Financial data: GL records, budget data, transformed outputs. Sensitive rows (exec comp, M&A) physically excluded from query results for unauthorized users. |
| Dagster → Cloud Run | GCP IAM service account. Dagster Cloud authenticated via deployment token. Cloud Run Jobs invoked with org-scoped parameters. | Pipeline execution. Dagster can only trigger jobs for orgs it has been configured for. |
| Pipeline Worker → ERPs | Customer-provided credentials stored encrypted in Supabase (connector_configs table). OAuth tokens refreshed automatically. Credentials never logged. | ERP data extraction. Credentials scoped per connector, per org. |
| Dagster → Chargebee | Chargebee API key (stored as Dagster secret). Scoped to PipeLedger's Chargebee site. | Billing operations: metered usage push, subscription status reads. |
| Chargebee → Web App | Webhook signature verification (Chargebee HMAC). Webhooks processed only if signature matches shared secret. | Billing state changes. Prevents unauthorized billing_status transitions from spoofed webhooks. |

## 6.3 Row-Level Security Implementation
Two separate RLS systems serve different purposes: 
Supabase RLS (application security): Every table in the Supabase operational database has RLS policies that filter by auth.uid() → org_id. This is automatic tenant isolation. A user in Org A can never see Org B’s pipeline configs, audit logs, or user records. This is enforced by PostgreSQL at the database engine level — no application code can bypass it.
BigQuery RLS (financial data security): The mart dataset tables have row-level access policies defined via BigQuery’s CREATE ROW ACCESS POLICY DDL. These policies reference the sec_rls_tags column (written by the dbt security model during transformation) and the requesting user’s access level (passed as a session parameter). When the MCP server queries mart_gl_movements for a user with Operator-level access, BigQuery physically excludes rows tagged as “Owner only” or “Admin + Owner.” The application never sees the restricted rows — they are filtered before results leave BigQuery.

# 7. API Contracts

## 7.1 REST API Endpoints


| Method | Path | Description | Auth | Response |
| --- | --- | --- | --- | --- |
| GET | /api/v1/gl/movements | Paginated GL movements with full dimension context and NL descriptions. Filters: period, account, department, class, subsidiary. | API key or JWT | JSON array of enriched GL records. BigQuery RLS applied. |
| GET | /api/v1/gl/accounts | Chart of Accounts with standard taxonomy mapping. Filters: type, mapped/unmapped. | API key or JWT | JSON array of account objects with taxonomy path. |
| GET | /api/v1/gl/budget-variance | Budget vs. actual by account/department/period. Includes variance amount, %, favorability, run-rate. | API key or JWT | JSON array of variance records with context. |
| GET | /api/v1/gl/projects | Project-level GL aggregation with project metadata (budget, timeline, status). | API key or JWT | JSON array of project P&L objects. |
| GET | /api/v1/gl/trial-balance | Period trial balance by account with optional department/class breakdown. | API key or JWT | JSON object with debit/credit totals by account. |
| POST | /api/v1/pipelines/{id}/run | Trigger a manual pipeline run. | JWT (Operator+) | Pipeline run ID and status. |
| POST | /api/v1/pipelines/{id}/approve | Approve a pending checkpoint (input or output). | JWT (Approver+) | Updated checkpoint status. |
| POST | /api/v1/pipelines/{id}/reject | Reject a pending checkpoint. | JWT (Approver+) | Updated checkpoint status with rejection reason. |
| POST | /api/v1/pipelines/{id}/revoke | Revoke a previously delivered dataset. | JWT (Approver+) | Revocation confirmation. MCP/API stop serving. Files deleted from GCS. |
| GET | /api/v1/activity | Paginated audit log. Filters: pipeline, status, user, date range. | JWT (Viewer+) | JSON array of audit events. |
| GET | /api/v1/usage/current | Current billing period usage: FCU and FIQ consumed vs. allocation. | JWT (Owner, Admin) | JSON: fcu_consumed, fcu_allocation, fiq_consumed, fiq_allocation, projected_overage. |
| GET | /api/v1/usage/daily | Daily usage breakdown for current or specified billing period. | JWT (Owner, Admin) | JSON array of daily usage records. |
| POST | /api/webhooks/chargebee | Chargebee webhook receiver. Verifies HMAC signature. Processes subscription_changed, payment_failed, payment_succeeded. | Chargebee HMAC | 200 OK (acknowledgment). |

## 7.2 MCP Server Resources & Tools


| Type | Name | Description | Parameters |
| --- | --- | --- | --- |
| Resource | chart_of_accounts | Full Chart of Accounts with standard taxonomy mapping, account types, and hierarchy | org (from API key) |
| Resource | gl_movements | Period GL movements with all dimensions denormalized, NL context, and budget variance (if available) | period, granularity (summary / account / transaction) |
| Resource | trial_balance | Period trial balance with debit/credit totals by account | period, department (optional), class (optional) |
| Resource | budget_variance | Budget vs. actual comparison with variance commentary | period, department (optional) |
| Tool | variance_analysis | Identify top N variances by magnitude for a given period. Returns ranked list with context. | period, top_n, dimension (account / department / class) |
| Tool | spend_by_department | Department-level expense breakdown with period comparison and budget context. | period, compare_period (optional) |
| Tool | search_transactions | Search GL records by keyword, account, amount range, or dimension. Returns matching records with full context. | query, filters (account, department, amount_min, amount_max, period) |
| Tool | project_profitability | Project-level revenue, cost, and margin with budget comparison. | project_id or project_name |


Every MCP/REST query writes a FIQ usage_event (with fiq_weight based on interaction type) and an mcp_query audit_log entry atomically. See Data Model v4, Section 2.7 for the usage_events schema and Pipeline Lifecycle v3, Developer Rule #9 for the write pattern. 

# 8. Infrastructure & Deployment


| Component | GCP Resource | Configuration | Cost Estimate (Month 12) |
| --- | --- | --- | --- |
| Web App | Cloud Run service: pipeledger-web | Min 0 / Max 10 instances. 1 vCPU, 512MB RAM. Custom domain: app.pipeledger.ai | $100–200/mo |
| MCP Server | Cloud Run service: pipeledger-mcp | Min 0 / Max 10 instances. 1 vCPU, 1GB RAM. Custom domain: mcp.pipeledger.ai | $100–200/mo |
| Pipeline Worker | Cloud Run Jobs: pipeledger-worker | 1 vCPU, 2GB RAM. 60 min timeout. Triggered by Dagster. | $50–100/mo |
| Orchestration | Dagster Cloud (managed) | Free tier during dev. Team plan at scale. dagster-dbt integration. | $0–100/mo |
| Operational DB | Supabase (Pro → Team) | PostgreSQL on GCP. Auth, RLS, Realtime. Pro $25/mo → Team $599/mo at scale. | $25–599/mo |
| Analytical Store | BigQuery | On-demand pricing. ~$5/TB queried. Storage ~$0.02/GB/mo. | $100–300/mo |
| File Storage | GCS bucket: pipeledger-exports | Standard storage class. Parquet/CSV exports, raw archives, uploaded docs. | $5–20/mo |
| Cache | Redis (Upstash or Memorystore) | Pipeline state cache, rate limiting, session store. | $10–30/mo |
| DNS / CDN | Cloudflare | DNS, DDoS protection, edge caching for static assets. | $0–20/mo |
| CI/CD | GitHub Actions | Build + deploy per service. dbt test against dev. ~10 min per deploy. | $0 (free tier) |
| Monitoring | GCP Cloud Monitoring + Logging | Metrics, alerts, structured logging from all Cloud Run services. | $0–50/mo |
| Billing | Chargebee (managed SaaS) | Subscription management, invoicing, payment processing, tax calculation. | $0–250/mo |


Total Month 12 estimate: $390–$1,869/mo against ~$100K MRR = 98.4% gross margin at the high end.

# 9. CI/CD & Deployment
Trigger: Push to main branch or manual dispatch via GitHub Actions.


| Step | Action | Runs Against |
| --- | --- | --- |
| 1. Lint + Type Check | ESLint + tsc --noEmit across all apps/ and packages/ | All code |
| 2. Unit Tests | Vitest for TypeScript. Tests for shared utils, connector logic, MCP tool handlers. | apps/*, packages/* |
| 3. dbt Test | dbt test against BigQuery dev dataset (pipeledger_dev_*). Validates model logic, schema contracts, referential integrity. | dbt/ |
| 4. Build | Docker build for each service (web, mcp, worker). Multi-stage builds for minimal image size. | apps/web, apps/mcp, apps/worker |
| 5. Push | Push images to Google Artifact Registry. | Docker images |
| 6. Deploy Web | gcloud run deploy pipeledger-web --image ... --region us-central1 | Cloud Run |
| 7. Deploy MCP | gcloud run deploy pipeledger-mcp --image ... --region us-central1 | Cloud Run |
| 8. Deploy Worker | gcloud run jobs update pipeledger-worker --image ... | Cloud Run Jobs |
| 9. Deploy Dagster | dagster-cloud workspace sync. Uploads definitions to Dagster Cloud. | Dagster Cloud |
| 10. Migrate DB | supabase db push (if migration files changed). | Supabase |


Rollback: Cloud Run supports instant rollback to previous revision. Dagster maintains version history. Supabase migrations are versioned and reversible.


END OF SYSTEM ARCHITECTURE DOCUMENT — v1.0