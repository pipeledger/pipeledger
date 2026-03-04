# PipeLedger Business Plan

Making Enterprise General Ledger Data
AI-Ready, Row-Level Secured & Dimensionally Enriched
Business Plan
Capitani Inc. • February 2026
CONFIDENTIAL

# 1. Executive Summary
PipeLedger AI is the financial data intelligence layer between enterprise ERP systems and the AI era. The company solves a specific, high-value problem: Enterprise Resource Planning systems were designed for human accountants, not for AI consumption. When companies feed raw General Ledger data to LLMs, the results are unreliable and often dangerous — models misinterpret cumulative balances as period movements, cannot decode account numbers without context, mix currencies across entities, and have no way to distinguish sensitive executive compensation from routine operating expenses.

Making enterprise general ledger data AI-ready, row-level secured, and dimensionally enriched.

PipeLedger solves this with a three-stage pipeline: Ingest raw GL data from the ERP via typed connectors (NetSuite SuiteQL, Dynamics 365 OData, SAP RFC). Transform the data using eight core financial transformations encoded as versioned dbt-core SQL models running in BigQuery — balance decomposition, account taxonomy normalization, dimension denormalization, currency standardization, period alignment, context enrichment, row-level security tagging, and budget-vs-actual integration. Deliver the result — clean, contextualized, and access-controlled — to LLMs via MCP server, REST API, or file export (Parquet/CSV). Every delivery requires explicit human approval through a dual-checkpoint workflow, and security is enforced at the BigQuery data layer via native row-level access policies.
Strategic positioning: PipeLedger is the metered infrastructure layer for autonomous finance systems. The subscription floor grows linearly with customer count. The usage component — driven by Financial Intelligence Queries (FIQ) from AI agents — grows exponentially as agent adoption accelerates. A single customer may have 5 human users but 50 AI agents querying PipeLedger, each consuming FIQ. This positions PipeLedger’s revenue to scale with the AI agent economy without requiring proportional growth in human users.
The company is founded by Alexander Ronningen, a finance executive with 10+ years at the intersection of accounting, data architecture, and enterprise technology. Alexander built the exact infrastructure PipeLedger productizes — dbt + BigQuery + Dagster pipelines inside a finance function that scaled from $45M to $180M ARR through IPO on Oslo Stock Exhange and a $1.7B Goldman Sachs acquisition at Kahoot! Group. The combination of CFO-level accounting expertise and hands-on technical data architecture skills is vanishingly rare and is the reason this product can exist.






# 2. The Problem

## 2.1 ERPs Were Designed for Humans, Not AI
Every mid-market and enterprise company stores its financial truth in an ERP system. The General Ledger inside that ERP is the canonical record of every dollar that moves through the business. But the GL was designed to produce financial statements for human readers, not structured data for machine reasoning. When companies attempt to use LLMs with their financial data today, they encounter six fundamental problems:

| Problem | What Happens | Impact |
| --- | --- | --- |
| Cumulative Balances | NetSuite exports GL with opening + closing balances. LLMs cannot distinguish cumulative from period movements. | LLM reports “Revenue was $12M” when actual period revenue was $2M (the $12M was YTD). CFO loses trust immediately. |
| Encoded Dimensions | GL lines reference account codes (4100), department IDs (200), class IDs (10). LLMs have no way to decode these. | LLM cannot answer “What did Engineering spend?” because it doesn’t know Department 200 = Engineering. |
| No Context | Raw GL data has no natural language describing what accounts or dimensions represent. | LLM treats $500K exec compensation the same as $500K cloud hosting — completely different business implications. |
| Currency Mixing | Multi-entity companies have transactions in USD, EUR, GBP. Raw exports mix currencies. | LLM adds $100K USD + €80K EUR as $180K. Mathematically and financially wrong. |
| No Security | Raw GL exports include all data — exec compensation, M&A costs, board entries. | Department head asking about their budget accidentally sees CEO compensation. Data governance violation. |
| No Budget Link | Actuals in ERP; budgets in FP&A system. Different dimension names, different structures. | The #1 CFO question (“Where are we vs. budget?”) requires hours of manual alignment before an LLM can attempt it. |


