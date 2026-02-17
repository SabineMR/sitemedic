-- Migration 114: Site Beacons
-- Stores Bluetooth beacon configurations for each job site.
-- Beacons are the fallback check-in method when GPS satellite signal is
-- unavailable (underground plant rooms, confined spaces, steel-framed buildings).
--
-- Check-in priority: GPS geofence → BLE beacon → manual button press
-- Created: 2026-02-17

-- =============================================================================
-- site_beacons table
-- =============================================================================

CREATE TABLE site_beacons (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Organisation that owns this beacon config
  org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Optional booking link (can be left null for reusable site beacons)
  booking_id        UUID REFERENCES bookings(id) ON DELETE SET NULL,

  -- Human-readable site label shown in admin
  site_name         TEXT NOT NULL,

  -- ── iBeacon fields ─────────────────────────────────────────────────────────
  -- Standard iBeacon UUID (lowercase with hyphens)
  -- e.g. "f7826da6-4fa2-4e98-8024-bc5b71e0893e"
  -- For Eddystone-UID, stored as "eddystone:<namespace_hex>:<instance_hex>"
  uuid              TEXT NOT NULL,

  -- iBeacon major number (0–65535). Use to group beacons at same company/site.
  -- NULL means "match any major"
  major             INTEGER CHECK (major >= 0 AND major <= 65535),

  -- iBeacon minor number (0–65535). Use for specific location within a site.
  -- NULL means "match any minor"
  minor             INTEGER CHECK (minor >= 0 AND minor <= 65535),

  -- ── Beacon type ────────────────────────────────────────────────────────────
  beacon_type       TEXT NOT NULL DEFAULT 'ibeacon'
                    CHECK (beacon_type IN ('ibeacon', 'eddystone')),

  -- ── Status & metadata ──────────────────────────────────────────────────────
  is_active         BOOLEAN NOT NULL DEFAULT true,

  -- Optional notes (beacon physical location, mounting instructions, etc.)
  notes             TEXT,

  created_by        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- Indexes
-- =============================================================================

-- Fast lookup by UUID when the mobile app scans (most frequent operation)
CREATE INDEX idx_site_beacons_uuid       ON site_beacons(uuid);
CREATE INDEX idx_site_beacons_org_id     ON site_beacons(org_id);
CREATE INDEX idx_site_beacons_booking_id ON site_beacons(booking_id);
CREATE INDEX idx_site_beacons_active     ON site_beacons(org_id, is_active) WHERE is_active = true;

-- =============================================================================
-- Auto-update updated_at on row change
-- =============================================================================

CREATE OR REPLACE FUNCTION update_site_beacons_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_site_beacons_updated_at
  BEFORE UPDATE ON site_beacons
  FOR EACH ROW EXECUTE FUNCTION update_site_beacons_updated_at();

-- =============================================================================
-- Row Level Security
-- =============================================================================

ALTER TABLE site_beacons ENABLE ROW LEVEL SECURITY;

-- Org admins can read and write their own beacons
CREATE POLICY "org_members_read_beacons"
  ON site_beacons FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "org_admins_insert_beacons"
  ON site_beacons FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE id = auth.uid() AND role IN ('org_admin', 'manager')
    )
  );

CREATE POLICY "org_admins_update_beacons"
  ON site_beacons FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE id = auth.uid() AND role IN ('org_admin', 'manager')
    )
  );

CREATE POLICY "org_admins_delete_beacons"
  ON site_beacons FOR DELETE
  USING (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE id = auth.uid() AND role IN ('org_admin', 'manager')
    )
  );

-- Platform admins have full access
CREATE POLICY "platform_admins_all_beacons"
  ON site_beacons FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'platform_admin'
    )
  );

-- =============================================================================
-- Comments
-- =============================================================================

COMMENT ON TABLE site_beacons IS
  'Bluetooth beacon configurations for job sites. Used as GPS fallback check-in when satellite signal is unavailable.';

COMMENT ON COLUMN site_beacons.uuid IS
  'iBeacon proximity UUID (lowercase with hyphens) or Eddystone-UID stored as eddystone:<namespace>:<instance>';

COMMENT ON COLUMN site_beacons.major IS
  'iBeacon major number (0-65535). NULL matches any major. Use to scope to a site group.';

COMMENT ON COLUMN site_beacons.minor IS
  'iBeacon minor number (0-65535). NULL matches any minor. Use to scope to a specific zone.';

COMMENT ON COLUMN site_beacons.beacon_type IS
  'ibeacon = Apple iBeacon format. eddystone = Google Eddystone-UID format.';
