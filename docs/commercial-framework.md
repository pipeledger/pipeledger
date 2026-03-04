# PipeLedger Commercial Framework

PIPELEDGER AI
Commercial, Usage & Subscription Framework
Audience: Internal strategy, finance, legal, investors • NOT customer-facing • March 2026

# 1. Executive Overview
PipeLedger AI operates on a subscription-plus-usage revenue model. Every customer pays a monthly subscription that includes a base allocation of processing capacity (FCU) and query capacity (FIQ). Usage above the base allocation is billed as monthly overage. This structure delivers predictable recurring revenue from subscriptions while capturing upside as customers process more financial data and as AI agents increase query volume.
Revenue has three components: (1) Subscription — monthly platform fee based on plan tier, covering platform access, users, connectors, and base usage allocations. (2) FCU Overage — Financial Compute Units consumed beyond the plan’s included allocation, metered by rows extracted, transformed, and stored. (3) FIQ Overage — Financial Intelligence Query units consumed beyond the plan’s included allocation, metered by weighted human and agent interactions with financial data.
Strategic thesis: The subscription floor grows linearly with customer count. The usage component grows exponentially as AI agent adoption accelerates — a single customer may have 5 human users but 50 AI agents querying PipeLedger. FIQ overage is the primary revenue scaling mechanism in Year 2+. PipeLedger is positioned as the metered infrastructure layer for autonomous finance systems.

# 2. Subscription Plans

## 2.1 Plan Comparison

| Feature | Premium | Pro | Enterprise |
| --- | --- | --- | --- |
| Monthly price | $2,000/mo | $5,000/mo | $10,000+/mo (custom) |
| Users | Up to 3 | Up to 5 | Unlimited |
| Entities (orgs) | 1 | Multi-entity |  |
| ERP connectors | 1 connector | 2 connectors | Unlimited connectors |
| FCU included (rows/mo) | 500,000 | 2,000,000 | Custom (negotiated) |
| FIQ included (queries/mo) | 2,000 | 10,000 | Custom (negotiated) |
| API keys (for AI agents) | 2 | 10 | Unlimited |
| Review workflow | Output review only | Dual checkpoint (input + output) |  |
| Security rules | Basic RLS (account-level) | Full RLS (account + dimension + project) | Full RLS + custom policies |
| Support | Email (48hr response) | Priority email (24hr response) | Dedicated support + SLA |
| SSO / SAML | Not available | Included |  |
| SOC 2 report access | Not available | Available under NDA | Included |
| Custom transformation templates | Standard templates | Custom templates + consulting |  |
| Data retention | Standard (per policy) | Custom retention terms |  |
| Billing method | Credit card | Credit card or invoice |  |


## 2.2 Billing Terms

| Term | Detail |
| --- | --- |
| Commitment period | Monthly. No annual commitment required. Customers can cancel at the end of any billing cycle. |
| Payment methods | Premium and Pro: credit card via Chargebee-hosted checkout. Enterprise: credit card or NET-30 invoice. |
| Billing cycle | Subscription billed at the start of each month. Usage overages (FCU + FIQ) billed at the end of each month based on actual consumption. |
| Upgrades | Effective immediately. Prorated charge for the remainder of the current billing cycle. New plan’s base allocations apply immediately. |
| Downgrades | Effective at the start of the next billing cycle. No partial refund for the current cycle. If current usage exceeds the lower plan’s allocation, overage rates apply from the downgrade date. |
| Cancellation | Effective at end of current billing cycle. Data retained for 90 days post-cancellation (accessible read-only). After 90 days, data deleted per retention policy. |
| Refund policy | No refunds. Usage charges are non-refundable. Subscription charges are non-refundable for the current billing cycle. |
| Taxes | All prices are exclusive of applicable taxes. Sales tax, VAT, or GST added based on customer’s billing jurisdiction via Chargebee tax integration. |
| Governing law | United States law. Standard SaaS terms of service. |


