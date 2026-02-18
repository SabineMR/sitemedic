-- Migration 126: Add motorsport_concussion to medic_alerts.alert_type CHECK constraint
-- Phase 19: Motorsport Vertical — MOTO-03
--
-- When a medic submits a motorsport treatment where concussion is suspected,
-- the mobile app inserts a 'motorsport_concussion' alert into medic_alerts so
-- that admin can see it in the command centre dashboard.
--
-- This migration drops the existing CHECK constraint on alert_type and recreates
-- it with 'motorsport_concussion' added to the allowed values.
-- All original values from migration 008_medic_alerts.sql are preserved.

-- ─────────────────────────────────────────────────────────────────────────────
-- Drop existing CHECK constraint and recreate with motorsport_concussion added
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE medic_alerts
  DROP CONSTRAINT IF EXISTS medic_alerts_alert_type_check;

ALTER TABLE medic_alerts
  ADD CONSTRAINT medic_alerts_alert_type_check
    CHECK (alert_type IN (
      -- Original values from migration 008
      'battery_low',           -- Battery <20%
      'battery_critical',      -- Battery <10%
      'late_arrival',          -- Not on-site 15 mins after shift start
      'early_departure',       -- Left site before shift end
      'connection_lost',       -- No ping received for >5 minutes
      'not_moving_20min',      -- Stationary for >20 minutes
      'geofence_failure',      -- Multiple failed geofence crossings
      'gps_accuracy_poor',     -- GPS accuracy >100m for extended period
      'shift_overrun',         -- Shift exceeded expected duration by >2 hours
      -- Phase 19 addition
      'motorsport_concussion'  -- Concussion suspected at motorsport event (MOTO-03)
    ));

COMMENT ON COLUMN medic_alerts.alert_type IS
  'Type of alert triggered. motorsport_concussion: inserted by mobile app when '
  'a medic submits a motorsport treatment with concussion_suspected = true.';
