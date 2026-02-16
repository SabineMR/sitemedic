-- 021_riddor_deadline_cron.sql
-- RIDDOR Deadline Tracking Cron Job
-- Phase 6: RIDDOR Auto-Flagging - Plan 05
--
-- Purpose: Schedule daily deadline checking for RIDDOR incidents
-- Sends email notifications 3 days before HSE submission deadline
--
-- Dependencies:
--   - Edge Function: riddor-deadline-checker (Plan 05)
--   - Resend API key for email delivery
--   - Vault secrets: project_url, service_role_key

-- Enable required extensions (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Drop existing job if it exists (for migration idempotency)
SELECT cron.unschedule('riddor-deadline-checker');

-- Schedule RIDDOR deadline checker
-- Cron expression: '0 9 * * *' = Every day at 09:00 UTC (9 AM UK time)
SELECT cron.schedule(
  'riddor-deadline-checker',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
           || '/functions/v1/riddor-deadline-checker',
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
-- SELECT * FROM cron.job WHERE jobname = 'riddor-deadline-checker';

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
-- WHERE job_name = 'riddor-deadline-checker'
-- ORDER BY start_time DESC
-- LIMIT 10;

-- Unschedule the job (if needed):
-- SELECT cron.unschedule('riddor-deadline-checker');

-- Re-schedule after unscheduling:
-- Run the SELECT cron.schedule(...) block above again

-- Manual trigger (for testing):
-- SELECT net.http_post(
--   url := 'http://localhost:54321/functions/v1/riddor-deadline-checker',
--   headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
--   body := '{"trigger": "manual"}'::jsonb
-- );
