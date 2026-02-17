-- Migration 026: Add org_id columns for multi-tenant architecture
-- Purpose: Add organization foreign keys to all business tables for complete data isolation
-- Created: 2026-02-16
-- Part 1 of 3: Column additions (backfill in 027, RLS in 028)

-- =============================================================================
-- CORE BUSINESS OPERATIONS
-- =============================================================================

-- territories: Postcode sectors and coverage areas
ALTER TABLE territories ADD COLUMN org_id UUID REFERENCES organizations(id);
CREATE INDEX idx_territories_org_id ON territories(org_id);

-- clients: Construction company accounts
ALTER TABLE clients ADD COLUMN org_id UUID REFERENCES organizations(id);
CREATE INDEX idx_clients_org_id ON clients(org_id);

-- medics: Medic roster with qualifications
ALTER TABLE medics ADD COLUMN org_id UUID REFERENCES organizations(id);
CREATE INDEX idx_medics_org_id ON medics(org_id);

-- bookings: Shift bookings
ALTER TABLE bookings ADD COLUMN org_id UUID REFERENCES organizations(id);
CREATE INDEX idx_bookings_org_id ON bookings(org_id);

-- timesheets: Hours worked with approval workflow
ALTER TABLE timesheets ADD COLUMN org_id UUID REFERENCES organizations(id);
CREATE INDEX idx_timesheets_org_id ON timesheets(org_id);

-- invoices: Client invoices
ALTER TABLE invoices ADD COLUMN org_id UUID REFERENCES organizations(id);
CREATE INDEX idx_invoices_org_id ON invoices(org_id);

-- invoice_line_items: Line items on invoices
ALTER TABLE invoice_line_items ADD COLUMN org_id UUID REFERENCES organizations(id);
CREATE INDEX idx_invoice_line_items_org_id ON invoice_line_items(org_id);

-- payments: Stripe payment transactions
ALTER TABLE payments ADD COLUMN org_id UUID REFERENCES organizations(id);
CREATE INDEX idx_payments_org_id ON payments(org_id);

-- territory_metrics: Analytics for coverage
ALTER TABLE territory_metrics ADD COLUMN org_id UUID REFERENCES organizations(id);
CREATE INDEX idx_territory_metrics_org_id ON territory_metrics(org_id);

-- payslips: Medic payslips
ALTER TABLE payslips ADD COLUMN org_id UUID REFERENCES organizations(id);
CREATE INDEX idx_payslips_org_id ON payslips(org_id);

-- =============================================================================
-- MEDIC SCHEDULING SYSTEM
-- =============================================================================

-- medic_availability: Medic calendar availability
ALTER TABLE medic_availability ADD COLUMN org_id UUID REFERENCES organizations(id);
CREATE INDEX idx_medic_availability_org_id ON medic_availability(org_id);

-- medic_preferences: Medic notification and scheduling preferences
ALTER TABLE medic_preferences ADD COLUMN org_id UUID REFERENCES organizations(id);
CREATE INDEX idx_medic_preferences_org_id ON medic_preferences(org_id);

-- shift_swaps: Peer-to-peer shift swap requests
ALTER TABLE shift_swaps ADD COLUMN org_id UUID REFERENCES organizations(id);
CREATE INDEX idx_shift_swaps_org_id ON shift_swaps(org_id);

-- auto_schedule_logs: Audit trail for auto-matching
ALTER TABLE auto_schedule_logs ADD COLUMN org_id UUID REFERENCES organizations(id);
CREATE INDEX idx_auto_schedule_logs_org_id ON auto_schedule_logs(org_id);

-- shift_templates: Recurring shift templates
ALTER TABLE shift_templates ADD COLUMN org_id UUID REFERENCES organizations(id);
CREATE INDEX idx_shift_templates_org_id ON shift_templates(org_id);

-- schedule_notifications: Scheduling notifications
ALTER TABLE schedule_notifications ADD COLUMN org_id UUID REFERENCES organizations(id);
CREATE INDEX idx_schedule_notifications_org_id ON schedule_notifications(org_id);

-- client_favorite_medics: Client medic preferences
ALTER TABLE client_favorite_medics ADD COLUMN org_id UUID REFERENCES organizations(id);
CREATE INDEX idx_client_favorite_medics_org_id ON client_favorite_medics(org_id);

-- booking_conflicts: Double-booking detection
ALTER TABLE booking_conflicts ADD COLUMN org_id UUID REFERENCES organizations(id);
CREATE INDEX idx_booking_conflicts_org_id ON booking_conflicts(org_id);

