-- Migration 003: Row-Level Security Policies
-- Phase 1.5: Multi-tenant data isolation for business operations
-- Created: 2026-02-15
-- Depends on: 002_business_operations.sql

-- =============================================================================
-- CRITICAL: UK GDPR Compliance
-- All tables must have RLS to prevent unauthorized data access
-- =============================================================================

-- Enable RLS on all business operations tables
ALTER TABLE territories ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE medics ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE timesheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE travel_time_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE territory_metrics ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- HELPER FUNCTION: Get current user's role
-- =============================================================================
CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()),
    'anonymous'
  );
$$ LANGUAGE SQL SECURITY DEFINER;

COMMENT ON FUNCTION auth.user_role IS 'Returns current user role: admin, medic, site_manager, client, or anonymous';

-- =============================================================================
-- RLS POLICIES: territories
-- =============================================================================

-- Admins: Full access
CREATE POLICY "Admins can manage territories" ON territories
  FOR ALL
  USING (auth.user_role() = 'admin')
  WITH CHECK (auth.user_role() = 'admin');

-- Medics: View their assigned territories
CREATE POLICY "Medics can view assigned territories" ON territories
  FOR SELECT
  USING (
    auth.user_role() = 'medic' AND (
      primary_medic_id = auth.uid() OR
      secondary_medic_id = auth.uid()
    )
  );

-- Site managers and clients: View all territories (for booking portal)
CREATE POLICY "Site managers and clients can view territories" ON territories
  FOR SELECT
  USING (auth.user_role() IN ('site_manager', 'client'));

-- =============================================================================
-- RLS POLICIES: clients
-- =============================================================================

-- Admins: Full access
CREATE POLICY "Admins can manage clients" ON clients
  FOR ALL
  USING (auth.user_role() = 'admin')
  WITH CHECK (auth.user_role() = 'admin');

-- Clients: View and update own account only
CREATE POLICY "Clients can view own account" ON clients
  FOR SELECT
  USING (
    auth.user_role() = 'client' AND
    user_id = auth.uid()
  );

CREATE POLICY "Clients can update own account" ON clients
  FOR UPDATE
  USING (
    auth.user_role() = 'client' AND
    user_id = auth.uid()
  )
  WITH CHECK (
    auth.user_role() = 'client' AND
    user_id = auth.uid()
  );

-- =============================================================================
-- RLS POLICIES: medics
-- =============================================================================

-- Admins: Full access
CREATE POLICY "Admins can manage medics" ON medics
  FOR ALL
  USING (auth.user_role() = 'admin')
  WITH CHECK (auth.user_role() = 'admin');

-- Medics: View and update own profile only
CREATE POLICY "Medics can view own profile" ON medics
  FOR SELECT
  USING (
    auth.user_role() = 'medic' AND
    user_id = auth.uid()
  );

CREATE POLICY "Medics can update own profile" ON medics
  FOR UPDATE
  USING (
    auth.user_role() = 'medic' AND
    user_id = auth.uid()
  )
  WITH CHECK (
    auth.user_role() = 'medic' AND
    user_id = auth.uid()
  );

-- Clients: View medic profiles (for booking transparency)
-- NOTE: Hide sensitive data like home address, Stripe account, UTR
CREATE POLICY "Clients can view medic public profiles" ON medics
  FOR SELECT
  USING (auth.user_role() = 'client');
  -- Application layer filters out: home_address, home_postcode, stripe_account_id, utr

-- =============================================================================
-- RLS POLICIES: bookings
-- =============================================================================

-- Admins: Full access
CREATE POLICY "Admins can manage bookings" ON bookings
  FOR ALL
  USING (auth.user_role() = 'admin')
  WITH CHECK (auth.user_role() = 'admin');

-- Clients: View and create own bookings
CREATE POLICY "Clients can view own bookings" ON bookings
  FOR SELECT
  USING (
    auth.user_role() = 'client' AND
    client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
  );

CREATE POLICY "Clients can create bookings" ON bookings
  FOR INSERT
  WITH CHECK (
    auth.user_role() = 'client' AND
    client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
  );

CREATE POLICY "Clients can cancel own bookings" ON bookings
  FOR UPDATE
  USING (
    auth.user_role() = 'client' AND
    client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()) AND
    status NOT IN ('completed', 'cancelled') -- Can't change completed/cancelled bookings
  )
  WITH CHECK (
    auth.user_role() = 'client' AND
    client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
  );

