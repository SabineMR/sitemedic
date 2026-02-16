-- Migration 008: Medic Alerts System
-- Real-time alerts for admin command center
-- Created: 2026-02-15

-- =============================================================================
-- TABLE: medic_alerts
-- Stores all alerts triggered by the system for admin review
-- =============================================================================
CREATE TABLE medic_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Who/What
  medic_id UUID NOT NULL REFERENCES medics(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,

  -- Alert Details
  alert_type TEXT NOT NULL CHECK (alert_type IN (
    'battery_low',           -- Battery <20%
    'battery_critical',      -- Battery <10%
    'late_arrival',          -- Not on-site 15 mins after shift start
    'early_departure',       -- Left site before shift end
    'connection_lost',       -- No ping received for >5 minutes
    'not_moving_20min',      -- Stationary for >20 minutes
    'geofence_failure',      -- Multiple failed geofence crossings
    'gps_accuracy_poor',     -- GPS accuracy >100m for extended period
    'shift_overrun'          -- Shift exceeded expected duration by >2 hours
  )),

  alert_severity TEXT NOT NULL DEFAULT 'medium' CHECK (alert_severity IN (
    'low',        -- Informational (e.g., battery_low at 19%)
    'medium',     -- Needs attention (e.g., late_arrival, not_moving)
    'high',       -- Urgent (e.g., battery_critical, connection_lost)
    'critical'    -- Immediate action (e.g., battery_died during shift)
  )),

  alert_title TEXT NOT NULL,
  alert_message TEXT NOT NULL,

  -- Context
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  related_event_id UUID REFERENCES medic_shift_events(id),
  related_ping_id UUID REFERENCES medic_location_pings(id),

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb, -- Battery level, distance, etc.

  -- Resolution
  is_dismissed BOOLEAN DEFAULT FALSE,
  dismissed_at TIMESTAMPTZ,
  dismissed_by UUID REFERENCES users(id),
  dismissal_notes TEXT,

  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id),
  resolution_notes TEXT,

  -- Auto-resolution (e.g., battery recovered, connection restored)
  auto_resolved BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_medic_alerts_medic_id ON medic_alerts(medic_id);
CREATE INDEX idx_medic_alerts_booking_id ON medic_alerts(booking_id);
CREATE INDEX idx_medic_alerts_type ON medic_alerts(alert_type);
CREATE INDEX idx_medic_alerts_severity ON medic_alerts(alert_severity);
CREATE INDEX idx_medic_alerts_triggered_at ON medic_alerts(triggered_at DESC);
CREATE INDEX idx_medic_alerts_active ON medic_alerts(is_dismissed, is_resolved)
  WHERE is_dismissed = FALSE AND is_resolved = FALSE;

COMMENT ON TABLE medic_alerts IS 'Real-time alerts for admin command center monitoring';
COMMENT ON COLUMN medic_alerts.alert_type IS 'Type of alert triggered';
COMMENT ON COLUMN medic_alerts.alert_severity IS 'Priority level for triage';
COMMENT ON COLUMN medic_alerts.is_dismissed IS 'Admin acknowledged but not resolved';
COMMENT ON COLUMN medic_alerts.is_resolved IS 'Issue completely resolved';
COMMENT ON COLUMN medic_alerts.auto_resolved IS 'System automatically resolved (e.g., battery recovered)';

