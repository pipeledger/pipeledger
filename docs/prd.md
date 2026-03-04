# PipeLedger Product Requirements Document

PIPELEDGER AI
Product Requirements Document (PRD)
Audience: Contract developers building the MVP with Claude Code • March 2026

# 1. Product Overview
PipeLedger AI is a three-stage data pipeline that makes enterprise General Ledger data AI-ready. It ingests raw GL data from ERP systems (NetSuite first, then Dynamics 365 and SAP), transforms it using accounting domain knowledge encoded as dbt-core SQL models in BigQuery (balance decomposition, account taxonomy mapping, dimension denormalization, currency standardization, period alignment, context enrichment, row-level security tagging, and budget vs. actual integration), and delivers the result to LLMs and downstream systems via MCP server, REST API, and file export (Parquet/CSV). Every delivery requires explicit human approval through a dual-checkpoint workflow. Security is enforced at the BigQuery data layer via row-level access policies, not at the application layer.
Core value proposition: Making enterprise general ledger data AI-ready, row-level secured, and dimensionally enriched.

# 2. User Roles & Permissions


| Role | Permissions | Typical User |
| --- | --- | --- |
| Owner | Full access to all features. Can manage billing, delete organization, manage all users. Sees all GL data including sensitive records. | Founder, CFO |
| Admin | Configure connectors, schemas, security rules, documents, integrations. Cannot manage billing or delete org. Sees all GL data including sensitive records. | Controller, Finance Director |
| Approver | Review and approve/reject pipeline checkpoints (input review + output review). Can revoke delivered data. Sees data at their configured access level. | Senior Accountant, FP&A Manager |
| Operator | Run pipelines manually, view pipeline status, view activity logs. Cannot approve checkpoints or configure schemas. | Staff Accountant, Finance Analyst |
| Viewer | Read-only access to activity logs and pipeline status. Cannot run pipelines or view transformed data. | Auditor, external stakeholder |


Authentication: Supabase Auth (email/password + magic link). SSO via SAML is a future Enterprise feature. All application-level tenant isolation is enforced by Supabase PostgreSQL RLS — every query is automatically scoped to the user’s organization.








# 3. Feature Requirements

## 3.1 Stage 1: Ingest


| ID | Feature | Description | Priority |
| --- | --- | --- | --- |
| ING-01 | NetSuite GL Connector | Extract GL transactions, Chart of Accounts, departments, classes, locations, projects, custom segments, and subsidiary metadata via SuiteQL API. Paginated extraction with change-tracking (delta sync). Customer provides NetSuite credentials via OAuth or token-based auth. | P0 |
| ING-02 | FP&A Budget Import (CSV) | Upload budget/forecast data as CSV. Validate format: must include account, department, period, and amount columns at minimum. Store in BigQuery staging tables. Support multiple budget versions (original, re-forecast, scenarios). | P0 |
| ING-03 | FP&A Budget Import (API) | Connect to Pigment, Adaptive Planning, or Anaplan via REST API to pull budget data directly. Same validation and storage as CSV import. OAuth-based authentication. | P1 |
| ING-04 | Extraction Scheduling | Configure pipeline run frequency: manual trigger, daily (configurable time), every N hours, weekly. Dagster sensors and schedules orchestrate. Cron expression support for advanced users. | P0 |
| ING-05 | Input Review Checkpoint | After extraction, pipeline pauses. Approver sees: record count, extraction scope (entity, period), sample raw records (first 20), and a diff summary if this is a delta sync. Approver can approve or reject. Rejection stops the pipeline. Approval writes to review_checkpoints table and triggers transformation stage. | P0 |
| ING-06 | Dynamics 365 Connector | Extract GL via OData API. Same data objects as NetSuite: GL transactions, CoA, financial dimensions, departments, cost centers. | P1 |
| ING-07 | SAP S/4HANA Connector | Extract GL via RFC/BAPI or OData. GL transactions, CoA, profit centers, cost centers, financial dimensions. | P2 |
| ING-08 | CSV/Excel GL Upload | Manual upload of GL exports, trial balances, and CoA files for companies without API access or during initial onboarding. Format validation and column mapping UI. | P1 |

