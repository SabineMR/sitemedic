-- 00005_audit_logging.sql
-- Database-level audit logging for GDPR Article 30 compliance
-- Logs field names only (NOT values) per GDPR Article 5(1)(c) data minimization

-- Create audit_logs table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE', 'SELECT')),
  user_id UUID REFERENCES auth.users(id),
  org_id UUID REFERENCES organizations(id),
  changed_fields JSONB, -- Field names only, NEVER values (GDPR minimization)
  ip_address TEXT, -- Anonymized: first 3 octets only (e.g., "192.168.1.xxx")
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for audit logs
CREATE INDEX idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_org ON audit_logs(org_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_operation ON audit_logs(operation);

-- Enable RLS on audit logs (only admins can access)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can read audit logs"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

COMMENT ON TABLE audit_logs IS 'Audit trail for all health data access. Logs field names only (GDPR data minimization). Admin-only access via RLS.';

-- Trigger function for audit logging
-- Logs INSERT/UPDATE/DELETE operations with field names only
CREATE OR REPLACE FUNCTION log_data_access()
RETURNS TRIGGER AS $$
DECLARE
  changed_fields_array TEXT[];
  anonymized_ip TEXT;
BEGIN
  -- Determine which fields changed (for UPDATE only)
  IF TG_OP = 'UPDATE' THEN
    SELECT array_agg(key)
    INTO changed_fields_array
    FROM jsonb_each(to_jsonb(NEW))
    WHERE to_jsonb(NEW)->>key IS DISTINCT FROM to_jsonb(OLD)->>key;
  END IF;

  -- Anonymize IP address: mask last octet (e.g., "192.168.1.xxx")
  -- GDPR Article 5(1)(c) data minimization: collect only necessary IP portion
  anonymized_ip := regexp_replace(
    COALESCE(inet_client_addr()::text, '0.0.0.0'),
    '\.[0-9]+$',
    '.xxx'
  );

  -- Insert audit log entry
  INSERT INTO audit_logs (
    table_name,
    record_id,
    operation,
    user_id,
    org_id,
    changed_fields,
    ip_address,
    created_at
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    auth.uid(), -- Current authenticated user from JWT
    COALESCE(NEW.org_id, OLD.org_id),
    CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(changed_fields_array) ELSE NULL END,
    anonymized_ip,
    NOW()
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach audit trigger to all health data tables
CREATE TRIGGER audit_workers
  AFTER INSERT OR UPDATE OR DELETE ON workers
  FOR EACH ROW
  EXECUTE FUNCTION log_data_access();

CREATE TRIGGER audit_treatments
  AFTER INSERT OR UPDATE OR DELETE ON treatments
  FOR EACH ROW
  EXECUTE FUNCTION log_data_access();

CREATE TRIGGER audit_near_misses
  AFTER INSERT OR UPDATE OR DELETE ON near_misses
  FOR EACH ROW
  EXECUTE FUNCTION log_data_access();

CREATE TRIGGER audit_safety_checks
  AFTER INSERT OR UPDATE OR DELETE ON safety_checks
  FOR EACH ROW
  EXECUTE FUNCTION log_data_access();

-- ============================================================================
-- Data retention policy for audit logs
-- RIDDOR requires 3-year minimum retention for health and safety records
-- Apply via Supabase Dashboard -> Database -> Extensions -> pg_cron
-- ============================================================================

-- Note: pg_cron schedule must be configured manually in Supabase Dashboard:
-- 1. Go to: Database -> Extensions -> pg_cron
-- 2. Run the following in SQL Editor:
--
-- SELECT cron.schedule(
--   'cleanup-audit-logs',
--   '0 2 * * *', -- Daily at 2 AM UTC
--   $$DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '3 years'$$
-- );
--
-- This ensures audit logs are retained for 3 years (RIDDOR compliance) then auto-deleted.

COMMENT ON FUNCTION log_data_access() IS 'Audit logging trigger function. Logs field names only (GDPR data minimization). Anonymizes IP addresses. Used for GDPR Article 30 compliance.';
