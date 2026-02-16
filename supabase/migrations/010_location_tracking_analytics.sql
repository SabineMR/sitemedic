-- Migration 010: Location Tracking Analytics
-- Analytics views and functions for admin dashboard
-- Created: 2026-02-15

-- =============================================================================
-- VIEW: System-wide metrics (last 30 days)
-- =============================================================================

CREATE OR REPLACE VIEW location_tracking_metrics AS
WITH date_range AS (
  SELECT
    NOW() - INTERVAL '30 days' AS start_date,
    NOW() AS end_date
),
ping_stats AS (
  SELECT
    COUNT(*) AS total_pings,
    COUNT(DISTINCT medic_id) AS active_medics,
    COUNT(DISTINCT booking_id) AS tracked_bookings,
    AVG(accuracy_meters) AS avg_accuracy,
    AVG(battery_level) AS avg_battery,
    COUNT(*) FILTER (WHERE is_offline_queued = true) AS offline_pings,
    COUNT(*) FILTER (WHERE accuracy_meters > 100) AS poor_accuracy_pings
  FROM medic_location_pings
  WHERE recorded_at >= (SELECT start_date FROM date_range)
),
event_stats AS (
  SELECT
    COUNT(*) AS total_events,
    COUNT(*) FILTER (WHERE event_type = 'arrived_on_site') AS arrivals,
    COUNT(*) FILTER (WHERE event_type = 'left_site') AS departures,
    COUNT(*) FILTER (WHERE source = 'geofence_auto') AS geofence_detections,
    COUNT(*) FILTER (WHERE source = 'manual_button') AS manual_events
  FROM medic_shift_events
  WHERE event_timestamp >= (SELECT start_date FROM date_range)
),
alert_stats AS (
  SELECT
    COUNT(*) AS total_alerts,
    COUNT(*) FILTER (WHERE alert_severity = 'critical') AS critical_alerts,
    COUNT(*) FILTER (WHERE is_resolved = true) AS resolved_alerts,
    AVG(EXTRACT(EPOCH FROM (resolved_at - triggered_at)) / 60)::INT AS avg_resolution_time_mins
  FROM medic_alerts
  WHERE triggered_at >= (SELECT start_date FROM date_range)
)
SELECT
  (SELECT start_date FROM date_range) AS period_start,
  (SELECT end_date FROM date_range) AS period_end,

  -- Ping metrics
  ps.total_pings,
  ps.active_medics,
  ps.tracked_bookings,
  ROUND(ps.avg_accuracy, 1) AS avg_gps_accuracy_meters,
  ROUND(ps.avg_battery, 0) AS avg_battery_level,
  ps.offline_pings,
  ROUND(ps.offline_pings::NUMERIC / NULLIF(ps.total_pings, 0) * 100, 1) AS offline_percentage,
  ps.poor_accuracy_pings,

  -- Event metrics
  es.total_events,
  es.arrivals,
  es.departures,
  es.geofence_detections,
  es.manual_events,
  ROUND(es.geofence_detections::NUMERIC / NULLIF(es.arrivals, 0) * 100, 1) AS geofence_accuracy_percentage,

  -- Alert metrics
  als.total_alerts,
  als.critical_alerts,
  als.resolved_alerts,
  als.avg_resolution_time_mins

FROM ping_stats ps
CROSS JOIN event_stats es
CROSS JOIN alert_stats als;

COMMENT ON VIEW location_tracking_metrics IS 'System-wide location tracking metrics for last 30 days';

-- =============================================================================
-- VIEW: Per-medic analytics
-- =============================================================================

