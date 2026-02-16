-- Migration 009: Privacy Controls & Data Retention
-- GDPR-compliant data retention and privacy management
-- Created: 2026-02-15

-- =============================================================================
-- SCHEDULED JOB: Auto-delete location pings older than 30 days (GDPR)
-- =============================================================================

-- Function to cleanup old location pings
CREATE OR REPLACE FUNCTION cleanup_old_location_pings()
RETURNS TABLE (
  pings_deleted BIGINT,
  medics_affected INT,
  cleanup_completed_at TIMESTAMPTZ
) AS $$
DECLARE
  v_pings_deleted BIGINT;
  v_medics_affected INT;
BEGIN
  -- Delete location pings older than 30 days
  WITH deleted AS (
    DELETE FROM medic_location_pings
    WHERE recorded_at < NOW() - INTERVAL '30 days'
    RETURNING medic_id
  )
  SELECT
    COUNT(*),
    COUNT(DISTINCT medic_id)
  INTO v_pings_deleted, v_medics_affected
  FROM deleted;

  -- Log cleanup in audit table
  INSERT INTO medic_location_audit (
    action_type,
    action_timestamp,
    actor_type,
    description,
    metadata
  ) VALUES (
    'data_retention_cleanup',
    NOW(),
    'system',
    format('Auto-deleted %s location pings older than 30 days (GDPR compliance)', v_pings_deleted),
    jsonb_build_object(
      'pings_deleted', v_pings_deleted,
      'medics_affected', v_medics_affected,
      'retention_days', 30
    )
  );

  -- Return results
  RETURN QUERY SELECT v_pings_deleted, v_medics_affected, NOW();
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_location_pings IS 'Auto-delete location pings older than 30 days for GDPR compliance';

-- Schedule cleanup job to run daily at 2 AM
-- Note: pg_cron must be enabled in production Supabase (automatic)
DO $block$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'cron') THEN
    PERFORM cron.schedule(
      'location-pings-cleanup',
      '0 2 * * *', -- Every day at 2 AM
      'SELECT cleanup_old_location_pings();'
    );
  ELSE
    RAISE NOTICE 'pg_cron not available - run SELECT cleanup_old_location_pings() manually or enable pg_cron';
  END IF;
END
$block$;

-- =============================================================================
-- FUNCTION: Export medic data (GDPR Right to Access)
-- =============================================================================