# 3. Financial Compute Units (FCU)

## 3.1 Definition
1 FCU = 1 ERP row extracted, transformed, secured, and stored within a monthly billing cycle. An FCU is consumed when a GL transaction, chart of accounts record, dimension record, or budget line is pulled from a customer’s ERP, passed through the full dbt transformation chain (staging, intermediate, security, marts), and stored in BigQuery for delivery via MCP. The FCU captures the full cost of processing: API calls to the ERP, BigQuery compute for transformation, dbt execution, and BigQuery storage.
FCU is counted once per row per pipeline run within a billing cycle. Re-running the same pipeline on the same data in the same month does not double-count FCU — only the most recent successful run’s record count applies. Delta syncs (incremental extraction) count only the new and changed rows, not the full dataset.

## 3.2 FCU Included Allocations

| Plan | Included FCU/Month | Typical Customer Profile | Approx. GL Size |
| --- | --- | --- | --- |
| Premium | 500,000 rows | Single entity, 1 ERP, basic GL + CoA + 2–3 dimensions | Small mid-market ($50M–$150M revenue) |
| Pro | 2,000,000 rows | Single entity, 1–2 ERPs, full GL + CoA + all dimensions + budget data | Mid-market ($150M–$500M revenue) |
| Enterprise | Custom (negotiated) | Multi-entity, multiple ERPs, full data scope, high-frequency sync | Upper mid-market to enterprise ($500M+) |


## 3.3 FCU Overage Pricing
FCU consumed beyond the plan’s included allocation is billed monthly at tiered overage rates. Tiers are cumulative within a billing cycle (not per-pipeline).

| Overage Tier | Rate (per 1,000 rows) | Example Monthly Overage | Overage Cost |
| --- | --- | --- | --- |
| 0 – 1M rows over allocation | $2.00 / 1,000 | Premium customer processes 1.2M rows (700K over) | $1,400 |
| 1M – 5M rows over allocation | $1.50 / 1,000 | Pro customer processes 5M rows (3M over): first 1M at $2.00, next 2M at $1.50 | $2,000 + $3,000 = $5,000 |
| 5M – 20M rows over allocation | $1.00 / 1,000 | Enterprise with negotiated 10M base, processes 25M (15M over) | Custom tiered pricing applies |
| 20M+ rows over allocation | Custom enterprise pricing | High-volume enterprise | Negotiated in contract |


## 3.4 FCU Cost of Goods Sold
Understanding the internal cost per FCU is critical for margin analysis and pricing decisions.

| Cost Component | Approx. Cost per 1M Rows | % of FCU Revenue at $2/1K | Notes |
| --- | --- | --- | --- |
| ERP API calls (SuiteQL/OData) | $0.05–$0.20 | 2.5–10% | Varies by ERP. SuiteQL is free (included in NetSuite license). Dynamics OData minimal. SAP RFC may incur costs. |
| BigQuery compute (dbt transforms) | $0.10–$0.30 | 5–15% | BigQuery on-demand pricing: $6.25/TB scanned. dbt transforms are SQL-efficient. Cost scales with transformation complexity. |
| BigQuery storage | $0.02–$0.04 | 1–2% | $0.02/GB/month for active storage. GL data is compact (avg 500 bytes/row). 1M rows ≈ 500MB. |
| Cloud Run compute (worker) | $0.05–$0.15 | 2.5–7.5% | Cloud Run CPU/memory during extraction. Scales to zero when idle. |
| Dagster orchestration | ~$0.01 | <1% | Dagster Cloud pricing based on compute-seconds. Pipeline orchestration is lightweight. |
| Total COGS per 1M FCU | $0.23–$0.70 | 11.5–35% | Target gross margin on FCU: 65–88.5%. Margin improves with volume (BigQuery gets cheaper at scale). |


# 4. Financial Intelligence Query Units (FIQ)