CREATE OR REPLACE VIEW medic_location_analytics AS
WITH date_range AS (
  SELECT NOW() - INTERVAL '30 days' AS start_date
),
medic_pings AS (
  SELECT
    medic_id,
    COUNT(*) AS total_pings,
    AVG(accuracy_meters) AS avg_accuracy,
    AVG(battery_level) AS avg_battery,
    COUNT(*) FILTER (WHERE is_offline_queued = true) AS offline_pings,
    MIN(recorded_at) AS first_ping,
    MAX(recorded_at) AS last_ping
  FROM medic_location_pings
  WHERE recorded_at >= (SELECT start_date FROM date_range)
  GROUP BY medic_id
),
medic_events AS (
  SELECT
    medic_id,
    COUNT(*) AS total_events,
    COUNT(*) FILTER (WHERE event_type = 'arrived_on_site') AS arrivals,
    COUNT(*) FILTER (WHERE source = 'geofence_auto') AS auto_arrivals,
    COUNT(*) FILTER (WHERE source = 'manual_button') AS manual_events
  FROM medic_shift_events
  WHERE event_timestamp >= (SELECT start_date FROM date_range)
  GROUP BY medic_id
),
medic_alerts AS (
  SELECT
    medic_id,
    COUNT(*) AS total_alerts,
    COUNT(*) FILTER (WHERE alert_severity = 'critical') AS critical_alerts,
    COUNT(*) FILTER (WHERE alert_type = 'late_arrival') AS late_arrivals,
    COUNT(*) FILTER (WHERE alert_type = 'battery_critical') AS battery_issues
  FROM medic_alerts
  WHERE triggered_at >= (SELECT start_date FROM date_range)
  GROUP BY medic_id
)
SELECT
  m.id AS medic_id,
  m.name AS medic_name,

  -- Ping metrics
  COALESCE(mp.total_pings, 0) AS total_pings,
  ROUND(COALESCE(mp.avg_accuracy, 0), 1) AS avg_gps_accuracy,
  ROUND(COALESCE(mp.avg_battery, 0), 0) AS avg_battery_level,
  COALESCE(mp.offline_pings, 0) AS offline_pings,
  ROUND(COALESCE(mp.offline_pings, 0)::NUMERIC / NULLIF(mp.total_pings, 0) * 100, 1) AS offline_percentage,
  mp.first_ping,
  mp.last_ping,

  -- Event metrics
  COALESCE(me.total_events, 0) AS total_events,
  COALESCE(me.arrivals, 0) AS total_arrivals,
  COALESCE(me.auto_arrivals, 0) AS geofence_arrivals,
  COALESCE(me.manual_events, 0) AS manual_events,
  ROUND(COALESCE(me.auto_arrivals, 0)::NUMERIC / NULLIF(me.arrivals, 0) * 100, 1) AS geofence_reliability_percentage,

  -- Alert metrics
  COALESCE(ma.total_alerts, 0) AS total_alerts,
  COALESCE(ma.critical_alerts, 0) AS critical_alerts,
  COALESCE(ma.late_arrivals, 0) AS late_arrivals,
  COALESCE(ma.battery_issues, 0) AS battery_issues,

  -- Overall score (0-100)
  GREATEST(0, LEAST(100,
    100
    - (COALESCE(ma.critical_alerts, 0) * 10)           -- -10 per critical alert
    - (COALESCE(ma.late_arrivals, 0) * 5)              -- -5 per late arrival
    - (COALESCE(me.manual_events, 0)::NUMERIC / NULLIF(me.total_events, 0) * 20)  -- -20% if all manual
    - (COALESCE(mp.offline_pings, 0)::NUMERIC / NULLIF(mp.total_pings, 0) * 10)   -- -10% if all offline
  ))::INT AS reliability_score

FROM medics m
LEFT JOIN medic_pings mp ON m.id = mp.medic_id
LEFT JOIN medic_events me ON m.id = me.medic_id
LEFT JOIN medic_alerts ma ON m.id = ma.medic_id
WHERE mp.total_pings > 0 OR me.total_events > 0;  -- Only include active medics

COMMENT ON VIEW medic_location_analytics IS 'Per-medic location tracking analytics with reliability score';

-- =============================================================================
-- VIEW: Daily activity trends (last 30 days)
-- =============================================================================

