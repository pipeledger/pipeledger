# PipeLedger Security, SOC2 & SOX Compliance

PIPELEDGER AI
Security, SOC 2 & SOX Compliance Framework
Audience: Enterprise customers, security teams, auditors, investors, and internal engineering • March 2026
PipeLedger AI is audit-grade financial data infrastructure. This document defines the security architecture, internal controls, and compliance posture aligned with SOC 2 Type II Trust Services Criteria and SOX Section 404 IT General Controls. It serves two purposes: an internal controls reference for the development team and an external security posture document for enterprise customers, their security teams, and auditors conducting procurement reviews.

# 1. Compliance Scope and Objectives
PipeLedger processes and transforms financial data on behalf of customers. It does not perform accounting entries, generate financial statements, or execute financial transactions. However, because the data PipeLedger delivers is consumed by CFOs, auditors, and AI agents for financial decision-making, the platform is designed to the same control standard as systems that are directly subject to SOX and SOC 2.

## 1.1 SOC 2 Trust Services Criteria (In Scope)

| TSC Category | Status | Rationale |
| --- | --- | --- |
| Security (CC1–CC9) | Required / In Scope | Mandatory for all SOC 2 reports. PipeLedger stores and processes customer financial data in a multi-tenant environment. Security controls protect against unauthorized access, unauthorized disclosure, and damage to systems. |
| Availability (A1) | In Scope | PipeLedger is operational infrastructure for financial data delivery. Customers depend on MCP server and REST API availability for AI agent workflows. Downtime directly impacts customer operations. |
| Processing Integrity (PI1) | In Scope | Core to PipeLedger’s value proposition. Financial data transformations must be complete, valid, accurate, timely, and authorized. Processing integrity controls ensure that the data delivered via MCP matches the data extracted from ERPs after applying deterministic, auditable transformations. |
| Confidentiality (C1) | In Scope | PipeLedger handles confidential financial data including GL transactions, account structures, organizational hierarchies, and budget figures. Multi-tenant isolation and row-level security are essential. |
| Privacy (P1) | Evaluated / Deferred | PipeLedger processes financial data, not personal data as its primary function. However, GL records may contain personal information in memo fields or project names. Privacy controls will be evaluated for inclusion in the first SOC 2 Type II report. |


## 1.2 SOX Section 404 Alignment
PipeLedger is not a publicly traded company and is not directly subject to SOX. However, PipeLedger’s customers include companies that are subject to SOX or preparing for IPO. When those customers rely on PipeLedger to deliver financial data for reporting, budgeting, or audit, PipeLedger becomes part of their ICFR (Internal Control over Financial Reporting) ecosystem. Designing PipeLedger to SOX-grade controls from day one means customers can rely on PipeLedger without compensating controls.
PipeLedger implements IT General Controls (ITGCs) aligned with COSO framework principles across four domains: Access Management, Change Management, Computer Operations, and Data Backup and Recovery. Additionally, PipeLedger implements IT Application Controls (ITACs) specific to the financial data transformation pipeline.

# 2. Security Architecture

## 2.1 Tenant Isolation

| Layer | Mechanism | Enforcement Detail |
| --- | --- | --- |
| Supabase (Operational DB) | PostgreSQL Row-Level Security (RLS) | Every table has an RLS policy that filters by auth.uid() → org_members.org_id. A user in Organization A can never read, write, or even detect the existence of Organization B’s data. RLS is enforced at the database engine level — application bugs cannot bypass it. |
| BigQuery (Financial Data) | Dataset-level isolation + row-level access policies | Each organization gets three isolated datasets: {org_id}_raw, {org_id}_transform, {org_id}_mart. BigQuery row-level access policies on mart tables enforce role-based data access. The sec_rls_tags dbt model tags records with access levels; BigQuery policies filter at query time. |
| GCS (File Exports) | Org-scoped IAM + bucket-level ACLs | File exports (Parquet/CSV) written to org-scoped GCS paths. IAM policies restrict access to the org’s service account. On revocation, object ACLs are removed. |
| MCP Server | API key → org_id + access_level | Every MCP query is authenticated by API key. The key maps to an org and access level. BigQuery queries run with the org’s RLS context. No cross-tenant data is ever returned. |


## 2.2 Encryption

| State | Mechanism | Detail |
| --- | --- | --- |
| At rest (Supabase) | AES-256, Google Cloud default encryption | All PostgreSQL data encrypted at rest by Google Cloud’s infrastructure. Encryption keys managed by Google KMS. Customer-managed encryption keys (CMEK) available as Enterprise feature. |
| At rest (BigQuery) | AES-256, Google Cloud default encryption | All BigQuery datasets encrypted at rest. CMEK available for Enterprise customers who require control over key lifecycle. |
| At rest (GCS) | AES-256, Google Cloud default encryption | All GCS objects (file exports, company documents) encrypted at rest. CMEK available. |
| In transit (external) | TLS 1.2+ enforced | All external connections (browser to Cloud Run, API calls, MCP queries, ERP connector calls) require TLS 1.2 or higher. HSTS headers enforced on web application. |
| In transit (internal) | Google Cloud internal encryption | Service-to-service communication within GCP (Cloud Run to BigQuery, Cloud Run to Supabase) encrypted by Google’s internal transport layer. |
| Secrets | GCP Secret Manager | ERP connector credentials, API keys, OAuth tokens, Supabase service role keys stored in GCP Secret Manager. Secrets are never committed to source code, environment variables, or logs. Accessed at runtime via IAM-scoped service accounts. |