## 4.1 Definition
FIQ represents a weighted unit of financial data interaction. Every time a human user or AI agent queries PipeLedger’s financial data — via the MCP server, REST API, or the PipeLedger UI — the interaction consumes FIQ. FIQ unifies structured data access and AI-driven intelligence into a single commercial metric, regardless of the consumer’s identity (human or agent).
Why FIQ matters strategically: A customer with 3 human users might consume 500 FIQ/month from the UI. The same customer with 5 AI agents (Claude for board reporting, GPT for expense analysis, a custom agent for cash flow forecasting, etc.) might consume 50,000 FIQ/month. FIQ is the metric that captures the exponential value of AI agent adoption. As the number and sophistication of AI agents grows, FIQ revenue grows proportionally — without requiring more human users.

## 4.2 FIQ Weighting Model (Internal — Not Customer-Visible)
Customers see a single FIQ count on their invoice. The internal weighting model translates heterogeneous interactions into comparable units. The weighting is based on BigQuery compute cost, LLM token consumption (if applicable), and interaction complexity. This model is not exposed to customers — they see FIQ as an opaque unit.

| Interaction Type | FIQ | BigQuery Cost Driver | LLM Cost Driver | Example |
| --- | --- | --- | --- | --- |
| Simple structured query (MCP resource read) | 1 | Small scan (<10MB) | None | AI agent reads chart_of_accounts resource. Returns 200 rows. |
| Filtered query with aggregation | 2 | Medium scan (10–100MB) | None | Agent queries gl_movements filtered by department and period. BigQuery aggregates. |
| Multi-resource query | 3 | Multiple scans | None | Agent reads chart_of_accounts + gl_movements + trial_balance in one workflow. |
| Short LLM-enriched summary | 5 | Medium scan | 500–2K tokens | Agent queries variance data and PipeLedger’s context enrichment layer adds narrative summary. |
| Deep variance analysis | 10–20 | Large scan (100MB–1GB) | 2K–10K tokens | Agent runs budget vs. actual across all departments, 12 periods, with commentary. |
| Agentic multi-step workflow | 20+ | Multiple large scans | 10K+ tokens | Agent orchestrates: pull GL → compare to budget → identify anomalies → generate executive summary → draft board slide content. |
| UI data preview (human user) | 1 | Small scan | None | Human user views Data Review page, scrolls through records. |
| UI export (CSV/Parquet download) | 0 | N/A (covered by FCU) | None | File exports are not FIQ-billable; the data was already processed under FCU. |


Weighting calibration: The weighting model is calibrated so that the internal cost of 1 FIQ is approximately $0.005–$0.01 (BigQuery scan cost + proportional LLM cost if applicable). At the customer-facing rate of $0.04/FIQ ($40/1,000), the gross margin on FIQ is approximately 75–87.5%. The weighting model is reviewed quarterly and adjusted if cost structure changes (e.g., BigQuery pricing changes, LLM token costs decrease).

## 4.3 FIQ Included Allocations

| Plan | Included FIQ/Month | Expected Usage Pattern |
| --- | --- | --- |
| Premium | 2,000 | 2–3 human users doing periodic data review + 1–2 AI agents running weekly reports. Modest usage. |
| Pro | 10,000 | 5 human users + 5–10 AI agents. Mix of daily automated reports and ad-hoc analysis. Moderate usage. |
| Enterprise | Custom (negotiated) | Unlimited human users + many AI agents. High-frequency automated workflows. Budget for 50K–200K+ FIQ/month. |


## 4.4 FIQ Overage Pricing

| Overage Tier | Rate (per 1,000 FIQ) | Notes |
| --- | --- | --- |
| 0 – 20K FIQ over allocation | $40 / 1,000 | Standard overage rate. Most Premium and Pro customers land here. |
| 20K – 100K FIQ over allocation | $30 / 1,000 | Volume discount kicks in. Rewards growing agent adoption. |
| 100K+ FIQ over allocation | Custom enterprise pricing | Negotiated for high-volume enterprise customers. Typically $15–$25/1,000. |


