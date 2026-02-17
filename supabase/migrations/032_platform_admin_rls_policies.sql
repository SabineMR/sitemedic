-- Migration 032: Platform Admin RLS Policies
-- Created: 2026-02-16
-- Purpose: Give platform admins cross-org access to all data
--
-- This migration adds additional RLS policies for platform_admin users
-- so they can view/manage data across ALL organizations.
--
-- Org admins (org_admin role) remain scoped to their own org via existing policies.
-- Platform admins (platform_admin role) get full access via these new policies.

-- =============================================================================
-- CORE BUSINESS OPERATIONS - Platform Admin Policies
-- =============================================================================

-- territories
CREATE POLICY "Platform admins can view all territories"
  ON territories FOR SELECT
  USING (is_platform_admin());

CREATE POLICY "Platform admins can insert territories in any org"
  ON territories FOR INSERT
  WITH CHECK (is_platform_admin());

CREATE POLICY "Platform admins can update any territories"
  ON territories FOR UPDATE
  USING (is_platform_admin());

CREATE POLICY "Platform admins can delete any territories"
  ON territories FOR DELETE
  USING (is_platform_admin());

-- clients
CREATE POLICY "Platform admins can view all clients"
  ON clients FOR SELECT
  USING (is_platform_admin());

CREATE POLICY "Platform admins can insert clients in any org"
  ON clients FOR INSERT
  WITH CHECK (is_platform_admin());

CREATE POLICY "Platform admins can update any clients"
  ON clients FOR UPDATE
  USING (is_platform_admin());

CREATE POLICY "Platform admins can delete any clients"
  ON clients FOR DELETE
  USING (is_platform_admin());

-- medics
CREATE POLICY "Platform admins can view all medics"
  ON medics FOR SELECT
  USING (is_platform_admin());

CREATE POLICY "Platform admins can insert medics in any org"
  ON medics FOR INSERT
  WITH CHECK (is_platform_admin());

CREATE POLICY "Platform admins can update any medics"
  ON medics FOR UPDATE
  USING (is_platform_admin());

CREATE POLICY "Platform admins can delete any medics"
  ON medics FOR DELETE
  USING (is_platform_admin());

-- bookings
CREATE POLICY "Platform admins can view all bookings"
  ON bookings FOR SELECT
  USING (is_platform_admin());

CREATE POLICY "Platform admins can insert bookings in any org"
  ON bookings FOR INSERT
  WITH CHECK (is_platform_admin());

CREATE POLICY "Platform admins can update any bookings"
  ON bookings FOR UPDATE
  USING (is_platform_admin());

CREATE POLICY "Platform admins can delete any bookings"
  ON bookings FOR DELETE
  USING (is_platform_admin());

-- timesheets
CREATE POLICY "Platform admins can view all timesheets"
  ON timesheets FOR SELECT
  USING (is_platform_admin());

CREATE POLICY "Platform admins can insert timesheets in any org"
  ON timesheets FOR INSERT
  WITH CHECK (is_platform_admin());

CREATE POLICY "Platform admins can update any timesheets"
  ON timesheets FOR UPDATE
  USING (is_platform_admin());

CREATE POLICY "Platform admins can delete any timesheets"
  ON timesheets FOR DELETE
  USING (is_platform_admin());

-- invoices
CREATE POLICY "Platform admins can view all invoices"
  ON invoices FOR SELECT
  USING (is_platform_admin());

CREATE POLICY "Platform admins can insert invoices in any org"
  ON invoices FOR INSERT
  WITH CHECK (is_platform_admin());

CREATE POLICY "Platform admins can update any invoices"
  ON invoices FOR UPDATE
  USING (is_platform_admin());

CREATE POLICY "Platform admins can delete any invoices"
  ON invoices FOR DELETE
  USING (is_platform_admin());

-- invoice_line_items
CREATE POLICY "Platform admins can view all invoice line items"
  ON invoice_line_items FOR SELECT
  USING (is_platform_admin());

CREATE POLICY "Platform admins can insert invoice line items in any org"
  ON invoice_line_items FOR INSERT
  WITH CHECK (is_platform_admin());

CREATE POLICY "Platform admins can update any invoice line items"
  ON invoice_line_items FOR UPDATE
  USING (is_platform_admin());