## 2.2 The Market Opportunity
The convergence of two forces creates PipeLedger’s market: enterprise AI adoption in finance is accelerating (78% of CFOs plan to deploy AI in financial workflows by 2027, per Gartner), and LLM capabilities are expanding rapidly. The missing piece is the data preparation layer. For a mid-market finance team of 3–8 people, manual data preparation workflows consume an estimated 60–130 hours per month of professional time. At a fully loaded cost of $75–$150/hour, this represents $4,500–$19,500 per month in labor costs spent on data preparation rather than analysis. PipeLedger at $2,000/month pays for itself within the first week.
More critically, the rise of autonomous AI agents transforms the unit economics of financial data consumption. Today, 3 human users might query financial data 500 times per month. Tomorrow, those same 3 humans plus 10 AI agents (Claude for board reporting, GPT for expense analysis, custom agents for cash flow forecasting) will generate 50,000+ queries per month. PipeLedger’s FIQ-based usage model captures this exponential growth.

# 3. The Solution: A Three-Stage Pipeline
PipeLedger is a focused product with a clear boundary: Ingest the General Ledger and its companions (Chart of Accounts, dimensions, projects, budget data), Transform the data using deep accounting domain knowledge, and Deliver the result — clean, contextualized, and security-controlled — to LLMs and downstream systems.

| Stage | What It Does | Technology | Customer Role |
| --- | --- | --- | --- |
| 1. Ingest | Extract GL transactions, CoA, dimensions, project records from ERP. Import budget data from FP&A system. | TypeScript connector (SuiteQL for NetSuite), CSV import for budgets, Dagster orchestration | Provides credentials, selects data scope, approves extracted data at input checkpoint |
| 2. Transform | Apply 8 core transformations: balance decomposition, account taxonomy mapping, dimension denormalization, currency standardization, period alignment, context enrichment, RLS tagging, budget-vs-actual join. | dbt-core running SQL models in BigQuery. Declarative, versioned, testable. | Maps CoA to standard taxonomy, reviews dimension labels, defines security rules, approves output |
| 3. Deliver | Serve transformed data via MCP server (native Claude/LLM integration), REST API (JSON/JSONL), file export (Parquet/CSV). All channels enforce row-level security. | TypeScript MCP SDK, Next.js API routes, BigQuery → GCS export | Configures delivery endpoints, manages API keys, controls access via role-based security |


Scope discipline: PipeLedger does GL extraction, Chart of Accounts normalization, dimension denormalization, GL-level transformations, row-level security, FP&A budget integration, and multi-format delivery. PipeLedger does NOT do sub-ledger processing (AP, AR, inventory), intercompany eliminations, audit preparation, financial close management, or accounting advice. These are served by existing tools (FloQast, Workiva, BlackLine). This discipline is intentional — by staying focused on the GL-to-AI pipeline, we build depth of expertise in the hardest part of the problem rather than breadth across adjacent features.

# 4. Transformation Engine: The Core IP
The transformation engine is PipeLedger’s core intellectual property. Each transformation encodes deep accounting domain knowledge that requires years of ERP experience to develop. The engine runs as dbt-core SQL models inside BigQuery, making the logic declarative, version-controlled, testable, and inspectable. All eight transformations execute in a strict layered architecture: staging → intermediate → security → marts. No model skips layers. Every column in the output mart can be traced back through the exact chain of dbt models to the original raw ERP field.

| Transformation | What It Does | Why It’s Hard |
| --- | --- | --- |
| Balance Decomposition | Strips opening/closing balances; isolates period-over-period movements by account and dimension | Every ERP exports differently: NetSuite includes YTD, SAP includes carry-forward, Dynamics embeds opening in first period. Custom segments behave differently. |
| Account Taxonomy Mapping | Maps company’s proprietary CoA to standard US GAAP / IFRS hierarchy using customer-approved rules | Account numbering, hierarchy depth, and type classification vary across every ERP and company. Requires mapping UI with customer review and approval. |
| Dimension Denormalization | Resolves hierarchical dimension codes into flat labeled paths on every GL record | LLMs reason dramatically better with flat, context-rich records. Hierarchies must be resolved, labeled, and customer-reviewed. |
| Currency Standardization | Converts all amounts to reporting currency; tags original currency, rate, functional vs. reporting | Must handle triangulation (non-USD base), historical rates for BS, average rates for P&L. Edge cases in multi-subsidiary environments. |
| Period Alignment | Normalizes fiscal periods to calendar months or labels custom fiscal calendars (4-4-5) | LLMs assume calendar months. A company on July year-end with 4-4-5 periods will confuse any model without explicit labeling. |
| Context Enrichment | Adds NL descriptions to every GL record based on account type, dimensions, amount patterns, and company documents | Transforms “Acct 4100, Dept 200, $124K CR” into “SaaS Subscription Revenue, Engineering, $124K recognized January 2026.” Single biggest improvement to LLM output quality. |
| Row-Level Security | Tags each GL record with security classification based on customer-defined rules | Must integrate with BigQuery’s native row-level access policies so security is enforced at the data layer, not the application layer. |
| Budget vs. Actual Join | Joins FP&A budget data to GL actuals by aligned dimensions; computes variance, favorability, run-rate | FP&A systems use different dimension names than the ERP. Alignment requires a mapping UI identical to the taxonomy mapping pattern. |


