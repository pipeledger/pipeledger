# PipeLedger Developer Workflow

PIPELEDGER AI
Developer Workflow
Audience: Contract developers building the MVP with Claude Code • March 2026
This document defines the development philosophy, branching strategy, CI/CD pipeline, local development setup, and change management rules for PipeLedger. PipeLedger is financial data infrastructure, not a generic CRUD application. Every decision in this document reflects that reality: deterministic transformations, audit-grade versioning, strict data boundaries, and security enforced at the data layer.

# 1. Development Philosophy
These principles govern every technical decision in PipeLedger. They are not guidelines — they are constraints. When a developer faces an architectural choice, these principles resolve the ambiguity.

| # | Principle | What It Means in Practice |
| --- | --- | --- |
| 1 | Determinism over cleverness | Financial transformations must produce identical output given identical input, every time. No randomness, no time-dependent logic, no external API calls inside dbt models. A pipeline re-run on the same data with the same config must produce byte-identical output. |
| 2 | No silent behavior changes | Any change to transformation logic, security rules, or taxonomy mappings must be version-tracked and visible in the audit trail. A developer may never deploy a change that alters financial output without the change being recorded in gl_export_versions.taxonomy_version, a git commit SHA, or the audit_logs. |
| 3 | Security at the data layer | Row-level security is enforced by BigQuery access policies and Supabase RLS, never by UI-level filtering. If the UI has a bug, the data layer still prevents unauthorized access. Security is not a feature of the application — it is a property of the database. |
| 4 | All transformations must be reproducible | Given a gl_export_versions row, a developer must be able to check out the git commit, load the same taxonomy version, and reproduce the exact mart output. This requires versioning every input: dbt code, taxonomy mappings, security rules, and FX rates. |
| 5 | No LLM may modify authoritative financial data | LLMs may enrich, summarize, and describe financial data. They may never alter amounts, reclassify accounts, change security tags, or modify any column in the authoritative transformation chain. See Section 2 for the boundary definition. |
| 6 | No partial transforms | If any dbt model or test fails, the entire transformation is rolled back. Intermediate BigQuery tables from the failed run are dropped. The pipeline never leaves half-transformed data visible to downstream consumers. |
| 7 | MCP is the primary delivery channel | The MCP server is how LLMs consume PipeLedger data. It is not a secondary endpoint — it is the primary product interface. MCP registration must succeed for a delivery to be considered complete. File exports (CSV/Parquet) are supplementary. |
| 8 | Enrichment is advisory, never authoritative | LLM-generated content (narrative summaries, variance commentary, risk explanations) is clearly separated from authoritative financial data. Enrichment columns are never included in gl_export_versions record counts or reconciliation checks. |


# 2. Authoritative vs. Enrichment Data Boundary
This is the most important architectural boundary in PipeLedger. The authoritative layer is the financial truth. The enrichment layer helps humans and LLMs understand that truth. The two layers have different rules, different versioning, and different trust levels.

## 2.1 Authoritative Financial Layer
The authoritative layer is produced exclusively by deterministic SQL transformations (dbt models running in BigQuery). It includes raw ERP extracts, staging models, all eight intermediate transformations, security tagging, and the final mart tables. This is the data that gets versioned in gl_export_versions, served via MCP, reconciled against source, and audited.

| Property | Detail |
| --- | --- |
| Production method | dbt SQL models only. No Python, no LLM calls, no external API calls during transformation. |
| Determinism | Identical input + identical config = identical output. Always. |
| Versioning | Every delivery is tracked in gl_export_versions with: version_number, taxonomy_version, pipeline_run_id, git commit SHA (via Dagster run metadata). |
| Security | BigQuery row-level access policies applied by sec_rls_tags model. Enforced at query time. |
| Reconciliation | Record count in = record count out at every stage. Control totals (debits = credits) validated per period. Any mismatch halts the pipeline. |
| Scope | raw.* tables, transform.* tables (staging through security), mart.* tables. |