CREATE POLICY "Platform admins can delete any invoice line items"
  ON invoice_line_items FOR DELETE
  USING (is_platform_admin());

-- payments
CREATE POLICY "Platform admins can view all payments"
  ON payments FOR SELECT
  USING (is_platform_admin());

CREATE POLICY "Platform admins can insert payments in any org"
  ON payments FOR INSERT
  WITH CHECK (is_platform_admin());

CREATE POLICY "Platform admins can update any payments"
  ON payments FOR UPDATE
  USING (is_platform_admin());

CREATE POLICY "Platform admins can delete any payments"
  ON payments FOR DELETE
  USING (is_platform_admin());

-- territory_metrics
CREATE POLICY "Platform admins can view all territory metrics"
  ON territory_metrics FOR SELECT
  USING (is_platform_admin());

CREATE POLICY "Platform admins can insert territory metrics in any org"
  ON territory_metrics FOR INSERT
  WITH CHECK (is_platform_admin());

CREATE POLICY "Platform admins can update any territory metrics"
  ON territory_metrics FOR UPDATE
  USING (is_platform_admin());

CREATE POLICY "Platform admins can delete any territory metrics"
  ON territory_metrics FOR DELETE
  USING (is_platform_admin());

-- payslips
CREATE POLICY "Platform admins can view all payslips"
  ON payslips FOR SELECT
  USING (is_platform_admin());

CREATE POLICY "Platform admins can insert payslips in any org"
  ON payslips FOR INSERT
  WITH CHECK (is_platform_admin());

CREATE POLICY "Platform admins can update any payslips"
  ON payslips FOR UPDATE
  USING (is_platform_admin());

CREATE POLICY "Platform admins can delete any payslips"
  ON payslips FOR DELETE
  USING (is_platform_admin());

-- =============================================================================
-- MEDIC SCHEDULING SYSTEM - Platform Admin Policies
-- =============================================================================

-- medic_availability
CREATE POLICY "Platform admins can view all medic availability"
  ON medic_availability FOR SELECT
  USING (is_platform_admin());

CREATE POLICY "Platform admins can manage all medic availability"
  ON medic_availability FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- medic_preferences
CREATE POLICY "Platform admins can view all medic preferences"
  ON medic_preferences FOR SELECT
  USING (is_platform_admin());

CREATE POLICY "Platform admins can manage all medic preferences"
  ON medic_preferences FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- shift_swaps
CREATE POLICY "Platform admins can view all shift swaps"
  ON shift_swaps FOR SELECT
  USING (is_platform_admin());

CREATE POLICY "Platform admins can manage all shift swaps"
  ON shift_swaps FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- auto_schedule_logs
CREATE POLICY "Platform admins can view all auto schedule logs"
  ON auto_schedule_logs FOR SELECT
  USING (is_platform_admin());

CREATE POLICY "Platform admins can manage all auto schedule logs"
  ON auto_schedule_logs FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- shift_templates
CREATE POLICY "Platform admins can view all shift templates"
  ON shift_templates FOR SELECT
  USING (is_platform_admin());

CREATE POLICY "Platform admins can manage all shift templates"
  ON shift_templates FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- schedule_notifications
CREATE POLICY "Platform admins can view all schedule notifications"
  ON schedule_notifications FOR SELECT
  USING (is_platform_admin());

CREATE POLICY "Platform admins can manage all schedule notifications"
  ON schedule_notifications FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- client_favorite_medics
CREATE POLICY "Platform admins can view all client favorite medics"
  ON client_favorite_medics FOR SELECT
  USING (is_platform_admin());

CREATE POLICY "Platform admins can manage all client favorite medics"
  ON client_favorite_medics FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- booking_conflicts
CREATE POLICY "Platform admins can view all booking conflicts"
  ON booking_conflicts FOR SELECT
  USING (is_platform_admin());

CREATE POLICY "Platform admins can manage all booking conflicts"
  ON booking_conflicts FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- =============================================================================
-- LOCATION TRACKING SYSTEM - Platform Admin Policies
-- =============================================================================

-- medic_location_pings
CREATE POLICY "Platform admins can view all location pings"
  ON medic_location_pings FOR SELECT
  USING (is_platform_admin());