## 4.1 Domain Knowledge Tiers
PipeLedger applies domain knowledge in three tiers. Tier 1 — Structural Knowledge (hardcoded in dbt models): how each ERP stores and exports GL data, the rules for decomposing cumulative balances, the mapping between NetSuite’s internal transaction types and standard accounting entries. An AI tool cannot replicate this without extensive ERP experience. Tier 2 — Accounting Standards Knowledge (configurable templates): the standard US GAAP / IFRS account taxonomy, industry-specific templates (SaaS, manufacturing, professional services). Tier 3 — Company-Specific Knowledge (customer-configured via UI): account taxonomy mappings, dimension label overrides, security policies, budget dimension alignments, company document context. PipeLedger never assumes company-specific knowledge — the customer configures everything, and the dual-review checkpoint ensures human validation before delivery.

## 4.2 Context Enrichment from Company Documents
PipeLedger’s Settings page includes a document upload interface where customers provide company-specific knowledge sources (strategy documents, accounting procedures, org charts) that feed directly into the enrichment engine during transformation. When an LLM sees $450K in Account 4100 (SaaS Revenue), it knows from the strategy document that the company has three product lines and is in a growth investment phase — so it can contextualize revenue trends against stated strategy. This is optional but when used, it dramatically improves LLM comprehension of company-specific financial patterns.


# 5. Technology Platform
PipeLedger runs as four services inside a monorepo, deployed to Google Cloud Platform. All services share a single TypeScript codebase for type safety and code reuse, but deploy as separate containers with distinct responsibilities and independent scaling.

| Service | Runtime | Responsibility | Scaling |
| --- | --- | --- | --- |
| Web App | Cloud Run (Next.js 14) | Frontend UI, REST API routes, Supabase client, webhook handlers. All UI pages: Home, Pipelines, Data Review, Connectors, Schemas, Activity, Settings. | 0 → N instances (auto-scale, scale to zero) |
| MCP Server | Cloud Run (TypeScript) | Dedicated MCP endpoint serving financial data to Claude and LLMs via Model Context Protocol. Reads from BigQuery marts. Enforces RLS at query time. | 0 → N instances (independent of web traffic) |
| Pipeline Worker | Cloud Run Jobs (TS) | ERP extraction (SuiteQL, OData), FP&A import, document parsing, file export generation (Parquet/CSV to GCS). Triggered by Dagster. | 1 instance per job (Dagster manages concurrency) |
| Orchestration | Dagster Cloud | Pipeline DAGs: extract → load → dbt run → checkpoint → deliver. Schedules, sensors, native dbt integration via dagster-dbt. | Managed (Dagster Cloud) |


## 5.1 Two-Layer Security Architecture
Layer 1 — Supabase RLS (Application Security): Supabase’s PostgreSQL row-level security enforces tenant isolation at the database engine level. Every query to the operational database is automatically scoped to the user’s organization. A user in Organization A can never read, write, or even detect the existence of Organization B’s data. Application bugs cannot bypass it.
Layer 2 — BigQuery RLS (Financial Data Security): The actual GL data lives in BigQuery. Row-level security for sensitive records (executive compensation, M&A projects) is enforced via BigQuery’s native row-level access policies. These are defined by the customer through PipeLedger’s security configuration UI, applied by the sec_rls_tags dbt model during transformation, and enforced at query time. When the MCP server serves data, BigQuery physically excludes rows the user is not authorized to see — even if someone bypasses the API.

## 5.2 Dual-Checkpoint Approval Workflow
No transformed GL data reaches an LLM or any external system without explicit human approval. After extraction, an Approver reviews record counts, extraction scope, and sample data. After transformation, the Approver sees automated quality checks (balance decomposition verified, dimension mapping complete, currency normalization applied, record count reconciliation, RLS applied) and previews data using a “Viewing as” role selector to see exactly what each role level will see. Only after approval does data become available to configured delivery endpoints. If data is shipped incorrectly, the Approver can immediately revoke the delivery — MCP stops serving, API excludes it, file exports are deleted.

