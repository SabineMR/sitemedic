-- Migration 160: Marketplace Notification Preferences
-- Phase 38: Notifications & Alerts — Plan 01
-- Created: 2026-02-20
-- Purpose: Per-user notification preference table for the marketplace.
--          Separate from org_settings.notification_preferences (which is admin-dashboard-scoped).
--          Channel x Category matrix: email (defaults TRUE) + SMS (defaults FALSE, PECR compliant).

-- =============================================================================
-- TABLE: marketplace_notification_preferences
-- One row per marketplace user. Primary key is user_id (one-to-one with auth.users).
-- SMS defaults all FALSE per PECR — transactional SMS requires explicit opt-in.
-- =============================================================================

CREATE TABLE marketplace_notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- ==========================================================================
  -- EMAIL preferences — default TRUE (opt-out model, per industry standard)
  -- ==========================================================================
  email_new_events  BOOLEAN NOT NULL DEFAULT TRUE,   -- New events matching company profile
  email_quotes      BOOLEAN NOT NULL DEFAULT TRUE,   -- Quote submitted on your event
  email_awards      BOOLEAN NOT NULL DEFAULT TRUE,   -- Quote awarded / rejected
  email_payments    BOOLEAN NOT NULL DEFAULT TRUE,   -- Payment received / failed
  email_ratings     BOOLEAN NOT NULL DEFAULT TRUE,   -- New rating received / rating nudge
  email_messages    BOOLEAN NOT NULL DEFAULT TRUE,   -- New marketplace message
  email_disputes    BOOLEAN NOT NULL DEFAULT TRUE,   -- Dispute filed / resolved

  -- ==========================================================================
  -- SMS preferences — default FALSE (opt-in model, PECR compliance)
  -- sms_opted_in_at provides PECR audit trail for when consent was given
  -- ==========================================================================
  sms_new_events    BOOLEAN NOT NULL DEFAULT FALSE,  -- New urgent/high-value events
  sms_quotes        BOOLEAN NOT NULL DEFAULT FALSE,  -- Quote activity
  sms_awards        BOOLEAN NOT NULL DEFAULT FALSE,  -- Award confirmation
  sms_payments      BOOLEAN NOT NULL DEFAULT FALSE,  -- Payment failure (time-critical)

  -- ==========================================================================
  -- Event alert radius (NULL = all UK — no radius filtering)
  -- Used for new_event notifications: only alert if event is within radius miles
  -- ==========================================================================
  event_alert_radius_miles INT,

  -- ==========================================================================
  -- SMS phone number — SEPARATE from company_phone
  -- company_phone is the business contact number (used in award emails).
  -- This number is the one explicitly consented to for SMS marketing/alerts.
  -- Must be stored in E.164 format (+447xxxxxxxxx).
  -- ==========================================================================
  sms_phone_number TEXT,                             -- E.164 format: +447xxxxxxxxx

  -- PECR audit trail: timestamp when user opted in to SMS alerts
  -- NULL = never opted in (matches all sms_* columns being FALSE)
  sms_opted_in_at TIMESTAMPTZ,

  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE marketplace_notification_preferences IS
  'Per-user marketplace notification preferences. '
  'Email defaults TRUE (opt-out). SMS defaults FALSE (opt-in, PECR compliant). '
  'sms_opted_in_at provides PECR consent audit trail.';

COMMENT ON COLUMN marketplace_notification_preferences.sms_phone_number IS
  'E.164 format (+447xxxxxxxxx). Separate from marketplace_companies.company_phone. '
  'This is the user-consented SMS recipient number.';

COMMENT ON COLUMN marketplace_notification_preferences.sms_opted_in_at IS
  'PECR audit trail: timestamp when user explicitly opted in to SMS notifications. '
  'Must be set when any sms_* preference is enabled.';

COMMENT ON COLUMN marketplace_notification_preferences.event_alert_radius_miles IS
  'NULL = receive all UK events (no radius filter). '
  'Set to e.g. 50 to only receive new_event alerts within 50 miles of company location.';

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE marketplace_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users manage only their own preferences (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "user_manages_own_prefs"
  ON marketplace_notification_preferences FOR ALL
  USING (user_id = auth.uid());

-- =============================================================================
-- TRIGGER: auto-update updated_at
-- =============================================================================

CREATE TRIGGER update_mkt_notification_prefs_updated_at
  BEFORE UPDATE ON marketplace_notification_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- SUMMARY
-- Table: marketplace_notification_preferences
-- Columns: user_id (PK), email_* x7 (TRUE), sms_* x4 (FALSE),
--          event_alert_radius_miles, sms_phone_number, sms_opted_in_at, updated_at
-- RLS: 1 policy (user manages own, FOR ALL)
-- Trigger: updated_at
-- Note: Rows auto-inserted on first API access using upsert with defaults
-- =============================================================================
