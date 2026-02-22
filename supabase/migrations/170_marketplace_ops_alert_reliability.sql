-- Migration 170: Marketplace Ops Alert Reliability + Cron Observability
-- Phase 54: External Services & Alert Delivery - Plan 01
-- Created: 2026-02-22
-- Purpose: Add delivery attempt/dead-letter tracking and cron job run observability.

CREATE TABLE IF NOT EXISTS marketplace_alert_delivery_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel TEXT NOT NULL DEFAULT 'dashboard_feed' CHECK (channel IN ('dashboard_feed', 'email', 'sms')),
  recipient_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notification_type TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed', 'dead_letter')),
  attempt_count INT NOT NULL DEFAULT 1 CHECK (attempt_count BETWEEN 1 AND 10),
  last_error TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  next_retry_at TIMESTAMPTZ,
  last_attempt_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alert_delivery_status_retry
  ON marketplace_alert_delivery_attempts(status, next_retry_at);

CREATE INDEX IF NOT EXISTS idx_alert_delivery_recipient_created
  ON marketplace_alert_delivery_attempts(recipient_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS marketplace_job_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,
  trigger_type TEXT NOT NULL DEFAULT 'cron' CHECK (trigger_type IN ('cron', 'manual')),
  status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  duration_ms INT,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_runs_name_started
  ON marketplace_job_runs(job_name, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_job_runs_status_started
  ON marketplace_job_runs(status, started_at DESC);

CREATE OR REPLACE FUNCTION set_ops_table_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_alert_delivery_updated_at ON marketplace_alert_delivery_attempts;
CREATE TRIGGER trg_alert_delivery_updated_at
  BEFORE UPDATE ON marketplace_alert_delivery_attempts
  FOR EACH ROW
  EXECUTE FUNCTION set_ops_table_updated_at();

DROP TRIGGER IF EXISTS trg_job_runs_updated_at ON marketplace_job_runs;
CREATE TRIGGER trg_job_runs_updated_at
  BEFORE UPDATE ON marketplace_job_runs
  FOR EACH ROW
  EXECUTE FUNCTION set_ops_table_updated_at();

ALTER TABLE marketplace_alert_delivery_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_job_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_admin_all_alert_delivery_attempts"
  ON marketplace_alert_delivery_attempts FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

CREATE POLICY "platform_admin_all_job_runs"
  ON marketplace_job_runs FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

COMMENT ON TABLE marketplace_alert_delivery_attempts IS 'Alert delivery attempts with retry/dead-letter tracking for dashboard/email/sms channels';
COMMENT ON TABLE marketplace_job_runs IS 'Cron/manual job run status history for operator observability';