# 5. Usage Metering and Tracking

## 5.1 Usage Event Schema
Every billable interaction generates a usage event record stored in Supabase. These records are the source of truth for billing calculations, dispute resolution, and audit. Usage events are append-only and immutable.
// usage_events table schema
{
  id:               uuid (PK)
  org_id:           uuid (FK → organizations)
  actor_type:       enum (human | agent | system)
  actor_id:         uuid (FK → org_members or api_keys)
  event_type:       enum (fcu | fiq)
  quantity:         integer
  fiq_weight:       integer (null for FCU events)
  pipeline_run_id:  uuid (FK, null for FIQ events)
  mcp_resource:     text (null for FCU events)
  bq_bytes_scanned: bigint (null for FCU events)
  token_count:      integer (null if no LLM involved)
  rows_processed:   integer (null for FIQ events)
  billing_period:   text (e.g., '2026-03')
  created_at:       timestamptz
}

## 5.2 Actor Identity Tracking
All human and agent actors are tracked as first-class billable entities. This enables per-actor usage reporting, which customers use for internal cost allocation and which PipeLedger uses for commercial intelligence (identifying high-value agent patterns).

| Actor Type | Identity Source | Usage Attribution | Commercial Significance |
| --- | --- | --- | --- |
| Human user | Supabase Auth user_id via JWT | Usage attributed to org_members record. Visible in Activity page. | Low FIQ volume per user (manual queries). Subscription revenue driver. |
| AI agent | API key with agent label (e.g., "claude-board-reporting") | Usage attributed to api_keys record. Agent name visible in Activity page and usage dashboard. | High FIQ volume per agent. Usage overage revenue driver. Number of agents per customer is the key growth metric. |
| System | Internal service account (pipeline runs, scheduled jobs) | Usage attributed to system actor. Not billed as FIQ (covered by FCU). | Pipeline runs are FCU events, not FIQ. System-initiated BigQuery maintenance is not billable. |


## 5.3 Metering Pipeline
Usage events flow from the application to Chargebee for billing via a metering pipeline that ensures accuracy and auditability.

| # | Step | Detail |
| --- | --- | --- |
| 1 | Event capture | Application code writes a usage_event row to Supabase on every billable interaction. FCU events are written by the Pipeline Worker after a successful pipeline run. FIQ events are written by the MCP Server and REST API on every query. |
| 2 | Daily aggregation | A scheduled Dagster job aggregates usage_events into usage_daily_summary: org_id, billing_period, event_type, total_quantity, total_fiq_weighted. This summary table is the source for the customer-facing usage dashboard. |
| 3 | End-of-month calculation | At billing cycle close, a Dagster job calculates: (a) total FCU consumed vs. plan allocation → FCU overage rows, (b) total FIQ consumed vs. plan allocation → FIQ overage units. Applies tiered pricing to overages. |
| 4 | Chargebee sync | Overage charges are pushed to Chargebee as metered billing line items via the Chargebee API. Chargebee generates the invoice combining subscription fee + FCU overage + FIQ overage. |
| 5 | Invoice delivery | Chargebee sends invoice to customer. Premium/Pro: auto-charged to card on file. Enterprise: NET-30 invoice. |
| 6 | Dispute window | Customer has 30 days from invoice date to dispute usage charges. Usage events are exportable from the Activity page for customer self-service verification. |


# 6. Chargebee Integration Architecture
Chargebee is the billing platform for PipeLedger. It handles subscription management, payment processing, invoicing, tax calculation, and revenue recognition. PipeLedger’s application code interacts with Chargebee via webhooks and API calls.

