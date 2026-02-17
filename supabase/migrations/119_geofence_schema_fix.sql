-- Phase 13: Fix geofence schema for org-level geofences
-- The geofences page manages org-level boundaries (filtered by org_id),
-- but booking_id was NOT NULL. Making it nullable allows org-level geofences
-- that aren't tied to a specific booking.

ALTER TABLE geofences ALTER COLUMN booking_id DROP NOT NULL;
ALTER TABLE geofences ADD COLUMN IF NOT EXISTS site_name TEXT;

COMMENT ON COLUMN geofences.booking_id IS 'Optional booking reference. NULL for org-level geofences.';
COMMENT ON COLUMN geofences.site_name IS 'Human-readable site name for display in admin UI.';
