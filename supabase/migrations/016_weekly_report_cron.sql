-- =============================================
-- Weekly Safety Report Automation
-- =============================================
-- Purpose: Schedule automated PDF generation every Friday at 5 PM UTC
-- Fulfills: PDF-01 (weekly auto-generation)
--
-- Dependencies:
--   - Edge Function: generate-weekly-report (Plan 05-01)
--   - Storage bucket: safety-reports (Plan 05-02)
--   - Table: weekly_reports (Plan 05-02)
--
-- Vault secrets required (configured in Supabase Dashboard):
--   - project_url: Your Supabase project URL
--   - service_role_key: Service role key for Edge Function invocation
--
-- =============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule weekly report generation
-- Cron expression: '0 17 * * 5' = Every Friday at 17:00 UTC (5 PM UK time, end of working day)
SELECT cron.schedule(
  'generate-weekly-safety-report',
  '0 17 * * 5',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
           || '/functions/v1/generate-weekly-report',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := jsonb_build_object(
      'trigger', 'cron',
      'week_ending', CURRENT_DATE::text
    )
  ) AS request_id;
  $$
);

-- Add descriptive comment
COMMENT ON SCHEMA cron IS 'Weekly safety report generation - every Friday at 5 PM UTC. Invokes generate-weekly-report Edge Function.';

-- =============================================
-- Monitoring and Management Queries
-- =============================================
-- Use these queries to monitor and manage the scheduled job

-- View all scheduled jobs:
-- SELECT * FROM cron.job;

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
-- WHERE job_name = 'generate-weekly-safety-report'
-- ORDER BY start_time DESC
-- LIMIT 10;

-- Unschedule the job (if needed):
-- SELECT cron.unschedule('generate-weekly-safety-report');

-- Re-schedule after unscheduling:
-- Run the SELECT cron.schedule(...) block above again
