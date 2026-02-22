-- Migration 164: Marketplace Integrity Provenance Foundation
-- Phase 48: Marketplace Integrity - Plan 01
-- Created: 2026-02-21
-- Purpose: Add immutable source provenance + fee policy invariants for events/bookings.

-- =============================================================================
-- 1) marketplace_events provenance + fee policy
-- =============================================================================

ALTER TABLE marketplace_events
  ADD COLUMN IF NOT EXISTS source_provenance TEXT,
  ADD COLUMN IF NOT EXISTS fee_policy TEXT,
  ADD COLUMN IF NOT EXISTS source_locked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS source_lock_reason TEXT;

UPDATE marketplace_events
SET
  source_provenance = CASE
    WHEN source = 'direct' THEN 'self_sourced'
    ELSE 'marketplace_sourced'
  END,
  fee_policy = CASE
    WHEN source = 'direct' THEN 'subscription'
    ELSE 'marketplace_commission'
  END,
  source_locked_at = COALESCE(source_locked_at, NOW()),
  source_lock_reason = COALESCE(source_lock_reason, 'initial_classification')
WHERE source_provenance IS NULL OR fee_policy IS NULL OR source_locked_at IS NULL OR source_lock_reason IS NULL;

ALTER TABLE marketplace_events
  ALTER COLUMN source_provenance SET NOT NULL,
  ALTER COLUMN fee_policy SET NOT NULL,
  ALTER COLUMN source_locked_at SET NOT NULL,
  ALTER COLUMN source_lock_reason SET NOT NULL;

ALTER TABLE marketplace_events
  ADD CONSTRAINT marketplace_events_source_provenance_check
  CHECK (source_provenance IN ('self_sourced', 'marketplace_sourced'));

ALTER TABLE marketplace_events
  ADD CONSTRAINT marketplace_events_fee_policy_check
  CHECK (fee_policy IN ('subscription', 'marketplace_commission', 'co_share_blended'));

ALTER TABLE marketplace_events
  ADD CONSTRAINT marketplace_events_provenance_fee_consistency_check
  CHECK (
    (source_provenance = 'self_sourced' AND fee_policy = 'subscription')
    OR
    (source_provenance = 'marketplace_sourced' AND fee_policy IN ('marketplace_commission', 'co_share_blended'))
  );

CREATE INDEX IF NOT EXISTS idx_marketplace_events_source_provenance
  ON marketplace_events(source_provenance);

CREATE INDEX IF NOT EXISTS idx_marketplace_events_fee_policy
  ON marketplace_events(fee_policy);

-- =============================================================================
-- 2) bookings provenance + fee policy
-- =============================================================================

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS source_provenance TEXT,
  ADD COLUMN IF NOT EXISTS fee_policy TEXT,
  ADD COLUMN IF NOT EXISTS source_origin_event_id UUID REFERENCES marketplace_events(id),
  ADD COLUMN IF NOT EXISTS source_locked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS source_lock_reason TEXT;

UPDATE bookings
SET
  source_provenance = CASE
    WHEN source = 'direct' THEN 'self_sourced'
    ELSE 'marketplace_sourced'
  END,
  fee_policy = CASE
    WHEN source = 'direct' THEN 'subscription'
    ELSE 'marketplace_commission'
  END,
  source_locked_at = COALESCE(source_locked_at, NOW()),
  source_lock_reason = COALESCE(source_lock_reason, 'initial_classification')
WHERE source_provenance IS NULL OR fee_policy IS NULL OR source_locked_at IS NULL OR source_lock_reason IS NULL;

ALTER TABLE bookings
  ALTER COLUMN source_provenance SET NOT NULL,
  ALTER COLUMN fee_policy SET NOT NULL,
  ALTER COLUMN source_locked_at SET NOT NULL,
  ALTER COLUMN source_lock_reason SET NOT NULL;

ALTER TABLE bookings
  ADD CONSTRAINT bookings_source_provenance_check
  CHECK (source_provenance IN ('self_sourced', 'marketplace_sourced'));

ALTER TABLE bookings
  ADD CONSTRAINT bookings_fee_policy_check
  CHECK (fee_policy IN ('subscription', 'marketplace_commission', 'co_share_blended'));

ALTER TABLE bookings
  ADD CONSTRAINT bookings_provenance_fee_consistency_check
  CHECK (
    (source_provenance = 'self_sourced' AND fee_policy = 'subscription')
    OR
    (source_provenance = 'marketplace_sourced' AND fee_policy IN ('marketplace_commission', 'co_share_blended'))
  );

CREATE INDEX IF NOT EXISTS idx_bookings_source_provenance
  ON bookings(source_provenance);

CREATE INDEX IF NOT EXISTS idx_bookings_fee_policy
  ON bookings(fee_policy);

CREATE INDEX IF NOT EXISTS idx_bookings_source_origin_event_id
  ON bookings(source_origin_event_id);

-- =============================================================================
-- 3) immutability trigger: non-admin provenance changes blocked
-- =============================================================================

CREATE OR REPLACE FUNCTION prevent_non_admin_source_reclassification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.source_provenance IS DISTINCT FROM OLD.source_provenance
     OR NEW.fee_policy IS DISTINCT FROM OLD.fee_policy THEN
    IF NOT is_platform_admin() THEN
      RAISE EXCEPTION 'Source provenance and fee policy are immutable; platform admin override required';
    END IF;

    NEW.source_locked_at := NOW();
    NEW.source_lock_reason := COALESCE(NEW.source_lock_reason, 'platform_admin_override');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_marketplace_events_provenance_immutable ON marketplace_events;
CREATE TRIGGER trg_marketplace_events_provenance_immutable
  BEFORE UPDATE ON marketplace_events
  FOR EACH ROW
  EXECUTE FUNCTION prevent_non_admin_source_reclassification();

DROP TRIGGER IF EXISTS trg_bookings_provenance_immutable ON bookings;
CREATE TRIGGER trg_bookings_provenance_immutable
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION prevent_non_admin_source_reclassification();

COMMENT ON COLUMN marketplace_events.source_provenance IS 'Canonical source classification: self_sourced or marketplace_sourced';
COMMENT ON COLUMN marketplace_events.fee_policy IS 'Fee policy applied: subscription, marketplace_commission, or co_share_blended';
COMMENT ON COLUMN bookings.source_provenance IS 'Snapshot source classification for payout/audit integrity';
COMMENT ON COLUMN bookings.fee_policy IS 'Snapshot fee policy used for booking economics';
COMMENT ON COLUMN bookings.source_origin_event_id IS 'Origin event for source attribution chain and collision checks';