## 2.3 Authentication and Access Control

| Control | Implementation | Detail |
| --- | --- | --- |
| User authentication | Supabase Auth (email/password + magic link) | JWT-based authentication. Tokens contain org_id and role claims. Short-lived access tokens (1 hour) with refresh tokens. SSO/SAML available for Enterprise plan. |
| Role-based access control | Five roles: Owner, Admin, Approver, Operator, Viewer | Roles enforced in application code and RLS policies. Each role has explicit permissions: Viewer (read-only), Operator (run pipelines), Approver (approve/reject checkpoints), Admin (manage users, security rules, connectors), Owner (all permissions including billing and hard purge). |
| API key authentication | Hashed API keys (bcrypt) with access_level | API keys used for MCP server and REST API access. Keys are hashed before storage — the raw key is shown once at creation. access_level on the key determines BigQuery RLS scope. Keys can be revoked instantly by Admin/Owner. |
| AI agent identity | API keys with agent-specific labels | AI agents (Claude, GPT, Copilot) authenticate via API keys just like human users. Each agent gets a dedicated key with an explicit access_level. Agent queries are logged in audit_logs with api_key_id for attribution. |
| Infrastructure access | GCP IAM with least privilege | Service accounts for Cloud Run, Dagster, and BigQuery follow least-privilege principle. No human has direct database access in production. All infrastructure changes go through IaC (Terraform) and PR review. |
| MFA | Supabase Auth supports MFA (TOTP) | MFA available for all users. Enforced organization-wide for Enterprise plan. Admin/Owner roles recommended to enable MFA. |


## 2.4 Network Security

| Control | Detail |
| --- | --- |
| Cloud Run ingress | Web App, MCP Server, and REST API are public-facing Cloud Run services with TLS termination. Worker service is internal-only (triggered by Dagster, not directly accessible from the internet). |
| Firewall rules | GCP VPC firewall rules restrict internal traffic. BigQuery and Supabase are accessed via private Google APIs where available. |
| DDoS protection | Google Cloud Armor provides DDoS protection for Cloud Run services. Rate limiting enforced at the Cloud Run layer. |
| Dependency scanning | GitHub Dependabot monitors npm and Python dependencies for known vulnerabilities. Critical vulnerabilities must be patched within 7 days. |
| Penetration testing | Annual third-party penetration test. First test targeted for Month 10 (pre-SOC 2 audit). Findings remediated before audit engagement. |


# 3. SOC 2 Common Criteria (CC1–CC9)
The Common Criteria are the mandatory security controls for all SOC 2 reports. Each criterion below maps to PipeLedger’s specific implementation and the evidence an auditor would examine.

## 3.1 CC1: Control Environment

| Control ID | Control Description | PipeLedger Implementation | Evidence |
| --- | --- | --- | --- |
| CC1.1 | The entity demonstrates commitment to integrity and ethical values. | Code of conduct for all team members and contractors. Financial data handling principles documented in Developer Workflow doc. No employee may access customer financial data directly. | Code of conduct document. Developer Workflow doc (Section 1: Development Philosophy). Signed contractor agreements. |
| CC1.2 | The board of directors or equivalent demonstrates independence from management and exercises oversight. | Founder/CEO provides oversight. Advisory board reviews security posture quarterly (post-Series A). SOC 2 auditor provides independent assessment. | Board meeting minutes. Quarterly security review records. SOC 2 report. |
| CC1.3 | Management establishes structures, reporting lines, and responsibilities. | Organization chart with clear ownership: CTO owns security, Head of Engineering owns development, Founder owns compliance. Control owners assigned for each SOC 2 criterion. | Org chart. Control owner matrix (Appendix A of this document). RACI for incident response. |
| CC1.4 | The entity demonstrates commitment to attract, develop, and retain competent individuals. | Security training required for all engineers at onboarding and annually. Background checks for employees with production access. Contractor agreements include security obligations. | Training completion records. Background check evidence. Contractor agreements. |
| CC1.5 | The entity holds individuals accountable for internal control responsibilities. | All production actions logged in audit_logs. PR approvals tracked in GitHub. Deployment history maintained in GitHub Actions. Performance reviews include security compliance. | audit_logs table. GitHub PR history. Deployment logs. Performance review records. |


## 3.2 CC2: Communication and Information

