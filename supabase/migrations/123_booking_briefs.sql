-- Migration 123: Booking Briefs (Pre-Event Medical Plan)
--
-- Adds:
--   1. event_vertical column to bookings — records which industry vertical
--      the booking belongs to (drives terminology and brief fields).
--   2. booking_briefs table — one-to-one with bookings, stores the pre-event
--      medical brief that the admin/medic completes before the shift starts.
--      Common fields are explicit columns; vertical-specific fields live in
--      extra_fields JSONB so the schema stays flexible across all 10 verticals.

-- 1. Add event_vertical to bookings
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS event_vertical TEXT;

COMMENT ON COLUMN bookings.event_vertical IS
  'Industry vertical for this booking (e.g. construction, tv_film, motorsport). '
  'Drives pre-event brief fields, outcome labels, and mechanism presets in the mobile app.';

-- 2. Create booking_briefs table
CREATE TABLE IF NOT EXISTS booking_briefs (
  id                         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id                 UUID        UNIQUE NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  org_id                     UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- ── Common fields (all verticals) ─────────────────────────────────────────
  nearest_ae_name            TEXT,
  nearest_ae_address         TEXT,
  ae_travel_minutes          INTEGER     CHECK (ae_travel_minutes IS NULL OR ae_travel_minutes > 0),
  helicopter_lz              TEXT,       -- Description or what3words of LZ
  emergency_rendezvous       TEXT,       -- Where emergency services should meet
  on_site_contact_name       TEXT,
  on_site_contact_phone      TEXT,
  known_hazards              TEXT,       -- Free-text hazard summary

  -- ── Vertical-specific extra fields (JSONB) ────────────────────────────────
  -- Stored as key-value pairs; schema varies per vertical.
  -- See booking-brief-form.tsx for the field definitions per vertical.
  extra_fields               JSONB       NOT NULL DEFAULT '{}'::jsonb,

  -- ── Completion status ─────────────────────────────────────────────────────
  status                     TEXT        NOT NULL DEFAULT 'not_started'
                               CHECK (status IN ('not_started', 'in_progress', 'complete')),
  completed_by               UUID        REFERENCES auth.users(id),
  completed_at               TIMESTAMPTZ,

  created_at                 TIMESTAMPTZ DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE booking_briefs IS
  'Pre-event medical brief / Event Medical Plan for each booking. '
  'One brief per booking. Common fields are explicit columns; '
  'vertical-specific fields are stored in extra_fields JSONB.';

COMMENT ON COLUMN booking_briefs.extra_fields IS
  'Vertical-specific fields, e.g. race_control_channel (motorsport), '
  'mip_reference (festivals), safeguarding_lead_name (education). '
  'Keys are camelCase strings matching the form field names in booking-brief-form.tsx.';

COMMENT ON COLUMN booking_briefs.status IS
  'not_started: brief not yet filled. '
  'in_progress: some fields completed but not marked done. '
  'complete: medic/admin confirmed all required info entered.';

-- Index for fast lookup by booking
CREATE INDEX IF NOT EXISTS idx_booking_briefs_booking_id
  ON booking_briefs (booking_id);

CREATE INDEX IF NOT EXISTS idx_booking_briefs_org_id
  ON booking_briefs (org_id);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_booking_briefs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_booking_briefs_updated_at
  BEFORE UPDATE ON booking_briefs
  FOR EACH ROW EXECUTE FUNCTION update_booking_briefs_updated_at();

-- ── RLS Policies ──────────────────────────────────────────────────────────────
ALTER TABLE booking_briefs ENABLE ROW LEVEL SECURITY;

-- Org users: read briefs belonging to their org
CREATE POLICY "org_read_booking_briefs"
  ON booking_briefs FOR SELECT
  USING (org_id = get_user_org_id());

-- Org users: insert briefs for their org
CREATE POLICY "org_write_booking_briefs"
  ON booking_briefs FOR INSERT
  WITH CHECK (org_id = get_user_org_id());

-- Org users: update briefs belonging to their org
CREATE POLICY "org_update_booking_briefs"
  ON booking_briefs FOR UPDATE
  USING (org_id = get_user_org_id());

-- Platform admins: full access across all orgs
CREATE POLICY "platform_admin_all_booking_briefs"
  ON booking_briefs FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());