-- =============================================================================
-- FUNCTION: Create alert with deduplication
-- Prevents duplicate alerts within a time window
-- =============================================================================
CREATE OR REPLACE FUNCTION create_medic_alert(
  p_medic_id UUID,
  p_booking_id UUID,
  p_alert_type TEXT,
  p_alert_severity TEXT,
  p_alert_title TEXT,
  p_alert_message TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_related_event_id UUID DEFAULT NULL,
  p_related_ping_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_alert_id UUID;
  v_existing_alert UUID;
  v_dedup_window INTERVAL;
BEGIN
  -- Set deduplication window based on alert type
  CASE p_alert_type
    WHEN 'battery_low' THEN v_dedup_window := INTERVAL '30 minutes';
    WHEN 'battery_critical' THEN v_dedup_window := INTERVAL '15 minutes';
    WHEN 'connection_lost' THEN v_dedup_window := INTERVAL '10 minutes';
    WHEN 'not_moving_20min' THEN v_dedup_window := INTERVAL '20 minutes';
    ELSE v_dedup_window := INTERVAL '15 minutes';
  END CASE;

  -- Check for existing similar alert within deduplication window
  SELECT id INTO v_existing_alert
  FROM medic_alerts
  WHERE medic_id = p_medic_id
    AND booking_id = p_booking_id
    AND alert_type = p_alert_type
    AND is_dismissed = FALSE
    AND is_resolved = FALSE
    AND triggered_at > (NOW() - v_dedup_window)
  ORDER BY triggered_at DESC
  LIMIT 1;

  -- If duplicate found, return existing alert ID
  IF v_existing_alert IS NOT NULL THEN
    RAISE NOTICE 'Duplicate alert suppressed: % for medic %', p_alert_type, p_medic_id;
    RETURN v_existing_alert;
  END IF;

  -- Create new alert
  INSERT INTO medic_alerts (
    medic_id,
    booking_id,
    alert_type,
    alert_severity,
    alert_title,
    alert_message,
    metadata,
    related_event_id,
    related_ping_id
  ) VALUES (
    p_medic_id,
    p_booking_id,
    p_alert_type,
    p_alert_severity,
    p_alert_title,
    p_alert_message,
    p_metadata,
    p_related_event_id,
    p_related_ping_id
  ) RETURNING id INTO v_alert_id;

  RAISE NOTICE 'Created alert: % (%)', p_alert_type, v_alert_id;

  RETURN v_alert_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_medic_alert IS 'Create alert with automatic deduplication to prevent spam';

-- =============================================================================
-- FUNCTION: Auto-resolve alerts when conditions improve
-- Called by monitoring functions to resolve alerts
-- =============================================================================
CREATE OR REPLACE FUNCTION auto_resolve_alerts(
  p_medic_id UUID,
  p_booking_id UUID,
  p_alert_types TEXT[]
) RETURNS INT AS $$
DECLARE
  v_resolved_count INT;
BEGIN
  UPDATE medic_alerts
  SET is_resolved = TRUE,
      resolved_at = NOW(),
      auto_resolved = TRUE,
      resolution_notes = 'Automatically resolved - conditions improved'
  WHERE medic_id = p_medic_id
    AND booking_id = p_booking_id
    AND alert_type = ANY(p_alert_types)
    AND is_resolved = FALSE
    AND is_dismissed = FALSE;

  GET DIAGNOSTICS v_resolved_count = ROW_COUNT;

  IF v_resolved_count > 0 THEN
    RAISE NOTICE 'Auto-resolved % alerts for medic %', v_resolved_count, p_medic_id;
  END IF;

  RETURN v_resolved_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION auto_resolve_alerts IS 'Automatically resolve alerts when conditions improve';

-- =============================================================================
-- VIEW: Active alerts for command center
-- Only shows unresolved, undismissed alerts
-- =============================================================================
CREATE OR REPLACE VIEW active_medic_alerts AS
SELECT
  a.id,
  a.medic_id,
  m.name AS medic_name,
  a.booking_id,
  b.site_name,
  a.alert_type,
  a.alert_severity,
  a.alert_title,
  a.alert_message,
  a.triggered_at,
  a.metadata,
  -- Time since alert triggered
  EXTRACT(EPOCH FROM (NOW() - a.triggered_at))::INT AS seconds_since_triggered
FROM medic_alerts a
JOIN medics m ON a.medic_id = m.id
JOIN bookings b ON a.booking_id = b.id
WHERE a.is_dismissed = FALSE
  AND a.is_resolved = FALSE
ORDER BY
  -- Critical first, then by time
  CASE a.alert_severity
    WHEN 'critical' THEN 1
    WHEN 'high' THEN 2
    WHEN 'medium' THEN 3
    WHEN 'low' THEN 4
  END,
  a.triggered_at DESC;

COMMENT ON VIEW active_medic_alerts IS 'Active alerts for admin command center, sorted by severity';

-- =============================================================================
-- Grant permissions (adjust based on your RLS setup)
-- =============================================================================
-- TODO: Add RLS policies in migration 012_security