| Control ID | Control Description | PipeLedger Implementation | Evidence |
| --- | --- | --- | --- |
| CC2.1 | The entity obtains or generates relevant, quality information to support internal control. | Structured logging (JSON) from all services to GCP Cloud Logging. Sentry error tracking with sanitized context. Dagster pipeline observability. audit_logs for business events. | GCP Cloud Logging dashboard. Sentry project configuration. Dagster Cloud UI. audit_logs table schema and sample queries. |
| CC2.2 | The entity internally communicates information to support internal control. | Developer Workflow document defines all control expectations. PR checklist enforces documentation. Incident post-mortems shared with full team. Weekly engineering standup reviews security items. | Developer Workflow doc. PR template with checklist. Post-mortem documents. Meeting notes. |
| CC2.3 | The entity communicates with external parties regarding internal control. | This Security Framework document shared with customers during procurement. SOC 2 report shared under NDA. Security questionnaire responses maintained. Incident notification procedures defined in Section 9. | This document. SOC 2 report (when available). Security questionnaire response library. Customer notification templates. |


## 3.3 CC3: Risk Assessment

| Control ID | Control Description | PipeLedger Implementation | Evidence |
| --- | --- | --- | --- |
| CC3.1 | The entity specifies objectives with sufficient clarity to enable identification of risks. | Service commitments documented: data integrity, tenant isolation, audit traceability, transformation determinism, delivery completeness. Each commitment has measurable criteria. | This document (Section 1). PRD (Section 5: Security). Data Transformation Strategy. |
| CC3.2 | The entity identifies risks to the achievement of objectives and analyzes risks. | Risk register maintained with likelihood and impact ratings. Covers: data breach, transformation error, tenant isolation failure, credential exposure, supply chain vulnerability, insider threat. | Risk register (maintained in internal doc, reviewed quarterly). Annual risk assessment report. |
| CC3.3 | The entity considers the potential for fraud. | Separation of duties in pipeline workflow (operator triggers, approver approves). No single person can extract, transform, and deliver without independent review. Hard purge requires two-step confirmation. AI agents cannot modify authoritative data. | Pipeline & Delivery Lifecycle doc. Role permissions matrix. Dual-checkpoint workflow. |
| CC3.4 | The entity identifies and assesses changes that could significantly impact internal control. | All code changes go through PR review. dbt/ and sec/ branch prefixes flag high-risk changes. Change categories defined in Developer Workflow doc. Supabase migrations reviewed before production. | GitHub PR history with branch prefixes. Developer Workflow doc (Section 9: Change Management). Migration review records. |


## 3.4 CC4: Monitoring Activities

| Control ID | Control Description | PipeLedger Implementation | Evidence |
| --- | --- | --- | --- |
| CC4.1 | The entity selects, develops, and performs ongoing evaluations. | GCP Cloud Monitoring dashboards for all services: error rates, latency, availability. Sentry monitors for new and recurring errors. Dagster UI tracks pipeline execution health. Canary deployment monitors for 5 minutes post-deploy. | Cloud Monitoring dashboards. Sentry alert configurations. Dagster Cloud execution history. GitHub Actions canary workflow. |
| CC4.2 | The entity evaluates and communicates deficiencies in a timely manner. | Sentry alerts to engineering Slack within 1 minute of new error. Canary rollback triggers immediate Slack notification. Monthly security metrics review. Quarterly risk register update. | Sentry alert rules. Slack notification history. Monthly metrics reports. Risk register changelog. |


## 3.5 CC5: Control Activities

| Control ID | Control Description | PipeLedger Implementation | Evidence |
| --- | --- | --- | --- |
| CC5.1 | The entity selects and develops control activities that mitigate risks. | Controls mapped to each identified risk: RLS for isolation, dbt tests for integrity, audit_logs for traceability, sanitizeForLog for confidentiality, canary deploy for availability. | Control-to-risk mapping matrix. This document (Sections 2–6). |
| CC5.2 | The entity selects and develops general controls over technology. | GitHub branch protection (PR required, CI must pass). Infrastructure as Code (Terraform). Automated dependency scanning (Dependabot). Secret management (GCP Secret Manager). Automated database backups. | GitHub branch protection settings. Terraform state files. Dependabot configuration. GCP Secret Manager audit logs. Backup verification records. |
| CC5.3 | The entity deploys control activities through policies and procedures. | Developer Workflow doc defines all procedures. Error Handling doc defines logging and alerting. Frontend Strategy defines UI security patterns. PR templates enforce compliance. | Developer Workflow doc. Error Handling doc. Frontend Strategy doc. GitHub PR templates. |


## 3.6 CC6: Logical and Physical Access Controls

