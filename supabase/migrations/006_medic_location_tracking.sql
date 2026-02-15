-- Migration 006: Medic Location Tracking & Command Center
-- Phase 5.6: Real-time location monitoring, geofencing, audit trail
-- Created: 2026-02-15
-- Depends on: 002_business_operations.sql (bookings, medics tables)

-- =============================================================================
-- TABLE: medic_location_pings
-- Purpose: GPS coordinates captured at regular intervals during active shifts
-- Retention: 30 days (GDPR compliance - auto-delete after)
-- =============================================================================
CREATE TABLE medic_location_pings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- References
  medic_id UUID NOT NULL REFERENCES medics(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,

  -- Location data
  latitude DECIMAL(10, 8) NOT NULL, -- e.g., 51.50740123
  longitude DECIMAL(11, 8) NOT NULL, -- e.g., -0.12775000
  accuracy_meters DECIMAL(6, 2), -- GPS accuracy in meters (e.g., 8.5m)
  altitude_meters DECIMAL(7, 2), -- Altitude above sea level (optional)
  heading_degrees DECIMAL(5, 2), -- Compass heading 0-360 (direction of travel)
  speed_mps DECIMAL(5, 2), -- Speed in meters per second

  -- Device context
  battery_level INT, -- 0-100 percentage
  connection_type TEXT, -- '4G', '5G', 'WiFi', 'offline'
  gps_provider TEXT, -- 'gps', 'network', 'fused' (Android), 'apple' (iOS)

  -- Timing
  recorded_at TIMESTAMPTZ NOT NULL, -- When GPS reading was taken on device
  received_at TIMESTAMPTZ DEFAULT NOW(), -- When server received the ping

  -- Quality flags
  is_offline_queued BOOLEAN DEFAULT FALSE, -- TRUE if sent from offline queue
  is_background BOOLEAN DEFAULT FALSE, -- TRUE if app was in background

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_latitude CHECK (latitude >= -90 AND latitude <= 90),
  CONSTRAINT valid_longitude CHECK (longitude >= -180 AND longitude <= 180),
  CONSTRAINT valid_accuracy CHECK (accuracy_meters > 0),
  CONSTRAINT valid_battery CHECK (battery_level >= 0 AND battery_level <= 100),
  CONSTRAINT valid_heading CHECK (heading_degrees >= 0 AND heading_degrees < 360),
  CONSTRAINT valid_speed CHECK (speed_mps >= 0)
);

-- Indexes for fast queries
CREATE INDEX idx_location_pings_medic_time ON medic_location_pings(medic_id, recorded_at DESC);
CREATE INDEX idx_location_pings_booking ON medic_location_pings(booking_id);
CREATE INDEX idx_location_pings_recorded_at ON medic_location_pings(recorded_at);
CREATE INDEX idx_location_pings_created_at ON medic_location_pings(created_at); -- For retention cleanup job

-- Partial index for today's active pings (command center queries)
CREATE INDEX idx_location_pings_today ON medic_location_pings(medic_id, recorded_at DESC)
  WHERE recorded_at >= CURRENT_DATE;

-- Geospatial index (if using PostGIS extension for advanced queries)
-- CREATE INDEX idx_location_pings_geom ON medic_location_pings USING GIST (
--   ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
-- );

COMMENT ON TABLE medic_location_pings IS 'GPS location pings captured every 30-120 seconds during active shifts. Auto-deleted after 30 days (GDPR).';
COMMENT ON COLUMN medic_location_pings.accuracy_meters IS 'GPS accuracy radius in meters. <10m = high accuracy, 10-50m = medium, >50m = low.';
COMMENT ON COLUMN medic_location_pings.is_offline_queued IS 'TRUE if ping was stored offline on device and synced later when connection restored.';
COMMENT ON COLUMN medic_location_pings.recorded_at IS 'Device timestamp when GPS reading was captured (source of truth for timeline).';
COMMENT ON COLUMN medic_location_pings.received_at IS 'Server timestamp when ping was received (for latency monitoring).';

