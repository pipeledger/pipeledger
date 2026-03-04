-- ==========================================================================
-- PipeLedger AI — Initial Schema Migration
-- Run once against a fresh Supabase project
-- ==========================================================================

-- Enable pgvector extension for future semantic search
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- ==========================================================================
-- ENUMS
-- ==========================================================================

CREATE TYPE user_role AS ENUM ('owner', 'admin', 'approver', 'operator', 'viewer');

CREATE TYPE pipeline_status AS ENUM (
  'queued', 'extracting', 'input_review', 'transforming',
  'output_review', 'delivering', 'succeeded', 'failed', 'cancelled'
);

CREATE TYPE checkpoint_type AS ENUM ('input', 'output');
CREATE TYPE checkpoint_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');

CREATE TYPE erp_type AS ENUM ('netsuite', 'dynamics365', 'sap', 'coupa', 'csv', 'pigment', 'adaptive', 'anaplan');
CREATE TYPE connector_status AS ENUM ('connected', 'error', 'disconnected', 'pending');

CREATE TYPE delivery_type AS ENUM ('mcp', 'api', 'parquet', 'csv');
CREATE TYPE schedule_type AS ENUM ('manual', 'daily', 'hourly', 'weekly', 'cron');
CREATE TYPE trigger_type AS ENUM ('schedule', 'manual', 'webhook');

CREATE TYPE export_version_status AS ENUM ('draft', 'approved', 'delivered', 'retracted', 'superseded', 'expired');
CREATE TYPE delivery_status AS ENUM ('delivering', 'delivered', 'failed', 'revoked');
CREATE TYPE delivery_endpoint_type AS ENUM ('mcp_server', 'rest_api', 'parquet_export', 'csv_export');

CREATE TYPE taxonomy_mapping_status AS ENUM ('draft', 'approved', 'archived');
CREATE TYPE dimension_type AS ENUM ('department', 'class', 'location', 'project', 'custom_segment');
CREATE TYPE security_rule_type AS ENUM ('account_range', 'dimension_value', 'project_code', 'custom_tag');
CREATE TYPE access_level AS ENUM ('all', 'admin_owner', 'owner_only');
CREATE TYPE budget_mapping_status AS ENUM ('suggested', 'approved', 'unmapped');

CREATE TYPE document_type AS ENUM ('company_overview', 'accounting_procedures', 'organizational_context');
CREATE TYPE document_status AS ENUM ('parsing', 'active', 'inactive', 'error');

CREATE TYPE plan_tier AS ENUM ('premium', 'pro', 'enterprise', 'custom');
CREATE TYPE billing_status AS ENUM ('active', 'grace_period', 'read_only', 'suspended', 'terminated');

CREATE TYPE audit_action AS ENUM (
  'extraction_started', 'extraction_complete',
  'input_approved', 'input_rejected',
  'transform_started', 'transform_complete', 'transform_failed',
  'output_approved', 'output_rejected',
  'delivery_started', 'delivery_complete', 'delivery_revoked',
  'pipeline_cancelled',
  'export_version_created', 'export_version_retracted',
  'export_version_expired', 'export_version_purged',
  'mcp_query', 'api_query',
  'schema_updated', 'security_rule_changed',
  'document_uploaded',
  'user_invited', 'api_key_created', 'api_key_revoked',
  'plan_upgraded', 'plan_downgraded',
  'usage_overage_billed', 'payment_failed', 'payment_succeeded',
  'billing_grace_period', 'account_read_only',
  'account_suspended', 'account_terminated'
);

CREATE TYPE usage_event_type AS ENUM ('fcu', 'fiq');
CREATE TYPE actor_type AS ENUM ('human', 'agent', 'system');

-- ==========================================================================
-- IDENTITY & ACCESS
-- ==========================================================================

CREATE TABLE organizations (
  id                        uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                      text NOT NULL,
  industry                  text,
  reporting_currency        text NOT NULL DEFAULT 'USD',
  fiscal_year_end           text,          -- e.g. '12-31' (MM-DD)
  accounting_standard       text CHECK (accounting_standard IN ('GAAP', 'IFRS')),
  default_delivery_format   text DEFAULT 'json',
  plan_id                   plan_tier NOT NULL DEFAULT 'premium',
  chargebee_customer_id     text,
  chargebee_subscription_id text,
  fcu_included              integer NOT NULL DEFAULT 100000,
  fiq_included              integer NOT NULL DEFAULT 1000,
  billing_status            billing_status NOT NULL DEFAULT 'active',
  billing_status_changed_at timestamptz,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE org_members (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        user_role NOT NULL DEFAULT 'viewer',
  invited_by  uuid REFERENCES auth.users(id),
  joined_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, user_id)
);

