-- Migration 109: Fix medic_alerts RLS policy for org admins
-- Created: 2026-02-16
-- Purpose: Restrict medic_alerts access to org admins only (not all org users)
--
-- SECURITY GAP: Migration 028 created "Users can view their org's medic alerts"
-- which allows ANY user in the org to view alerts. Should be org_admin only.
-- Platform admin policies already exist in migration 102.

-- =============================================================================
-- FIX ORG-SCOPED ACCESS POLICY
-- =============================================================================

-- Drop the overly permissive policy from migration 028
DROP POLICY IF EXISTS "Users can view their org's medic alerts" ON medic_alerts;
DROP POLICY IF EXISTS "Users can insert medic alerts in their org" ON medic_alerts;
DROP POLICY IF EXISTS "Users can update their org's medic alerts" ON medic_alerts;
DROP POLICY IF EXISTS "Users can delete their org's medic alerts" ON medic_alerts;

-- Create restricted policies - org admins only
CREATE POLICY "Org admins view org alerts"
  ON medic_alerts FOR SELECT
  USING (org_id = get_user_org_id() AND is_org_admin());

CREATE POLICY "Org admins insert org alerts"
  ON medic_alerts FOR INSERT
  WITH CHECK (org_id = get_user_org_id() AND is_org_admin());

CREATE POLICY "Org admins update org alerts"
  ON medic_alerts FOR UPDATE
  USING (org_id = get_user_org_id() AND is_org_admin());

CREATE POLICY "Org admins delete org alerts"
  ON medic_alerts FOR DELETE
  USING (org_id = get_user_org_id() AND is_org_admin());

COMMENT ON POLICY "Org admins view org alerts" ON medic_alerts
  IS 'Only org admins can view their organization''s medic alerts';

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- Verify RLS is enabled
DO $$
BEGIN
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'medic_alerts') THEN
    RAISE EXCEPTION 'RLS is not enabled on medic_alerts table';
  END IF;

  RAISE NOTICE '✅ RLS policies updated successfully for medic_alerts';
  RAISE NOTICE '✅ Org admins can only view their org''s alerts';
  RAISE NOTICE '✅ Platform admins can view all alerts (from migration 102)';
END $$;