| Chargebee Entity | PipeLedger Mapping | Sync Direction |
| --- | --- | --- |
| Customer | 1:1 with organization (org_id) | PipeLedger → Chargebee (created on org signup) |
| Subscription | 1:1 with organization’s active plan | PipeLedger → Chargebee (created on plan selection, updated on upgrade/downgrade) |
| Plan / Item Price | Premium ($2,000), Pro ($5,000), Enterprise (custom) | Configured in Chargebee dashboard. Referenced by plan_id in PipeLedger. |
| Metered Item: FCU Overage | usage_events where event_type = fcu, quantity > plan allocation | PipeLedger → Chargebee (end-of-month batch push via API) |
| Metered Item: FIQ Overage | usage_events where event_type = fiq, weighted_total > plan allocation | PipeLedger → Chargebee (end-of-month batch push via API) |
| Invoice | Monthly invoice: subscription + FCU overage + FIQ overage + tax | Chargebee generates. PipeLedger reads via webhook for status tracking. |
| Payment | Credit card charge or invoice payment | Chargebee processes. Webhook notifies PipeLedger of success/failure. |
| Webhook: subscription_changed | Plan upgrade or downgrade | Chargebee → PipeLedger (triggers plan allocation update in organizations table) |
| Webhook: payment_failed | Card declined or invoice overdue | Chargebee → PipeLedger (triggers grace period logic, see Section 7) |


// Chargebee metered usage push (end-of-month)
chargebee.usage.create(subscription_id, {
  item_price_id: 'fcu-overage-per-1000',
  quantity: Math.ceil(fcu_overage / 1000),
  usage_date: billing_period_end,
  note: `FCU overage: ${fcu_overage} rows over ${plan_allocation} allocation`
});

chargebee.usage.create(subscription_id, {
  item_price_id: 'fiq-overage-per-1000',
  quantity: Math.ceil(fiq_overage / 1000),
  usage_date: billing_period_end,
  note: `FIQ overage: ${fiq_overage} FIQ over ${plan_allocation} allocation`
});

# 7. Payment Failure and Account Lifecycle

| Day | Status | Customer Impact | System Behavior |
| --- | --- | --- | --- |
| Day 0 | Payment failed | Chargebee retries payment automatically (3 attempts over 7 days). Customer notified via email. | PipeLedger continues normal operation. No service disruption. |
| Day 7 | Grace period starts | All Chargebee retry attempts exhausted. Customer receives “update payment method” email with direct link. | PipeLedger continues normal operation. In-app banner: “Payment overdue — update payment method.” |
| Day 14 | Read-only mode | Customer can view data but cannot run new pipelines, create exports, or modify configurations. | Pipeline scheduling paused. MCP server returns 402 Payment Required. API keys return 402. |
| Day 30 | Account suspended | Customer cannot access the application. Login redirects to payment update page. | All services suspended. Data retained for 90 days. |
| Day 120 | Account terminated | Data deleted per retention policy. Customer notified 30 days before deletion. | Automated data cleanup. audit_logs preserved for 7 years per compliance policy. |


Enterprise exception: Enterprise customers on NET-30 invoicing follow their contractual payment terms. The grace period above applies to credit card customers only. Enterprise payment disputes are handled by the account team, not by automated dunning.

# 8. Revenue Model Scenarios
The following scenarios illustrate how the three revenue components combine for different customer profiles. These are used for financial modeling, investor conversations, and sales team guidance.

## 8.1 Scenario A: Premium Customer (Small Mid-Market)

| Component | Usage | Monthly Revenue |
| --- | --- | --- |
| Subscription (Premium) | Base plan | $2,000 |
| FCU: 800K rows processed | 500K included + 300K overage at $2.00/1K | $600 |
| FIQ: 1,800 queries | 2,000 included — no overage | $0 |
| Total monthly revenue |  | $2,600 |
| Annualized |  | $31,200 |


## 8.2 Scenario B: Pro Customer (Mid-Market, Agent-Heavy)