## 3.2 Stage 2: Transform


| ID | Feature | Description | Priority |
| --- | --- | --- | --- |
| TRN-01 | Balance Decomposition | dbt model: int_balance_decomposition. Strip opening/closing balances from GL exports, isolate period movements by account and dimension. ERP-specific logic (NetSuite YTD handling, SAP carry-forward, Dynamics first-period embedding). Fully automated — no customer input. | P0 |
| TRN-02 | Account Taxonomy Mapping | dbt model: int_account_normalization. Map company CoA to US GAAP / IFRS standard hierarchy using customer-approved mapping table stored in Supabase. Auto-suggest mappings with confidence scores. Customer QAs via the Schemas > Account Taxonomy Mapping UI. | P0 |
| TRN-03 | Dimension Denormalization | dbt model: int_dimension_flattening. Resolve hierarchical dimension codes into flat labeled paths. Auto-generate labels from parent-child hierarchy. Customer QAs via Schemas > Dimension Management UI. Output: every GL record carries self-describing dimension labels. | P0 |
| TRN-04 | Currency Standardization | dbt model: int_currency_conversion. Convert all amounts to reporting currency using period-end rates (balance sheet) and average rates (P&L). Tag original currency, converted amount, FX rate used, and functional vs. reporting distinction. Handle triangulation for non-USD base currencies. Fully automated. | P0 |
| TRN-05 | Period Alignment | dbt model: int_period_alignment. Normalize fiscal periods to calendar months or explicitly label custom fiscal calendars (4-4-5, non-December year-end). Auto-detect from NetSuite fiscal calendar config. Fully automated. | P0 |
| TRN-06 | Context Enrichment | dbt model: int_context_enrichment. Generate NL descriptions for every GL record using taxonomy mappings, dimension labels, amount patterns, and parsed company documents. This is the primary transformation that makes data LLM-comprehensible. Fully automated (uses approved mappings + active documents). | P0 |
| TRN-07 | Row-Level Security Tagging | dbt model: sec_rls_tags. Tag each GL record with security classification based on customer-defined rules (account ranges, dimension values, project codes). Rules stored in Supabase, applied during transformation, enforced at query time in BigQuery via native row-level access policies. | P0 |
| TRN-08 | Budget vs. Actual Join | dbt model: int_budget_vs_actual. Join FP&A budget to GL actuals by aligned dimensions. Compute: variance amount, variance %, favorability (favorable/unfavorable by account type), run-rate projection, period trend context. Requires customer to complete budget dimension mapping in Schemas UI. | P0 |
| TRN-09 | dbt Test Suite | dbt tests on every model: not_null on required fields, unique on primary keys, referential integrity between staging and intermediate, record count reconciliation (input = output), control total validation (sum of debits = sum of credits per period). | P0 |

## 3.3 Stage 3: Deliver