## 5.3 Data Model Architecture
PipeLedger uses two databases with distinct responsibilities. Supabase PostgreSQL stores operational data (21+ tables covering identity, pipeline configuration, review/approval/delivery, transformation configuration, documents, and immutable audit trail). BigQuery stores financial data organized into per-organization isolated datasets: {org_id}_raw (raw ERP extracts), {org_id}_transform (dbt intermediate outputs), and {org_id}_mart (business-ready output tables). A shared dataset (pipeledger_shared) holds global reference data including GAAP/IFRS taxonomy, FX rates, and industry templates.
The four mart tables — mart_gl_movements (primary output), mart_chart_of_accounts, mart_budget_variance, and mart_project_profitability — are queried by the MCP server, REST API, and file export. BigQuery row-level access policies are applied to all mart tables.

## 5.4 Error Handling Philosophy
PipeLedger uses a hybrid error strategy: auto-retry with exponential backoff for transient infrastructure errors (ERP timeouts, BigQuery quota, GCS write failures) and fail-fast with no retry for data integrity errors (dbt test failures, record count mismatches, control total imbalances, schema drift). If any dbt model or test fails, the entire transformation is rolled back — no partial transforms. If delivery fails partway through, all successful deliveries for that run are revoked. Delivery is atomic across all configured endpoints. All logging uses a strict data allow-list — financial data never appears in logs, error tracking, or monitoring systems.

## 5.5 Infrastructure Cost

| Phase | Monthly Cost | Key Components | Note |
| --- | --- | --- | --- |
| Month 1 (MVP) | $75–$110 | Supabase Pro $25, Cloud Run $25–50, BigQuery $0 (free tier), GCS $1 | BigQuery free tier covers MVP easily |
| Month 6 (25 customers) | $215–$400 | Supabase $25, Cloud Run $100–200, BigQuery $20–50, Dagster $15–30 | Infrastructure scales linearly |
| Month 12 (80 customers) | $1,150–$1,710 | Supabase Team $599, Cloud Run $300–500, BigQuery $100–300, Dagster $30–75 | ~$1,500/mo against ~$100K MRR = 98.5% gross margin |


# 6. Commercial Model: Subscription + Usage
PipeLedger operates on a subscription-plus-usage revenue model designed to capture both predictable recurring revenue and exponential upside from AI agent adoption. Revenue has three components: (1) Subscription — monthly platform fee based on plan tier. (2) FCU Overage — Financial Compute Units consumed beyond the plan’s allocation, metered by rows extracted, transformed, and stored. (3) FIQ Overage — Financial Intelligence Query units consumed beyond the plan’s allocation, metered by weighted human and agent interactions with financial data.

## 6.1 Plan Comparison

| Feature | Premium ($2K/mo) | Pro ($5K/mo) | Enterprise ($10K+/mo) |
| --- | --- | --- | --- |
| Users | Up to 3 | Up to 5 | Unlimited |
| ERP connectors | 1 | 2 | Unlimited |
| FCU included (rows/mo) | 500,000 | 2,000,000 | Custom (negotiated) |
| FIQ included (queries/mo) | 2,000 | 10,000 | Custom (negotiated) |
| API keys (AI agents) | 2 | 10 | Unlimited |
| Review workflow | Output review only | Dual checkpoint (input + output) |  |
| Security rules | Basic RLS (account-level) | Full RLS (account + dimension + project) | Full RLS + custom policies |
| Support | Email (48hr) | Priority email (24hr) | Dedicated support + SLA |
| SSO / SAML | Not available | Included |  |
| SOC 2 report access | Not available | Available under NDA | Included |


## 6.2 Usage Metering: FCU and FIQ
FCU (Financial Compute Units): 1 FCU = 1 ERP row extracted, transformed, secured, and stored. FCU captures the full cost of processing: API calls, BigQuery compute, dbt execution, and storage. Overage pricing is tiered: $2.00/1K for the first 1M over allocation, $1.50/1K for 1M–5M, $1.00/1K for 5M–20M. Internal COGS per 1M FCU: $0.23–$0.70, yielding 65–88.5% gross margin on FCU overage.
FIQ (Financial Intelligence Queries): FIQ is the strategic revenue scaling mechanism. Every time a human or AI agent queries PipeLedger’s data, the interaction consumes FIQ weighted by complexity (1 FIQ for a simple read, 5 for LLM-enriched summary, 20+ for agentic multi-step workflows). At $40/1K FIQ, gross margin is 75–87.5%. FIQ is the metric that captures exponential AI agent adoption value — a customer with 3 humans might consume 500 FIQ/month; the same customer with 5 AI agents might consume 50,000 FIQ/month.