| Component | Usage | Monthly Revenue |
| --- | --- | --- |
| Subscription (Pro) | Base plan | $5,000 |
| FCU: 3.5M rows processed | 2M included + 1M at $2.00/1K + 500K at $1.50/1K | $2,750 |
| FIQ: 35K queries | 10K included + 20K at $40/1K + 5K at $30/1K | $950 |
| Total monthly revenue |  | $8,700 |
| Annualized |  | $104,400 |


## 8.3 Scenario C: Enterprise Customer (Multi-Entity, High Agent Adoption)

| Component | Usage | Monthly Revenue |
| --- | --- | --- |
| Subscription (Enterprise) | Custom plan | $15,000 |
| FCU: 12M rows processed | 10M included + 2M overage at custom rate ($1.25/1K) | $2,500 |
| FIQ: 180K queries | 50K included + 100K at custom $25/1K + 30K at custom $20/1K | $3,100 |
| Total monthly revenue |  | $20,600 |
| Annualized |  | $247,200 |


## 8.4 Blended Revenue Analysis

| Metric | Scenario A | Scenario B | Scenario C | Blended Avg. |
| --- | --- | --- | --- | --- |
| Monthly revenue | $2,600 | $8,700 | $20,600 | $10,633 |
| Subscription % of revenue | 77% | 57% | 73% | 66% |
| FCU overage % of revenue | 23% | 32% | 12% | 21% |
| FIQ overage % of revenue | 0% | 11% | 15% | 13% |
| Usage % of total revenue | 23% | 43% | 27% | 34% |


Key insight: Subscription revenue provides the floor (66% blended), but usage revenue (34% blended) is the growth driver. As AI agent adoption increases, FIQ overage grows disproportionately. In the enterprise scenario, FIQ overage alone ($3,100/mo) exceeds the entire Premium plan subscription ($2,000/mo). This validates the strategic thesis: PipeLedger’s revenue scales with AI agent adoption even when human user count stays flat.

# 9. Customer-Facing Usage Dashboard
Customers need visibility into their consumption to trust the billing model. The usage dashboard is a critical retention and transparency tool. It lives in Settings > Usage and is accessible to Admin and Owner roles.

| Dashboard Element | Detail |
| --- | --- |
| Current billing period summary | Bar chart: FCU consumed vs. included allocation. Bar chart: FIQ consumed vs. included allocation. Projected end-of-month total (linear extrapolation). Estimated overage charge. |
| Daily usage trend | Line chart: daily FCU and FIQ consumption over the current billing period. Highlights spikes (e.g., a large pipeline run or agent workflow). Hover for daily breakdown. |
| Usage by actor | Table: each human user and AI agent with their FIQ consumption for the period. Sortable by usage. Identifies the top-consuming agents for internal cost allocation. |
| Usage by pipeline | Table: each pipeline configuration with FCU consumed per run. Sortable by total FCU. Identifies the most expensive pipelines. |
| Historical usage (past 12 months) | Monthly bar chart: total FCU and FIQ for the past 12 billing periods. Overlaid with plan allocation line. Shows growth trend. |
| Export usage data | CSV export of all usage_events for the current or any past billing period. Used for internal cost allocation, dispute resolution, and audit. |
| Plan comparison | Shows current plan’s allocations vs. actual usage. Recommends upgrade if overage consistently exceeds 50% of base allocation for 3+ months. Not auto-triggered — informational only. |


# 10. Revenue Expansion and Contraction Signals
Usage data drives proactive commercial actions. The following signals are monitored to identify expansion opportunities and churn risks.

