-- Migration 149b: Schedule daily remainder charge check
-- Phase 35: Award Flow & Payment — Plan 03
-- Runs at 8 AM UTC every day
-- Calls the charge-remainder-payment Edge Function

-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net for HTTP calls (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Vault secrets required (configured in Supabase Dashboard):
-- - project_url: Your Supabase project URL (e.g., https://xxx.supabase.co)
-- - service_role_key: Your service role key for Edge Function auth

-- Schedule daily remainder charge job
-- Cron expression: '0 8 * * *' = Every day at 08:00 UTC
SELECT cron.schedule(
  'charge-marketplace-remainders',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
           || '/functions/v1/charge-remainder-payment',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := jsonb_build_object(
      'action', 'charge_due_remainders',
      'timestamp', NOW()
    )
  ) AS request_id;
  $$
);

COMMENT ON SCHEMA public IS 'Migration 149b: Daily marketplace remainder charge cron job';