## 6.3 Revenue Model Scenarios

| Metric | Premium | Pro (Agent-Heavy) | Enterprise | Blended Avg. |
| --- | --- | --- | --- | --- |
| Monthly revenue | $2,600 | $8,700 | $20,600 | $10,633 |
| Subscription % of revenue | 77% | 57% | 73% | 66% |
| FCU overage % | 23% | 32% | 12% | 21% |
| FIQ overage % | 0% | 11% | 15% | 13% |
| Annualized | $31,200 | $104,400 | $247,200 | $127,600 |


Key insight: Subscription revenue provides the floor (66% blended), but usage revenue (34% blended) is the growth driver. In the enterprise scenario, FIQ overage alone ($3,100/mo) exceeds the entire Premium subscription ($2,000/mo). As AI agent adoption increases, FIQ grows disproportionately — validating the thesis that PipeLedger’s revenue scales with AI agent adoption even when human user count stays flat.

## 6.4 Billing Infrastructure
Chargebee handles subscription management, payment processing, invoicing, tax calculation, and revenue recognition. Subscriptions billed at start of month; usage overages billed at end of month via metered billing items pushed from Dagster-aggregated usage events stored in Supabase. Payment failure triggers a graceful degradation path: 7-day auto-retry, 14-day read-only mode, 30-day suspension, 120-day termination with 90-day data retention window.

# 7. Competitive Landscape & Defensibility

| Category | Examples | Why They Don’t Solve This |
| --- | --- | --- |
| Generic ETL | Fivetran, Airbyte | Move data without financial domain logic. They replicate GL as-is: raw codes, cumulative balances, mixed currencies. Data arrives in warehouse but LLMs still can’t use it. |
| Unified Accounting APIs | Codat, Railz (FIS) | Serve banks/fintechs for lending decisions. Wrong customer (banks, not CFOs), wrong use case (credit scoring, not AI analysis), wrong depth (normalized for lending, not enriched for LLM comprehension). |
| AI-Native ERPs | Rillet, Campfire | Replace legacy ERPs entirely. A company running NetSuite isn’t switching ERPs for AI — they want AI on top of their existing ERP. |
| Close Management | Numeric, FloQast, BlackLine | Focus on human month-end close workflow. Don’t prepare data for LLM consumption or provide MCP/API delivery for AI agents. |
| FP&A Platforms | Pigment, Adaptive, Anaplan | Own budgeting/forecasting. Don’t transform GL data or serve it to LLMs. PipeLedger integrates with them as a data source. |
| LLMs Directly | Claude, GPT-4 | Can build connectors (the 20%) but cannot build transformation logic (the 80%). They don’t know NetSuite’s balance includes YTD carryover or that account 6110 is exec comp. |


## 7.1 Defensibility Moats
Transformation logic = 80% of the value. AI tools can build ERP connectors. They cannot build the financial domain knowledge encoded in the transformation layer. This expertise comes from decades of working inside these systems.
Configuration stickiness. Once a customer maps their CoA, configures dimension labels, defines security policies, and sets up budget alignment, they have invested significant time in PipeLedger’s configuration. This is version-controlled and becomes more valuable over time. Switching costs are high.
AI agent dependency. When 10+ AI agents across an organization depend on PipeLedger as their financial data source, the platform becomes infrastructure — as critical as the ERP itself. Ripping out PipeLedger means reconfiguring every agent’s data access.
Template network effects. As PipeLedger serves more customers, the standard taxonomy improves, industry templates become more accurate, and auto-suggestion confidence scores increase. Each new customer benefits from aggregate learning without sharing proprietary data.

# 8. Compliance & Enterprise Readiness
PipeLedger is designed to audit-grade standards from day one. The Security, SOC 2 & SOX Compliance Framework covers the complete security architecture and internal controls aligned with SOC 2 Type II Trust Services Criteria and SOX Section 404 IT General Controls.

## 8.1 SOC 2 Type II Scope
All five Trust Services Criteria are in scope: Security (CC1–CC9, mandatory), Availability (A1 — MCP/API uptime), Processing Integrity (PI1 — core to value proposition: deterministic, reconcilable transformations), Confidentiality (C1 — multi-tenant isolation, RLS), and Privacy (P1 — evaluated for first report). SOC 2 Type II certification is targeted for Month 10–12.