## 2.2 LLM Enrichment Layer
The enrichment layer sits downstream of the authoritative marts. LLMs generate supporting content that makes financial data more understandable, but this content is advisory — never authoritative. Today, the enrichment layer includes the nl_description and record_summary columns generated by the int_context_enrichment dbt model (which uses template-based logic, not LLM calls). Future enrichment may include LLM-generated variance commentary, risk assessments, and executive summaries.

| Allowed LLM Outputs (Enrichment) | Forbidden LLM Behavior (Authoritative) |
| --- | --- |
| Narrative summaries of financial records | Changing account taxonomy mappings |
| Variance commentary explaining budget deviations | Modifying currency conversion rates or amounts |
| Risk explanations for unusual patterns | Altering dimension labels or hierarchy paths |
| Aggregated executive summaries for board reporting | Updating security tags or RLS access levels |
| Natural language descriptions of accounts and dimensions | Modifying monetary amounts (debits, credits, balances, variances) |
| Trend analysis and period-over-period context | Reclassifying accounts between types (income, expense, asset, liability) |


Enforcement: The boundary is enforced architecturally, not by policy. The dbt transformation chain (int_balance_decomposition through sec_rls_tags) contains zero LLM calls. The int_context_enrichment model generates nl_description using deterministic string templates, not LLM inference. If a future model introduces LLM-generated columns, those columns must be stored in a separate enrichment dataset ({org_id}_enrichment), never in the mart tables that gl_export_versions tracks.

# 3. Environments
PipeLedger uses two environments for MVP: local development and production. This keeps infrastructure simple and deployment fast. A staging environment may be added post-MVP when the customer base grows.

| Environment | Infrastructure | Data |
| --- | --- | --- |
| Local development | Supabase CLI (local Postgres + Auth + Realtime), BigQuery sandbox dataset (pipeledger_dev_{developer}), dbt-core CLI, Next.js dev server (localhost:3000), lightweight Dagster dev instance. | Developer-specific BigQuery datasets. Seed data for testing. No real customer data. Each developer gets their own sandbox to avoid cross-contamination. |
| Production | Cloud Run (web, MCP, worker), Dagster Cloud, Supabase hosted (PostgreSQL + Auth + Realtime), BigQuery production datasets ({org_id}_raw, {org_id}_transform, {org_id}_mart), GCS for file exports. | Real customer data. RLS enforced. Full audit logging. gl_export_versions tracked. All pipeline runs recorded. |


## 3.1 Local Development Setup
# 1. Clone the monorepo
git clone git@github.com:capitani-inc/pipeledger.git
cd pipeledger

# 2. Install dependencies
npm install

# 3. Start Supabase locally
npx supabase start        # Postgres + Auth + Realtime on localhost
npx supabase db reset      # Apply migrations and seed data

# 4. Configure BigQuery sandbox
export GOOGLE_APPLICATION_CREDENTIALS=~/.config/gcloud/dev-key.json
export BQ_PROJECT=pipeledger-dev
export BQ_DATASET_PREFIX=dev_$(whoami)_    # Isolates per developer

# 5. Run dbt against sandbox
cd packages/dbt && dbt seed && dbt run && dbt test

# 6. Start the web app
cd apps/web && npm run dev  # localhost:3000

# 7. Start Dagster dev (optional, for pipeline testing)
cd apps/dagster && dagster dev
Key rule: No real customer data may exist in any local development environment. Developers use seed data (synthetic GL records, synthetic CoA, synthetic dimensions) that exercises all transformation paths without exposing financial data. The seed dataset is maintained in packages/dbt/seeds/ and version-controlled.

# 4. Branching Strategy
PipeLedger uses GitHub Flow: short-lived feature branches, pull request review, and merge to main. There is no develop branch, no release branches, and no hotfix branches. Main is always deployable.

## 4.1 Branch Lifecycle
1. Create feature branch from main
   git checkout -b feat/add-period-alignment-model

2. Develop, commit, push
   git push origin feat/add-period-alignment-model

3. Open PR against main
   - CI runs automatically (lint, type-check, unit tests, dbt tests)
   - At least one approval required
   - PR description must include: what changed, why, and which
     documents are affected (Data Model, Lifecycle, etc.)

