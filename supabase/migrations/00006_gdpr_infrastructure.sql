-- 00006_gdpr_infrastructure.sql
-- GDPR compliance infrastructure for consent management, data erasure, and retention tracking

-- ============================================================================
-- Consent Records Table (GDPR Article 7)
-- ============================================================================
-- Tracks worker consent for data processing, health data collection, and photo capture

CREATE TABLE consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES workers(id),
  org_id UUID NOT NULL REFERENCES organizations(id),
  consent_type TEXT NOT NULL, -- e.g., 'data_processing', 'health_data', 'photo_capture'
  granted BOOLEAN NOT NULL,
  granted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  signature_uri TEXT, -- Digital signature image (Supabase Storage URL)
  ip_address TEXT, -- Anonymized IP for consent audit trail
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for consent_records
CREATE INDEX idx_consent_records_worker_id ON consent_records(worker_id);
CREATE INDEX idx_consent_records_org_id ON consent_records(org_id);
CREATE INDEX idx_consent_records_consent_type ON consent_records(consent_type);
CREATE INDEX idx_consent_records_granted_at ON consent_records(granted_at);

-- Enable RLS on consent_records
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;

-- Users can read consent records in their organization
CREATE POLICY "Users can read consent records in their org"
  ON consent_records
  FOR SELECT
  TO authenticated
  USING (org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid);

-- Users can insert consent records in their organization
CREATE POLICY "Users can insert consent records in their org"
  ON consent_records
  FOR INSERT
  TO authenticated
  WITH CHECK (org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid);

-- Users can update consent records in their organization (e.g., revoke consent)
CREATE POLICY "Users can update consent records in their org"
  ON consent_records
  FOR UPDATE
  TO authenticated
  USING (org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid)
  WITH CHECK (org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid);

COMMENT ON TABLE consent_records IS 'GDPR Article 7 consent records. Tracks worker consent for data processing with digital signatures and audit trail. Supports consent withdrawal (right to object).';

-- ============================================================================
-- Erasure Requests Table (GDPR Article 17)
-- ============================================================================
-- Tracks "right to erasure" (right to be forgotten) requests

CREATE TABLE erasure_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES workers(id),
  org_id UUID NOT NULL REFERENCES organizations(id),
  requested_by UUID REFERENCES profiles(id), -- Who submitted the erasure request
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'rejected')) DEFAULT 'pending',
  reason TEXT, -- Reason for rejection (if status = 'rejected')
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for erasure_requests
CREATE INDEX idx_erasure_requests_worker_id ON erasure_requests(worker_id);
CREATE INDEX idx_erasure_requests_org_id ON erasure_requests(org_id);
CREATE INDEX idx_erasure_requests_status ON erasure_requests(status);
CREATE INDEX idx_erasure_requests_created_at ON erasure_requests(created_at);

-- Enable RLS on erasure_requests
ALTER TABLE erasure_requests ENABLE ROW LEVEL SECURITY;

-- Users can read erasure requests in their organization
CREATE POLICY "Users can read erasure requests in their org"
  ON erasure_requests
  FOR SELECT
  TO authenticated
  USING (org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid);

-- Users can insert erasure requests in their organization
CREATE POLICY "Users can insert erasure requests in their org"
  ON erasure_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid);

-- Only admins can update erasure request status
CREATE POLICY "Only admins can update erasure requests"
  ON erasure_requests
  FOR UPDATE
  TO authenticated
  USING (
    org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  WITH CHECK (
    org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

COMMENT ON TABLE erasure_requests IS 'GDPR Article 17 erasure requests (right to be forgotten). Admin-only approval workflow. Does NOT auto-delete—manual review required due to RIDDOR 3-year retention requirement.';

-- ============================================================================
-- Data Retention Log Table
-- ============================================================================
-- Tracks automated data retention policy execution (e.g., pg_cron cleanup jobs)

CREATE TABLE data_retention_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  records_deleted INTEGER NOT NULL,
  retention_period INTERVAL NOT NULL, -- e.g., '3 years' for RIDDOR
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for data_retention_log
CREATE INDEX idx_data_retention_log_table_name ON data_retention_log(table_name);
CREATE INDEX idx_data_retention_log_executed_at ON data_retention_log(executed_at);

-- Enable RLS on data_retention_log
ALTER TABLE data_retention_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read retention logs
CREATE POLICY "Only admins can read retention logs"
  ON data_retention_log
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- System can insert retention logs (SECURITY DEFINER function)
CREATE POLICY "System can insert retention logs"
  ON data_retention_log
  FOR INSERT
  TO authenticated
  WITH CHECK (TRUE); -- Allow inserts from scheduled jobs

COMMENT ON TABLE data_retention_log IS 'Tracks automated data retention policy execution. Admin-only visibility. Used for compliance audits.';

-- ============================================================================
-- pg_cron schedule for automated retention (apply manually via SQL Editor)
-- ============================================================================

-- IMPORTANT: Do NOT auto-delete health data tables (treatments, workers, etc.)
-- RIDDOR requires 3-year minimum retention for health and safety records.
-- Erasure ONLY via explicit erasure_requests workflow (manual admin approval).

-- However, audit logs can be auto-deleted after 3 years:
--
-- SELECT cron.schedule(
--   'cleanup-audit-logs',
--   '0 2 * * *', -- Daily at 2 AM UTC
--   $$
--   WITH deleted AS (
--     DELETE FROM audit_logs
--     WHERE created_at < NOW() - INTERVAL '3 years'
--     RETURNING *
--   )
--   INSERT INTO data_retention_log (table_name, records_deleted, retention_period)
--   VALUES ('audit_logs', (SELECT COUNT(*) FROM deleted), INTERVAL '3 years');
--   $$
-- );

-- Note: This schedule must be applied via Supabase Dashboard SQL Editor:
-- Dashboard -> SQL Editor -> New Query -> paste above code -> Run