CREATE TABLE api_keys (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id       uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  key_hash     text NOT NULL UNIQUE,    -- bcrypt hash of the raw key
  label        text NOT NULL,
  access_level user_role NOT NULL DEFAULT 'viewer',
  created_by   uuid NOT NULL REFERENCES auth.users(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  revoked_at   timestamptz
);

-- ==========================================================================
-- PIPELINE CONFIGURATION
-- ==========================================================================

CREATE TABLE connector_configs (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id                uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  connector_type        erp_type NOT NULL,
  name                  text NOT NULL,
  credentials_encrypted jsonb NOT NULL DEFAULT '{}',  -- encrypted at application layer
  data_scope            jsonb,
  last_sync_at          timestamptz,
  status                connector_status NOT NULL DEFAULT 'disconnected',
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE pipeline_configs (
  id                   uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id               uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name                 text NOT NULL,
  description          text,
  connector_id         uuid NOT NULL REFERENCES connector_configs(id),
  delivery_type        delivery_type NOT NULL DEFAULT 'api',
  delivery_config      jsonb,
  schedule_type        schedule_type NOT NULL DEFAULT 'manual',
  schedule_config      jsonb,
  is_active            boolean NOT NULL DEFAULT true,
  budget_connector_id  uuid REFERENCES connector_configs(id),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE pipeline_runs (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id           uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  pipeline_id      uuid NOT NULL REFERENCES pipeline_configs(id) ON DELETE CASCADE,
  status           pipeline_status NOT NULL DEFAULT 'queued',
  started_at       timestamptz NOT NULL DEFAULT now(),
  completed_at     timestamptz,
  record_count_in  integer,
  record_count_out integer,
  error_message    text,
  triggered_by     trigger_type NOT NULL DEFAULT 'manual',
  dagster_run_id   text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- ==========================================================================
-- REVIEW, APPROVAL & DELIVERY
-- ==========================================================================

CREATE TABLE review_checkpoints (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id           uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  pipeline_run_id  uuid NOT NULL REFERENCES pipeline_runs(id) ON DELETE CASCADE,
  checkpoint_type  checkpoint_type NOT NULL,
  status           checkpoint_status NOT NULL DEFAULT 'pending',
  quality_checks   jsonb,
  record_count     integer,
  sample_data      jsonb,       -- first 20 records for preview
  reviewed_by      uuid REFERENCES auth.users(id),
  reviewed_at      timestamptz,
  rejection_reason text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE gl_export_versions (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id            uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  pipeline_run_id   uuid NOT NULL REFERENCES pipeline_runs(id),
  version_number    integer NOT NULL,
  status            export_version_status NOT NULL DEFAULT 'draft',
  record_count      integer,
  period_start      date,
  period_end        date,
  taxonomy_version  integer,
  approved_by       uuid REFERENCES auth.users(id),
  approved_at       timestamptz,
  delivered_at      timestamptz,
  retracted_by      uuid REFERENCES auth.users(id),
  retracted_at      timestamptz,
  retraction_reason text,
  purged            boolean NOT NULL DEFAULT false,
  purged_by         uuid REFERENCES auth.users(id),
  purged_at         timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE delivery_records (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id             uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  pipeline_run_id    uuid NOT NULL REFERENCES pipeline_runs(id),
  export_version_id  uuid NOT NULL REFERENCES gl_export_versions(id),
  delivery_type      delivery_endpoint_type NOT NULL,
  delivery_target    text,
  status             delivery_status NOT NULL DEFAULT 'delivering',
  record_count       integer,
  delivered_at       timestamptz,
  revoked_at         timestamptz,
  revoked_by         uuid REFERENCES auth.users(id),
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- ==========================================================================
-- TRANSFORMATION CONFIGURATION
-- ==========================================================================

CREATE TABLE taxonomy_mappings (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id           uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  connector_id     uuid NOT NULL REFERENCES connector_configs(id),
  version          integer NOT NULL DEFAULT 1,
  status           taxonomy_mapping_status NOT NULL DEFAULT 'draft',
  account_number   text NOT NULL,
  account_name     text,
  account_type     text,
  taxonomy_path    text,
  confidence_score numeric(4,3),
  mapped_by        uuid REFERENCES auth.users(id),
  approved_by      uuid REFERENCES auth.users(id),
  approved_at      timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE dimension_labels (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id           uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  connector_id     uuid NOT NULL REFERENCES connector_configs(id),
  dimension_type   dimension_type NOT NULL,
  dimension_code   text NOT NULL,
  erp_name         text,
  auto_label_path  text,
  override_label   text,
  description      text,
  parent_code      text,
  hierarchy_level  integer NOT NULL DEFAULT 1,
  updated_by       uuid REFERENCES auth.users(id),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, connector_id, dimension_type, dimension_code)
);

CREATE TABLE security_rules (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id       uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  rule_type    security_rule_type NOT NULL,
  rule_config  jsonb NOT NULL,
  access_level access_level NOT NULL DEFAULT 'admin_owner',
  label        text NOT NULL,
  is_active    boolean NOT NULL DEFAULT true,
  created_by   uuid NOT NULL REFERENCES auth.users(id),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE budget_dimension_mappings (
  id                   uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id               uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  budget_connector_id  uuid NOT NULL REFERENCES connector_configs(id),
  dimension_type       dimension_type NOT NULL,
  fpa_value            text NOT NULL,
  gl_value             text NOT NULL,
  confidence_score     numeric(4,3),
  status               budget_mapping_status NOT NULL DEFAULT 'suggested',
  mapped_by            uuid REFERENCES auth.users(id),
  created_at           timestamptz NOT NULL DEFAULT now()
);

-- ==========================================================================
-- DOCUMENTS & ENRICHMENT
-- ==========================================================================

CREATE TABLE company_documents (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  filename        text NOT NULL,
  document_type   document_type NOT NULL,
  file_path_gcs   text,
  page_count      integer,
  snippet_count   integer,
  status          document_status NOT NULL DEFAULT 'parsing',
  parsed_at       timestamptz,
  uploaded_by     uuid NOT NULL REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE document_snippets (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id           uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  document_id      uuid NOT NULL REFERENCES company_documents(id) ON DELETE CASCADE,
  chunk_index      integer NOT NULL,
  content          text NOT NULL,
  metadata         jsonb,
  embedding_vector vector(1536),   -- for future semantic search
  UNIQUE (document_id, chunk_index)
);

-- ==========================================================================
-- AUDIT TRAIL (immutable — no UPDATE or DELETE)
-- ==========================================================================

CREATE TABLE audit_logs (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          uuid NOT NULL REFERENCES organizations(id),
  timestamp       timestamptz NOT NULL DEFAULT now(),
  user_id         uuid REFERENCES auth.users(id),
  action          audit_action NOT NULL,
  pipeline_run_id uuid REFERENCES pipeline_runs(id),
  record_count    integer,
  details         jsonb,
  ip_address      inet
);

-- Prevent any UPDATE or DELETE on audit_logs
CREATE OR REPLACE RULE audit_logs_no_update AS ON UPDATE TO audit_logs DO INSTEAD NOTHING;
CREATE OR REPLACE RULE audit_logs_no_delete AS ON DELETE TO audit_logs DO INSTEAD NOTHING;

-- ==========================================================================
-- USAGE & BILLING (immutable — append-only)
-- ==========================================================================

CREATE TABLE usage_events (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id           uuid NOT NULL REFERENCES organizations(id),
  actor_type       actor_type NOT NULL DEFAULT 'human',
  actor_id         uuid,
  event_type       usage_event_type NOT NULL,
  quantity         integer NOT NULL DEFAULT 1,
  fiq_weight       integer,
  pipeline_run_id  uuid REFERENCES pipeline_runs(id),
  mcp_resource     text,
  bq_bytes_scanned bigint,
  token_count      integer,
  rows_processed   integer,
  billing_period   text NOT NULL,   -- format: '2026-03'
  created_at       timestamptz NOT NULL DEFAULT now(),
  -- FCU deduplication: one row per pipeline run per billing period
  UNIQUE NULLS NOT DISTINCT (org_id, pipeline_run_id, billing_period, event_type)
);

CREATE OR REPLACE RULE usage_events_no_update AS ON UPDATE TO usage_events DO INSTEAD NOTHING;
CREATE OR REPLACE RULE usage_events_no_delete AS ON DELETE TO usage_events DO INSTEAD NOTHING;

CREATE TABLE usage_daily_summary (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id             uuid NOT NULL REFERENCES organizations(id),
  billing_period     text NOT NULL,
  summary_date       date NOT NULL,
  fcu_quantity       integer NOT NULL DEFAULT 0,
  fiq_quantity       integer NOT NULL DEFAULT 0,
  fiq_weighted_total integer NOT NULL DEFAULT 0,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, billing_period, summary_date)
);

-- ==========================================================================
-- INDEXES (performance)
-- ==========================================================================

CREATE INDEX idx_org_members_user_id   ON org_members(user_id);
CREATE INDEX idx_org_members_org_id    ON org_members(org_id);
CREATE INDEX idx_pipeline_runs_org_id  ON pipeline_runs(org_id);
CREATE INDEX idx_pipeline_runs_status  ON pipeline_runs(status);
CREATE INDEX idx_pipeline_runs_pipeline_id ON pipeline_runs(pipeline_id);
CREATE INDEX idx_review_checkpoints_run_id ON review_checkpoints(pipeline_run_id);
CREATE INDEX idx_audit_logs_org_id     ON audit_logs(org_id);
CREATE INDEX idx_audit_logs_timestamp  ON audit_logs(timestamp DESC);
CREATE INDEX idx_usage_events_org_id   ON usage_events(org_id);
CREATE INDEX idx_usage_events_billing  ON usage_events(org_id, billing_period);

-- ==========================================================================
-- ROW-LEVEL SECURITY
-- ==========================================================================

ALTER TABLE organizations          ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members            ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys               ENABLE ROW LEVEL SECURITY;
ALTER TABLE connector_configs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_configs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_runs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_checkpoints     ENABLE ROW LEVEL SECURITY;
ALTER TABLE gl_export_versions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_records       ENABLE ROW LEVEL SECURITY;
ALTER TABLE taxonomy_mappings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE dimension_labels       ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_rules         ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_dimension_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_documents      ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_snippets      ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_events           ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_daily_summary    ENABLE ROW LEVEL SECURITY;

-- Helper function: get the current user's org_id and role for a given org
CREATE OR REPLACE FUNCTION current_user_org_role(p_org_id uuid)
RETURNS user_role
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT role FROM org_members
  WHERE org_id = p_org_id AND user_id = auth.uid()
  LIMIT 1;
$$;

-- Helper function: check if current user is a member of an org
CREATE OR REPLACE FUNCTION is_org_member(p_org_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_members
    WHERE org_id = p_org_id AND user_id = auth.uid()
  );
$$;

-- Helper function: check if current user is admin or owner in an org
CREATE OR REPLACE FUNCTION is_admin_or_owner(p_org_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_members
    WHERE org_id = p_org_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
  );
$$;

-- organizations: members see their org
CREATE POLICY "org_members_can_read_own_org" ON organizations
  FOR SELECT USING (is_org_member(id));

CREATE POLICY "owners_can_update_org" ON organizations
  FOR UPDATE USING (current_user_org_role(id) = 'owner');

-- org_members: users see memberships for their orgs
CREATE POLICY "members_can_read_org_members" ON org_members
  FOR SELECT USING (is_org_member(org_id));

CREATE POLICY "admins_can_insert_members" ON org_members
  FOR INSERT WITH CHECK (is_admin_or_owner(org_id));

CREATE POLICY "admins_can_delete_members" ON org_members
  FOR DELETE USING (is_admin_or_owner(org_id));

-- api_keys: org-scoped, admin+ manage
CREATE POLICY "members_can_read_api_keys" ON api_keys
  FOR SELECT USING (is_org_member(org_id));

CREATE POLICY "admins_can_manage_api_keys" ON api_keys
  FOR ALL USING (is_admin_or_owner(org_id));

-- connector_configs: org-scoped
CREATE POLICY "members_can_read_connectors" ON connector_configs
  FOR SELECT USING (is_org_member(org_id));

CREATE POLICY "admins_can_manage_connectors" ON connector_configs
  FOR ALL USING (is_admin_or_owner(org_id));

-- pipeline_configs: org-scoped
CREATE POLICY "members_can_read_pipeline_configs" ON pipeline_configs
  FOR SELECT USING (is_org_member(org_id));

CREATE POLICY "admins_can_manage_pipeline_configs" ON pipeline_configs
  FOR ALL USING (is_admin_or_owner(org_id));

-- pipeline_runs: all org members can read; operators+ trigger
CREATE POLICY "members_can_read_pipeline_runs" ON pipeline_runs
  FOR SELECT USING (is_org_member(org_id));

CREATE POLICY "operators_can_insert_runs" ON pipeline_runs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_id = pipeline_runs.org_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin', 'approver', 'operator')
    )
  );

CREATE POLICY "system_can_update_runs" ON pipeline_runs
  FOR UPDATE USING (is_org_member(org_id));

-- review_checkpoints: all org members read; approver+ update
CREATE POLICY "members_can_read_checkpoints" ON review_checkpoints
  FOR SELECT USING (is_org_member(org_id));

CREATE POLICY "approvers_can_update_checkpoints" ON review_checkpoints
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_id = review_checkpoints.org_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin', 'approver')
    )
  );

-- gl_export_versions: org-scoped
CREATE POLICY "members_can_read_export_versions" ON gl_export_versions
  FOR SELECT USING (is_org_member(org_id));

CREATE POLICY "admins_can_manage_export_versions" ON gl_export_versions
  FOR ALL USING (is_admin_or_owner(org_id));

-- delivery_records: org-scoped read
CREATE POLICY "members_can_read_delivery_records" ON delivery_records
  FOR SELECT USING (is_org_member(org_id));

CREATE POLICY "admins_can_manage_delivery_records" ON delivery_records
  FOR ALL USING (is_admin_or_owner(org_id));

-- taxonomy_mappings: all read; admin+ write
CREATE POLICY "members_can_read_taxonomy_mappings" ON taxonomy_mappings
  FOR SELECT USING (is_org_member(org_id));

CREATE POLICY "admins_can_manage_taxonomy_mappings" ON taxonomy_mappings
  FOR ALL USING (is_admin_or_owner(org_id));

-- dimension_labels: all read; admin+ write
CREATE POLICY "members_can_read_dimension_labels" ON dimension_labels
  FOR SELECT USING (is_org_member(org_id));

CREATE POLICY "admins_can_manage_dimension_labels" ON dimension_labels
  FOR ALL USING (is_admin_or_owner(org_id));

-- security_rules: admin+ only
CREATE POLICY "admins_can_manage_security_rules" ON security_rules
  FOR ALL USING (is_admin_or_owner(org_id));

-- budget_dimension_mappings: all read; admin+ write
CREATE POLICY "members_can_read_budget_mappings" ON budget_dimension_mappings
  FOR SELECT USING (is_org_member(org_id));

CREATE POLICY "admins_can_manage_budget_mappings" ON budget_dimension_mappings
  FOR ALL USING (is_admin_or_owner(org_id));

-- company_documents: all read; admin+ manage
CREATE POLICY "members_can_read_documents" ON company_documents
  FOR SELECT USING (is_org_member(org_id));

CREATE POLICY "admins_can_manage_documents" ON company_documents
  FOR ALL USING (is_admin_or_owner(org_id));

-- document_snippets: all read (no write from UI — written by backend)
CREATE POLICY "members_can_read_snippets" ON document_snippets
  FOR SELECT USING (is_org_member(org_id));

-- audit_logs: all org members can read, no one can update/delete (enforced by rules above)
CREATE POLICY "members_can_read_audit_logs" ON audit_logs
  FOR SELECT USING (is_org_member(org_id));

CREATE POLICY "system_can_insert_audit_logs" ON audit_logs
  FOR INSERT WITH CHECK (is_org_member(org_id));

-- usage_events: org-scoped read, system-only write (enforced separately by service role)
CREATE POLICY "members_can_read_usage_events" ON usage_events
  FOR SELECT USING (is_org_member(org_id));

CREATE POLICY "system_can_insert_usage_events" ON usage_events
  FOR INSERT WITH CHECK (is_org_member(org_id));

-- usage_daily_summary: org-scoped read
CREATE POLICY "members_can_read_usage_summary" ON usage_daily_summary
  FOR SELECT USING (is_org_member(org_id));

-- ==========================================================================
-- HELPER RPCs (called from application code)
-- ==========================================================================

-- Auto-update updated_at on tables that have it
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER connector_configs_updated_at
  BEFORE UPDATE ON connector_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER pipeline_configs_updated_at
  BEFORE UPDATE ON pipeline_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER usage_daily_summary_updated_at
  BEFORE UPDATE ON usage_daily_summary
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