4. Merge to main (squash merge preferred)
   - Triggers auto-deploy with canary window (see Section 5)

5. Delete feature branch

## 4.2 Branch Naming Convention

| Prefix | Use Case | Example |
| --- | --- | --- |
| feat/ | New feature or capability | feat/taxonomy-mapping-editor |
| fix/ | Bug fix | fix/currency-conversion-rounding |
| refactor/ | Code restructuring without behavior change | refactor/extract-shared-table-component |
| dbt/ | dbt model changes (transformation logic) | dbt/add-budget-vs-actual-model |
| sec/ | Security rule or RLS policy changes | sec/update-rls-admin-owner-level |
| infra/ | Infrastructure, CI/CD, deployment changes | infra/add-canary-monitoring |
| docs/ | Documentation changes only | docs/update-data-model-v3 |


The dbt/ and sec/ prefixes are important: they signal to reviewers that the PR affects financial transformation logic or security policies. PRs with these prefixes should receive extra scrutiny during review, even though the same approval rules apply to all PRs.

# 5. CI/CD Pipeline
Every push to a feature branch runs the validation pipeline. Every merge to main triggers the deployment pipeline with a canary window. The entire CI/CD runs in GitHub Actions.

## 5.1 Validation Pipeline (On Every Push)

| # | Step | What It Does | Failure Behavior |
| --- | --- | --- | --- |
| 1 | Lint + Type Check | ESLint + tsc --noEmit across all apps/ and packages/. Enforces code style and type safety. | PR blocked. Developer must fix before merge. |
| 2 | Unit Tests | Vitest for TypeScript. Tests shared utils, connector logic, MCP tool handlers, API route handlers. | PR blocked. |
| 3 | dbt Test | dbt test against BigQuery dev dataset (pipeledger_dev_ci). Validates model logic, schema contracts, referential integrity, reconciliation checks. | PR blocked. If a dbt test fails, the transformation logic is incorrect. |
| 4 | Build Check | Docker build for each service (web, mcp, worker). Multi-stage builds. Verifies that all services compile and containerize. | PR blocked. |


## 5.2 Deployment Pipeline (On Merge to Main)

| # | Step | What It Does | Failure Behavior |
| --- | --- | --- | --- |
| 1 | Validation pipeline | Full lint, type-check, unit tests, dbt tests, build check. Same as PR validation but against the merged commit. | Deploy aborted. Main remains on previous version. |
| 2 | Docker build + push | Build production Docker images for web, mcp, and worker. Push to Google Artifact Registry. | Deploy aborted. |
| 3 | Deploy web service | gcloud run deploy pipeledger-web with new image. Cloud Run creates new revision. Previous revision kept for rollback. | Auto-rollback to previous revision. |
| 4 | Deploy MCP service | gcloud run deploy pipeledger-mcp with new image. | Auto-rollback to previous revision. |
| 5 | Deploy worker service | gcloud run deploy pipeledger-worker with new image. | Auto-rollback to previous revision. |
| 6 | Deploy Dagster definitions | Push updated Dagster definitions to Dagster Cloud workspace. | Alert to engineering. Manual rollback if needed. |
| 7 | Canary monitoring (5 min) | Monitor all deployed services for 5 minutes. Check: HTTP 5xx rate < 1%, no Sentry error spike, Cloud Run health checks passing, no container crash loops. | Auto-rollback all services to previous revision. Alert to engineering Slack. |
| 8 | Promote | If canary passes, new revisions become the active versions. Previous revisions remain available for manual rollback. | N/A (canary passed). |


Canary rollback is automatic: The GitHub Actions workflow queries Cloud Monitoring metrics after the 5-minute window. If any threshold is breached, it runs gcloud run services update-traffic --to-revisions=PREVIOUS=100 for each service. The rollback is instant (Cloud Run traffic splitting). The failed deployment commit is flagged in GitHub, and the team investigates before re-deploying.

