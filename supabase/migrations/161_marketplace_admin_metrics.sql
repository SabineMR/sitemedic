-- Migration 161: Marketplace Admin Metrics
-- Phase 39: Admin Dashboard — Plan 01
-- Created: 2026-02-21
-- Purpose: Provide a single RPC for platform marketplace health metrics

CREATE OR REPLACE FUNCTION get_marketplace_admin_metrics(window_days INT DEFAULT 30)
RETURNS TABLE (
  total_events_posted BIGINT,
  total_quotes_submitted BIGINT,
  awarded_events_count BIGINT,
  conversion_rate_percent NUMERIC(6,2),
  marketplace_revenue_gbp NUMERIC(12,2),
  open_disputes_count BIGINT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  WITH bounds AS (
    SELECT
      CASE
        WHEN window_days IS NULL OR window_days <= 0 THEN NULL::timestamptz
        ELSE NOW() - make_interval(days => window_days)
      END AS since_at
  ),
  scoped_events AS (
    SELECT e.id
    FROM marketplace_events e
    CROSS JOIN bounds b
    WHERE e.source = 'marketplace'
      AND (b.since_at IS NULL OR e.created_at >= b.since_at)
  ),
  scoped_quotes AS (
    SELECT q.id, q.event_id
    FROM marketplace_quotes q
    JOIN marketplace_events e ON e.id = q.event_id
    CROSS JOIN bounds b
    WHERE e.source = 'marketplace'
      AND q.status IN ('submitted', 'revised', 'awarded', 'rejected')
      AND (b.since_at IS NULL OR COALESCE(q.submitted_at, q.created_at) >= b.since_at)
  ),
  scoped_awards AS (
    SELECT DISTINCT ah.event_id
    FROM marketplace_award_history ah
    JOIN marketplace_events e ON e.id = ah.event_id
    CROSS JOIN bounds b
    WHERE e.source = 'marketplace'
      AND (b.since_at IS NULL OR ah.awarded_at >= b.since_at)
  ),
  scoped_bookings AS (
    SELECT b.platform_fee
    FROM bookings b
    CROSS JOIN bounds d
    WHERE b.source = 'marketplace'
      AND (d.since_at IS NULL OR b.created_at >= d.since_at)
  ),
  scoped_disputes AS (
    SELECT d.id
    FROM marketplace_disputes d
    CROSS JOIN bounds b
    WHERE d.status IN ('open', 'under_review')
      AND (b.since_at IS NULL OR d.created_at >= b.since_at)
  )
  SELECT
    (SELECT COUNT(*) FROM scoped_events) AS total_events_posted,
    (SELECT COUNT(*) FROM scoped_quotes) AS total_quotes_submitted,
    (SELECT COUNT(*) FROM scoped_awards) AS awarded_events_count,
    CASE
      WHEN (SELECT COUNT(DISTINCT event_id) FROM scoped_quotes) = 0 THEN 0::NUMERIC(6,2)
      ELSE ROUND(
        ((SELECT COUNT(*) FROM scoped_awards)::NUMERIC
          / (SELECT COUNT(DISTINCT event_id) FROM scoped_quotes)::NUMERIC) * 100,
        2
      )::NUMERIC(6,2)
    END AS conversion_rate_percent,
    COALESCE((SELECT ROUND(SUM(COALESCE(platform_fee, 0)), 2) FROM scoped_bookings), 0)::NUMERIC(12,2) AS marketplace_revenue_gbp,
    (SELECT COUNT(*) FROM scoped_disputes) AS open_disputes_count;
$$;

COMMENT ON FUNCTION get_marketplace_admin_metrics(INT) IS
  'Returns aggregated marketplace admin metrics for platform dashboard cards with optional date window in days.';

REVOKE ALL ON FUNCTION get_marketplace_admin_metrics(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_marketplace_admin_metrics(INT) TO authenticated;
