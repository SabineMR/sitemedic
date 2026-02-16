-- Migration 007: Geofence Automation
-- Auto-create geofences when bookings are created
-- Created: 2026-02-15

-- =============================================================================
-- FUNCTION: Auto-create geofence for new booking
-- =============================================================================
CREATE OR REPLACE FUNCTION create_geofence_for_booking()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create geofence if booking has site coordinates
  IF NEW.site_latitude IS NOT NULL AND NEW.site_longitude IS NOT NULL THEN
    INSERT INTO geofences (
      booking_id,
      center_latitude,
      center_longitude,
      radius_meters,
      require_consecutive_pings,
      is_active,
      notes
    ) VALUES (
      NEW.id,
      NEW.site_latitude,
      NEW.site_longitude,
      75.0, -- Default 75m radius
      3, -- Require 3 consecutive pings
      TRUE,
      'Auto-created from booking'
    );

    RAISE NOTICE 'Created geofence for booking %', NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-create geofence
CREATE TRIGGER trigger_create_geofence_for_booking
  AFTER INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION create_geofence_for_booking();

COMMENT ON FUNCTION create_geofence_for_booking IS 'Automatically creates geofence when booking is created with site coordinates';

-- =============================================================================
-- Add site coordinates to bookings table (if not already present)
-- =============================================================================
DO $$
BEGIN
  -- Check if columns exist, add if they don't
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'site_latitude'
  ) THEN
    ALTER TABLE bookings ADD COLUMN site_latitude DECIMAL(10, 8);
    COMMENT ON COLUMN bookings.site_latitude IS 'Job site latitude for geofencing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'site_longitude'
  ) THEN
    ALTER TABLE bookings ADD COLUMN site_longitude DECIMAL(11, 8);
    COMMENT ON COLUMN bookings.site_longitude IS 'Job site longitude for geofencing';
  END IF;
END
$$;

-- =============================================================================
-- Index for site coordinates (for distance calculations)
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_bookings_site_coordinates ON bookings(site_latitude, site_longitude)
  WHERE site_latitude IS NOT NULL AND site_longitude IS NOT NULL;

COMMENT ON INDEX idx_bookings_site_coordinates IS 'Fast lookup for bookings with geofence coordinates';