-- =============================================================================
-- TABLE: medic_shift_events
-- Purpose: Significant status changes during shifts (arrived, left, breaks)
-- Retention: Forever (needed for billing records and compliance)
-- =============================================================================
CREATE TABLE medic_shift_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- References
  medic_id UUID NOT NULL REFERENCES medics(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,

  -- Event details
  event_type TEXT NOT NULL, -- See CHECK constraint below for valid types
  event_timestamp TIMESTAMPTZ NOT NULL,

  -- Location (optional - may not have location for manual events)
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  accuracy_meters DECIMAL(6, 2),

  -- Source tracking (how was this event triggered?)
  source TEXT NOT NULL, -- 'geofence_auto', 'manual_button', 'system_detected', 'admin_override'
  triggered_by_user_id UUID REFERENCES auth.users(id), -- NULL for automatic events

  -- Geofence context (for automatic arrival/departure)
  geofence_radius_meters DECIMAL(6, 2), -- Radius of geofence that triggered event
  distance_from_site_meters DECIMAL(7, 2), -- Distance from job site center

  -- Additional context
  notes TEXT, -- Optional notes (e.g., "Medic manually marked - GPS unavailable")
  device_info JSONB, -- {battery_level, connection_type, app_version, os_version}

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_event_type CHECK (event_type IN (
    'shift_started',        -- First location ping of shift
    'arrived_on_site',      -- Entered geofence or manual arrival
    'left_site',            -- Exited geofence or manual departure
    'break_started',        -- Medic started break
    'break_ended',          -- Medic ended break
    'shift_ended',          -- Last location ping or manual completion
    'battery_critical',     -- Battery <10% warning
    'battery_died',         -- Phone died (inferred from no pings)
    'connection_lost',      -- Offline >10 minutes
    'connection_restored',  -- Back online after being offline
    'gps_unavailable',      -- GPS disabled/unavailable
    'app_killed',           -- App force-closed by user
    'app_restored',         -- App reopened during active shift
    'inactivity_detected',  -- Not moving for >20 minutes
    'late_arrival',         -- Still not on-site 15+ mins after shift start
    'early_departure'       -- Left site before shift scheduled end
  )),
  CONSTRAINT valid_source CHECK (source IN (
    'geofence_auto',        -- Automatic geofence detection
    'manual_button',        -- Medic pressed button in app
    'system_detected',      -- System inferred from data (e.g., no pings = battery died)
    'admin_override'        -- Admin manually created event
  )),
  CONSTRAINT valid_latitude CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90)),
  CONSTRAINT valid_longitude CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180))
);

-- Indexes for fast queries
CREATE INDEX idx_shift_events_medic_time ON medic_shift_events(medic_id, event_timestamp DESC);
CREATE INDEX idx_shift_events_booking ON medic_shift_events(booking_id);
CREATE INDEX idx_shift_events_type ON medic_shift_events(event_type);
CREATE INDEX idx_shift_events_timestamp ON medic_shift_events(event_timestamp DESC);

-- Partial index for today's events (command center real-time view)
CREATE INDEX idx_shift_events_today ON medic_shift_events(medic_id, event_timestamp DESC)
  WHERE event_timestamp >= CURRENT_DATE;

COMMENT ON TABLE medic_shift_events IS 'Significant shift status changes (arrival, departure, breaks, edge cases). Permanent retention for billing/compliance.';
COMMENT ON COLUMN medic_shift_events.event_type IS 'Type of status change. Includes normal events (arrival/departure) and edge cases (battery died, connection lost).';
COMMENT ON COLUMN medic_shift_events.source IS 'How event was triggered: automatic geofence, medic button press, system inference, or admin override.';
COMMENT ON COLUMN medic_shift_events.geofence_radius_meters IS 'Radius of geofence boundary (typically 50-100m, larger for big construction sites).';

-- =============================================================================
-- TABLE: medic_location_audit
-- Purpose: Comprehensive audit trail for accountability and compliance
-- Retention: 6 years (UK tax law requirement)
-- =============================================================================
CREATE TABLE medic_location_audit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- References
  medic_id UUID NOT NULL REFERENCES medics(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  shift_event_id UUID REFERENCES medic_shift_events(id) ON DELETE SET NULL,

  -- Action tracking
  action_type TEXT NOT NULL, -- See CHECK constraint below
  action_timestamp TIMESTAMPTZ DEFAULT NOW(),

  -- Actor (who/what performed this action?)
  actor_type TEXT NOT NULL, -- 'medic', 'admin', 'system'
  actor_user_id UUID REFERENCES auth.users(id),

  -- Context
  description TEXT NOT NULL, -- Human-readable description of what happened
  metadata JSONB, -- Additional structured data (device info, location, etc.)

  -- Request context (for security auditing)
  ip_address INET,
  user_agent TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_action_type CHECK (action_type IN (
    'location_ping_received',      -- Normal GPS ping received
    'shift_event_created',          -- Status change event logged
    'geofence_entry_detected',      -- Medic entered job site boundary
    'geofence_exit_detected',       -- Medic exited job site boundary
    'manual_status_change',         -- Medic manually changed status
    'edge_case_detected',           -- System detected edge case (battery died, etc.)
    'alert_triggered',              -- Alert sent to admin
    'alert_resolved',               -- Admin marked alert as resolved
    'admin_viewed_location',        -- Admin viewed medic's location on map
    'admin_contacted_medic',        -- Admin called/SMS'd medic from command center
    'data_exported',                -- Location data exported (GDPR request)
    'consent_given',                -- Medic gave location tracking consent
    'consent_withdrawn',            -- Medic withdrew consent
    'data_retention_cleanup'        -- Old location pings auto-deleted
  )),
  CONSTRAINT valid_actor_type CHECK (actor_type IN ('medic', 'admin', 'system'))
);

