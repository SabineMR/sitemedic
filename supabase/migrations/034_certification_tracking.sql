-- 031_certification_tracking.sql
-- Certification Tracking Infrastructure
-- Phase 7: Certification Tracking - Plan 01
--
-- Purpose: Create database infrastructure for UK construction certification tracking
-- Provides: GIN index on JSONB certifications, audit trail table, RPC functions for expiry queries
--
-- Dependencies:
--   - medics.certifications JSONB column (from 002_business_operations.sql)
--   - organizations table (multi-tenant support)

-- =============================================
-- 1. GIN Index for JSONB Performance
-- =============================================
-- Enables fast queries on medics.certifications JSONB array
-- Supports expiry date extraction and certification type filtering
CREATE INDEX IF NOT EXISTS idx_medics_certifications_gin
ON medics USING GIN (certifications);

COMMENT ON INDEX idx_medics_certifications_gin IS 'GIN index for fast JSONB queries on certification expiry dates and types';

-- =============================================
-- 2. Certification Reminders Audit Table
-- =============================================
-- Tracks sent reminders to prevent duplicates and provide compliance audit trail
CREATE TABLE IF NOT EXISTS certification_reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  medic_id UUID NOT NULL REFERENCES medics(id) ON DELETE CASCADE,
  cert_type TEXT NOT NULL, -- 'CSCS', 'CPCS', 'IPAF', 'PASMA', 'Gas Safe'
  days_before INT NOT NULL, -- 30, 14, 7, 1
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resend_message_id TEXT, -- Resend API message ID for delivery tracking
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for duplicate checking and org-scoped queries
CREATE INDEX IF NOT EXISTS idx_certification_reminders_lookup
ON certification_reminders(medic_id, cert_type, days_before, sent_at);

CREATE INDEX IF NOT EXISTS idx_certification_reminders_org
ON certification_reminders(org_id);

COMMENT ON TABLE certification_reminders IS 'Audit trail of certification expiry reminders sent via email - prevents duplicates and provides compliance proof';

-- =============================================
-- 3. Row Level Security for certification_reminders
-- =============================================
ALTER TABLE certification_reminders ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view reminders for their organization
CREATE POLICY certification_reminders_select_policy ON certification_reminders
  FOR SELECT
  USING (
    org_id = (
      SELECT org_id FROM medics WHERE id = auth.uid()
    )
  );

-- =============================================
-- 4. PostgreSQL Function: Get Certifications Expiring in N Days
-- =============================================
-- Returns medics with certifications expiring exactly N days from now
-- Used by daily cron job for progressive reminder stages (30, 14, 7, 1 days)
CREATE OR REPLACE FUNCTION get_certifications_expiring_in_days(days_ahead INT)
RETURNS TABLE (
  medic_id UUID,
  medic_first_name TEXT,
  medic_last_name TEXT,
  medic_email TEXT,
  cert_type TEXT,
  cert_number TEXT,
  expiry_date DATE,
  expiry_date_formatted TEXT,
  days_remaining INT,
  renewal_url TEXT,
  org_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.first_name,
    m.last_name,
    m.email,
    cert->>'type' AS cert_type,
    cert->>'cert_number' AS cert_number,
    (cert->>'expiry_date')::date AS expiry_date,
    TO_CHAR((cert->>'expiry_date')::date, 'DD Mon YYYY') AS expiry_date_formatted,
    days_ahead AS days_remaining,
    CASE
      WHEN cert->>'type' = 'CSCS' THEN 'https://www.cscs.uk.com/apply-for-card/'
      WHEN cert->>'type' = 'CPCS' THEN 'https://www.cpcscards.com/renewal'
      WHEN cert->>'type' = 'IPAF' THEN 'https://www.ipaf.org/en/training'
      WHEN cert->>'type' = 'PASMA' THEN 'https://www.pasma.co.uk/training'
      WHEN cert->>'type' = 'Gas Safe' THEN 'https://www.gassaferegister.co.uk/'
      ELSE NULL
    END AS renewal_url,
    m.org_id
  FROM medics m,
       jsonb_array_elements(m.certifications) AS cert
  WHERE
    (cert->>'expiry_date')::date = CURRENT_DATE + days_ahead
    AND m.available_for_work = true
    AND m.email IS NOT NULL
  ORDER BY m.last_name, m.first_name;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_certifications_expiring_in_days IS 'Returns medics with certifications expiring in exactly N days ahead - for progressive reminder system';

-- =============================================
-- 5. PostgreSQL Function: Get Certification Summary by Organization
-- =============================================
-- Returns compliance overview for all medics in an organization
-- Used by dashboard to show certification status at a glance
CREATE OR REPLACE FUNCTION get_certification_summary_by_org(p_org_id UUID)
RETURNS TABLE (
  medic_id UUID,
  medic_name TEXT,
  total_certs INT,
  expired_certs INT,
  expiring_soon_certs INT,
  valid_certs INT,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.first_name || ' ' || m.last_name AS medic_name,
    jsonb_array_length(m.certifications) AS total_certs,
    (
      SELECT COUNT(*)::INT
      FROM jsonb_array_elements(m.certifications) AS cert
      WHERE (cert->>'expiry_date')::date < CURRENT_DATE
    ) AS expired_certs,
    (
      SELECT COUNT(*)::INT
      FROM jsonb_array_elements(m.certifications) AS cert
      WHERE (cert->>'expiry_date')::date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
    ) AS expiring_soon_certs,
    (
      SELECT COUNT(*)::INT
      FROM jsonb_array_elements(m.certifications) AS cert
      WHERE (cert->>'expiry_date')::date > CURRENT_DATE + INTERVAL '30 days'
    ) AS valid_certs,
    CASE
      WHEN EXISTS (
        SELECT 1
        FROM jsonb_array_elements(m.certifications) AS cert
        WHERE (cert->>'expiry_date')::date < CURRENT_DATE
      ) THEN 'non-compliant'
      WHEN EXISTS (
        SELECT 1
        FROM jsonb_array_elements(m.certifications) AS cert
        WHERE (cert->>'expiry_date')::date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
      ) THEN 'at-risk'
      ELSE 'compliant'
    END AS status
  FROM medics m
  WHERE m.org_id = p_org_id
    AND jsonb_array_length(m.certifications) > 0
  ORDER BY
    CASE
      WHEN status = 'non-compliant' THEN 1
      WHEN status = 'at-risk' THEN 2
      ELSE 3
    END,
    medic_name;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_certification_summary_by_org IS 'Returns certification compliance summary for all medics in an organization - used by dashboard';

-- =============================================
-- 6. PostgreSQL Function: Get Expired Cert Count by Organization
-- =============================================
-- Returns count of distinct medics with at least one expired certification
-- Used by compliance score to replace hardcoded 0
CREATE OR REPLACE FUNCTION get_expired_cert_count_by_org(p_org_id UUID)
RETURNS INT AS $$
DECLARE
  expired_count INT;
BEGIN
  SELECT COUNT(DISTINCT m.id)::INT INTO expired_count
  FROM medics m,
       jsonb_array_elements(m.certifications) AS cert
  WHERE m.org_id = p_org_id
    AND (cert->>'expiry_date')::date < CURRENT_DATE;

  RETURN expired_count;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_expired_cert_count_by_org IS 'Returns count of distinct medics with at least one expired certification - for compliance score calculation';

-- =============================================
-- Migration Complete
-- =============================================
-- Next steps:
--   - Create Edge Function: certification-expiry-checker (Plan 02)
--   - Schedule daily pg_cron job (Plan 02)
--   - Build dashboard UI (Plan 03)