## 5.3 Supabase Migrations
Supabase schema changes (new tables, column additions, RLS policy changes) are managed via Supabase CLI migrations. Migrations are SQL files stored in supabase/migrations/ and version-controlled in the monorepo. Migrations run automatically on deploy via supabase db push. They are additive-only in production — no destructive migrations (DROP TABLE, DROP COLUMN) without explicit founder approval.
# Create a new migration
npx supabase migration new add_gl_export_versions

# Edit the generated SQL file
# supabase/migrations/20260315120000_add_gl_export_versions.sql

# Test locally
npx supabase db reset   # Applies all migrations from scratch

# Deploy (runs automatically in CI, or manually)
npx supabase db push    # Applies pending migrations to production

# 6. Monorepo Structure
Single GitHub repository. All services share TypeScript types, utility functions, and configuration. Each service deploys independently via GitHub Actions. The shared package is imported by all apps but never deployed on its own.
pipeledger/
  apps/
    web/                 # Next.js 14 (frontend + API routes)
    mcp/                 # MCP server (TypeScript MCP SDK)
    worker/              # Pipeline worker (ERP connectors, export)
    dagster/             # Dagster definitions (sensors, schedules, assets)
  packages/
    shared/              # Shared types, utils, logger, error templates
      lib/
        logger.ts        # Structured JSON logger (GCP Cloud Logging)
        sanitizeForLog.ts  # Allow-list log sanitizer
        error-templates.ts # Error code to sanitized message map
        schemas/          # Zod schemas (shared frontend + API validation)
    dbt/                 # dbt project
      models/
        staging/         # stg_netsuite_gl, stg_netsuite_coa, etc.
        intermediate/    # int_balance_decomposition through int_budget_vs_actual
        security/        # sec_rls_tags
        marts/           # mart_gl_movements, mart_chart_of_accounts, etc.
      tests/             # dbt tests (not_null, unique, custom reconciliation)
      seeds/             # Synthetic test data for local dev and CI
      macros/            # Shared SQL macros
  supabase/
    migrations/          # SQL migration files (version-controlled)
    seed.sql             # Local dev seed data
  .github/
    workflows/
      validate.yml       # PR validation (lint, test, dbt test, build)
      deploy.yml         # Production deploy with canary monitoring
  docker/
    web.Dockerfile
    mcp.Dockerfile
    worker.Dockerfile

# 7. Transformation Rules (dbt Layer)
All financial transformation logic resides in dbt models. This section defines the rules that every dbt model must follow. These rules exist because financial data transformations are the core IP of PipeLedger and the primary source of audit exposure.

| # | Rule |
| --- | --- |
| 1 | Every dbt model must include a schema.yml entry with column descriptions, data types, and test definitions. Undocumented models are not allowed. |
| 2 | Every dbt model must include data quality tests: not_null on required fields, unique on primary keys, and custom reconciliation tests (record count match, control totals where applicable). |
| 3 | No LLM API calls, no external HTTP requests, no Python UDFs, and no randomness inside any dbt model. Transformations are pure SQL against BigQuery tables and Supabase config tables (read via dbt sources). |
| 4 | No time-dependent logic. A dbt model must not reference CURRENT_TIMESTAMP(), NOW(), or any function that produces different output on re-execution. Pipeline run timestamps come from pipeline_runs.started_at, not from the transformation itself. |
| 5 | Any change to transformation logic requires a PR with the dbt/ branch prefix. The PR description must explain: what changed, why, and what the expected impact is on mart output. If the change alters output for existing data, the PR must note that existing gl_export_versions will need to be superseded. |
| 6 | The dbt project follows strict layer ordering: staging reads raw, intermediate reads staging and previous intermediate, security reads the last intermediate, marts read security. No model may skip a layer. No circular dependencies. |
| 7 | All Supabase configuration tables (taxonomy_mappings, dimension_labels, security_rules, budget_dimension_mappings) are declared as dbt sources with explicit version filters. The model reads only the approved version, never draft or archived rows. |
| 8 | If any dbt model fails, all intermediate tables produced by that pipeline run are dropped. The mart tables from the previous successful run remain untouched. This is the no-partial-transform rule. |


