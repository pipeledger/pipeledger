# PipeLedger Tech Stack

PIPELEDGER AI
Definitive Technology Stack & Architecture Reference
February 2026 • v1.0

# Technology Stack Overview
This document defines the complete technology stack for PipeLedger AI, informed by the founder’s existing experience with the chosen tools and the specific requirements of a financial data intelligence platform. Every decision balances three constraints: development speed (solo founder in Month 1), enterprise readiness (SOC 2, SSO, audit trails), and cost efficiency (bootstrapping on $50K).


| Layer | Technology | Purpose | Decision |
| --- | --- | --- | --- |
| Frontend | Next.js 14 + React 18 + TypeScript + Tailwind + shadcn/ui | Web application, dashboard, review UI | Build |
| Backend API | Next.js API Routes (same codebase) | REST API, MCP server, webhook handlers | Build |
| Pipeline Worker | Separate Cloud Run service (TypeScript) | ERP extraction, BigQuery loading, export delivery | Build |
| Orchestration | Dagster (Cloud Run or GCE) | Pipeline DAGs: extract → load → dbt → deliver | Build |
| Transformation | dbt-core + BigQuery | All financial data transformations (SQL models) | Build |
| Operational DB | Supabase (PostgreSQL on GCP) | Users, orgs, pipeline configs, audit logs, RBAC | Buy |
| Auth | Supabase Auth | Authentication, SSO (future), row-level security | Buy |
| Analytical Store | BigQuery | Raw ERP data staging, dbt transforms, output tables | Buy |
| File Storage | Google Cloud Storage (GCS) | Parquet/CSV output staging, raw file archival | Buy |
| Cache / Queue | Redis (Memorystore or Upstash) | Pipeline state, rate limiting, session cache | Buy |
| MCP Server | TypeScript MCP SDK (in Next.js API) | Native LLM integration via Anthropic protocol | Build |
| Hosting | Google Cloud Platform (Cloud Run) | Web app + worker containers, scales to zero | Buy |
| CI/CD | GitHub Actions | Build, test, deploy to Cloud Run | Buy |
| Monitoring | Google Cloud Monitoring + Logging | Pipeline observability, error alerting, audit logs | Buy |
| DNS / CDN | Cloudflare | DNS, DDoS protection, edge caching | Buy |


# Architecture: Data Flow
The platform follows a clear separation of concerns across five stages. Each stage is handled by the technology best suited for it:


| Stage | What Happens | Technology | Where It Runs |
| --- | --- | --- | --- |
| 1. Extract | Pull data from ERP APIs (NetSuite SuiteQL, Dynamics OData, SAP RFC, Coupa REST) | TypeScript (pipeline worker) | Cloud Run (worker service) |
| 2. Load | Write raw ERP data to BigQuery staging tables, preserving all original fields | TypeScript + BigQuery SDK | Cloud Run → BigQuery |
| 3. Transform | Apply financial domain logic: balance decomposition, account normalization, dimension flattening, currency conversion, RLS tagging | dbt-core (SQL models) | BigQuery (compute) |
| 4. Review | Dual-checkpoint approval: input review (raw data) + output review (transformed data) | Next.js UI + Supabase (Postgres + RLS) | Cloud Run (web app) |
| 5. Deliver | Serve transformed data via API (JSON/JSONL), MCP server, file export (Parquet/CSV to GCS/S3) | TypeScript + MCP SDK | Cloud Run (web app + worker) |


## Orchestration: Dagster Pipeline
Dagster manages the full pipeline DAG (directed acyclic graph) for each configured pipeline. A typical pipeline run looks like this:


