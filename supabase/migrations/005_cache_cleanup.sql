-- Migration 005: Travel Time Cache Cleanup
-- Phase 1.5: Automated cleanup of expired 7-day cache entries
-- Created: 2026-02-15
-- Depends on: 002_business_operations.sql (travel_time_cache table)

-- =============================================================================
-- FUNCTION: cleanup_expired_cache
-- Purpose: Delete expired travel_time_cache entries (7-day TTL)
-- Returns: Number of deleted rows
-- =============================================================================
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM travel_time_cache WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_expired_cache IS 'Deletes expired travel_time_cache entries (7-day TTL) - run daily via pg_cron';

-- =============================================================================
-- SCHEDULE: Daily cache cleanup at 3 AM UTC
-- Uses pg_cron extension (if available)
-- =============================================================================
DO $$
BEGIN
  -- Try to schedule with pg_cron
  -- If pg_cron extension not installed, this will fail silently
  PERFORM cron.schedule('cleanup-travel-cache', '0 3 * * *', 'SELECT cleanup_expired_cache()');
  RAISE NOTICE 'pg_cron job scheduled: cleanup-travel-cache runs daily at 3 AM UTC';
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'pg_cron extension not available - manual scheduling required';
    RAISE NOTICE 'To clean cache manually, run: SELECT cleanup_expired_cache();';
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not schedule pg_cron job: %', SQLERRM;
    RAISE NOTICE 'To clean cache manually, run: SELECT cleanup_expired_cache();';
END;
$$;

-- =============================================================================
-- MANUAL ALTERNATIVE (if pg_cron not available)
-- =============================================================================
-- Run this daily via external cron job or application scheduler:
-- SELECT cleanup_expired_cache();
--
-- Example external cron (Linux):
-- 0 3 * * * psql $DATABASE_URL -c "SELECT cleanup_expired_cache();"