-- =============================================================================
-- LOCATION TRACKING SYSTEM
-- =============================================================================

-- medic_location_pings: GPS location tracking
ALTER TABLE medic_location_pings ADD COLUMN org_id UUID REFERENCES organizations(id);
CREATE INDEX idx_medic_location_pings_org_id ON medic_location_pings(org_id);

-- medic_shift_events: Shift start/end/break events
ALTER TABLE medic_shift_events ADD COLUMN org_id UUID REFERENCES organizations(id);
CREATE INDEX idx_medic_shift_events_org_id ON medic_shift_events(org_id);

-- medic_location_audit: Location access audit log
ALTER TABLE medic_location_audit ADD COLUMN org_id UUID REFERENCES organizations(id);
CREATE INDEX idx_medic_location_audit_org_id ON medic_location_audit(org_id);

-- geofences: Site boundary definitions
ALTER TABLE geofences ADD COLUMN org_id UUID REFERENCES organizations(id);
CREATE INDEX idx_geofences_org_id ON geofences(org_id);

-- medic_location_consent: Location tracking consent records
ALTER TABLE medic_location_consent ADD COLUMN org_id UUID REFERENCES organizations(id);
CREATE INDEX idx_medic_location_consent_org_id ON medic_location_consent(org_id);

-- =============================================================================
-- ALERTS AND NOTIFICATIONS
-- =============================================================================

-- medic_alerts: Real-time medic alerts
ALTER TABLE medic_alerts ADD COLUMN org_id UUID REFERENCES organizations(id);
CREATE INDEX idx_medic_alerts_org_id ON medic_alerts(org_id);

-- =============================================================================
-- CONTRACTS
-- =============================================================================

-- contract_templates: Contract templates
ALTER TABLE contract_templates ADD COLUMN org_id UUID REFERENCES organizations(id);
CREATE INDEX idx_contract_templates_org_id ON contract_templates(org_id);

-- contracts: Medic contracts
ALTER TABLE contracts ADD COLUMN org_id UUID REFERENCES organizations(id);
CREATE INDEX idx_contracts_org_id ON contracts(org_id);

-- contract_versions: Contract version history
ALTER TABLE contract_versions ADD COLUMN org_id UUID REFERENCES organizations(id);
CREATE INDEX idx_contract_versions_org_id ON contract_versions(org_id);

-- contract_events: Contract lifecycle events
ALTER TABLE contract_events ADD COLUMN org_id UUID REFERENCES organizations(id);
CREATE INDEX idx_contract_events_org_id ON contract_events(org_id);

-- =============================================================================
-- ADMIN AND PAYOUTS
-- =============================================================================

-- payout_executions: Friday payout job execution log (IF EXISTS check)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payout_executions') THEN
    ALTER TABLE payout_executions ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
    CREATE INDEX IF NOT EXISTS idx_payout_executions_org_id ON payout_executions(org_id);
  END IF;
END $$;

-- =============================================================================
-- OUT OF TERRITORY
-- =============================================================================

-- out_of_territory_rules: Territory coverage rules (IF EXISTS check)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'out_of_territory_rules') THEN
    ALTER TABLE out_of_territory_rules ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
    CREATE INDEX IF NOT EXISTS idx_out_of_territory_rules_org_id ON out_of_territory_rules(org_id);
  END IF;
END $$;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON COLUMN territories.org_id IS 'Multi-tenant isolation: organization that owns this territory';
COMMENT ON COLUMN clients.org_id IS 'Multi-tenant isolation: medic company serving this client';
COMMENT ON COLUMN medics.org_id IS 'Multi-tenant isolation: medic company this medic works for';
COMMENT ON COLUMN bookings.org_id IS 'Multi-tenant isolation: organization that owns this booking';
COMMENT ON COLUMN timesheets.org_id IS 'Multi-tenant isolation: organization that owns this timesheet';
COMMENT ON COLUMN invoices.org_id IS 'Multi-tenant isolation: organization that issued this invoice';
COMMENT ON COLUMN payments.org_id IS 'Multi-tenant isolation: organization receiving this payment';
COMMENT ON COLUMN payslips.org_id IS 'Multi-tenant isolation: organization that generated this payslip';

-- =============================================================================
-- NOTES
-- =============================================================================

-- 1. Columns are nullable in this migration for safety
-- 2. Migration 027 will backfill all existing data with ASG org_id
-- 3. Migration 028 will make columns NOT NULL and enable RLS policies
-- 4. travel_time_cache is intentionally excluded (shared cache across all orgs)