CREATE POLICY "Platform admins can manage all location pings"
  ON medic_location_pings FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- medic_shift_events
CREATE POLICY "Platform admins can view all shift events"
  ON medic_shift_events FOR SELECT
  USING (is_platform_admin());

CREATE POLICY "Platform admins can manage all shift events"
  ON medic_shift_events FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- medic_location_audit
CREATE POLICY "Platform admins can view all location audit"
  ON medic_location_audit FOR SELECT
  USING (is_platform_admin());

CREATE POLICY "Platform admins can manage all location audit"
  ON medic_location_audit FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- geofences
CREATE POLICY "Platform admins can view all geofences"
  ON geofences FOR SELECT
  USING (is_platform_admin());

CREATE POLICY "Platform admins can manage all geofences"
  ON geofences FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- medic_location_consent
CREATE POLICY "Platform admins can view all location consent"
  ON medic_location_consent FOR SELECT
  USING (is_platform_admin());

CREATE POLICY "Platform admins can manage all location consent"
  ON medic_location_consent FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- =============================================================================
-- ALERTS AND NOTIFICATIONS - Platform Admin Policies
-- =============================================================================

-- medic_alerts
CREATE POLICY "Platform admins can view all medic alerts"
  ON medic_alerts FOR SELECT
  USING (is_platform_admin());

CREATE POLICY "Platform admins can manage all medic alerts"
  ON medic_alerts FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- =============================================================================
-- CONTRACTS - Platform Admin Policies
-- =============================================================================

-- contract_templates
CREATE POLICY "Platform admins can view all contract templates"
  ON contract_templates FOR SELECT
  USING (is_platform_admin());

CREATE POLICY "Platform admins can manage all contract templates"
  ON contract_templates FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- contracts
CREATE POLICY "Platform admins can view all contracts"
  ON contracts FOR SELECT
  USING (is_platform_admin());

CREATE POLICY "Platform admins can manage all contracts"
  ON contracts FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- contract_versions
CREATE POLICY "Platform admins can view all contract versions"
  ON contract_versions FOR SELECT
  USING (is_platform_admin());

CREATE POLICY "Platform admins can manage all contract versions"
  ON contract_versions FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- contract_events
CREATE POLICY "Platform admins can view all contract events"
  ON contract_events FOR SELECT
  USING (is_platform_admin());

CREATE POLICY "Platform admins can manage all contract events"
  ON contract_events FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- =============================================================================
-- ORGANIZATIONS TABLE - Platform Admin Policies
-- =============================================================================

-- Platform admins need to see all organizations for the /platform/organizations page
CREATE POLICY "Platform admins can view all organizations"
  ON organizations FOR SELECT
  USING (is_platform_admin());

CREATE POLICY "Platform admins can manage all organizations"
  ON organizations FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- Org admins can only see their own organization
CREATE POLICY "Org admins can view their organization"
  ON organizations FOR SELECT
  USING (id = get_user_org_id() AND is_org_admin());

-- =============================================================================
-- CONDITIONAL TABLES - Platform Admin Policies
-- =============================================================================

-- payout_executions (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payout_executions') THEN
    EXECUTE 'CREATE POLICY "Platform admins can view all payout executions"
      ON payout_executions FOR SELECT
      USING (is_platform_admin())';

    EXECUTE 'CREATE POLICY "Platform admins can manage all payout executions"
      ON payout_executions FOR ALL
      USING (is_platform_admin())
      WITH CHECK (is_platform_admin())';
  END IF;
END $$;

-- out_of_territory_rules (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'out_of_territory_rules') THEN
    EXECUTE 'CREATE POLICY "Platform admins can view all out of territory rules"
      ON out_of_territory_rules FOR SELECT
      USING (is_platform_admin())';

    EXECUTE 'CREATE POLICY "Platform admins can manage all out of territory rules"
      ON out_of_territory_rules FOR ALL
      USING (is_platform_admin())
      WITH CHECK (is_platform_admin())';
  END IF;
END $$;

-- =============================================================================
-- SUMMARY
-- =============================================================================

COMMENT ON MIGRATION IS 'Added platform_admin RLS policies for cross-org access. Platform admins can now view/manage all data across organizations while org admins remain scoped to their own org.';
