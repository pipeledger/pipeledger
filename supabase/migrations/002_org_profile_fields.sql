-- ─────────────────────────────────────────────────────────────────────────────
-- 002_org_profile_fields.sql
-- Extends the organizations table with structured profile fields collected
-- during onboarding to improve AI context and pipeline configuration.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS accounting_framework        text,
  ADD COLUMN IF NOT EXISTS accounting_framework_other  text,
  ADD COLUMN IF NOT EXISTS reporting_frameworks        text[],
  ADD COLUMN IF NOT EXISTS consolidation_structure     text,
  ADD COLUMN IF NOT EXISTS regulatory_oversight        text,
  ADD COLUMN IF NOT EXISTS costing_method              text;

COMMENT ON COLUMN organizations.accounting_framework       IS 'Primary accounting framework: US GAAP | IFRS | Local GAAP | Other';
COMMENT ON COLUMN organizations.accounting_framework_other IS 'Free-text description when accounting_framework = Other';
COMMENT ON COLUMN organizations.reporting_frameworks       IS 'Array of reporting frameworks the org produces (multi-select)';
COMMENT ON COLUMN organizations.consolidation_structure    IS 'single_entity | multi_entity_domestic | consolidation | multi_entity_international';
COMMENT ON COLUMN organizations.regulatory_oversight       IS 'public_pcaob | private_aicpa | pe_backed | venture_backed | non_audited';
COMMENT ON COLUMN organizations.costing_method             IS 'standard_cost | fifo | weighted_average | not_applicable';