CREATE OR REPLACE VIEW daily_location_trends AS
WITH date_series AS (
  SELECT generate_series(
    NOW()::DATE - INTERVAL '29 days',
    NOW()::DATE,
    INTERVAL '1 day'
  )::DATE AS date
),
daily_pings AS (
  SELECT
    recorded_at::DATE AS date,
    COUNT(*) AS pings,
    COUNT(DISTINCT medic_id) AS active_medics,
    AVG(accuracy_meters) AS avg_accuracy,
    COUNT(*) FILTER (WHERE is_offline_queued = true) AS offline_pings
  FROM medic_location_pings
  WHERE recorded_at >= NOW() - INTERVAL '30 days'
  GROUP BY recorded_at::DATE
),
daily_events AS (
  SELECT
    event_timestamp::DATE AS date,
    COUNT(*) AS events,
    COUNT(*) FILTER (WHERE event_type = 'arrived_on_site') AS arrivals
  FROM medic_shift_events
  WHERE event_timestamp >= NOW() - INTERVAL '30 days'
  GROUP BY event_timestamp::DATE
),
daily_alerts AS (
  SELECT
    triggered_at::DATE AS date,
    COUNT(*) AS alerts,
    COUNT(*) FILTER (WHERE alert_severity = 'critical') AS critical_alerts
  FROM medic_alerts
  WHERE triggered_at >= NOW() - INTERVAL '30 days'
  GROUP BY triggered_at::DATE
)
SELECT
  ds.date,
  COALESCE(dp.pings, 0) AS pings,
  COALESCE(dp.active_medics, 0) AS active_medics,
  ROUND(COALESCE(dp.avg_accuracy, 0), 1) AS avg_accuracy,
  COALESCE(dp.offline_pings, 0) AS offline_pings,
  COALESCE(de.events, 0) AS events,
  COALESCE(de.arrivals, 0) AS arrivals,
  COALESCE(da.alerts, 0) AS alerts,
  COALESCE(da.critical_alerts, 0) AS critical_alerts
FROM date_series ds
LEFT JOIN daily_pings dp ON ds.date = dp.date
LEFT JOIN daily_events de ON ds.date = de.date
LEFT JOIN daily_alerts da ON ds.date = da.date
ORDER BY ds.date DESC;

COMMENT ON VIEW daily_location_trends IS 'Daily location tracking trends for last 30 days';

-- =============================================================================
-- VIEW: Geofence performance
-- =============================================================================

CREATE OR REPLACE VIEW geofence_performance AS
WITH geofence_arrivals AS (
  SELECT
    g.id AS geofence_id,
    g.booking_id,
    b.site_name,
    g.radius_meters,
    g.require_consecutive_pings,
    COUNT(*) FILTER (WHERE mse.source = 'geofence_auto') AS auto_detections,
    COUNT(*) FILTER (WHERE mse.source = 'manual_button') AS manual_detections,
    AVG(EXTRACT(EPOCH FROM (mse.event_timestamp - b.shift_start_time)) / 60)::INT AS avg_arrival_delay_mins
  FROM geofences g
  JOIN bookings b ON g.booking_id = b.id
  LEFT JOIN medic_shift_events mse ON g.booking_id = mse.booking_id
    AND mse.event_type = 'arrived_on_site'
    AND mse.event_timestamp >= NOW() - INTERVAL '30 days'
  WHERE g.is_active = true
  GROUP BY g.id, g.booking_id, b.site_name, g.radius_meters, g.require_consecutive_pings
)
SELECT
  geofence_id,
  booking_id,
  site_name,
  radius_meters,
  require_consecutive_pings,
  auto_detections,
  manual_detections,
  (auto_detections + manual_detections) AS total_arrivals,
  CASE
    WHEN (auto_detections + manual_detections) = 0 THEN NULL
    ELSE ROUND(auto_detections::NUMERIC / (auto_detections + manual_detections) * 100, 1)
  END AS auto_detection_rate,
  avg_arrival_delay_mins,
  CASE
    WHEN auto_detections::NUMERIC / NULLIF(auto_detections + manual_detections, 0) >= 0.9 THEN 'excellent'
    WHEN auto_detections::NUMERIC / NULLIF(auto_detections + manual_detections, 0) >= 0.7 THEN 'good'
    WHEN auto_detections::NUMERIC / NULLIF(auto_detections + manual_detections, 0) >= 0.5 THEN 'fair'
    ELSE 'poor'
  END AS performance_rating
