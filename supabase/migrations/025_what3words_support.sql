-- Migration 023: what3words Support
-- Add what3words address fields for precise location identification
-- Created: 2026-02-16

-- =============================================================================
-- Add what3words_address column to bookings table
-- =============================================================================
ALTER TABLE bookings
ADD COLUMN what3words_address TEXT;

COMMENT ON COLUMN bookings.what3words_address IS 'what3words address for precise site location (e.g., ///filled.count.soap). Provides 3m x 3m precision.';

-- Create index for searching by what3words address
CREATE INDEX idx_bookings_what3words ON bookings(what3words_address);

-- =============================================================================
-- Add what3words_address column to territories table (for admin use)
-- =============================================================================
ALTER TABLE territories
ADD COLUMN what3words_address TEXT;

COMMENT ON COLUMN territories.what3words_address IS 'Optional what3words address for territory center point';

-- =============================================================================
-- Add what3words_address column to medics table (home address)
-- =============================================================================
ALTER TABLE medics
ADD COLUMN home_what3words TEXT;

COMMENT ON COLUMN medics.home_what3words IS 'what3words address for medic home location (used for travel time calculations)';