CREATE OR REPLACE FUNCTION export_medic_data(p_medic_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Compile all medic data into single JSON object
  v_result := jsonb_build_object(
    'medic_id', p_medic_id,
    'export_date', NOW(),
    'data_retention_notice', 'Location pings retained for 30 days, audit logs for 6 years per UK tax law',

    -- Location pings (last 30 days)
    'location_pings', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'recorded_at', recorded_at,
          'latitude', latitude,
          'longitude', longitude,
          'accuracy_meters', accuracy_meters,
          'battery_level', battery_level,
          'connection_type', connection_type,
          'booking_id', booking_id
        ) ORDER BY recorded_at DESC
      )
      FROM medic_location_pings
      WHERE medic_id = p_medic_id
        AND recorded_at >= NOW() - INTERVAL '30 days'
    ),

    -- Shift events
    'shift_events', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'event_type', event_type,
          'event_timestamp', event_timestamp,
          'source', source,
          'latitude', latitude,
          'longitude', longitude,
          'notes', notes,
          'booking_id', booking_id
        ) ORDER BY event_timestamp DESC
      )
      FROM medic_shift_events
      WHERE medic_id = p_medic_id
    ),

    -- Audit trail (who accessed my data)
    'audit_trail', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'action_type', action_type,
          'action_timestamp', action_timestamp,
          'actor_type', actor_type,
          'description', description,
          'ip_address', ip_address
        ) ORDER BY action_timestamp DESC
      )
      FROM medic_location_audit
      WHERE medic_id = p_medic_id
    ),

    -- Consent records
    'consent_records', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'consent_given_at', consent_given_at,
          'consent_version', consent_version,
          'ip_address', ip_address,
          'withdrawn_at', withdrawn_at
        ) ORDER BY consent_given_at DESC
      )
      FROM medic_location_consent
      WHERE medic_id = p_medic_id
    ),

    -- Alerts related to this medic
    'alerts', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'alert_type', alert_type,
          'alert_severity', alert_severity,
          'alert_title', alert_title,
          'triggered_at', triggered_at,
          'is_resolved', is_resolved,
          'booking_id', booking_id
        ) ORDER BY triggered_at DESC
      )
      FROM medic_alerts
      WHERE medic_id = p_medic_id
    )
  );

  -- Log data export in audit trail
  INSERT INTO medic_location_audit (
    medic_id,
    action_type,
    action_timestamp,
    actor_type,
    actor_user_id,
    description,
    metadata
  ) VALUES (
    p_medic_id,
    'data_exported',
    NOW(),
    'medic',
    p_medic_id,
    'Medic exported their personal data (GDPR Right to Access)',
    jsonb_build_object(
      'export_size_kb', pg_column_size(v_result) / 1024.0
    )
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION export_medic_data IS 'Export all medic data for GDPR Right to Access';

-- =============================================================================
-- FUNCTION: Delete medic data (GDPR Right to be Forgotten)
-- =============================================================================

CREATE OR REPLACE FUNCTION delete_medic_data(
  p_medic_id UUID,
  p_requesting_user_id UUID,
  p_reason TEXT DEFAULT 'GDPR Right to be Forgotten'
)
RETURNS TABLE (
  pings_deleted BIGINT,
  events_deleted BIGINT,
  alerts_deleted BIGINT,
  completed_at TIMESTAMPTZ
) AS $$
DECLARE
  v_pings_deleted BIGINT;
  v_events_deleted BIGINT;
  v_alerts_deleted BIGINT;
  v_consent_withdrawn INT;
BEGIN
  -- Verify requesting user has permission (medic themselves or admin)
  -- This check should be enforced by RLS, but adding extra validation
  IF p_requesting_user_id != p_medic_id THEN
    -- Check if user is admin (implement based on your auth schema)
    -- For now, only allow medic to delete their own data
    RAISE EXCEPTION 'Only medic can delete their own data';
  END IF;

  -- Create final audit entry BEFORE deletion
  INSERT INTO medic_location_audit (
    medic_id,
    action_type,
    action_timestamp,
    actor_type,
    actor_user_id,
    description,
    metadata
  ) VALUES (
    p_medic_id,
    'data_deletion_requested',
    NOW(),
    'medic',
    p_requesting_user_id,
    p_reason,
    jsonb_build_object(
      'deletion_type', 'full',
      'reason', p_reason
    )
  );

  -- Delete location pings
  WITH deleted_pings AS (
    DELETE FROM medic_location_pings
    WHERE medic_id = p_medic_id
    RETURNING id
  )
  SELECT COUNT(*) INTO v_pings_deleted FROM deleted_pings;

  -- Delete shift events (but keep audit trail for 6 years - UK tax law)
  -- For true "right to be forgotten", you may need to anonymize instead of delete
  WITH deleted_events AS (
    DELETE FROM medic_shift_events
    WHERE medic_id = p_medic_id
    RETURNING id
  )
  SELECT COUNT(*) INTO v_events_deleted FROM deleted_events;

  -- Delete alerts
  WITH deleted_alerts AS (
    DELETE FROM medic_alerts
    WHERE medic_id = p_medic_id
    RETURNING id
  )
  SELECT COUNT(*) INTO v_alerts_deleted FROM deleted_alerts;

  -- Mark consent as withdrawn (don't delete - need proof of withdrawal)
  UPDATE medic_location_consent
  SET withdrawn_at = NOW()
  WHERE medic_id = p_medic_id
    AND withdrawn_at IS NULL;

  GET DIAGNOSTICS v_consent_withdrawn = ROW_COUNT;

  -- Create final audit entry (this will remain for 6 years)
  INSERT INTO medic_location_audit (
    medic_id,
    action_type,
    action_timestamp,
    actor_type,
    actor_user_id,
    description,
    metadata
  ) VALUES (
    p_medic_id,
    'data_deleted',
    NOW(),
    'medic',
    p_requesting_user_id,
    format('Deleted medic data: %s pings, %s events, %s alerts', v_pings_deleted, v_events_deleted, v_alerts_deleted),
    jsonb_build_object(
      'pings_deleted', v_pings_deleted,
      'events_deleted', v_events_deleted,
      'alerts_deleted', v_alerts_deleted,
      'consent_withdrawn', v_consent_withdrawn,
      'reason', p_reason
    )
  );

  -- Return summary
  RETURN QUERY SELECT v_pings_deleted, v_events_deleted, v_alerts_deleted, NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION delete_medic_data IS 'Delete medic data for GDPR Right to be Forgotten (keeps audit trail per UK law)';

-- =============================================================================
-- FUNCTION: Check if medic has active consent
-- =============================================================================

CREATE OR REPLACE FUNCTION has_location_tracking_consent(p_medic_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_has_consent BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1
    FROM medic_location_consent
    WHERE medic_id = p_medic_id
      AND withdrawn_at IS NULL
  ) INTO v_has_consent;

  RETURN v_has_consent;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION has_location_tracking_consent IS 'Check if medic has active location tracking consent';

-- =============================================================================
-- FUNCTION: Anonymize old audit logs (optional - for extra privacy)
-- =============================================================================

CREATE OR REPLACE FUNCTION anonymize_old_audit_logs()
RETURNS BIGINT AS $$
DECLARE
  v_logs_anonymized BIGINT;
BEGIN
  -- After 6 years, anonymize audit logs (remove IP addresses, user agents)
  -- Keep the logs for compliance, but remove identifying info
  WITH updated AS (
    UPDATE medic_location_audit
    SET
      ip_address = NULL,
      user_agent = NULL,
      metadata = metadata - 'ip_address' - 'user_agent'
    WHERE action_timestamp < NOW() - INTERVAL '6 years'
      AND ip_address IS NOT NULL
    RETURNING id
  )
  SELECT COUNT(*) INTO v_logs_anonymized FROM updated;

  -- Log anonymization
  IF v_logs_anonymized > 0 THEN
    INSERT INTO medic_location_audit (
      action_type,
      action_timestamp,
      actor_type,
      description,
      metadata
    ) VALUES (
      'audit_logs_anonymized',
      NOW(),
      'system',
      format('Anonymized %s audit logs older than 6 years', v_logs_anonymized),
      jsonb_build_object('logs_anonymized', v_logs_anonymized)
    );
  END IF;

  RETURN v_logs_anonymized;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION anonymize_old_audit_logs IS 'Anonymize audit logs older than 6 years (keep for compliance, remove PII)';

-- Schedule anonymization job to run annually
-- Note: pg_cron must be enabled in production Supabase (automatic)
DO $block$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'cron') THEN
    PERFORM cron.schedule(
      'audit-logs-anonymization',
      '0 3 1 1 *', -- Every Jan 1 at 3 AM
      'SELECT anonymize_old_audit_logs();'
    );
  ELSE
    RAISE NOTICE 'pg_cron not available - run SELECT anonymize_old_audit_logs() manually or enable pg_cron';
  END IF;
END
$block$;

-- =============================================================================
-- VIEW: Medic privacy dashboard
-- =============================================================================

CREATE OR REPLACE VIEW medic_privacy_dashboard AS
SELECT
  m.id AS medic_id,
  m.first_name || ' ' || m.last_name AS medic_name,

  -- Consent status
  c.consented_at,
  c.consent_version,
  c.withdrawn_at,
  CASE
    WHEN c.withdrawn_at IS NOT NULL THEN 'withdrawn'
    WHEN c.consented_at IS NOT NULL THEN 'active'
    ELSE 'none'
  END AS consent_status,

  -- Data volumes
  (SELECT COUNT(*) FROM medic_location_pings WHERE medic_id = m.id) AS total_pings_stored,
  (SELECT COUNT(*) FROM medic_shift_events WHERE medic_id = m.id) AS total_events_stored,
  (SELECT COUNT(*) FROM medic_location_audit WHERE medic_id = m.id) AS total_audit_logs,

  -- Data age
  (SELECT MIN(recorded_at) FROM medic_location_pings WHERE medic_id = m.id) AS oldest_ping,
  (SELECT MAX(recorded_at) FROM medic_location_pings WHERE medic_id = m.id) AS newest_ping,

  -- Data access tracking
  (SELECT COUNT(*) FROM medic_location_audit
   WHERE medic_id = m.id
     AND action_type = 'admin_viewed_location') AS times_viewed_by_admin,
  (SELECT MAX(action_timestamp) FROM medic_location_audit
   WHERE medic_id = m.id
     AND action_type = 'admin_viewed_location') AS last_viewed_by_admin,

  -- Export/deletion history
  (SELECT COUNT(*) FROM medic_location_audit
   WHERE medic_id = m.id
     AND action_type = 'data_exported') AS times_exported,
  (SELECT MAX(action_timestamp) FROM medic_location_audit
   WHERE medic_id = m.id
     AND action_type = 'data_exported') AS last_exported_at,

  EXISTS(
    SELECT 1 FROM medic_location_audit
    WHERE medic_id = m.id
      AND action_type = 'data_deleted'
  ) AS data_deleted_previously

FROM medics m
LEFT JOIN medic_location_consent c ON m.id = c.medic_id AND c.withdrawn_at IS NULL;

COMMENT ON VIEW medic_privacy_dashboard IS 'Privacy dashboard showing consent status and data volumes per medic';

-- =============================================================================
-- Grants and security
-- =============================================================================

-- Medics can export their own data
GRANT EXECUTE ON FUNCTION export_medic_data TO authenticated;

-- Medics can delete their own data
GRANT EXECUTE ON FUNCTION delete_medic_data TO authenticated;

-- Medics can check their own consent
GRANT EXECUTE ON FUNCTION has_location_tracking_consent TO authenticated;

-- Allow viewing privacy dashboard (RLS will restrict to own data)
GRANT SELECT ON medic_privacy_dashboard TO authenticated;
