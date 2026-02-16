-- Migration 027: Late Payment Cron Auth Fix
-- Replace current_setting() with vault.decrypted_secrets pattern
-- Phase 6.5: Payments & Payouts - Gap Closure
-- Created: 2026-02-16
--
-- Purpose: Closes verification gap identified in 06.5-VERIFICATION.md
-- - Migration 020 uses current_setting() auth pattern (lines 22-23)
-- - Other crons use vault.decrypted_secrets pattern (migrations 021, 022)
-- - Inconsistent auth approach may fail in production
-- - Manual env var config required vs vault secrets (configured once in Dashboard)
--
-- Solution: Unschedule old job, re-create with vault pattern
--
-- Dependencies:
--   - Migration 020: check-overdue-invoices-daily job
--   - Vault secrets: project_url, service_role_key

-- Unschedule the old cron job created by migration 020
SELECT cron.unschedule('check-overdue-invoices-daily');

-- Re-create the cron job with vault.decrypted_secrets pattern
-- Daily check for overdue invoices (runs at 10am GMT)
-- Invoice query logic and reminder types (7, 14, 21 days) unchanged
SELECT cron.schedule(
  'check-overdue-invoices-daily',
  '0 10 * * *',
  $$
  DECLARE
    invoice_rec RECORD;
  BEGIN
    -- Find invoices needing 7-day reminder
    FOR invoice_rec IN
      SELECT id FROM invoices
      WHERE status = 'sent'
        AND due_date = CURRENT_DATE - INTERVAL '7 days'
        AND reminder_sent_7_days = FALSE
    LOOP
      PERFORM net.http_post(
        url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
               || '/functions/v1/send-invoice-reminder',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
        ),
        body := jsonb_build_object('invoiceId', invoice_rec.id, 'reminderType', '7_days')
      );
    END LOOP;

    -- Find invoices needing 14-day reminder
    FOR invoice_rec IN
      SELECT id FROM invoices
      WHERE status IN ('sent', 'overdue')
        AND due_date = CURRENT_DATE - INTERVAL '14 days'
        AND reminder_sent_14_days = FALSE
    LOOP
      PERFORM net.http_post(
        url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
               || '/functions/v1/send-invoice-reminder',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
        ),
        body := jsonb_build_object('invoiceId', invoice_rec.id, 'reminderType', '14_days')
      );
    END LOOP;

    -- Find invoices needing 21-day reminder (with late fee)
    FOR invoice_rec IN
      SELECT id FROM invoices
      WHERE status IN ('sent', 'overdue')
        AND due_date = CURRENT_DATE - INTERVAL '21 days'
        AND reminder_sent_21_days = FALSE
    LOOP
      PERFORM net.http_post(
        url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
               || '/functions/v1/send-invoice-reminder',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
        ),
        body := jsonb_build_object('invoiceId', invoice_rec.id, 'reminderType', '21_days')
      );
    END LOOP;
  END;
  $$
);

COMMENT ON EXTENSION pg_cron IS 'Late payment reminder automation - runs daily at 10am GMT with vault auth';

-- =============================================
-- Auth Pattern Comparison
-- =============================================
-- OLD (Migration 020):
--   project_url := current_setting('app.supabase_url', true);
--   service_key := current_setting('app.service_role_key', true);
--   Requires: ALTER DATABASE postgres SET app.supabase_url = '...'
--   Fragile: May not persist across restarts, must configure manually
--
-- NEW (This migration, consistent with 021, 022):
--   (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
--   (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
--   Configured: Once in Supabase Dashboard -> Project Settings -> Vault
--   Persistent: Stored securely, available to all cron jobs automatically
--
-- All 3 cron jobs now use consistent auth pattern:
--   - 021_riddor_deadline_cron.sql (vault pattern)
--   - 022_friday_payout_cron.sql (vault pattern)
--   - 027_late_payment_cron_auth_fix.sql (vault pattern - this migration)
