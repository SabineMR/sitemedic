-- Migration 039: Territory Metrics Cron Jobs
-- Phase 07.5-01: Daily territory metrics aggregation and weekly hiring trigger detection
-- Created: 2026-02-17
-- Depends on: 002_business_operations.sql (territory_metrics table)

-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- =============================================================================
-- SCHEMA UPDATES
-- =============================================================================

-- Add org_id column to territory_metrics if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'territory_metrics' AND column_name = 'org_id'
  ) THEN
    ALTER TABLE territory_metrics ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
    CREATE INDEX idx_territory_metrics_org ON territory_metrics(org_id);
  END IF;
END $$;

-- Add hiring_trigger_weeks column to track consecutive weeks of high utilization
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'territory_metrics' AND column_name = 'hiring_trigger_weeks'
  ) THEN
    ALTER TABLE territory_metrics ADD COLUMN hiring_trigger_weeks INT DEFAULT 0;
  END IF;
END $$;

COMMENT ON COLUMN territory_metrics.org_id IS 'Organization this territory belongs to (multi-tenant isolation)';
COMMENT ON COLUMN territory_metrics.hiring_trigger_weeks IS 'Consecutive weeks where primary_medic_utilization > 80% (hiring trigger threshold)';

-- =============================================================================
-- DAILY METRICS AGGREGATION CRON JOB
-- =============================================================================

-- Schedule daily aggregation at 3 AM UTC
-- Calculates metrics for each territory with bookings in the last 7 days
SELECT cron.schedule(
  'aggregate-territory-metrics',
  '0 3 * * *',
  $$
  INSERT INTO territory_metrics (
    org_id,
    postcode_sector,
    metric_date,
    total_bookings,
    confirmed_bookings,
    rejected_bookings,
    rejection_rate,
    fulfillment_rate,
    primary_medic_id,
    primary_medic_utilization,
    secondary_medic_id,
    secondary_medic_utilization,
    avg_travel_time_minutes,
    out_of_territory_bookings
  )
  SELECT
    t.org_id,
    t.postcode_sector,
    CURRENT_DATE AS metric_date,

    -- Booking counts
    COUNT(b.id) AS total_bookings,
    COUNT(b.id) FILTER (WHERE b.status = 'confirmed') AS confirmed_bookings,
    COUNT(b.id) FILTER (WHERE b.status = 'cancelled' AND b.cancellation_reason LIKE '%no medic available%') AS rejected_bookings,

    -- Rejection rate (percentage)
    CASE
      WHEN COUNT(b.id) > 0 THEN
        (COUNT(b.id) FILTER (WHERE b.status = 'cancelled' AND b.cancellation_reason LIKE '%no medic available%')::DECIMAL / COUNT(b.id) * 100)
      ELSE 0
    END AS rejection_rate,

    -- Fulfillment rate (percentage)
    CASE
      WHEN COUNT(b.id) > 0 THEN
        (COUNT(b.id) FILTER (WHERE b.status = 'confirmed')::DECIMAL / COUNT(b.id) * 100)
      ELSE 100
    END AS fulfillment_rate,

    -- Primary medic assignment and utilization
    t.primary_medic_id,
    CASE
      WHEN t.primary_medic_id IS NOT NULL THEN
        LEAST(
          (COUNT(b.id) FILTER (WHERE b.status = 'confirmed' AND b.medic_id = t.primary_medic_id)::DECIMAL / 5 * 100),
          100
        )
      ELSE 0
    END AS primary_medic_utilization,

    -- Secondary medic assignment and utilization
    t.secondary_medic_id,
    CASE
      WHEN t.secondary_medic_id IS NOT NULL THEN
        LEAST(
          (COUNT(b.id) FILTER (WHERE b.status = 'confirmed' AND b.medic_id = t.secondary_medic_id)::DECIMAL / 5 * 100),
          100
        )
      ELSE 0
    END AS secondary_medic_utilization,

    -- Average travel time for confirmed bookings
    AVG(ttc.travel_time_minutes) FILTER (WHERE b.status = 'confirmed') AS avg_travel_time_minutes,

    -- Out-of-territory bookings (where medic is not primary or secondary)
    COUNT(b.id) FILTER (
      WHERE b.status = 'confirmed'
        AND b.medic_id IS NOT NULL
        AND b.medic_id != COALESCE(t.primary_medic_id, '00000000-0000-0000-0000-000000000000'::UUID)
        AND b.medic_id != COALESCE(t.secondary_medic_id, '00000000-0000-0000-0000-000000000000'::UUID)
    ) AS out_of_territory_bookings

  FROM territories t
  LEFT JOIN bookings b ON (
    -- Match bookings to territory by postcode sector
    LEFT(b.site_postcode, POSITION(' ' IN b.site_postcode) - 1) = t.postcode_sector
    AND b.shift_date >= CURRENT_DATE - INTERVAL '7 days'
    AND b.shift_date < CURRENT_DATE
    AND b.org_id = t.org_id
  )
  LEFT JOIN travel_time_cache ttc ON (
    ttc.destination_postcode = b.site_postcode
    AND ttc.origin_postcode = (
      SELECT home_postcode FROM medics WHERE id = b.medic_id AND org_id = b.org_id
    )
  )
  WHERE t.org_id IS NOT NULL
  GROUP BY t.id, t.org_id, t.postcode_sector, t.primary_medic_id, t.secondary_medic_id

  -- Upsert: update existing metrics for idempotency
  ON CONFLICT (org_id, postcode_sector, metric_date)
  DO UPDATE SET
    total_bookings = EXCLUDED.total_bookings,
    confirmed_bookings = EXCLUDED.confirmed_bookings,
    rejected_bookings = EXCLUDED.rejected_bookings,
    rejection_rate = EXCLUDED.rejection_rate,
    fulfillment_rate = EXCLUDED.fulfillment_rate,
    primary_medic_id = EXCLUDED.primary_medic_id,
    primary_medic_utilization = EXCLUDED.primary_medic_utilization,
    secondary_medic_id = EXCLUDED.secondary_medic_id,
    secondary_medic_utilization = EXCLUDED.secondary_medic_utilization,
    avg_travel_time_minutes = EXCLUDED.avg_travel_time_minutes,
    out_of_territory_bookings = EXCLUDED.out_of_territory_bookings;
  $$
);

COMMENT ON SCHEMA public IS 'Migration 039: Daily territory metrics aggregation (3 AM UTC) with org isolation';

-- =============================================================================
-- WEEKLY HIRING TRIGGER AGGREGATION CRON JOB
-- =============================================================================

-- Schedule weekly hiring trigger accumulation at 4 AM UTC every Monday
-- Counts consecutive weeks where primary_medic_utilization > 80%
SELECT cron.schedule(
  'weekly-hiring-triggers',
  '0 4 * * 1',
  $$
  UPDATE territory_metrics tm
  SET hiring_trigger_weeks = (
    SELECT COUNT(DISTINCT metric_date)
    FROM territory_metrics tm_sub
    WHERE tm_sub.org_id = tm.org_id
      AND tm_sub.postcode_sector = tm.postcode_sector
      AND tm_sub.primary_medic_utilization > 80
      AND tm_sub.metric_date >= CURRENT_DATE - INTERVAL '21 days'
      AND tm_sub.metric_date < CURRENT_DATE
  )
  WHERE tm.metric_date = CURRENT_DATE - INTERVAL '1 day';
  $$
);

COMMENT ON SCHEMA public IS 'Migration 039: Weekly hiring trigger aggregation (Monday 4 AM UTC) - counts consecutive high utilization weeks';