-- Indexes for audit queries
CREATE INDEX idx_location_audit_medic ON medic_location_audit(medic_id, action_timestamp DESC);
CREATE INDEX idx_location_audit_booking ON medic_location_audit(booking_id);
CREATE INDEX idx_location_audit_action_type ON medic_location_audit(action_type);
CREATE INDEX idx_location_audit_actor ON medic_location_audit(actor_user_id);
CREATE INDEX idx_location_audit_timestamp ON medic_location_audit(action_timestamp DESC);

COMMENT ON TABLE medic_location_audit IS 'Comprehensive audit trail for all location tracking activities. 6-year retention for UK tax compliance.';
COMMENT ON COLUMN medic_location_audit.action_type IS 'Type of action logged. Covers normal operations, edge cases, admin access, and GDPR actions.';
COMMENT ON COLUMN medic_location_audit.actor_type IS 'Who/what performed the action: medic (mobile app), admin (dashboard), or system (automated).';
COMMENT ON COLUMN medic_location_audit.metadata IS 'Structured JSON data with context: {battery_level, accuracy, distance_from_site, alert_type, etc.}';

-- =============================================================================
-- TABLE: geofences
-- Purpose: Define virtual boundaries around job sites for auto-detection
-- =============================================================================
CREATE TABLE geofences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- References
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,

  -- Geofence definition
  center_latitude DECIMAL(10, 8) NOT NULL, -- Job site center point
  center_longitude DECIMAL(11, 8) NOT NULL,
  radius_meters DECIMAL(6, 2) NOT NULL DEFAULT 75.00, -- Default 75m radius

  -- Configuration
  require_consecutive_pings INT DEFAULT 3, -- How many pings needed to confirm entry/exit
  is_active BOOLEAN DEFAULT TRUE, -- Can be disabled if geofence causing false positives

  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  notes TEXT, -- e.g., "Large construction site - expanded radius to 200m"

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_center_latitude CHECK (center_latitude >= -90 AND center_latitude <= 90),
  CONSTRAINT valid_center_longitude CHECK (center_longitude >= -180 AND center_longitude <= 180),
  CONSTRAINT valid_radius CHECK (radius_meters >= 20 AND radius_meters <= 1000), -- 20m min, 1km max
  CONSTRAINT valid_consecutive_pings CHECK (require_consecutive_pings >= 1 AND require_consecutive_pings <= 10)
);

-- Indexes
CREATE INDEX idx_geofences_booking ON geofences(booking_id);
CREATE INDEX idx_geofences_active ON geofences(is_active) WHERE is_active = TRUE;

COMMENT ON TABLE geofences IS 'Virtual boundaries around job sites for automatic arrival/departure detection.';
COMMENT ON COLUMN geofences.radius_meters IS 'Geofence radius (default 75m). Larger for big sites (up to 1km), smaller for tight urban areas (20m minimum).';
COMMENT ON COLUMN geofences.require_consecutive_pings IS 'Number of consecutive GPS pings inside/outside boundary needed to trigger event (prevents GPS jitter false positives).';

-- =============================================================================
-- TABLE: medic_location_consent
-- Purpose: Track medic consent for location tracking (GDPR requirement)
-- =============================================================================
CREATE TABLE medic_location_consent (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  medic_id UUID NOT NULL REFERENCES medics(id) ON DELETE CASCADE,

  -- Consent details
  consent_given BOOLEAN NOT NULL,
  consent_version TEXT NOT NULL, -- Version of consent form (e.g., "v1.0", "v2.1")
  consent_text TEXT NOT NULL, -- Full text of consent form presented to medic

  -- Timestamps
  consented_at TIMESTAMPTZ NOT NULL,
  withdrawn_at TIMESTAMPTZ, -- NULL if still consented

  -- Audit trail
  ip_address INET,
  user_agent TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint: One active consent per medic
  UNIQUE(medic_id) WHERE withdrawn_at IS NULL
);

CREATE INDEX idx_location_consent_medic ON medic_location_consent(medic_id);
CREATE INDEX idx_location_consent_active ON medic_location_consent(consent_given) WHERE consent_given = TRUE AND withdrawn_at IS NULL;

COMMENT ON TABLE medic_location_consent IS 'GDPR-compliant consent tracking for location monitoring during shifts.';
COMMENT ON COLUMN medic_location_consent.consent_version IS 'Consent form version (allows tracking changes to consent terms over time).';