# 8. Versioning and Auditability
Every GL export version must be fully reproducible. Given a gl_export_versions row, a developer must be able to reconstruct the exact conditions under which that data was produced. This requires versioning four inputs.

| Versioned Input | How It Is Tracked | Where It Is Stored |
| --- | --- | --- |
| dbt transformation code | Git commit SHA. The Dagster run that triggers the dbt execution records the commit hash. | Dagster run metadata. Accessible via Dagster Cloud UI or API. Linkable from pipeline_runs.dagster_run_id. |
| Taxonomy mappings | taxonomy_mappings.version (integer). Each approved mapping set has a version number. | gl_export_versions.taxonomy_version records which mapping version was applied. |
| Security rules | security_rules table state at time of execution. Active rules snapshot captured by sec_rls_tags model. | audit_logs records any security rule changes. The sec_rls_tags model output is part of the versioned mart data. |
| FX rates | fx_rates table contents at time of extraction. Rates are immutable once loaded (append-only, versioned by period). | Raw BigQuery dataset. The int_currency_conversion model joins on period, preserving the exact rate used per record. |


Reproducibility test: To reproduce gl_export_versions row v7 for pipeline_config ABC: (1) check out the git commit from the dagster_run_id metadata, (2) load taxonomy_mappings where version = v7.taxonomy_version, (3) run dbt against the raw dataset that existed at pipeline_runs.started_at, (4) compare output to the mart snapshot. The output must be identical.

# 9. Change Management
Not all code changes carry equal risk. Changes to financial transformation logic, security policies, and database schemas have a direct impact on the data PipeLedger delivers to customers. These changes require additional attention during review.

## 9.1 Change Categories

| Category | What It Includes | Branch Prefix | Review Standard |
| --- | --- | --- | --- |
| Financial transformation | Any change to dbt models (staging, intermediate, security, mart), dbt macros, dbt sources, dbt seeds used in production. | dbt/ | One approval required. PR must describe expected output impact. If mart output changes, note that existing export versions will be superseded on next run. |
| Security and RLS | Changes to security_rules table structure, RLS policies in Supabase, BigQuery row-level access policy DDL, sec_rls_tags model logic. | sec/ | One approval required. PR must describe which access levels are affected and for which record patterns. |
| Database schema | Supabase migrations (new tables, columns, enums, RLS policies). BigQuery dataset or table schema changes. | feat/ or sec/ | One approval required. No destructive migrations (DROP) in production without founder approval. |
| Frontend and UI | React components, pages, styles, client-side logic. No impact on financial data. | feat/ or fix/ | One approval required. Standard review. |
| Infrastructure | CI/CD workflows, Dockerfiles, Cloud Run config, Dagster definitions, monitoring alerts. | infra/ | One approval required. Test locally or in dry-run mode before merge. |


## 9.2 Mandatory PR Checklist
Every PR must include the following in the description. GitHub PR templates enforce this structure.
## What changed
[Description of the change]

## Why
[Business reason or bug being fixed]

## Affected documents
[Which PipeLedger docs are affected: Data Model, Lifecycle, etc.]

## Financial impact
[ ] This PR does NOT change financial transformation output
[ ] This PR changes output — existing export versions will be
    superseded on next pipeline run

## Security impact
[ ] This PR does NOT change RLS policies or security rules
[ ] This PR changes security — access levels affected: [describe]

## Testing
[ ] dbt tests pass locally
[ ] Unit tests pass locally
[ ] Manually tested in local dev environment

# 10. SOC 2 and Compliance Alignment
PipeLedger is designed to support SOC 2 Type II compliance (targeted Month 10–12 per the PRD). The developer workflow enforces the controls that SOC 2 auditors will examine.