| Control ID | Control Description | PipeLedger Implementation | Evidence |
| --- | --- | --- | --- |
| CC6.1 | The entity implements logical access security over protected information assets. | Supabase RLS on all operational tables. BigQuery RLS on all mart tables. GCS IAM on file exports. GCP IAM least-privilege for infrastructure. MFA available for all users. | RLS policy definitions (Supabase migrations). BigQuery access policy DDL. GCS IAM bindings. GCP IAM roles audit. |
| CC6.2 | Prior to issuing credentials, the entity registers and authorizes new users. | User invitation flow: Admin/Owner invites via email, user accepts and creates account. Role assigned at invitation time. API keys created by Admin/Owner with explicit access_level. | org_members table records. audit_logs entries for user_invited and api_key_created. |
| CC6.3 | The entity authorizes, modifies, or removes access based on authorization. | Role changes logged in audit_logs. API key revocation is immediate and logged. User removal cascades to session invalidation. Quarterly access review by Admin/Owner. | audit_logs for role changes. api_keys.revoked_at records. Quarterly access review records. |
| CC6.4 | The entity restricts access to assets through physical and logical means. | All infrastructure on GCP (no physical servers to manage). GCP data centers are SOC 2 Type II certified. Developer laptops require full-disk encryption. No production database credentials on developer machines. | GCP SOC 2 report (bridge letter). Laptop encryption policy. Infrastructure access audit. |
| CC6.5 | The entity discontinues access when no longer needed. | Contractor offboarding checklist: GitHub access revoked, GCP IAM removed, Supabase admin removed, API keys revoked. Automated alerts for unused API keys (> 90 days). | Offboarding checklist records. API key usage monitoring. GitHub access audit log. |
| CC6.6 | The entity manages credentials for infrastructure and software. | Infrastructure credentials managed via GCP IAM service accounts. Application secrets in GCP Secret Manager. Database credentials rotated quarterly. API keys hashed (bcrypt) before storage. | GCP IAM audit. Secret Manager access logs. Key rotation records. |
| CC6.7 | The entity restricts data transmission, movement, and removal. | Financial data only transmitted via TLS. File exports written to org-scoped GCS paths. No bulk data export outside authorized delivery channels. Log sanitization prevents financial data leakage. | TLS configuration. GCS bucket policies. Log allow-list (Error Handling doc Section 4). |
| CC6.8 | The entity implements controls to prevent or detect unauthorized software. | Infrastructure deployed via CI/CD (no manual installations). Docker images built from verified base images. Dependabot scans for vulnerable packages. No user-installed software on production infrastructure. | CI/CD pipeline configuration. Dockerfile base image versions. Dependabot alerts and resolution records. |


## 3.7 CC7: System Operations

| Control ID | Control Description | PipeLedger Implementation | Evidence |
| --- | --- | --- | --- |
| CC7.1 | The entity detects and monitors security events. | GCP Cloud Logging captures all service logs (structured JSON). Cloud Monitoring alerts on anomalous patterns (5xx spikes, latency degradation, unusual query volumes). Sentry captures unhandled exceptions. | Cloud Logging query history. Cloud Monitoring alert policies. Sentry project dashboard. |
| CC7.2 | The entity monitors the system to identify potential vulnerabilities. | Dependabot automated vulnerability scanning. Annual penetration test by third party. GCP Security Command Center for infrastructure-level findings. Monthly review of GCP security recommendations. | Dependabot alerts and remediation PRs. Penetration test report. Security Command Center findings log. |
| CC7.3 | The entity evaluates security events to determine whether they could impact the system. | Incident classification framework (Section 9). Sentry error triage within 24 hours. Security events escalated to founder within 1 hour. Monthly trend analysis of security events. | Incident log. Sentry triage records. Escalation records. Monthly security report. |
| CC7.4 | The entity responds to identified security events. | Incident response procedures (Section 9). On-call rotation for critical alerts. Root cause analysis documented for all severity-1 incidents. Customer notification within 72 hours for data-impacting incidents. | Incident response records. Post-mortem documents. Customer notification records. |
| CC7.5 | The entity identifies, develops, and implements remediation activities. | Post-incident remediation tracked as GitHub issues. Remediation PRs follow standard review process. Lessons learned incorporated into risk register. Recurring issues trigger control improvements. | GitHub remediation issues. PR history. Risk register updates. Control improvement records. |


## 3.8 CC8: Change Management

| Control ID | Control Description | PipeLedger Implementation | Evidence |
| --- | --- | --- | --- |
| CC8.1 | The entity authorizes, designs, develops, configures, documents, tests, approves, and implements changes. | All changes via PR (GitHub branch protection enforced). CI pipeline validates: lint, type-check, unit tests, dbt tests, Docker build. At least one approval required. Canary deployment with 5-minute monitoring window. Auto-rollback on failure. | GitHub branch protection rules. CI pipeline logs. PR approval records. Canary monitoring results. Rollback records. |


## 3.9 CC9: Risk Mitigation

| Control ID | Control Description | PipeLedger Implementation | Evidence |
| --- | --- | --- | --- |
| CC9.1 | The entity identifies, selects, and develops risk mitigation activities. | Risk mitigation mapped to each risk in register. Technical controls (RLS, encryption, testing) supplemented by procedural controls (review, approval, monitoring). | Risk register with mitigation mapping. This document. |
| CC9.2 | The entity assesses and manages risks from vendors and business partners. | Third-party risk assessment for critical vendors: GCP (SOC 2 certified), Supabase (SOC 2 certified), Dagster Cloud, Sentry. ERP connectors connect to customer-owned systems (customer manages ERP security). Vendor SOC 2 reports reviewed annually. | Vendor risk assessment records. GCP SOC 2 report. Supabase SOC 2 report. Annual vendor review. |


# 4. SOC 2 Additional Trust Services Criteria