| Signal | Trigger | Commercial Action |
| --- | --- | --- |
| FCU overage > 50% of allocation for 3+ months | Customer consistently processes more data than their plan includes. | Account manager reaches out with upgrade recommendation. Show cost comparison: current plan + overage vs. next plan. |
| FIQ overage growing month-over-month | Customer is adding AI agents or increasing agent query frequency. | Positive signal: AI adoption is accelerating. Offer custom enterprise pricing if FIQ > 50K/month. |
| New API key created | Customer is connecting a new AI agent to PipeLedger. | Expansion signal. Follow up to understand use case and ensure good integration experience. |
| FCU usage declining month-over-month | Customer is processing less data than before. | Churn risk. Investigate: did they switch ERPs? Reduce entities? Encounter data quality issues? |
| FIQ usage near zero for 30+ days | No human or agent is querying PipeLedger data. | Critical churn risk. The data exists but nobody is consuming it. Reach out immediately. |
| Payment method update required | Credit card expiring within 30 days. | Proactive notification via email and in-app banner. Prevent involuntary churn. |
| Second connector added | Customer connecting a second ERP or data source. | Expansion signal. May need Pro plan if on Premium. |
| Dual-checkpoint enabled | Customer activates input + output review workflow. | Maturity signal. Customer is taking data governance seriously. Good candidate for Enterprise. |


# 11. Unit Economics Targets

| Metric | Target | Rationale |
| --- | --- | --- |
| Gross margin (subscription) | > 95% | Subscription revenue is nearly pure margin. Infrastructure cost is fixed and shared across all customers. |
| Gross margin (FCU overage) | 65–88% | FCU COGS driven by BigQuery compute + ERP API costs. Margin improves with volume (tiered BQ pricing). |
| Gross margin (FIQ overage) | 75–88% | FIQ COGS driven by BigQuery scans + proportional LLM token cost. High margin because queries are read-only. |
| Blended gross margin | > 90% | Consistent with infrastructure SaaS. Business plan targets 94–98.5% at Month 12. |
| Net dollar retention (NDR) | > 120% | Expansion from FCU + FIQ overage growth should exceed any contraction or churn. Agent adoption is the primary NDR driver. |
| Logo churn | < 5% monthly | Monthly billing (no annual lock-in) means higher churn risk. Offset by configuration stickiness and AI agent dependency. |
| Average revenue per account (ARPA) | $2,600 (Year 1) → $8,000+ (Year 2) | Year 1 skews toward Premium customers. Year 2: agent adoption drives FIQ overage growth. |
| LTV (36-month, 5% monthly churn) | $18K–$22K | Conservative. Assumes blended ARPA of ~$3K and 5% monthly churn. Improves as NDR exceeds 100%. |
| CAC payback period | < 6 months | Low-touch sales (Premium/Pro via self-serve). Enterprise requires sales touch but higher ARPA. |
| LTV:CAC ratio | > 3:1 | Standard SaaS benchmark. PipeLedger’s configuration stickiness and agent dependency should push this toward 5:1+. |


# 12. Pricing Governance

| Policy | Detail |
| --- | --- |
| Price change authority | Founder approval required for any pricing change (plan prices, overage rates, included allocations). No unilateral changes by sales or account team. |
| Customer notification for price changes | Existing customers receive 60 days written notice before any price increase takes effect. Price increases apply at the start of the next billing cycle after the notice period. |
| Enterprise custom pricing authority | Sales team may offer custom enterprise pricing within approved bands: subscription $10K–$50K/mo, FCU overage $0.75–$2.00/1K, FIQ overage $15–$40/1K. Pricing outside these bands requires founder approval. |
| Discount authority | No discounts on Premium or Pro plans (price integrity). Enterprise: up to 15% annual volume discount with founder approval. No free months. |
| FIQ weighting model changes | Quarterly review. Changes require founder approval. Existing customers grandfathered for 90 days before new weighting applies. |
| Annual pricing review | Annual review of all pricing (plans, overages, allocations) against COGS, competitive landscape, and expansion data. Documented decision: hold, increase, or restructure. |


END OF COMMERCIAL, USAGE & SUBSCRIPTION FRAMEWORK — v2.0