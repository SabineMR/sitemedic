-- Migration 020: Late Payment Reminder Cron Jobs
-- Automated reminders at 7, 14, 21 days overdue
-- Phase 06.5: Payments & Payouts
-- Created: 2026-02-16
-- Depends on: 002_business_operations.sql (invoices table)

-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Daily check for overdue invoices (runs at 10am GMT)
SELECT cron.schedule(
  'check-overdue-invoices-daily',
  '0 10 * * *',
  $$
  DECLARE
    invoice_rec RECORD;
    project_url TEXT;
    service_key TEXT;
  BEGIN
    -- Get Supabase project URL and service role key from environment
    -- These would be set via Supabase dashboard or CLI
    project_url := current_setting('app.supabase_url', true);
    service_key := current_setting('app.service_role_key', true);

    -- Find invoices needing 7-day reminder
    FOR invoice_rec IN
      SELECT id
      FROM invoices
      WHERE status = 'sent'
        AND due_date = CURRENT_DATE - INTERVAL '7 days'
        AND reminder_sent_7_days = FALSE
    LOOP
      PERFORM net.http_post(
        url := project_url || '/functions/v1/send-invoice-reminder',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_key
        ),
        body := jsonb_build_object(
          'invoiceId', invoice_rec.id,
          'reminderType', '7_days'
        )
      );
    END LOOP;

    -- Find invoices needing 14-day reminder
    FOR invoice_rec IN
      SELECT id
      FROM invoices
      WHERE status IN ('sent', 'overdue')
        AND due_date = CURRENT_DATE - INTERVAL '14 days'
        AND reminder_sent_14_days = FALSE
    LOOP
      PERFORM net.http_post(
        url := project_url || '/functions/v1/send-invoice-reminder',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_key
        ),
        body := jsonb_build_object(
          'invoiceId', invoice_rec.id,
          'reminderType', '14_days'
        )
      );
    END LOOP;

    -- Find invoices needing 21-day reminder (with late fee)
    FOR invoice_rec IN
      SELECT id
      FROM invoices
      WHERE status IN ('sent', 'overdue')
        AND due_date = CURRENT_DATE - INTERVAL '21 days'
        AND reminder_sent_21_days = FALSE
    LOOP
      PERFORM net.http_post(
        url := project_url || '/functions/v1/send-invoice-reminder',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_key
        ),
        body := jsonb_build_object(
          'invoiceId', invoice_rec.id,
          'reminderType', '21_days'
        )
      );
    END LOOP;
  END;
  $$
);

COMMENT ON EXTENSION pg_cron IS 'Late payment reminder automation - runs daily at 10am GMT';

-- Add index for faster reminder queries
CREATE INDEX IF NOT EXISTS idx_invoices_reminder_due_7 ON invoices(due_date, status, reminder_sent_7_days)
  WHERE status = 'sent' AND reminder_sent_7_days = FALSE;

CREATE INDEX IF NOT EXISTS idx_invoices_reminder_due_14 ON invoices(due_date, status, reminder_sent_14_days)
  WHERE status IN ('sent', 'overdue') AND reminder_sent_14_days = FALSE;

CREATE INDEX IF NOT EXISTS idx_invoices_reminder_due_21 ON invoices(due_date, status, reminder_sent_21_days)
  WHERE status IN ('sent', 'overdue') AND reminder_sent_21_days = FALSE;

COMMENT ON INDEX idx_invoices_reminder_due_7 IS 'Optimizes 7-day reminder queries';
COMMENT ON INDEX idx_invoices_reminder_due_14 IS 'Optimizes 14-day reminder queries';
COMMENT ON INDEX idx_invoices_reminder_due_21 IS 'Optimizes 21-day reminder queries';