## 8.2 SOX Section 404 Alignment
PipeLedger’s customers include companies subject to SOX or preparing for IPO. IT General Controls are implemented across all four ITGC domains: Access Management (Supabase RLS, role-based access, API key management, quarterly access reviews), Change Management (GitHub branch protection, CI/CD with canary deployment, dbt/ and sec/ branch prefixes for high-risk changes), Computer Operations (Dagster orchestration, canary monitoring, auto-rollback), and Data Backup and Recovery (quarterly recovery testing, Supabase point-in-time recovery, BigQuery cross-region replication). IT Application Controls include dbt test suites (reconciliation checks, control totals), dual-checkpoint approval, gl_export_versions tracking, and immutable audit trail.

## 8.3 Key Security Controls

| Control | Implementation |
| --- | --- |
| Tenant isolation | Supabase RLS (application DB) + BigQuery dataset isolation + row-level access policies (financial data). Cross-tenant leakage is impossible at the database engine level. |
| Encryption | AES-256 at rest (GCP default), TLS 1.2+ in transit, GCP Secret Manager for all credentials. Customer-managed keys (CMEK) available for Enterprise. |
| Audit trail | Immutable append-only audit_logs table in Supabase. 7-year retention. Records every extraction, approval, transformation, delivery, revocation, and data access event. |
| Data integrity | dbt tests on every pipeline run: not_null, unique, referential integrity, record count reconciliation (in = out), control totals (debits = credits). No partial transforms. |
| Log safety | Strict allow-list: financial data never appears in logs, error tracking, or monitoring. sanitizeForLog() enforced on all log output. |
| Network security | GCP VPC, Cloud Armor DDoS protection, annual penetration testing, Dependabot dependency scanning. Critical vulnerabilities patched within 7 days. |


# 9. Go-to-Market Strategy

## 9.1 Target Customer
Primary buyer: CFO or Controller at a mid-market technology company ($50M–$1B revenue) running NetSuite. They have 3–10 people on the finance team, use an FP&A tool, and are actively evaluating AI. They are frustrated that every attempt to use Claude or GPT with financial data produces unreliable results. Secondary buyer: Engineering Managers building agentic financial solutions, often referred to by CFO/Finance or vice versa. The strategic objective is to monetize agent-driven financial intelligence at scale. Tertiary buyer: VP of Finance at larger companies ($1B–$5B) on Dynamics 365 or SAP who need GL data enriched for AI-powered board reporting.

## 9.2 Value position
Making enterprise general ledger data AI-ready, row-level secured, and dimensionally enriched.

## 9.3 Revenue Expansion Signals
Usage data drives proactive commercial actions. Key signals monitored: FCU overage > 50% of allocation for 3+ months triggers upgrade recommendation; FIQ overage growing month-over-month signals AI agent adoption acceleration; new API key creation signals agent expansion; FIQ near zero for 30+ days is a critical churn risk. Each customer’s usage dashboard shows real-time FCU and FIQ consumption vs. allocation, daily trends, usage by actor (human vs. agent), and usage by pipeline — building trust in the billing model and driving self-serve upgrades.

# 10. What Becomes Possible

| Use Case | How PipeLedger Enables It |
| --- | --- |
| Monthly Close: Secured & Delivered | RLS automatically redacts sensitive records. Dual-checkpoint ensures human approval. CFO confidently shares financial data with LLMs knowing security is enforced at the data layer and every delivery is auditable. |
| Investor & Board Reporting | AI generates first draft of board deck financial sections: revenue by segment with variance commentary, expense analysis by department with budget comparison. Finance team refines in 2–4 hours instead of 20–40. |
| Budget vs. Actual Intelligence | CFO asks Claude via MCP: “Where are we most over budget?” Claude accesses pre-joined data, identifies top variances, explains each with magnitude, direction, run-rate implication, and period trend. Available in seconds. |
| Project Profitability | Real-time project P&L by joining GL lines tagged with project dimension to project metadata. Services companies see project margin, budget utilization, and cost trends during the project lifecycle. |
| Autonomous Agent Infrastructure | PipeLedger becomes the trusted Level 1 data layer that enables Level 2 analysis agents, Level 3 decision agents, and Level 4 execution agents. Sales forecasting, procurement, HR planning, and IR agents all operate on clean, validated, security-controlled data. |
| General Productivity | Engineers query cloud costs via Claude Code. Department heads pull actuals via API. Product managers build revenue dashboards. Data scientists export Parquet for ML. All within CFO-defined security boundaries, without finance becoming a bottleneck. |