## 4.1 Availability (A1)

| Control ID | Control Description | PipeLedger Implementation | Evidence |
| --- | --- | --- | --- |
| A1.1 | The entity maintains, monitors, and evaluates current processing capacity and availability. | Cloud Run auto-scaling (0 to N instances based on demand). BigQuery serverless (automatic capacity). GCP uptime monitoring on all public endpoints. Dagster Cloud managed availability. | Cloud Run scaling configuration. GCP Uptime Check results. BigQuery job history (no capacity failures). |
| A1.2 | The entity authorizes, designs, develops, implements, operates, approves, maintains, and monitors environmental protections and recovery infrastructure. | GCP multi-zone deployment. Cloud Run automatic failover. BigQuery cross-region replication (available for Enterprise). Supabase daily automated backups with point-in-time recovery. GCS objects replicated across zones. | GCP deployment configuration. Supabase backup logs. GCS replication settings. Recovery test records. |
| A1.3 | The entity tests recovery plan procedures. | Quarterly recovery test: restore Supabase from backup, verify BigQuery dataset integrity, validate Cloud Run rollback procedure. Results documented and gaps remediated. | Quarterly recovery test records. Remediation PRs for identified gaps. |


## 4.2 Processing Integrity (PI1)

| Control ID | Control Description | PipeLedger Implementation | Evidence |
| --- | --- | --- | --- |
| PI1.1 | The entity implements policies and procedures over system processing to ensure completeness, validity, accuracy, timeliness, and authorization. | dbt tests on every pipeline run: not_null, unique, referential integrity, record count reconciliation, control totals (debits = credits). No partial transforms (pipeline halts on any test failure). Dual-checkpoint approval (input + output). gl_export_versions tracks every delivery. | dbt test definitions (schema.yml). Pipeline run records showing test pass/fail. review_checkpoints records. gl_export_versions records. |
| PI1.2 | The entity implements policies to handle processing errors. | Error classification: transient (auto-retry with backoff) vs. data (fail-fast). Pipeline failures recorded in pipeline_runs.error_message and audit_logs. Delivery failures trigger full rollback. Customer notified via in-app badge, email, and Slack webhook. | Error Handling doc. Pipeline run failure records. Rollback evidence. Notification records. |
| PI1.3 | The entity implements policies for inputs and outputs. | Inputs: ERP data validated at extraction (schema drift detection). Outputs: dbt tests validate marts before delivery. Version tracking: gl_export_versions records exact transformation version, taxonomy version, and security rules state. | Schema validation logic. dbt test results. gl_export_versions records. |


## 4.3 Confidentiality (C1)

| Control ID | Control Description | PipeLedger Implementation | Evidence |
| --- | --- | --- | --- |
| C1.1 | The entity identifies and maintains confidential information. | All customer financial data classified as confidential. Data isolation via RLS and dataset-level separation. Log allow-list prevents financial data from appearing in logs, error tracking, or monitoring systems. | Data classification policy. RLS definitions. Log allow-list (Error Handling doc Section 4). |
| C1.2 | The entity disposes of confidential information when no longer needed. | Hard purge capability for export versions (Admin/Owner only, two-step confirmation). Purge deletes BigQuery mart data. gl_export_versions row retained as audit record with purged = true. File export ACLs removed on revocation. | Purge records in gl_export_versions. audit_logs purge events. GCS ACL removal records. |


# 5. SOX Section 404: IT General Controls
SOX ITGCs ensure the reliability, security, and integrity of IT systems supporting financial reporting. PipeLedger implements controls across all four ITGC domains. Each control includes the testing procedure an internal or external auditor would follow.

## 5.1 ITGC Domain 1: Access Management

| Control ID | Control | Implementation | Testing Procedure | Frequency |
| --- | --- | --- | --- | --- |
| AM-01 | User provisioning requires authorization | Admin/Owner invites users via UI. Role assigned at invitation. audit_logs records user_invited with inviter identity. | Sample 25 user additions. Verify each has audit_log entry with authorized inviter. | Annual |
| AM-02 | User access is reviewed periodically | Quarterly access review by Admin/Owner. Review org_members for inactive users. Review api_keys for unused keys (> 90 days). | Obtain quarterly review records. Verify inactive users and keys were addressed. | Quarterly |
| AM-03 | User deprovisioning is timely | Offboarding checklist: GitHub, GCP IAM, Supabase, API keys. Contractor access removed within 24 hours of contract end. | Sample 5 departures. Verify access removed within policy window. | Annual |
| AM-04 | Privileged access is restricted | Only Owner and Admin roles can: create users, manage connectors, create/revoke API keys, configure security rules, hard purge. Production infrastructure requires GCP IAM with MFA. | Review role assignments. Verify privileged roles are limited and justified. | Quarterly |
| AM-05 | Service account access follows least privilege | Cloud Run, Dagster, BigQuery service accounts have minimum required permissions. No service account has cross-org access. | Review GCP IAM bindings for each service account. Verify no excessive permissions. | Annual |
| AM-06 | Authentication mechanisms are enforced | Supabase Auth (email/password or magic link). JWT with 1-hour expiry. MFA available (TOTP). SSO/SAML for Enterprise. | Verify auth configuration. Test expired token rejection. Verify MFA availability. | Annual |