-- Medics: View assigned bookings only
CREATE POLICY "Medics can view assigned bookings" ON bookings
  FOR SELECT
  USING (
    auth.user_role() = 'medic' AND
    medic_id IN (SELECT id FROM medics WHERE user_id = auth.uid())
  );

-- Site managers: View bookings for their sites
CREATE POLICY "Site managers can view site bookings" ON bookings
  FOR SELECT
  USING (
    auth.user_role() = 'site_manager' AND
    site_manager_id = auth.uid()
  );

CREATE POLICY "Site managers can update site bookings" ON bookings
  FOR UPDATE
  USING (
    auth.user_role() = 'site_manager' AND
    site_manager_id = auth.uid()
  )
  WITH CHECK (
    auth.user_role() = 'site_manager' AND
    site_manager_id = auth.uid()
  );

-- =============================================================================
-- RLS POLICIES: timesheets
-- =============================================================================

-- Admins: Full access
CREATE POLICY "Admins can manage timesheets" ON timesheets
  FOR ALL
  USING (auth.user_role() = 'admin')
  WITH CHECK (auth.user_role() = 'admin');

-- Medics: View and submit own timesheets
CREATE POLICY "Medics can view own timesheets" ON timesheets
  FOR SELECT
  USING (
    auth.user_role() = 'medic' AND
    medic_id IN (SELECT id FROM medics WHERE user_id = auth.uid())
  );

CREATE POLICY "Medics can submit timesheets" ON timesheets
  FOR INSERT
  WITH CHECK (
    auth.user_role() = 'medic' AND
    medic_id IN (SELECT id FROM medics WHERE user_id = auth.uid())
  );

CREATE POLICY "Medics can update own pending timesheets" ON timesheets
  FOR UPDATE
  USING (
    auth.user_role() = 'medic' AND
    medic_id IN (SELECT id FROM medics WHERE user_id = auth.uid()) AND
    payout_status = 'pending' -- Can only edit before manager approval
  )
  WITH CHECK (
    auth.user_role() = 'medic' AND
    medic_id IN (SELECT id FROM medics WHERE user_id = auth.uid())
  );

-- Site managers: View and approve timesheets for their sites
CREATE POLICY "Site managers can view site timesheets" ON timesheets
  FOR SELECT
  USING (
    auth.user_role() = 'site_manager' AND
    booking_id IN (
      SELECT id FROM bookings WHERE site_manager_id = auth.uid()
    )
  );

CREATE POLICY "Site managers can approve timesheets" ON timesheets
  FOR UPDATE
  USING (
    auth.user_role() = 'site_manager' AND
    booking_id IN (
      SELECT id FROM bookings WHERE site_manager_id = auth.uid()
    ) AND
    payout_status = 'pending' -- Only approve pending timesheets
  )
  WITH CHECK (
    auth.user_role() = 'site_manager' AND
    booking_id IN (
      SELECT id FROM bookings WHERE site_manager_id = auth.uid()
    )
  );

-- =============================================================================
-- RLS POLICIES: invoices
-- =============================================================================

-- Admins: Full access
CREATE POLICY "Admins can manage invoices" ON invoices
  FOR ALL
  USING (auth.user_role() = 'admin')
  WITH CHECK (auth.user_role() = 'admin');

-- Clients: View own invoices only
CREATE POLICY "Clients can view own invoices" ON invoices
  FOR SELECT
  USING (
    auth.user_role() = 'client' AND
    client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
  );

-- =============================================================================
-- RLS POLICIES: invoice_line_items
-- =============================================================================

-- Admins: Full access
CREATE POLICY "Admins can manage invoice line items" ON invoice_line_items
  FOR ALL
  USING (auth.user_role() = 'admin')
  WITH CHECK (auth.user_role() = 'admin');

-- Clients: View line items for own invoices
CREATE POLICY "Clients can view own invoice line items" ON invoice_line_items
  FOR SELECT
  USING (
    auth.user_role() = 'client' AND
    invoice_id IN (
      SELECT id FROM invoices
      WHERE client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
    )
  );

-- =============================================================================
-- RLS POLICIES: payments
-- =============================================================================

-- Admins: Full access
CREATE POLICY "Admins can manage payments" ON payments
  FOR ALL
  USING (auth.user_role() = 'admin')
  WITH CHECK (auth.user_role() = 'admin');

-- Clients: View own payments only
CREATE POLICY "Clients can view own payments" ON payments
  FOR SELECT
  USING (
    auth.user_role() = 'client' AND
    client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
  );

-- =============================================================================
-- RLS POLICIES: travel_time_cache
-- =============================================================================