| ID | Feature | Description | Priority |
| --- | --- | --- | --- |
| DEL-01 | Output Review Checkpoint | After transformation, pipeline pauses. Approver sees: automated quality checks (balance decomposition verified, dimension mapping complete, currency normalization applied, record count reconciliation, period alignment, context enrichment applied, RLS applied, sensitive field masking). Data preview table with “Viewing as” role selector. Approve & Deliver or Reject buttons. | P0 |
| DEL-02 | MCP Server | TypeScript MCP SDK running in Next.js API routes. Expose financial data as MCP resources (chart_of_accounts, gl_movements, trial_balance, budget_variance) and tools (variance_analysis, spend_by_department, search_transactions). API key auth tied to org. RLS enforced: queries run at the requesting user’s access level in BigQuery. | P0 |
| DEL-03 | REST API | Next.js API routes serving JSON/JSONL. Endpoints: /gl/movements, /gl/accounts, /gl/budget-variance, /gl/projects. Pagination, filtering by period/account/department. API key + org scoping. BigQuery RLS enforced at query time. | P0 |
| DEL-04 | File Export (Parquet) | Generate Parquet files from BigQuery mart tables. Write to GCS bucket (customer-configurable). Include companion schema file describing each column’s accounting meaning. Trigger: after approved pipeline run or on schedule. | P1 |
| DEL-05 | File Export (CSV) | Generate flat CSV with enriched headers (column name + description). Write to GCS. Same trigger as Parquet. Download to client in .zip | P1 |
| DEL-06 | Delivery Revocation | Approver can revoke a previously approved delivery. Revocation: MCP server stops serving revoked dataset, API excludes it, file exports deleted from GCS. Audit trail records revocation with reason, user, timestamp. This is a safety net for incorrect data. | P0 |
| DEL-07 | Audit Trail | Immutable append-only table in Supabase: audit_logs. Records every extraction, approval, transformation, delivery, revocation, schema change, and user access event. Includes: timestamp, user, action, pipeline_id, record_count, details JSON. Exportable as CSV/JSON. | P0 |
| DEL-08 | RAG Vector Store Export | Export transformed data as chunked financial narrative with structured metadata for vector search applications. Write to configurable vector store endpoint. | P2 |

# 4. UI Pages & Tools


| Page | Key Components | Priority |
| --- | --- | --- |
| Home | Dashboard: pending review count, records processed today, last sync time, errors. Recent pipeline runs list. Connector health status. | P0 |
| Pipelines | Pipeline list table (name, source, delivery, schedule, status, records). Create Pipeline wizard: select connector → configure scope → select delivery → set schedule. Pipeline detail view with run history. | P0 |
| Data Review | Left panel: review queue (pending checkpoints). Right panel: quality check grid, data preview table with “Viewing as” role selector, Approve & Deliver / Reject buttons. Input review and output review views. | P0 |
| Connectors | ERP connectors section (connected + available). FP&A / Budget sources section. Connector setup wizard (credentials, data scope, test connection). Sync Now and status indicators. | P0 |
| Schemas > Core Transformations | Scrollable list of all 8 transformations as cards in fixed order: Balance Decomposition, Account Taxonomy Normalization, Dimension Denormalization, Currency Standardization, Period Alignment, Context Enrichment, Row-Level Security Tagging, Budget vs. Actual Integration. Each card shows: name, color-coded ownership tag (green SYSTEM-MANAGED, amber CUSTOMER-MAPPED, blue CUSTOMER-DEFINED), 1–2 sentence description, last run status with timestamp and record counts in/out, version indicator, and ERP compatibility badges. Action buttons differ by ownership: SYSTEM-MANAGED transforms show "View Details" (read-only panel with dbt model name, last run log, warnings); CUSTOMER-MAPPED transforms show "Open Mapping UI" (navigates to Account Taxonomy Mapping or Dimension Management sub-tab); CUSTOMER-DEFINED transforms show "Configure" (opens inline panel — RLS rule builder for security tagging, budget dimension selector for budget integration). | P0 |
| Schemas > Account Taxonomy Mapping | Two-column mapping interface: company accounts (left) → standard taxonomy (right). Auto-suggested mappings with confidence scores. Search, filter, bulk mapping, “Show unmapped only”. Approval workflow with version control. | P0 |
| Schemas > Dimension Management | Hierarchy tree view (left panel). Label editor (right panel): ERP code, ERP name, auto-generated label path, override label, LLM context description. Preview showing how a GL record looks before/after denormalization. | P0 |
| Schemas > Budget Dimension Mapping | Two-column mapping: FP&A dimensions (left) → GL dimensions (right). Same pattern as taxonomy mapping: auto-suggest, confidence scores, approval. | P0 |
| Activity | Filterable audit log table: timestamp, pipeline, event, status, records, duration, user, details. Export Audit Log button. Filters: status, pipeline, connector, date range. | P0 |
| Settings > Organization | Organization name, industry, reporting currency, fiscal year end, accounting standard, default delivery format. | P0 |
| Settings > Users | User table with role management. Role descriptions. | P0 |
| Settings > Delivery Endpoints | MCP Server config (endpoint URL, API key). REST API config (base URL, API keys). File Export config (GCS bucket, format, schedule). RAG Vector Store config (future). | P0 |
| Settings > Documents | PDF upload with drag-and-drop. Document list: name, type, page count, snippet count, parsed date, active/inactive toggle. Preview Snippets button. Deactivate/Activate controls. | P1 |
| Settings > Integrations | Connected integrations list (Pigment, etc.). Available integrations (Adaptive, Anaplan, Notion). OAuth connection flows. | P1 |
| Settings > Audit & Controls | Review policy selector (dual checkpoint vs output only). RLS rule builder (account ranges, dimensions, project codes, access levels). Data retention config. Compliance toggles. | P0 |
| Settings > Billing | Current plan, usage metrics (connectors, users, records, runs). Upgrade button. | P1 |