## 5.2 ITGC Domain 2: Change Management

| Control ID | Control | Implementation | Testing Procedure | Frequency |
| --- | --- | --- | --- | --- |
| CM-01 | All changes require documented authorization | GitHub branch protection: PR required for all merges to main. At least one approval. CI must pass. PR description includes change rationale. | Sample 25 PRs. Verify each has approval, passing CI, and description. | Annual |
| CM-02 | Changes are tested before deployment | CI pipeline: lint, type-check, unit tests, dbt tests, Docker build. All must pass before merge is allowed. dbt tests validate financial transformation integrity. | Review CI pipeline configuration. Sample 10 failed CI runs and verify they blocked deployment. | Annual |
| CM-03 | Deployment to production is controlled | Auto-deploy on merge to main with 5-minute canary monitoring. Auto-rollback if error rate > 1% or health check fails. Deployment history logged in GitHub Actions. | Review deployment pipeline. Sample 5 deployments and verify canary passed. Review any rollback events. | Annual |
| CM-04 | Emergency changes follow expedited but documented process | Emergency hotfix: branch from main, PR with [HOTFIX] prefix, one approval still required, CI must pass. Post-deploy: full post-mortem required within 48 hours. | Review any hotfix PRs. Verify approval and post-mortem exist. | Annual |
| CM-05 | Financial transformation changes are version-tracked | dbt code versioned in Git. gl_export_versions records taxonomy_version and links to pipeline_run.dagster_run_id (which contains git commit SHA). Historical versions are immutable. | Select 5 gl_export_versions records. Trace each to git commit and verify transformation code matches. | Annual |
| CM-06 | Database schema changes are controlled | Supabase migrations stored in version control. Reviewed via PR. No destructive migrations without founder approval. Applied via supabase db push. | Review migration files and associated PRs. Verify no unauthorized schema changes. | Annual |


## 5.3 ITGC Domain 3: Computer Operations

| Control ID | Control | Implementation | Testing Procedure | Frequency |
| --- | --- | --- | --- | --- |
| CO-01 | Job scheduling is authorized and monitored | Dagster manages all pipeline scheduling. Schedule configs stored in pipeline_configs (Supabase). Only Admin/Owner can create or modify schedules. Dagster Cloud provides execution history. | Review Dagster schedule configurations. Verify only authorized schedules exist. Sample 10 pipeline runs and verify correct trigger. | Annual |
| CO-02 | Processing errors are detected and resolved | dbt test failures halt pipeline (no partial output). Error classification: transient (retry) vs. data (fail-fast). Failures logged in pipeline_runs and audit_logs. Notifications sent to configured channels. | Sample 5 pipeline failures. Verify error was logged, classified, and resolved. | Annual |
| CO-03 | System availability is monitored | GCP Cloud Monitoring uptime checks on all public endpoints. Alert policies for downtime (> 5 minutes). Cloud Run auto-restart on container crash. | Review uptime monitoring configuration. Review any downtime incidents and response times. | Monthly |
| CO-04 | Batch processing is complete and accurate | Pipeline runs track record_count_in and record_count_out. dbt reconciliation tests verify counts match. Control totals (debits = credits) verified per period. gl_export_versions records final record count. | Sample 10 pipeline runs. Verify record_count_in matches record_count_out. Verify control totals. | Annual |


## 5.4 ITGC Domain 4: Data Backup and Recovery

| Control ID | Control | Implementation | Testing Procedure | Frequency |
| --- | --- | --- | --- | --- |
| BR-01 | Data is backed up regularly | Supabase: daily automated backups with 7-day point-in-time recovery. BigQuery: datasets are durable by design (Google-managed replication). GCS: objects replicated across zones. | Verify Supabase backup configuration. Verify BigQuery dataset durability settings. Verify GCS replication. | Annual |
| BR-02 | Backup restoration is tested | Quarterly recovery test: restore Supabase to test environment, verify data integrity. BigQuery recovery tested by re-materializing datasets from raw layer. | Obtain quarterly recovery test records. Verify restoration was successful and data integrity confirmed. | Quarterly |
| BR-03 | Backup access is restricted | Supabase backups accessible only via project owner (Supabase dashboard). BigQuery snapshots accessible only via GCP IAM. GCS backup objects in separate bucket with restricted ACL. | Review access controls on backup storage. Verify only authorized personnel can access. | Annual |


# 6. SOX IT Application Controls (ITACs)
ITACs are controls specific to PipeLedger’s financial data processing application. While ITGCs ensure the environment is secure, ITACs ensure the application itself processes financial data with integrity.