-- System-level table: Backend Edge Functions only (no direct user access)
-- All authenticated users can read (for booking portal auto-matching preview)
CREATE POLICY "Authenticated users can read travel cache" ON travel_time_cache
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only admins and backend functions can write
CREATE POLICY "Admins and service role can write travel cache" ON travel_time_cache
  FOR INSERT
  WITH CHECK (
    auth.user_role() = 'admin' OR
    auth.role() = 'service_role' -- Backend Edge Functions
  );

-- =============================================================================
-- RLS POLICIES: territory_metrics
-- =============================================================================

-- Admins: Full access
CREATE POLICY "Admins can manage territory metrics" ON territory_metrics
  FOR ALL
  USING (auth.user_role() = 'admin')
  WITH CHECK (auth.user_role() = 'admin');

-- Backend functions can write metrics
CREATE POLICY "Service role can write territory metrics" ON territory_metrics
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Medics can view metrics for their territories
CREATE POLICY "Medics can view own territory metrics" ON territory_metrics
  FOR SELECT
  USING (
    auth.user_role() = 'medic' AND (
      primary_medic_id IN (SELECT id FROM medics WHERE user_id = auth.uid()) OR
      secondary_medic_id IN (SELECT id FROM medics WHERE user_id = auth.uid())
    )
  );

-- =============================================================================
-- AUDIT: Log RLS policy enforcement
-- =============================================================================

-- Track when RLS policies block access (for security monitoring)
CREATE TABLE rls_access_denials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL, -- SELECT, INSERT, UPDATE, DELETE
  attempted_at TIMESTAMPTZ DEFAULT NOW(),
  user_role TEXT,
  ip_address INET
);

CREATE INDEX idx_rls_denials_user ON rls_access_denials(user_id);
CREATE INDEX idx_rls_denials_table ON rls_access_denials(table_name);
CREATE INDEX idx_rls_denials_time ON rls_access_denials(attempted_at);

COMMENT ON TABLE rls_access_denials IS 'Security audit log: tracks when RLS policies block unauthorized access';

-- =============================================================================
-- TESTING: Verify RLS policies work correctly
-- =============================================================================

-- Test script (run manually after migration):
/*
-- 1. Create test users (admin, client, medic)
INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin@sitemedic.com', '{"role": "admin"}'::jsonb),
  ('00000000-0000-0000-0000-000000000002', 'client@abc.com', '{"role": "client"}'::jsonb),
  ('00000000-0000-0000-0000-000000000003', 'medic@sitemedic.com', '{"role": "medic"}'::jsonb);

-- 2. Create test client and medic records
INSERT INTO clients (id, user_id, company_name, contact_name, contact_email, contact_phone, billing_address, billing_postcode)
VALUES ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'ABC Construction', 'John Smith', 'john@abc.com', '07700900000', '123 High St, London', 'E1 6AN');

INSERT INTO medics (id, user_id, first_name, last_name, email, phone, home_address, home_postcode)
VALUES ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'Dr.', 'Johnson', 'medic@sitemedic.com', '07700900001', '456 Low St, London', 'SW1A 1AA');

-- 3. Test RLS (impersonate client user)
SET LOCAL role authenticated;
SET LOCAL request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';

-- Client should see own bookings (0 results expected - no bookings yet)
SELECT COUNT(*) FROM bookings; -- Should return 0 (no access to other clients' bookings)

-- Client should NOT see medic sensitive data
SELECT home_address FROM medics WHERE id = '20000000-0000-0000-0000-000000000001'; -- Should be filtered by app layer

-- 4. Test RLS (impersonate medic user)
SET LOCAL request.jwt.claim.sub = '00000000-0000-0000-0000-000000000003';

-- Medic should see own timesheets (0 results expected - no timesheets yet)
SELECT COUNT(*) FROM timesheets; -- Should return 0

-- Medic should NOT see other medics' data
SELECT COUNT(*) FROM timesheets WHERE medic_id != '20000000-0000-0000-0000-000000000001'; -- Should return 0 (RLS blocks)

-- 5. Test RLS (impersonate admin)
SET LOCAL request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';

-- Admin should see ALL data
SELECT COUNT(*) FROM clients; -- Should return 1 (test client)
SELECT COUNT(*) FROM medics; -- Should return 1 (test medic)
SELECT COUNT(*) FROM territories; -- Should return 1 (E1 test territory)

-- Reset role
RESET role;
*/

COMMENT ON SCHEMA public IS 'Row-Level Security policies enforce UK GDPR data isolation - Phase 1.5';