| SOC 2 Control Area | PipeLedger Implementation | Developer Responsibility |
| --- | --- | --- |
| Change management | All code changes go through PR review. GitHub branch protection requires at least one approval. CI must pass before merge. | Never push directly to main. Never bypass PR review. Use correct branch prefixes. |
| Access control | Supabase RLS on all operational tables. BigQuery RLS on all mart tables. API keys scoped to org and role. MCP queries check export version status. | Never hardcode credentials. Never disable RLS for convenience. Test RLS behavior in local dev. |
| Audit trail | audit_logs table is append-only. Every status transition, approval, delivery, and revocation is recorded. No UPDATE or DELETE on audit_logs. | Every new feature that changes data state must write to audit_logs. Use the shared audit logging utility, never write directly. |
| Data integrity | dbt tests validate reconciliation at every stage. gl_export_versions tracks versioned snapshots. No partial transforms. | Every new dbt model must include tests. Never skip dbt test in CI. Never deploy a model without reconciliation checks. |
| Separation of duties | Dual-checkpoint approval (input and output review). Approver role is separate from Operator role. Hard purge requires Admin/Owner. | Never combine approval and operation in the same workflow. The person who triggers a pipeline run should not be the same person who approves the output. |
| Monitoring and alerting | Sentry for error tracking. GCP Cloud Monitoring for infrastructure. Canary deployment with auto-rollback. | Monitor Sentry for new errors after deploys. Investigate canary rollbacks before re-deploying. |


Immutability rules: All historical gl_export_versions rows are immutable — they are never deleted, even after purge (the row remains with purged = true). Retroactive taxonomy changes do not modify historical exports; they require re-running the pipeline to produce a new version that supersedes the old one. The audit trail records the full chain of events.

# 11. Developer Golden Rules
These are the rules that every developer working on PipeLedger must internalize. They are the non-negotiable constraints of this codebase. When in doubt, apply these rules.

| # | Rule | Why It Exists |
| --- | --- | --- |
| 1 | Financial data is sacred. | PipeLedger delivers financial data to CFOs, auditors, and LLMs. A rounding error in the currency conversion model, a missed account in the taxonomy mapping, or a RLS misconfiguration can destroy customer trust instantly. Treat every financial data path as critical infrastructure. |
| 2 | Deterministic core; AI downstream only. | The authoritative transformation chain (dbt models) must be pure, deterministic SQL. LLMs are powerful but non-deterministic — they produce different output on different runs. Financial data cannot tolerate this. LLMs consume the output; they never produce it. |
| 3 | Security enforced at the data layer. | If the UI has a bug that shows the wrong page, the data layer still prevents unauthorized access. This is defense in depth. Never rely on frontend filtering for security. RLS is the last line of defense, and it must be correct. |
| 4 | Version everything that affects financial output. | An auditor will ask: “What exact logic produced this data?” You must be able to answer with: git commit, taxonomy version, security rules state, and FX rates. If any input is unversioned, the audit trail has a gap. |
| 5 | No silent logic changes. | A developer must never deploy a change that alters financial output without the change being visible in the audit trail. If mart output changes, gl_export_versions must reflect a new version. The customer must see that something changed. |
| 6 | No partial transforms. | Half-transformed data is worse than no data. If step 5 of 8 fails, roll back steps 1–4. The mart tables from the previous successful run remain untouched. The customer never sees intermediate garbage. |
| 7 | MCP is the primary delivery channel. | The MCP server is the product. File exports are a supplement. When prioritizing work, MCP reliability comes first. If MCP registration fails, the delivery fails — even if file exports succeeded. |
| 8 | Enrichment is advisory, never authoritative. | LLM-generated content helps humans understand financial data. It does not define financial truth. The moment an LLM can modify an account mapping or a monetary amount, the entire audit story collapses. Keep the boundary absolute. |
| 9 | Logs never contain financial data. | Use sanitizeForLog() for every log entry. The allow-list in the Error Handling doc defines what can appear. Everything else is forbidden. A log leak of customer financial data is a security incident. |
| 10 | When in doubt, halt the pipeline. | If you are writing error handling logic and are unsure whether an error is transient (retry) or data (fail-fast), default to fail-fast. A false halt is an inconvenience. A false retry on bad data wastes resources and creates confusing audit entries. |


END OF DEVELOPER WORKFLOW — v2.0