# 5. Non-Functional Requirements


| Category | Requirement | Target |
| --- | --- | --- |
| Performance | Pipeline execution time (extraction + transformation + quality checks) for 1M GL records | < 5 minutes end-to-end |
| Performance | MCP server / API response time for summary queries (trial balance, budget variance) | < 2 seconds (p95) |
| Performance | MCP server / API response time for detailed queries (account-level movements) | < 5 seconds (p95) |
| Scalability | Maximum GL records per pipeline run | 10M records |
| Scalability | Concurrent pipeline runs per organization | 3 simultaneous |
| Availability | Uptime SLA for MCP server and API endpoints | 99.9% (monthly) |
| Security | Application tenant isolation | Supabase PostgreSQL RLS (every query scoped to org) |
| Security | Financial data record-level security | BigQuery native row-level access policies (enforced at query time) |
| Security | Data in transit | TLS 1.3 on all endpoints |
| Security | Data at rest | BigQuery and GCS default encryption (Google-managed keys). Customer-managed keys (CMEK) as Enterprise feature. |
| Security | Authentication | Supabase Auth (email/password, magic link). SSO/SAML as Enterprise feature. |
| Compliance | Audit trail immutability | Append-only audit_logs table. No UPDATE or DELETE operations permitted. |
| Compliance | Data retention | Configurable: 1–7 years. Default 7 years for audit trail. |
| Compliance | SOC 2 Type II readiness | Architecture designed for SOC 2. Certification targeted Month 10–12. |

# 6. Explicitly Out of Scope


| Excluded Feature | Rationale |
| --- | --- |
| Sub-ledger processing (AP, AR, Inventory, Payroll) | v1 is GL-only. Sub-ledgers add integration complexity without proportional value for the core LLM-readiness use case. |
| Intercompany elimination logic | CFO can use existing tools (FloQast, BlackLine) for consolidation. PipeLedger delivers enriched entity-level data; elimination is downstream. |
| Audit preparation workflows | Audit prep is a workflow tool problem (Workiva, FloQast), not a data transformation problem. |
| Financial close management | Month-end close task management is out of scope. PipeLedger secures and enriches the GL output; it does not manage the close process. |
| Anomaly detection / fraud scoring | PipeLedger is an enrichment layer, not an enforcement or detection tool. Anomaly detection is downstream. |
| Accounting advice or liability | PipeLedger transforms data. It does not determine accounting standards, classify transactions, or assert correctness. |
| Scenario planning / forecasting engine | The LLM performs scenario analysis using PipeLedger’s enriched data. PipeLedger provides the data, not the analysis. |
| Notion connector (v1) | Year 2+ roadmap. Qualitative context enrichment via Notion is valuable but not required for MVP. |
| Real-time streaming (v1) | v1 uses batch extraction on configurable schedules. Real-time CDC/streaming is Year 2+. |

