-- 032_certification_expiry_cron.sql
-- Certification Expiry Tracking Cron Job
-- Phase 7: Certification Tracking - Plan 02
--
-- Purpose: Schedule daily certification expiry checking for medic certifications
-- Sends progressive email notifications at 30/14/7/1 days before expiry
-- Notifies medics at all stages, site managers at critical stages (14/7/1 days)
--
-- Dependencies:
--   - Edge Function: certification-expiry-checker (Plan 02)
--   - Resend API key for email delivery
--   - Vault secrets: project_url, service_role_key
--   - RPC functions from 031_certification_tracking.sql

-- Enable required extensions (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Drop existing job if it exists (for migration idempotency)
DO $$
BEGIN
  PERFORM cron.unschedule('certification-expiry-checker');
EXCEPTION
  WHEN OTHERS THEN
    -- Job doesn't exist, which is fine for first run
    NULL;
END $$;

-- Schedule Certification Expiry Checker
-- Cron expression: '0 9 * * *' = Every day at 09:00 UTC
SELECT cron.schedule(
  'certification-expiry-checker',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
           || '/functions/v1/certification-expiry-checker',
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
-- SELECT * FROM cron.job WHERE jobname = 'certification-expiry-checker';

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
-- WHERE job_name = 'certification-expiry-checker'
-- ORDER BY start_time DESC
-- LIMIT 10;

-- Unschedule the job (if needed):
-- SELECT cron.unschedule('certification-expiry-checker');

-- Re-schedule after unscheduling:
-- Run the SELECT cron.schedule(...) block above again

-- Manual trigger (for testing):
-- SELECT net.http_post(
--   url := 'http://localhost:54321/functions/v1/certification-expiry-checker',
--   headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
--   body := '{"trigger": "manual", "check_date": "2026-02-17"}'::jsonb
-- );
