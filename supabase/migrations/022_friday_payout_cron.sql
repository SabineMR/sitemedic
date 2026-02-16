-- Migration 021: Friday Payout Cron Job
-- Phase 06.5-02: Schedule automated medic payouts every Friday at 9am GMT
-- Created: 2026-02-16
-- Depends on: 002_business_operations.sql (timesheets table)

-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create job execution log table
CREATE TABLE IF NOT EXISTS payout_executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  execution_date DATE NOT NULL,
  execution_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  timesheets_processed INT DEFAULT 0,
  successful_payouts INT DEFAULT 0,
  failed_payouts INT DEFAULT 0,
  total_amount DECIMAL(10,2) DEFAULT 0,
  errors JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'running', -- running, completed, failed
  completed_at TIMESTAMPTZ,

  CONSTRAINT valid_status CHECK (status IN ('running', 'completed', 'failed'))
);

CREATE INDEX idx_payout_executions_date ON payout_executions(execution_date DESC);
CREATE INDEX idx_payout_executions_status ON payout_executions(status);

COMMENT ON TABLE payout_executions IS 'Audit log of automated Friday payout job executions';
COMMENT ON COLUMN payout_executions.execution_date IS 'Date when payout job was executed (Friday)';
COMMENT ON COLUMN payout_executions.timesheets_processed IS 'Total number of timesheets processed in this run';
COMMENT ON COLUMN payout_executions.successful_payouts IS 'Number of successful Stripe Transfers created';
COMMENT ON COLUMN payout_executions.failed_payouts IS 'Number of failed payouts (logged for manual review)';
COMMENT ON COLUMN payout_executions.total_amount IS 'Total amount transferred to medics in GBP';
COMMENT ON COLUMN payout_executions.errors IS 'Array of error details for failed payouts: [{timesheetId, error, medic}]';

-- NOTE: pg_cron job creation requires manual setup via Supabase Dashboard
-- The cron job should be configured with the following parameters:
--
-- Job name: friday-medic-payouts
-- Schedule: 0 9 * * 5  (Every Friday at 9:00 AM GMT)
-- Command:
--   SELECT
--     net.http_post(
--       url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/friday-payout',
--       headers := jsonb_build_object(
--         'Content-Type', 'application/json',
--         'Authorization', 'Bearer ' || current_setting('app.service_role_key')
--       ),
--       body := jsonb_build_object(
--         'scheduled', true,
--         'execution_time', NOW()
--       )
--     ) AS request_id;
--
-- IMPORTANT: The service_role_key must be stored as a database setting:
--   ALTER DATABASE postgres SET app.service_role_key = 'your-service-role-key';
--
-- Alternatively, use Supabase Edge Function Cron Triggers (recommended):
-- https://supabase.com/docs/guides/functions/schedule-functions

COMMENT ON SCHEMA public IS 'Migration 021: Friday payout cron job and execution logging';