| Step | Dagster Asset | Description | Duration (est.) |
| --- | --- | --- | --- |
| 1 | extract_netsuite_gl | Call SuiteQL API, paginate through GL transactions, write to GCS as JSONL | 30–90s |
| 2 | load_raw_to_bigquery | Load JSONL from GCS into BigQuery staging table (raw_gl_transactions) | 10–30s |
| 3 | input_review_checkpoint | Pause pipeline, notify reviewer, wait for approval in Supabase | Manual |
| 4 | dbt_run_transforms | Execute dbt models: balance decomposition → account normalization → dimension flattening → currency conversion → context enrichment → anomaly flagging → RLS tagging | 60–180s |
| 5 | output_review_checkpoint | Pause pipeline, notify reviewer, present quality checks + data preview | Manual |
| 6 | export_parquet_to_gcs | Write transformed data as Parquet to GCS bucket | 10–20s |
| 7 | serve_via_api_and_mcp | Update API cache, refresh MCP server data, notify delivery webhooks | 5–10s |

Key Dagster benefits: Native dbt integration via dagster-dbt (auto-discovers dbt models as Dagster assets). Built-in sensor support for triggering pipelines on ERP webhooks or schedules. Materialization tracking gives full lineage from ERP source to delivered output. The Dagster UI provides pipeline observability that you can expose to customers in the Activity tab.

# Transformation Layer: dbt + BigQuery
All financial data transformations run as dbt SQL models inside BigQuery. This means the transformation logic is declarative, version-controlled, testable, and inspectable — critical for audit-grade financial data processing.

## dbt Project Structure


| Layer | dbt Folder | Purpose | Example Models |
| --- | --- | --- | --- |
| Staging | models/staging/ | Clean raw ERP data, standardize column names, cast types | stg_netsuite_gl, stg_dynamics_gl, stg_sap_gl, stg_coupa_invoices |
| Intermediate | models/intermediate/ | Apply core financial transformations | int_balance_decomposition, int_account_normalization, int_dimension_flattening, int_currency_conversion |
| Marts | models/marts/ | Business-ready output tables optimized for AI consumption | mart_gl_movements, mart_chart_of_accounts, mart_spend_analytics, mart_audit_ready |
| Security | models/security/ | Apply row-level security tags and field masking | sec_rls_tags, sec_field_masking, sec_sensitive_accounts |
| Quality | models/quality/ | Data quality scoring and anomaly detection | qual_anomaly_flags, qual_completeness_score, qual_reconciliation_check |

## Core dbt Models (Transformation IP)


| Model | What It Does | Why It’s Hard |
| --- | --- | --- |
| int_balance_decomposition | Strips opening/closing balances from GL exports, isolates period movements by computing deltas between cumulative snapshots | Every ERP exports balances differently; NetSuite includes YTD, SAP includes carry-forward, Dynamics embeds opening in first period |
| int_account_normalization | Maps ERP-specific chart of accounts to a standard taxonomy (US GAAP / IFRS hierarchy) using configurable mapping tables | Account numbering, hierarchy depth, and type classification vary across every ERP and every company |
| int_dimension_flattening | Converts hierarchical dimensions (departments, projects, cost centers, locations) to flat denormalized attributes on each transaction | LLMs reason better with flat, context-rich records; hierarchies need to be resolved and labeled |
| int_currency_conversion | Applies period-end or average FX rates, tags functional vs. reporting currency, identifies unrealized gains/losses | Must handle triangulation (non-USD base currencies), historical rates for BS items, and average rates for P&L |
| int_context_enrichment | Adds natural language descriptions to accounts and transactions (e.g., “This is a SaaS subscription revenue account under ASC 606”) | Dramatically improves LLM comprehension; requires industry and accounting standard awareness |
| sec_rls_tags | Tags each record with security classification based on account range, dimension, project code, or custom rules stored in Supabase config | Must integrate with Supabase RLS policies so the same rules apply at DB level and in dbt output |

dbt tests run automatically on every pipeline execution: not_null on critical fields, unique on primary keys, accepted_values for account types and currency codes, custom tests for balanced entries (debits = credits), record count reconciliation between staging and marts, and referential integrity between GL transactions and chart of accounts.