# 11. Financial Projections

## 11.1 Year 1 Revenue Build

| Quarter | Months | Customers | Avg. MRR | Quarterly Rev. | Cumulative ARR |
| --- | --- | --- | --- | --- | --- |
| Q1 | 1–3 | 0 (building MVP) | $0 |  |  |
| Q2 | 4–6 | 5 paying | $2,600 | $39K | $156K |
| Q3 | 7–9 | 25 paying | $3,500 | $263K | $1.05M |
| Q4 | 10–12 | 80 paying | $4,200 | $1.01M | $4.03M |


Note: Average MRR increases over time as customers adopt more AI agents (driving FIQ overage) and process more data (driving FCU overage). Year 1 projections reflect the updated commercial framework with subscription + usage model rather than flat subscription pricing.

## 11.2 Unit Economics

| Metric | Target | Rationale |
| --- | --- | --- |
| Gross margin (subscription) | > 95% | Nearly pure margin. Infrastructure cost fixed and shared. |
| Gross margin (FCU overage) | 65–88% | BigQuery compute + ERP API costs. Improves with volume. |
| Gross margin (FIQ overage) | 75–88% | BigQuery scans + LLM token cost. Read-only = high margin. |
| Blended gross margin (M12) | 94–98.5% | Infrastructure SaaS economics on managed services. |
| Net dollar retention | > 120% | FCU + FIQ overage growth exceeds churn. Agent adoption is primary NDR driver. |
| Logo churn | < 5% monthly | Monthly billing risk offset by config stickiness + agent dependency. |
| ARPA | $2,600 (Y1) → $8,000+ (Y2) | Year 1 skews Premium. Year 2: agent adoption drives FIQ growth. |
| LTV (36-mo, 5% churn) | $18K–$22K | Conservative. Improves as NDR exceeds 100%. |
| CAC payback | < 6 months | Low-touch (Premium/Pro self-serve). Enterprise requires sales. |
| LTV:CAC | > 3:1 targeting 5:1+ | Config stickiness + agent dependency = durable retention. |


# 12. Fundraising & Milestones

| Phase | Timeline | Capital | Milestones |
| --- | --- | --- | --- |
| Bootstrap | Months 1–3 | $10K (founder) | Core transformation engine, NetSuite connector, basic UI, first 3 design partners |
| Pre-Seed | Months 2–5 | $40K | Full MVP: dual-review workflow, taxonomy mapping UI, MCP server, 5 paying customers |
| Angel Round | Month 6 | $1M | Working product with traction. RLS live. Budget integration. 25 customers. SOC 2 readiness. |
| Seed Round | Month 18 | $3–5M | $1M+ ARR, 80+ customers, SOC 2 Type II certified, 4+ ERP connectors, team of 8–10 |


# 13. Team

## Alexander Ronningen — Founder & CEO
10+ years of finance leadership at the intersection of accounting, data architecture, and enterprise technology:
Finance Manager, Kahoot! Group (2020–2025): CFO’s strategic partner through scaling from $45M to $180M ARR, IPO on Oslo Børs, and $1.7B Goldman Sachs acquisition. Led ASC 606 implementation, Deal Desk operations, payment systems integration (Stripe, Adyen), and data infrastructure using dbt, Dagster, and BigQuery. Managed $500M Clever Inc. acquisition integration. Liaison with Deloitte and PwC external auditors.
Built finance functions from scratch at PE-backed and publicly traded companies (Face2Face Design through successful PE exit, Sweco AB managing $105M revenue operations, Vistin Pharma ASA with manufacturing cost accounting). Experience spans SaaS, manufacturing, professional services, and international multi-entity management across NetSuite, Dynamics 365, and SAP.
Technical skills: SQL, Python, dbt, BigQuery, Dagster, NetSuite (SuiteQL), Dynamics 365, SAP. Built data pipelines and ERP integrations hands-on. MBA in Financial Management from University of Agder. Operating through Capitani Inc. (Wyoming C-Corp), San Francisco Bay Area.
Why this founder for this company: PipeLedger requires someone who can write a dbt model for balance decomposition AND explain to a CFO why their revenue recognition needs context enrichment for AI consumption. Alexander has built the exact data infrastructure PipeLedger productizes inside a finance function that scaled through IPO and acquisition. The combination of CFO-level accounting expertise and hands-on technical data architecture skills is vanishingly rare and is the reason this product can exist.

