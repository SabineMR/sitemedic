-- Migration 110: Platform Metrics RPC Functions
-- Created: 2026-02-16
-- Purpose: Replace fake hardcoded data with real database queries for platform analytics
--
-- BACKGROUND: Platform dashboard currently shows fake data:
-- - 12 organizations (fake)
-- - 458 users (fake)
-- - £125,450 revenue (fake)
-- - Active bookings (fake)
--
-- These functions provide real metrics for platform admins.

-- =============================================================================
-- FUNCTION: Get platform-wide metrics
-- Used by: /platform/page.tsx (main dashboard)
-- =============================================================================

CREATE OR REPLACE FUNCTION get_platform_metrics()
RETURNS TABLE (
  total_organizations BIGINT,
  total_users BIGINT,
  total_revenue NUMERIC,
  active_bookings BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM organizations WHERE status = 'active')::BIGINT,
    (SELECT COUNT(*) FROM auth.users)::BIGINT,
    (SELECT COALESCE(SUM(total), 0) FROM bookings WHERE status = 'completed')::NUMERIC,
    (SELECT COUNT(*) FROM bookings WHERE status IN ('confirmed', 'in_progress'))::BIGINT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION get_platform_metrics IS 'Get platform-wide statistics for main dashboard';

GRANT EXECUTE ON FUNCTION get_platform_metrics TO authenticated;

-- =============================================================================
-- FUNCTION: Get revenue breakdown by organization
-- Used by: /platform/revenue/page.tsx
-- =============================================================================

CREATE OR REPLACE FUNCTION get_org_revenue_breakdown()
RETURNS TABLE (
  org_id UUID,
  org_name TEXT,
  revenue NUMERIC,
  booking_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id,
    o.name,
    COALESCE(SUM(b.total), 0)::NUMERIC as revenue,
    COUNT(b.id)::BIGINT as booking_count
  FROM organizations o
  LEFT JOIN bookings b ON b.org_id = o.id AND b.status = 'completed'
  WHERE o.status = 'active'
  GROUP BY o.id, o.name
  ORDER BY revenue DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION get_org_revenue_breakdown IS 'Get revenue breakdown by organization for platform analytics';

GRANT EXECUTE ON FUNCTION get_org_revenue_breakdown TO authenticated;

-- =============================================================================
-- FUNCTION: Get per-organization metrics
-- Used by: /platform/organizations/page.tsx (org list with metrics)
-- =============================================================================

CREATE OR REPLACE FUNCTION get_org_metrics(p_org_id UUID)
RETURNS TABLE (
  user_count BIGINT,
  medic_count BIGINT,
  booking_count BIGINT,
  revenue NUMERIC,
  active_issues_count BIGINT,
  pending_bookings_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM profiles WHERE org_id = p_org_id)::BIGINT,
    (SELECT COUNT(*) FROM medics WHERE org_id = p_org_id)::BIGINT,
    (SELECT COUNT(*) FROM bookings WHERE org_id = p_org_id)::BIGINT,
    (SELECT COALESCE(SUM(total), 0) FROM bookings
     WHERE org_id = p_org_id AND status = 'completed')::NUMERIC,
    (SELECT COUNT(*) FROM medic_alerts
     WHERE org_id = p_org_id AND is_resolved = FALSE AND is_dismissed = FALSE)::BIGINT,
    (SELECT COUNT(*) FROM bookings
     WHERE org_id = p_org_id AND status = 'pending')::BIGINT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION get_org_metrics IS 'Get detailed metrics for a specific organization';

GRANT EXECUTE ON FUNCTION get_org_metrics TO authenticated;

-- =============================================================================
-- FUNCTION: Get growth trends over time
-- Used by: /platform/analytics/page.tsx
-- =============================================================================

CREATE OR REPLACE FUNCTION get_growth_trends(
  p_start_date DATE DEFAULT NOW() - INTERVAL '30 days',
  p_end_date DATE DEFAULT NOW()
)
RETURNS TABLE (
  date DATE,
  new_users BIGINT,
  new_bookings BIGINT,
  revenue NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(
      p_start_date::DATE,
      p_end_date::DATE,
      '1 day'::interval
    )::DATE as date
  )
  SELECT
    ds.date,
    COALESCE(COUNT(DISTINCT au.id), 0)::BIGINT as new_users,
    COALESCE(COUNT(DISTINCT b.id), 0)::BIGINT as new_bookings,
    COALESCE(SUM(b.total), 0)::NUMERIC as revenue
  FROM date_series ds
  LEFT JOIN auth.users au ON au.created_at::DATE = ds.date
  LEFT JOIN bookings b ON b.created_at::DATE = ds.date AND b.status = 'completed'
  GROUP BY ds.date
  ORDER BY ds.date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION get_growth_trends IS 'Get daily growth trends for analytics dashboard';

GRANT EXECUTE ON FUNCTION get_growth_trends TO authenticated;

-- =============================================================================
-- FUNCTION: Get organization list with key metrics
-- Used by: /platform/organizations/page.tsx
-- =============================================================================

CREATE OR REPLACE FUNCTION get_platform_organizations()
RETURNS TABLE (
  id UUID,
  name TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  user_count BIGINT,
  medic_count BIGINT,
  booking_count BIGINT,
  revenue NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id,
    o.name,
    o.status,
    o.created_at,
    (SELECT COUNT(*) FROM profiles WHERE org_id = o.id)::BIGINT as user_count,
    (SELECT COUNT(*) FROM medics WHERE org_id = o.id)::BIGINT as medic_count,
    (SELECT COUNT(*) FROM bookings WHERE org_id = o.id)::BIGINT as booking_count,
    (SELECT COALESCE(SUM(total), 0) FROM bookings b2
     WHERE b2.org_id = o.id AND b2.status = 'completed')::NUMERIC as revenue
  FROM organizations o
  WHERE o.status = 'active'
  ORDER BY o.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION get_platform_organizations IS 'Get all organizations with aggregated metrics for platform dashboard';

GRANT EXECUTE ON FUNCTION get_platform_organizations TO authenticated;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Platform metrics functions created successfully';
  RAISE NOTICE '   - get_platform_metrics() - Main dashboard stats';
  RAISE NOTICE '   - get_org_revenue_breakdown() - Revenue by org';
  RAISE NOTICE '   - get_org_metrics(org_id) - Per-org details';
  RAISE NOTICE '   - get_growth_trends(start, end) - Analytics trends';
  RAISE NOTICE '   - get_platform_organizations() - Org list with metrics';
END $$;