-- =============================================================================
-- FUNCTION: Calculate distance between two GPS coordinates (Haversine formula)
-- Purpose: Used for geofence detection and distance calculations
-- =============================================================================
CREATE OR REPLACE FUNCTION calculate_distance_meters(
  lat1 DECIMAL,
  lon1 DECIMAL,
  lat2 DECIMAL,
  lon2 DECIMAL
)
RETURNS DECIMAL AS $$
DECLARE
  earth_radius_km CONSTANT DECIMAL := 6371.0;
  dlat DECIMAL;
  dlon DECIMAL;
  a DECIMAL;
  c DECIMAL;
  distance_km DECIMAL;
BEGIN
  -- Convert degrees to radians
  dlat := RADIANS(lat2 - lat1);
  dlon := RADIANS(lon2 - lon1);

  -- Haversine formula
  a := SIN(dlat/2) * SIN(dlat/2) +
       COS(RADIANS(lat1)) * COS(RADIANS(lat2)) *
       SIN(dlon/2) * SIN(dlon/2);
  c := 2 * ATAN2(SQRT(a), SQRT(1-a));
  distance_km := earth_radius_km * c;

  -- Return distance in meters
  RETURN distance_km * 1000;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_distance_meters IS 'Calculate distance between two GPS coordinates in meters using Haversine formula.';

-- =============================================================================
-- FUNCTION: Check if GPS coordinate is inside geofence
-- =============================================================================
CREATE OR REPLACE FUNCTION is_inside_geofence(
  ping_latitude DECIMAL,
  ping_longitude DECIMAL,
  geofence_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  geofence_record RECORD;
  distance DECIMAL;
BEGIN
  -- Get geofence details
  SELECT center_latitude, center_longitude, radius_meters
  INTO geofence_record
  FROM geofences
  WHERE id = geofence_id AND is_active = TRUE;

  -- If geofence not found or inactive, return FALSE
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Calculate distance from ping to geofence center
  distance := calculate_distance_meters(
    ping_latitude,
    ping_longitude,
    geofence_record.center_latitude,
    geofence_record.center_longitude
  );

  -- Return TRUE if inside radius
  RETURN distance <= geofence_record.radius_meters;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION is_inside_geofence IS 'Check if GPS coordinates are inside a geofence boundary.';

-- =============================================================================
-- TRIGGER: Auto-create audit log when shift event is created
-- =============================================================================
CREATE OR REPLACE FUNCTION log_shift_event_to_audit()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO medic_location_audit (
    medic_id,
    booking_id,
    shift_event_id,
    action_type,
    action_timestamp,
    actor_type,
    actor_user_id,
    description,
    metadata
  ) VALUES (
    NEW.medic_id,
    NEW.booking_id,
    NEW.id,
    'shift_event_created',
    NEW.event_timestamp,
    CASE
      WHEN NEW.source = 'manual_button' THEN 'medic'
      WHEN NEW.source = 'admin_override' THEN 'admin'
      ELSE 'system'
    END,
    NEW.triggered_by_user_id,
    format('Shift event: %s (%s)', NEW.event_type, NEW.source),
    jsonb_build_object(
      'event_type', NEW.event_type,
      'source', NEW.source,
      'latitude', NEW.latitude,
      'longitude', NEW.longitude,
      'accuracy_meters', NEW.accuracy_meters,
      'device_info', NEW.device_info
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_shift_event_audit
  AFTER INSERT ON medic_shift_events
  FOR EACH ROW
  EXECUTE FUNCTION log_shift_event_to_audit();

COMMENT ON FUNCTION log_shift_event_to_audit IS 'Automatically create audit log entry when shift event is created.';

-- =============================================================================
-- TRIGGER: Auto-update updated_at timestamps
-- =============================================================================
CREATE TRIGGER update_geofences_updated_at BEFORE UPDATE ON geofences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- SCHEDULED JOB: Auto-delete location pings older than 30 days (GDPR compliance)
-- =============================================================================
-- Note: This would typically be implemented as a Supabase cron job or pg_cron
-- Example cron job (run daily at 2am):
--
-- SELECT cron.schedule(
--   'cleanup-old-location-pings',
--   '0 2 * * *', -- Daily at 2am
--   $$
--   DELETE FROM medic_location_pings
--   WHERE created_at < NOW() - INTERVAL '30 days';
--   $$
-- );

-- =============================================================================
-- SEED DATA: Test geofence for development
-- =============================================================================
-- Note: This will reference a booking created in migration 002
-- Uncomment after creating test booking data

-- Example: Create geofence for E1 postcode test booking
-- INSERT INTO geofences (
--   booking_id,
--   center_latitude,
--   center_longitude,
--   radius_meters,
--   notes
-- ) VALUES (
--   (SELECT id FROM bookings LIMIT 1), -- First test booking
--   51.5074, -- London E1 approximate center
--   -0.1278,
--   75.00,
--   'Test geofence for development'
-- );

COMMENT ON SCHEMA public IS 'SiteMedic schema - Added Phase 5.6: Live Medic Location Tracking';