# Operational Layer: Supabase
Supabase serves as the operational backbone — everything that isn’t heavy data processing lives here. It provides PostgreSQL (on GCP), authentication, row-level security, and realtime subscriptions in a single managed service.

## Supabase Database Schema (Key Tables)


| Table | Purpose | Key Columns |
| --- | --- | --- |
| organizations | Multi-tenant org management | id, name, industry, base_currency, fiscal_year_end, accounting_standard, erp_connections (JSONB) |
| users / auth.users | Authentication (managed by Supabase Auth) | id, email, role, org_id, created_at |
| pipeline_configs | User-defined pipeline definitions | id, org_id, name, source_connector, transforms (JSONB), output_config, schedule, is_active |
| pipeline_runs | Execution history with full lineage | id, config_id, status, started_at, completed_at, records_in, records_out, errors (JSONB), dagster_run_id |
| review_checkpoints | Dual-review approval records | id, run_id, checkpoint_type (input/output), status, reviewer_id, reviewed_at, quality_checks (JSONB) |
| connector_configs | ERP connection details (encrypted) | id, org_id, erp_type, connection_params (encrypted JSONB), last_sync, status |
| schema_rules | Transformation schema definitions | id, org_id, name, rule_type, predicate (JSONB), severity, enforcement, is_active |
| security_policies | Row-level security rules for data access | id, org_id, name, account_ranges, dimensions, project_codes, restricted_roles, masking_config |
| audit_logs | Immutable audit trail | id, org_id, user_id, action, entity_type, entity_id, changes (JSONB), ip_address, timestamp |
| delivery_endpoints | Output destination configs | id, org_id, type (api/mcp/gcs/s3/webhook), config (JSONB), is_active |

## Supabase Row-Level Security (RLS)
This is a major architectural advantage of Supabase. PostgreSQL RLS policies enforce data access at the database level, meaning even if someone bypasses the application layer and queries the API directly, they can only see data their role permits. For PipeLedger, this means:
- Organization isolation: Every query is automatically scoped to the user’s org_id. No cross-tenant data leakage is possible.
- Role-based data access: Viewers see pipeline status but not raw data. Operators see data but not security policy configs. Approvers see everything within their approval scope.
- Sensitive record redaction: Security policies defined in the security_policies table drive both the dbt RLS tagging models AND the Supabase RLS policies, ensuring consistency between the transformation layer and the application layer.

# GCP Service Map


| GCP Service | PipeLedger Usage | Estimated Monthly Cost (Bootstrap) |
| --- | --- | --- |
| Cloud Run (Web App) | Next.js frontend + API routes + MCP server. Min instances: 0, max: 3 | $15–50 |
| Cloud Run (Pipeline Worker) | TypeScript extraction jobs, export delivery. Triggered by Dagster/Pub/Sub | $10–40 |
| Cloud Run or GCE (Dagster) | Dagster webserver + daemon. Can run on small GCE instance ($7/mo) or Cloud Run | $7–30 |
| BigQuery | Staging tables, dbt transforms, output marts. On-demand pricing (first 1TB/mo free) | $0–20 (free tier covers MVP) |
| Cloud Storage (GCS) | Parquet/CSV output files, raw ERP data archival, dbt artifacts | $1–5 |
| Memorystore (Redis) | Pipeline state cache, rate limiting. Or use Upstash (serverless Redis) for $0 start | $0–25 |
| Cloud Pub/Sub | Event triggers: pipeline completion notifications, webhook fan-out | $0–5 |
| Secret Manager | Store ERP API keys, OAuth tokens, encryption keys | $0–1 |
| Cloud Build / Artifact Registry | Container builds for Cloud Run deployments | $0–5 |
| Cloud Monitoring + Logging | Pipeline observability, error alerting, audit log storage | $0 (free tier) |

Total estimated GCP cost for Month 1: $35–$100/month. BigQuery’s free tier (10GB storage + 1TB queries/month) covers the MVP easily. Cloud Run scales to zero when not in use. This is dramatically cheaper than running Kubernetes.

