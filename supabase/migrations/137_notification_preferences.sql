-- Migration 137: Add notification_preferences JSONB to org_settings
-- Persists admin notification preferences that were previously localStorage-only.
-- Default mirrors the client-side defaults in admin/settings/page.tsx.

ALTER TABLE org_settings
  ADD COLUMN IF NOT EXISTS notification_preferences JSONB
    DEFAULT '{"booking_confirmations": true, "riddor_alerts": true, "cert_expiry": true, "payout_summaries": true, "cashflow_alerts": true}'::jsonb;

COMMENT ON COLUMN org_settings.notification_preferences IS
  'Admin notification preferences (booking_confirmations, riddor_alerts, cert_expiry, payout_summaries, cashflow_alerts)';