| Control ID | Control | Implementation | Testing Procedure | Type |
| --- | --- | --- | --- | --- |
| AC-01 | Input validation at extraction | Pipeline Worker validates ERP API response schema against expected structure. Schema drift (missing or unexpected columns) halts extraction immediately. | Review schema validation logic. Inject a malformed response and verify pipeline halts. | Preventive |
| AC-02 | Transformation completeness | dbt record_count_match test on every model: output rows = input rows. No records may be silently dropped during transformation. | Sample 10 pipeline runs. Verify record_count_in = record_count_out at each transformation stage. | Detective |
| AC-03 | Transformation accuracy (control totals) | dbt control_total test: sum of debit period_movements = sum of credit period_movements per period after balance decomposition. | Sample 5 pipeline runs. Verify control total test passed. For one run, manually verify totals. | Detective |
| AC-04 | Authorization of data delivery | Dual-checkpoint approval: Approver must approve input data and output data before delivery proceeds. Approval recorded in review_checkpoints with reviewer identity and timestamp. | Sample 10 deliveries. Verify each has approved input checkpoint and approved output checkpoint with distinct reviewer. | Preventive |
| AC-05 | Segregation of duties | Person who triggers pipeline run (Operator+) is tracked separately from person who approves checkpoints (Approver+). Application code prevents same user from triggering and approving the same run. | Attempt to approve a checkpoint on a run the same user triggered. Verify system rejects it. | Preventive |
| AC-06 | Version integrity of delivered data | gl_export_versions records: version_number, taxonomy_version, record_count, period range. Only one version per pipeline_config can be delivered at a time. Supersession is automatic and auditable. | Sample 5 supersession events. Verify old version moved to superseded status and new version is the only active delivery. | Detective |
| AC-07 | Revocation and purge integrity | Revocation cascades to all delivery endpoints. MCP/API returns 410 Gone. GCS ACLs removed. Purge deletes mart data but preserves gl_export_versions row. All actions logged in audit_logs. | Trigger a retraction. Verify MCP returns 410, file access revoked, audit_log entries created. | Detective |
| AC-08 | Security tagging accuracy | sec_rls_tags model evaluates every GL record against active security rules. Most restrictive matching rule wins. Records matching no rules default to rls_access_level = all. rls_coverage test: no null access levels. | Review sec_rls_tags logic. Sample 10 records and verify correct access level assignment against active rules. | Detective |


# 7. Audit Trail Architecture
PipeLedger maintains a three-layer audit trail. Together, these layers answer the auditor’s core question: “Who did what, to which data, when, and with what authorization?”

| Layer | Tool | Retention | Immutability | Accessible By |
| --- | --- | --- | --- | --- |
| Application audit trail | Supabase audit_logs table | 7 years (configurable per customer) | Append-only. No UPDATE or DELETE triggers. RLS prevents modification by any role. | Customer: via Activity page (all roles can read). Auditor: via direct query or export. |
| Infrastructure logs | GCP Cloud Logging | 30 days default. Exportable to GCS for long-term retention. | GCP-managed immutability. Cloud Logging entries cannot be modified after creation. | PipeLedger engineering. Customer: on request for their org. |
| Error tracking | Sentry | 90 days | Sentry-managed. Events cannot be modified after capture. | PipeLedger engineering only. |
| Pipeline observability | Dagster Cloud | 90 days (Dagster retention) | Dagster-managed. Execution history is append-only. | PipeLedger engineering. Customer: pipeline status visible in UI. |


Audit trail completeness: Every action that changes the state of financial data or its access controls is recorded in audit_logs. This includes: pipeline status transitions, checkpoint approvals and rejections, export version creation, delivery starts and completions, revocations, retraction, purge events, security rule changes, taxonomy mapping changes, user invitations, API key creation and revocation, and MCP queries (action = mcp_query with details including api_key_id, mcp_resource, rows_returned, rows_redacted).

# 8. Data Retention and Deletion

| Data Type | Default Retention | Deletion Method | Audit Preservation |
| --- | --- | --- | --- |
| Raw ERP extracts (BigQuery) | Retained for duration of customer contract + 90 days | Deleted via automated cleanup job after contract termination + 90-day grace period. | Record of extraction (pipeline_runs) preserved in audit_logs indefinitely. |
| Transformed data (BigQuery) | Retained until superseded or purged | Supersession: old mart data replaced by new version. Purge: Admin/Owner triggers hard delete. | gl_export_versions row preserved with purged = true. audit_logs records purge event. |
| audit_logs (Supabase) | 7 years (configurable) | No deletion mechanism. Append-only. Customer may request retention extension. | The audit trail itself is the preservation mechanism. |
| File exports (GCS) | Retained until revoked or contract termination | On revocation: ACL removed (file inaccessible). On contract termination: file deleted after 90-day grace. | delivery_records row preserved with revoked_at timestamp. |
| ERP credentials (Supabase) | Duration of connector config | Encrypted at rest. Deleted when connector is removed by Admin/Owner. | audit_logs records connector deletion. |
| User data (Supabase Auth) | Duration of account | Account deletion by Owner. Cascades to org_members, removes auth record. | audit_logs records account deletion. Historical actions by that user remain attributed by user_id. |