## Supabase Cost
Supabase Pro plan: $25/month. Includes 8GB database, 250 concurrent connections, 50GB bandwidth, unlimited auth users, and row-level security. This covers the MVP and early customers comfortably. Scale to Team plan ($599/mo) when you hit 25+ customers.

# MCP Server Architecture
The Model Context Protocol (MCP) server is a key differentiator — it lets Claude and other LLMs query PipeLedger’s transformed financial data natively, without the customer needing to build custom integrations.

## MCP Server Implementation
The MCP server runs as a set of Next.js API routes within the main web app Cloud Run service. It exposes financial data as MCP resources and tools that LLMs can discover and call:


| MCP Resource/Tool | What It Exposes | Example LLM Query |
| --- | --- | --- |
| resource: chart_of_accounts | Normalized CoA with account types, hierarchy, and descriptions | "What are the revenue accounts?" |
| resource: gl_movements | Period-level GL movements (transformed, no balances) | "Show me January expenses over $50K" |
| resource: trial_balance | Computed trial balance for any period | "What’s the trial balance for Q4 2025?" |
| tool: variance_analysis | Compare two periods, flag significant variances | "What changed between Dec and Jan?" |
| tool: spend_by_vendor | Procurement spend breakdown from Coupa/Ariba data | "Who are our top 10 vendors by spend?" |
| tool: search_transactions | Full-text search across GL with dimension filters | "Find all entries related to Project Alpha" |

Security: MCP requests are authenticated via API key tied to the organization. Row-level security policies apply to MCP responses — if a user’s API key has Operator-level access, executive compensation records are automatically redacted from MCP responses, just as they would be in the review UI.

# Development Workflow & Repository Structure

## Monorepo Structure


| Directory | Contents | Technology |
| --- | --- | --- |
| apps/web/ | Next.js app (frontend + API routes + MCP server) | TypeScript, React, Tailwind, shadcn/ui |
| apps/worker/ | Pipeline worker (ERP extraction + export delivery) | TypeScript, BigQuery SDK, GCS SDK |
| packages/dagster/ | Dagster pipeline definitions and sensors | Python, dagster, dagster-dbt |
| packages/dbt/ | dbt project (models, tests, macros, seeds) | SQL, dbt-core, dbt-bigquery |
| packages/shared/ | Shared types, utils, constants | TypeScript |
| packages/connectors/ | ERP connector implementations (NetSuite, Dynamics, SAP, Coupa, etc.) | TypeScript |
| infra/ | Terraform / Pulumi for GCP infrastructure | HCL / TypeScript |
| .github/workflows/ | CI/CD: build, test, deploy to Cloud Run | GitHub Actions YAML |

## CI/CD Pipeline
GitHub Actions handles the full deployment pipeline. On push to main: build Next.js app and worker containers, run dbt tests (dbt test against BigQuery dev dataset), run TypeScript unit tests, deploy containers to Cloud Run via gcloud CLI, run Dagster asset materialization check. Pull requests run the same checks but deploy to a staging environment.

## Local Development
Developers run the full stack locally using Supabase CLI (local Postgres + Auth), BigQuery sandbox dataset (free tier), dbt-core CLI for transform development and testing, Next.js dev server for the web app, and a lightweight Dagster dev instance. The dbt models can be developed and tested independently against BigQuery using dbt run and dbt test, making the transformation layer the fastest part of the stack to iterate on.

# Security Architecture