## Hiring Plan

| Timeline | Hire | Focus |
| --- | --- | --- |
| Month 1–3 | 1 contract full-stack developer | Next.js UI: taxonomy mapping, dimension management, review workflow, pipeline configuration |
| Month 4–6 | 1 backend / data engineer | Pipeline worker optimization, BigQuery performance, second ERP connector (Dynamics 365) |
| Month 7–9 | 1 product designer + 1 developer | UX refinement, customer onboarding, Schemas page polish, Settings page completion |
| Month 10–12 | 1 solutions engineer + 1 GTM | Customer onboarding, SOC 2 audit support, enterprise pipeline, content marketing |


# 14. Long-Term Vision
PipeLedger’s immediate product is a three-stage GL-to-AI pipeline. The long-term vision is to become the standard financial data infrastructure layer for the AI era — the Snowflake for financial data, but purpose-built for AI consumption with domain knowledge, security, and audit controls that generic data platforms cannot match.
Year 1: NetSuite connector, core 8 transformations, MCP + API + file delivery, dual-checkpoint approval, row-level security, budget integration, SOC 2 Type II certification. Year 2: Dynamics 365 and SAP connectors, Notion integration for qualitative context, template marketplace, real-time CDC/streaming extraction, LLM-generated variance commentary (enrichment layer), expanded FIQ-driven revenue from agent adoption. Year 3+: Sub-ledger integration (AP, AR), cross-company benchmarking (anonymized), industry-specific AI agents built on PipeLedger data, and positioning as the financial data layer that every AI agent in the organization connects to.
The endgame: Every AI agent that needs financial context — from Claude analyzing board materials to a procurement agent evaluating vendor spend to an HR agent modeling hiring costs — connects to PipeLedger. The platform becomes the financial data backbone of the enterprise AI stack, metered by FIQ, secured by RLS, and trusted because every record traces back to the source ERP through an auditable transformation chain.

# 15. Supporting Document Series
This business plan is supported by a comprehensive technical and commercial documentation suite. Each document provides implementation-level detail for the areas summarized in this plan:

| Document | What It Covers |
| --- | --- |
| Product Requirements Document (PRD) | Feature requirements by pipeline stage (Ingest, Transform, Deliver), UI page specifications, non-functional requirements, and explicit scope exclusions. |
| Data Model & Schema (v3) | Complete Supabase schema (21+ tables), BigQuery schema (raw, transform, mart, shared datasets), dbt transformation lineage, and test definitions. |
| Data Transformation Strategy (v2) | Deep-dive into NetSuite GL structure, all 8 transformations with operational detail, domain knowledge tiers, LLM-optimized data principles, and use case specifics. |
| System Architecture | Four-service architecture, monorepo structure, data flow diagrams, service communication protocols, BigQuery dataset layout, and security boundaries. |
| Commercial Framework (v2) | Subscription plans, FCU/FIQ definitions, tiered overage pricing, COGS analysis, usage metering pipeline, Chargebee integration, revenue scenarios, and pricing governance. |
| Pipeline & Delivery Lifecycle (v2) | Pipeline run state machine, GL export version lifecycle (draft → approved → delivered → retracted/superseded), delivery records, revocation cascade rules. |
| Security, SOC 2 & SOX Framework (v2) | SOC 2 CC1–CC9 controls with evidence requirements, SOX ITGC/ITAC controls with testing procedures, incident response, and vendor risk management. |
| Developer Workflow (v2) | Development philosophy (8 principles), authoritative vs. enrichment data boundary, branching strategy, CI/CD pipeline with canary deployment, monorepo structure. |
| Frontend Strategy | Design token system, dark mode, responsive layout, component architecture (4-tier), performance strategy (hybrid pagination + virtual scrolling), interactive element specs. |
| Tech Stack | Complete technology decisions with rationale, cost projections, MCP server architecture, Supabase/BigQuery/Dagster configuration, and GCP service map. |
| State Management | TanStack Query as sole state layer, query key convention, Supabase Realtime integration, approval workflow (confirmation-based, no optimistic updates), dirty tracking for schema editors. |
| Error Handling & Logging | Error classification (transient vs. data), per-stage error handling, 3-layer logging architecture, data allow-list, customer-facing error templates, Sentry configuration. |


END OF BUSINESS PLAN — v3.0 • CONFIDENTIAL