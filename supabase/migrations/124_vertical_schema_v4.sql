-- Migration 124: Vertical infrastructure schema v4
-- Phase 18: Vertical Infrastructure & RIDDOR Fix
--
-- Adds columns required by all Phase 18 plans:
--   - treatments.event_vertical        — which industry vertical the treatment belongs to
--   - treatments.vertical_extra_fields — JSONB bag for vertical-specific form data
--   - treatments.booking_id            — links treatment to a pre-event booking brief
--   - near_misses.gps_lat              — GPS latitude of incident location
--   - near_misses.gps_lng              — GPS longitude of incident location
--
-- Also creates compliance_score_history table required by Phase 23 analytics.

-- ─────────────────────────────────────────────────────────────────────────────
-- Treatments: vertical context + booking linkage
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE treatments
  ADD COLUMN IF NOT EXISTS event_vertical TEXT,
  ADD COLUMN IF NOT EXISTS vertical_extra_fields JSONB,
  ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL;

COMMENT ON COLUMN treatments.event_vertical IS
  'Industry vertical identifier (e.g. construction, motorsport, football). Matches the vertical config key in the TypeScript registry.';

COMMENT ON COLUMN treatments.vertical_extra_fields IS
  'JSONB bag of vertical-specific form fields collected at treatment time. Schema varies per vertical.';

COMMENT ON COLUMN treatments.booking_id IS
  'Optional link to the booking brief that preceded this treatment. Null for walk-in or unlinked treatments.';

-- ─────────────────────────────────────────────────────────────────────────────
-- Near misses: GPS coordinates for precise location logging
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE near_misses
  ADD COLUMN IF NOT EXISTS gps_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS gps_lng DOUBLE PRECISION;

COMMENT ON COLUMN near_misses.gps_lat IS 'GPS latitude of the near-miss incident location (WGS84).';
COMMENT ON COLUMN near_misses.gps_lng IS 'GPS longitude of the near-miss incident location (WGS84).';

-- ─────────────────────────────────────────────────────────────────────────────
-- Compliance score history (required by Phase 23 analytics)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS compliance_score_history (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID         NOT NULL REFERENCES org_settings(org_id) ON DELETE CASCADE,
  vertical        TEXT         NOT NULL,
  score           INTEGER      NOT NULL CHECK (score >= 0 AND score <= 100),
  period_start    DATE         NOT NULL,
  period_end      DATE         NOT NULL,
  calculated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  details         JSONB
);

COMMENT ON TABLE compliance_score_history IS
  'Stores periodic compliance score snapshots per org and vertical for trend analytics (Phase 23).';

CREATE INDEX IF NOT EXISTS compliance_score_history_org_id_idx
  ON compliance_score_history (org_id);

CREATE INDEX IF NOT EXISTS compliance_score_history_vertical_idx
  ON compliance_score_history (vertical);

CREATE INDEX IF NOT EXISTS compliance_score_history_period_idx
  ON compliance_score_history (org_id, vertical, period_start);

-- ─────────────────────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE compliance_score_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_can_read_compliance_scores"
  ON compliance_score_history FOR SELECT
  USING (org_id IN (
    SELECT org_id FROM profiles WHERE id = auth.uid()
  ));