GDPR and CCPA considerations: PipeLedger processes financial data, not personal data as its primary function. However, GL memo fields may contain names, and org_members stores email addresses. PipeLedger supports data subject access requests (DSARs) by providing an export of all data associated with a user_id. Deletion requests are fulfilled by removing the user account; historical audit_logs entries are anonymized (user_id replaced with a hash) to preserve audit integrity while removing personal identifiers.

# 9. Incident Response

## 9.1 Incident Classification

| Severity | Definition | Example | Response Time | Notification |
| --- | --- | --- | --- | --- |
| SEV-1 (Critical) | Data breach, unauthorized cross-tenant access, financial data corruption. | RLS bypass detected. Customer financial data exposed to wrong tenant. | Immediate (within 15 minutes of detection). All hands. | Customer notified within 24 hours. Founder personally communicates. |
| SEV-2 (High) | Service outage affecting production, data delivery failure, security control failure. | MCP server down for > 15 minutes. Pipeline delivering incorrect data. | Within 1 hour. On-call engineer + founder. | Customer notified within 72 hours via email. |
| SEV-3 (Medium) | Degraded performance, non-critical feature failure, single-customer impact. | Slow BigQuery queries. One customer’s connector failing. | Within 4 hours. On-call engineer. | Customer notified if impacted, via in-app notification. |
| SEV-4 (Low) | Minor bug, cosmetic issue, documentation error. | UI rendering glitch. Incorrect tooltip text. | Next business day. | No customer notification. Fixed in next release. |


## 9.2 Incident Response Procedure

| # | Phase | Actions |
| --- | --- | --- |
| 1 | Detection | Alert received via Sentry, Cloud Monitoring, or customer report. On-call engineer acknowledges within response time SLA. Incident logged in incident tracker with severity, description, and affected customers. |
| 2 | Containment | Immediate actions to limit impact: rollback deployment, disable affected feature, revoke compromised credentials, isolate affected tenant. Priority is stopping the bleeding, not root cause. |
| 3 | Investigation | Determine scope: which customers affected, which data impacted, what timeframe. Preserve evidence: logs, database snapshots, deployment history. Identify root cause. |
| 4 | Remediation | Fix the root cause. Deploy fix through standard PR process (or hotfix process for SEV-1/2). Verify fix resolves the issue. Restore normal operations. |
| 5 | Notification | Notify affected customers per severity SLA. Provide: what happened, what data was affected, what we did to fix it, what we are doing to prevent recurrence. Written communication from founder for SEV-1. |
| 6 | Post-mortem | Written post-mortem within 48 hours (SEV-1/2) or 1 week (SEV-3). Includes: timeline, root cause, impact assessment, remediation actions, preventive measures. Shared internally. Summary shared with affected customers for SEV-1/2. |
| 7 | Prevention | Remediation items tracked as GitHub issues. Control improvements implemented. Risk register updated. Lessons learned incorporated into Developer Workflow doc and this document. |


# 10. Compliance Roadmap

| Timeline | Milestone | Deliverable | Status |
| --- | --- | --- | --- |
| Months 1–6 | Design controls and implement technical infrastructure | This document. All referenced technical documents. RLS, encryption, audit logging, CI/CD pipeline operational. | In progress |
| Months 6–8 | Internal readiness assessment | Internal audit of all controls. Gap analysis. Remediation of identified deficiencies. Evidence collection procedures tested. | Planned |
| Month 8 | Engage SOC 2 auditor | Select CPA firm experienced with SaaS / financial data platforms. Define scope (Security + Availability + Processing Integrity + Confidentiality). | Planned |
| Month 9 | SOC 2 Type I (point-in-time) | Auditor examines control design at a point in time. Produces Type I report. Any findings remediated immediately. | Planned |
| Months 9–12 | SOC 2 Type II observation period | 3-month observation period. Auditor tests operating effectiveness of controls over time. Evidence collection ongoing. | Planned |
| Month 12 | SOC 2 Type II report issued | Independent auditor report covering Security, Availability, Processing Integrity, and Confidentiality. Shared with customers under NDA. | Planned |
| Month 10 | Penetration test | Third-party penetration test. Findings remediated before SOC 2 Type II report issuance. | Planned |
| Ongoing | Annual SOC 2 Type II renewal | Annual audit cycle. Continuous control monitoring via automated tooling. | Recurring |


# 11. Legal and Jurisdiction

| Item | Detail |
| --- | --- |
| Governing law | United States law. PipeLedger AI. is a Wyoming C-Corp. |
| Data processing location | Google Cloud Platform, us-central1 region. All customer financial data processed and stored within the United States. |
| Data processing agreement | Standard DPA available for all customers. GDPR-compatible DPA available for customers with EU data subjects. |
| Sub-processors | GCP (infrastructure), Supabase (operational database), Dagster Cloud (orchestration), Sentry (error tracking). Full sub-processor list maintained and updated with 30-day advance notice to customers. |
| Contractual commitment | Annual contractual commitment. Enterprise customers: custom SLA with uptime commitment, support response times, and data retention terms. |
| Insurance | Cyber liability insurance. Coverage details available to Enterprise customers under NDA. |


END OF SECURITY, SOC 2 & SOX COMPLIANCE FRAMEWORK — v2.0