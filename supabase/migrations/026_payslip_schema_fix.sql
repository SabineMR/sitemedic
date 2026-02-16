-- Migration 026: Payslip Schema Fix
-- Add payslip_reference field and wire Edge Function trigger
-- Phase 6.5: Payments & Payouts - Gap Closure
-- Created: 2026-02-16
--
-- Purpose: Closes verification gap identified in 06.5-VERIFICATION.md
-- - Adds payslip_reference field required by generate-payslip-pdf Edge Function (line 107)
-- - Creates trigger to automatically invoke Edge Function after payslip creation
-- - Uses vault.decrypted_secrets for auth (consistent with migrations 021, 022)
--
-- Dependencies:
--   - Migration 024: payslips table
--   - Edge Function: generate-payslip-pdf
--   - Vault secrets: project_url, service_role_key

-- Enable pg_net extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Add payslip_reference column to payslips table
-- Generates human-readable reference like 'PS-20260216-a1b2c3d4'
-- Required by Edge Function at line 107 for PDF filename and metadata
ALTER TABLE payslips ADD COLUMN payslip_reference TEXT UNIQUE NOT NULL
  DEFAULT ('PS-' || to_char(NOW(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 8));

COMMENT ON COLUMN payslips.payslip_reference IS 'Human-readable payslip reference (PS-YYYYMMDD-UUID8) for PDF generation';

-- Create trigger function to invoke Edge Function via pg_net
-- Fires AFTER INSERT on payslips table (cascade from trigger_generate_payslip_on_payout in migration 024)
-- Uses vault.decrypted_secrets pattern consistent with other cron jobs
CREATE OR REPLACE FUNCTION generate_payslip_pdf_on_insert()
RETURNS TRIGGER AS $$
DECLARE
  project_url TEXT;
  service_key TEXT;
BEGIN
  -- Get credentials from vault (consistent with 021, 022 pattern)
  SELECT decrypted_secret INTO project_url
    FROM vault.decrypted_secrets WHERE name = 'project_url';
  SELECT decrypted_secret INTO service_key
    FROM vault.decrypted_secrets WHERE name = 'service_role_key';

  -- Call Edge Function to generate PDF (non-blocking via pg_net)
  PERFORM net.http_post(
    url := project_url || '/functions/v1/generate-payslip-pdf',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := jsonb_build_object(
      'payslipId', NEW.id::text
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_payslip_pdf_on_insert IS 'Trigger: Calls generate-payslip-pdf Edge Function via pg_net after payslip creation';

-- Create trigger on payslips table
-- Execution order (cross-table cascade):
--   1. trigger_generate_payslip_on_payout (migration 024) fires AFTER UPDATE ON timesheets
--      -> Creates payslip row via INSERT
--   2. trigger_generate_payslip_pdf (this migration 026) fires AFTER INSERT ON payslips
--      -> Calls Edge Function via pg_net
-- No alphabetical ordering concern - triggers are on different tables (timesheets vs payslips)
CREATE TRIGGER trigger_generate_payslip_pdf
  AFTER INSERT ON payslips
  FOR EACH ROW
  EXECUTE FUNCTION generate_payslip_pdf_on_insert();

COMMENT ON TRIGGER trigger_generate_payslip_pdf ON payslips IS 'Auto-invokes PDF generation Edge Function after payslip creation';

-- =============================================
-- Trigger Cascade Chain Documentation
-- =============================================
-- 1. Timesheet status update: UPDATE timesheets SET payout_status = 'paid'
-- 2. trigger_generate_payslip_on_payout (024) -> INSERT INTO payslips
-- 3. trigger_generate_payslip_pdf (026) -> pg_net HTTP POST to Edge Function
-- 4. Edge Function generates PDF -> UPDATE payslips SET pdf_url = '[signed_url]'
--
-- Result: When timesheet.payout_status = 'paid', payslip record created AND PDF generated automatically
