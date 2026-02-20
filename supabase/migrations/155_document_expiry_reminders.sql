-- 155_document_expiry_reminders.sql
-- Document Expiry Tracking & Progressive Alerts
-- Phase 46: Expiry Tracking & Alerts - Plan 01
--
-- Purpose: Create database infrastructure for progressive document expiry alerts.
-- Medics receive daily digest emails at 30/14/7/1 days before a document expires.
-- Org admins receive org-wide digest at critical stages (14/7/1 days).
-- Deduplication prevents the same document+stage combination from generating duplicate emails.
--
-- Dependencies:
--   - documents, document_versions tables (from 143_comms_docs_schema.sql)
--   - medics table (from 002_business_operations.sql)
--   - organizations table
--   - Edge Function: document-expiry-checker (this migration's pg_cron job calls it)
--   - Vault secrets: project_url, service_role_key

-- =============================================
-- 1. Document Expiry Reminders Audit Table
-- =============================================
-- Tracks sent reminders to prevent duplicates and provide compliance audit trail.
-- Each row = one document's alert at a specific stage for a specific recipient type.
CREATE TABLE IF NOT EXISTS document_expiry_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  document_version_id UUID NOT NULL REFERENCES document_versions(id) ON DELETE CASCADE,
  medic_id UUID NOT NULL REFERENCES medics(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  days_before INT NOT NULL, -- 30, 14, 7, 1
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resend_message_id TEXT, -- Resend API message ID for delivery tracking (nullable)
  recipient_type TEXT NOT NULL DEFAULT 'medic' CHECK (recipient_type IN ('medic', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Composite index for deduplication: one alert per document_version + stage + recipient_type
CREATE INDEX IF NOT EXISTS idx_doc_expiry_reminders_dedup
  ON document_expiry_reminders(document_version_id, days_before, recipient_type);

-- Org-scoped queries (admin dashboard, compliance reports)
CREATE INDEX IF NOT EXISTS idx_doc_expiry_reminders_org
  ON document_expiry_reminders(org_id);

-- Per-medic lookups (medic alert history)
CREATE INDEX IF NOT EXISTS idx_doc_expiry_reminders_medic
  ON document_expiry_reminders(medic_id);

COMMENT ON TABLE document_expiry_reminders IS 'Audit trail of document expiry reminders sent via email - prevents duplicates and provides compliance proof';

-- =============================================
-- 2. Row Level Security for document_expiry_reminders
-- =============================================
ALTER TABLE document_expiry_reminders ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view reminders for their organization
CREATE POLICY "Org users can view document expiry reminders"
  ON document_expiry_reminders
  FOR SELECT
  USING (org_id = (SELECT get_user_org_id()));

-- Platform admin full access
CREATE POLICY "Platform admin full access to document expiry reminders"
  ON document_expiry_reminders
  FOR ALL
  USING (is_platform_admin());

-- =============================================
-- 3. RPC Function: Get Documents Expiring in N Days
-- =============================================
-- Returns documents with current version expiry_date exactly N days from now.
-- Used by the daily cron Edge Function for progressive reminder stages (30, 14, 7, 1 days).
-- Only queries the CURRENT version (via documents.current_version_id).
-- Excludes NULL expiry_date and archived documents.
CREATE OR REPLACE FUNCTION get_documents_expiring_in_days(days_ahead INT)
RETURNS TABLE (
  document_id UUID,
  document_version_id UUID,
  medic_id UUID,
  medic_first_name TEXT,
  medic_last_name TEXT,
  medic_email TEXT,
  org_id UUID,
  category_name TEXT,
  file_name TEXT,
  expiry_date DATE,
  expiry_date_formatted TEXT,
  days_remaining INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id AS document_id,
    dv.id AS document_version_id,
    d.medic_id,
    m.first_name AS medic_first_name,
    m.last_name AS medic_last_name,
    m.email AS medic_email,
    d.org_id,
    dc.name AS category_name,
    dv.file_name,
    dv.expiry_date,
    TO_CHAR(dv.expiry_date, 'DD Mon YYYY') AS expiry_date_formatted,
    days_ahead AS days_remaining
  FROM documents d
  JOIN document_versions dv ON dv.id = d.current_version_id
  JOIN medics m ON m.id = d.medic_id
  JOIN document_categories dc ON dc.id = d.category_id
  WHERE dv.expiry_date = CURRENT_DATE + days_ahead
    AND dv.expiry_date IS NOT NULL
    AND d.status NOT IN ('archived')
    AND m.email IS NOT NULL
  ORDER BY d.org_id, m.last_name, m.first_name;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_documents_expiring_in_days IS 'Returns documents with current version expiring in exactly N days - for progressive document expiry reminder system';

-- =============================================
-- 4. Function: Mark Expired Documents
-- =============================================
-- Updates documents.status to 'expired' for documents whose current version
-- has an expiry_date in the past. Excludes already archived or expired documents.
-- Called by the daily cron Edge Function after processing all reminder stages.
CREATE OR REPLACE FUNCTION mark_expired_documents()
RETURNS void AS $$
BEGIN
  UPDATE documents d
  SET status = 'expired',
      updated_at = NOW()
  FROM document_versions dv
  WHERE dv.id = d.current_version_id
    AND dv.expiry_date IS NOT NULL
    AND dv.expiry_date < CURRENT_DATE
    AND d.status NOT IN ('archived', 'expired');
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

COMMENT ON FUNCTION mark_expired_documents IS 'Sets documents.status to expired for documents whose current version expiry_date has passed - run daily by cron';

-- =============================================
-- 5. pg_cron Job: Daily Document Expiry Checker
-- =============================================
-- Runs daily at 08:00 UTC (8am GMT / 9am BST)
-- Calls the document-expiry-checker Edge Function via pg_net
-- Uses Vault secrets for Supabase project URL and service role key

-- Enable required extensions (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Drop existing job if it exists (idempotent -- safe for migration re-run)
DO $$
BEGIN
  PERFORM cron.unschedule('document-expiry-checker');
EXCEPTION
  WHEN OTHERS THEN
    -- Job doesn't exist, which is fine for first run
    NULL;
END $$;

-- Schedule Document Expiry Checker
-- Cron expression: '0 8 * * *' = Every day at 08:00 UTC
SELECT cron.schedule(
  'document-expiry-checker',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
           || '/functions/v1/document-expiry-checker',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := jsonb_build_object(
      'trigger', 'cron',
      'check_date', CURRENT_DATE::text
    )
  ) AS request_id;
  $$
);

-- =============================================
-- Monitoring and Management Queries
-- =============================================
-- Use these queries to monitor and manage the scheduled job

-- View all scheduled jobs:
-- SELECT * FROM cron.job WHERE jobname = 'document-expiry-checker';

-- Monitor job execution history (last 10 runs):
-- SELECT
--   jobid,
--   runid,
--   job_name,
--   status,
--   return_message,
--   start_time,
--   end_time
-- FROM cron.job_run_details
-- WHERE job_name = 'document-expiry-checker'
-- ORDER BY start_time DESC
-- LIMIT 10;

-- Unschedule the job (if needed):
-- SELECT cron.unschedule('document-expiry-checker');

-- Manual trigger (for testing):
-- SELECT net.http_post(
--   url := 'http://localhost:54321/functions/v1/document-expiry-checker',
--   headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
--   body := '{"trigger": "manual", "check_date": "2026-02-20"}'::jsonb
-- );