FROM geofence_arrivals
WHERE total_arrivals > 0
ORDER BY auto_detection_rate DESC NULLS LAST;

COMMENT ON VIEW geofence_performance IS 'Geofence auto-detection performance by booking';

-- =============================================================================
-- VIEW: Alert summary by type
-- =============================================================================

CREATE OR REPLACE VIEW alert_type_summary AS
SELECT
  alert_type,
  alert_severity,
  COUNT(*) AS total_count,
  COUNT(*) FILTER (WHERE is_resolved = true) AS resolved_count,
  COUNT(*) FILTER (WHERE is_dismissed = true AND is_resolved = false) AS dismissed_count,
  COUNT(*) FILTER (WHERE is_resolved = false AND is_dismissed = false) AS active_count,
  COUNT(*) FILTER (WHERE auto_resolved = true) AS auto_resolved_count,
  AVG(EXTRACT(EPOCH FROM (COALESCE(resolved_at, NOW()) - triggered_at)) / 60)::INT AS avg_lifetime_mins,
  MAX(triggered_at) AS last_triggered
FROM medic_alerts
WHERE triggered_at >= NOW() - INTERVAL '30 days'
GROUP BY alert_type, alert_severity
ORDER BY total_count DESC;

COMMENT ON VIEW alert_type_summary IS 'Alert statistics grouped by type and severity';

-- =============================================================================
-- FUNCTION: Generate location tracking report
-- =============================================================================

CREATE OR REPLACE FUNCTION generate_location_report(
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSONB AS $$
DECLARE
  v_report JSONB;
BEGIN
  -- Compile comprehensive report
  v_report := jsonb_build_object(
    'report_generated_at', NOW(),
    'period', jsonb_build_object(
      'start', p_start_date,
      'end', p_end_date,
      'days', EXTRACT(DAY FROM (p_end_date - p_start_date))
    ),

    -- Overall metrics
    'summary', (
      SELECT jsonb_build_object(
        'total_pings', COUNT(*),
        'active_medics', COUNT(DISTINCT medic_id),
        'tracked_bookings', COUNT(DISTINCT booking_id),
        'avg_accuracy_meters', ROUND(AVG(accuracy_meters), 1),
        'offline_percentage', ROUND(COUNT(*) FILTER (WHERE is_offline_queued = true)::NUMERIC / COUNT(*) * 100, 1)
      )
      FROM medic_location_pings
      WHERE recorded_at BETWEEN p_start_date AND p_end_date
    ),

    -- Top performers (by reliability score)
    'top_performers', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'medic_name', medic_name,
          'reliability_score', reliability_score,
          'total_pings', total_pings,
          'geofence_reliability', geofence_reliability_percentage
        )
        ORDER BY reliability_score DESC
      )
      FROM medic_location_analytics
      LIMIT 10
    ),

    -- Alert trends
    'alert_trends', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'alert_type', alert_type,
          'count', total_count,
          'resolved', resolved_count
        )
        ORDER BY total_count DESC
      )
      FROM alert_type_summary
    ),

    -- Geofence performance
    'geofence_performance', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'site_name', site_name,
          'auto_detection_rate', auto_detection_rate,
          'total_arrivals', total_arrivals
        )
        ORDER BY auto_detection_rate DESC
      )
      FROM geofence_performance
    )
  );

  RETURN v_report;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_location_report IS 'Generate comprehensive location tracking analytics report';

-- =============================================================================
-- Grants
-- =============================================================================

-- Allow admins to view analytics
GRANT SELECT ON location_tracking_metrics TO authenticated;
GRANT SELECT ON medic_location_analytics TO authenticated;
GRANT SELECT ON daily_location_trends TO authenticated;
GRANT SELECT ON geofence_performance TO authenticated;
GRANT SELECT ON alert_type_summary TO authenticated;
GRANT EXECUTE ON FUNCTION generate_location_report TO authenticated;