| Security Layer | Implementation | Details |
| --- | --- | --- |
| Authentication | Supabase Auth (JWT) | Email/password, magic links, OAuth providers. Enterprise SSO (SAML) available on Supabase Team plan. |
| Authorization | Supabase RLS + application middleware | Database-level enforcement. Five roles: Owner, Admin, Approver, Operator, Viewer. |
| Row-Level Security | Supabase RLS policies + dbt sec_rls_tags model | Dual enforcement: DB policies prevent unauthorized reads; dbt models tag records for UI redaction. |
| Data Encryption (at rest) | BigQuery (default AES-256) + Supabase (encrypted storage) | All data encrypted at rest by default on both platforms. |
| Data Encryption (in transit) | TLS 1.3 everywhere | Cloud Run enforces HTTPS. Supabase connections use SSL. BigQuery API calls encrypted. |
| Secrets Management | GCP Secret Manager | ERP API keys, OAuth tokens, webhook secrets stored encrypted. Accessed via IAM roles, not env vars. |
| Audit Logging | Supabase audit_logs table + GCP Cloud Logging | Every pipeline run, approval, data access, and config change logged with user, IP, timestamp, and changes. |
| Network Security | Cloud Run IAM + VPC connector (future) | Service-to-service auth via IAM. BigQuery accessed via service account, not public endpoint. |
| SOC 2 Readiness | Supabase (SOC 2 Type II) + GCP (SOC 2 Type II) | Both platforms are already SOC 2 certified. PipeLedger inherits their compliance for infrastructure. |


# Monthly Cost Projection


| Service | Month 1 (MVP) | Month 6 (25 customers) | Month 12 (80 customers) |
| --- | --- | --- | --- |
| Supabase (Pro → Team) | $25 | $599 |  |
| GCP Cloud Run (2 services) | $25–50 | $100–200 | $300–500 |
| GCP BigQuery | $0 (free tier) | $20–50 | $100–300 |
| GCP Cloud Storage | $1 | $5–10 | $20–50 |
| GCP Memorystore / Upstash Redis | $0 (Upstash free) | $10–25 | $25–75 |
| GCP Secret Manager | $0 | $1 | $1–5 |
| GCP Monitoring / Logging | $0 | $0–10 | $20–50 |
| Dagster (Cloud Run or GCE) | $7–15 | $15–30 | $30–75 |
| Cloudflare (DNS/CDN) | $0 (free plan) | $20 |  |
| GitHub (repo + Actions) | $0 | $4 | $20 |
| Domain + misc | $15 |  |  |
| TOTAL | $75–$110 | $215–$400 | $1,150–$1,710 |

At Month 12 with 80 customers at $1,250/mo average: $100K MRR vs. ~$1,500/mo infrastructure = 98.5% gross margin. This is SaaS-grade unit economics from day one because we’re leveraging managed services (Supabase, BigQuery) rather than running our own infrastructure.

# Migration Path: Supabase/Vercel → Final Stack
Since you’re currently on Supabase + Vercel, here’s the migration plan:


| Step | Action | Effort | When |
| --- | --- | --- | --- |
| 1 | Keep Supabase as-is (already on GCP region). No migration needed for Postgres or Auth. | 0 hours | Now |
| 2 | Set up GCP project, enable BigQuery, Cloud Run, Cloud Storage, Secret Manager | 2–4 hours | Week 1 |
| 3 | Create BigQuery datasets (staging, intermediate, marts, security, quality) | 1–2 hours | Week 1 |
| 4 | Initialize dbt project with dbt-bigquery adapter, create first staging model | 4–8 hours | Week 1–2 |
| 5 | Containerize Next.js app, deploy to Cloud Run (replaces Vercel) | 2–4 hours | Week 2 |
| 6 | Set up Dagster with dagster-dbt integration, define first pipeline asset graph | 4–8 hours | Week 2–3 |
| 7 | Build first ERP connector (NetSuite SuiteQL) as TypeScript worker | 20–40 hours | Week 2–4 |
| 8 | Connect Dagster: extract → BigQuery → dbt → GCS. Full pipeline working. | 8–16 hours | Week 3–4 |

Total migration effort: ~40–80 hours (1–2 weeks of focused work). The critical insight is that Supabase doesn’t need to be migrated at all — it stays as the operational layer. The migration is really about adding GCP services alongside it and moving off Vercel to Cloud Run.


END OF TECHNOLOGY STACK REFERENCE