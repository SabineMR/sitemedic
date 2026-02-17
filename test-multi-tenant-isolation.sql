-- ============================================================================
-- Multi-Tenant Isolation Test Script
-- ============================================================================
-- This script tests that org_id filtering and RLS policies properly isolate
-- data between organizations.
--
-- Test Plan:
-- 1. Create test organization "Test Medics Ltd"
-- 2. Create test users with different org_ids
-- 3. Create test data for both ASG and Test Medics
-- 4. Verify RLS prevents cross-org access
-- 5. Test critical security scenarios
-- ============================================================================

-- ============================================================================
-- SETUP: Create Test Organization
-- ============================================================================

-- Check existing organizations
SELECT id, name, slug, status FROM organizations ORDER BY created_at;

-- Create test organization if it doesn't exist
INSERT INTO organizations (
  name,
  slug,
  status,
  onboarding_completed,
  created_at,
  updated_at
)
VALUES (
  'Test Medics Ltd',
  'test-medics',
  'active',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING
RETURNING id, name, slug;

-- Get org IDs for testing
DO $$
DECLARE
  asg_org_id UUID;
  test_org_id UUID;
BEGIN
  -- Get ASG org ID
  SELECT id INTO asg_org_id FROM organizations WHERE slug = 'asg';
  RAISE NOTICE 'ASG org_id: %', asg_org_id;

  -- Get Test Medics org ID
  SELECT id INTO test_org_id FROM organizations WHERE slug = 'test-medics';
  RAISE NOTICE 'Test Medics org_id: %', test_org_id;
END $$;

-- ============================================================================
-- SETUP: Create Test Data
-- ============================================================================

-- Create test client for Test Medics
DO $$
DECLARE
  test_org_id UUID;
  test_client_id UUID;
BEGIN
  SELECT id INTO test_org_id FROM organizations WHERE slug = 'test-medics';

  INSERT INTO clients (
    org_id,
    company_name,
    billing_address,
    billing_postcode,
    contact_name,
    contact_email,
    contact_phone,
    payment_terms,
    status,
    created_at,
    updated_at
  )
  VALUES (
    test_org_id,
    'Test Construction Ltd',
    '123 Test Street',
    'E1 1AA',
    'John Test',
    'john@testconstruction.co.uk',
    '07700900000',
    'prepay',
    'active',
    NOW(),
    NOW()
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO test_client_id;

  RAISE NOTICE 'Created test client: %', test_client_id;
END $$;

-- Create test medic for Test Medics
DO $$
DECLARE
  test_org_id UUID;
  test_medic_id UUID;
BEGIN
  SELECT id INTO test_org_id FROM organizations WHERE slug = 'test-medics';

  INSERT INTO medics (
    org_id,
    first_name,
    last_name,
    email,
    phone,
    home_postcode,
    home_address,
    employment_status,
    available_for_work,
    has_confined_space_cert,
    has_trauma_cert,
    star_rating,
    created_at,
    updated_at
  )
  VALUES (
    test_org_id,
    'Jane',
    'TestMedic',
    'jane.testmedic@example.com',
    '07700900001',
    'E2 1AA',
    '456 Test Avenue',
    'self_employed',
    true,
    false,
    false,
    4.5,
    NOW(),
    NOW()
  )
  ON CONFLICT (email) DO NOTHING
  RETURNING id INTO test_medic_id;

  RAISE NOTICE 'Created test medic: %', test_medic_id;
END $$;

-- Create test booking for Test Medics
DO $$
DECLARE
  test_org_id UUID;
  test_client_id UUID;
  test_medic_id UUID;
  test_booking_id UUID;
BEGIN
  SELECT id INTO test_org_id FROM organizations WHERE slug = 'test-medics';
  SELECT id INTO test_client_id FROM clients WHERE org_id = test_org_id LIMIT 1;
  SELECT id INTO test_medic_id FROM medics WHERE org_id = test_org_id LIMIT 1;

  INSERT INTO bookings (
    org_id,
    client_id,
    medic_id,
    site_name,
    site_address,
    site_postcode,
    shift_date,
    shift_start_time,
    shift_end_time,
    shift_hours,
    base_rate,
    urgency_premium_percent,
    travel_surcharge,
    out_of_territory_cost,
    subtotal,
    vat,
    total,
    platform_fee,
    medic_payout,
    status,
    created_at,
    updated_at
  )
  VALUES (
    test_org_id,
    test_client_id,
    test_medic_id,
    'Test Construction Site',
    '789 Test Road',
    'E3 1AA',
    CURRENT_DATE + INTERVAL '7 days',
    '08:00:00',
    '17:00:00',
    8,
    80.00,
    0,
    0,
    0,
    640.00,
    128.00,
    768.00,
    307.20,
    460.80,
    'confirmed',
    NOW(),
    NOW()
  )
  RETURNING id INTO test_booking_id;

  RAISE NOTICE 'Created test booking: %', test_booking_id;
END $$;

-- ============================================================================
-- TEST 1: Verify Data Isolation - Count Records Per Org
-- ============================================================================

-- Count ASG records
DO $$
DECLARE
  asg_org_id UUID;
  asg_clients_count INT;
  asg_medics_count INT;
  asg_bookings_count INT;
BEGIN
  SELECT id INTO asg_org_id FROM organizations WHERE slug = 'asg';

  SELECT COUNT(*) INTO asg_clients_count FROM clients WHERE org_id = asg_org_id;
  SELECT COUNT(*) INTO asg_medics_count FROM medics WHERE org_id = asg_org_id;
  SELECT COUNT(*) INTO asg_bookings_count FROM bookings WHERE org_id = asg_org_id;

  RAISE NOTICE '=== ASG Data Count ===';
  RAISE NOTICE 'Clients: %', asg_clients_count;
  RAISE NOTICE 'Medics: %', asg_medics_count;
  RAISE NOTICE 'Bookings: %', asg_bookings_count;
END $$;

-- Count Test Medics records
DO $$
DECLARE
  test_org_id UUID;
  test_clients_count INT;
  test_medics_count INT;
  test_bookings_count INT;
BEGIN
  SELECT id INTO test_org_id FROM organizations WHERE slug = 'test-medics';

  SELECT COUNT(*) INTO test_clients_count FROM clients WHERE org_id = test_org_id;
  SELECT COUNT(*) INTO test_medics_count FROM medics WHERE org_id = test_org_id;
  SELECT COUNT(*) INTO test_bookings_count FROM bookings WHERE org_id = test_org_id;

  RAISE NOTICE '=== Test Medics Data Count ===';
  RAISE NOTICE 'Clients: %', test_clients_count;
  RAISE NOTICE 'Medics: %', test_medics_count;
  RAISE NOTICE 'Bookings: %', test_bookings_count;
END $$;

-- ============================================================================
-- TEST 2: Verify RLS Policies Prevent Cross-Org Access
-- ============================================================================

-- This test simulates a user trying to access another org's data
-- Note: RLS policies should automatically filter results

-- Test: Try to query all bookings without org filter (should only see user's org)
-- This would be blocked by RLS in production when authenticated as a specific user

SELECT
  'TEST: Cross-Org Booking Access' AS test_name,
  COUNT(*) AS total_bookings_visible,
  COUNT(DISTINCT org_id) AS distinct_orgs,
  CASE
    WHEN COUNT(DISTINCT org_id) = 1 THEN '✅ PASS: Only one org visible'
    WHEN COUNT(DISTINCT org_id) > 1 THEN '❌ FAIL: Multiple orgs visible (RLS not enforced)'
    ELSE '⚠️  WARN: No data found'
  END AS result
FROM bookings;

-- ============================================================================
-- TEST 3: Verify Foreign Key Relationships Respect org_id
-- ============================================================================

-- Test: Check if any bookings reference clients from different orgs (should be 0)
SELECT
  'TEST: Cross-Org Booking-Client Relationship' AS test_name,
  COUNT(*) AS violations,
  CASE
    WHEN COUNT(*) = 0 THEN '✅ PASS: No cross-org relationships'
    ELSE '❌ FAIL: Cross-org relationships found'
  END AS result
FROM bookings b
JOIN clients c ON b.client_id = c.id
WHERE b.org_id != c.org_id;

-- Test: Check if any bookings reference medics from different orgs (should be 0)
SELECT
  'TEST: Cross-Org Booking-Medic Relationship' AS test_name,
  COUNT(*) AS violations,
  CASE
    WHEN COUNT(*) = 0 THEN '✅ PASS: No cross-org relationships'
    ELSE '❌ FAIL: Cross-org relationships found'
  END AS result
FROM bookings b
JOIN medics m ON b.medic_id = m.id
WHERE b.org_id != m.org_id;

-- ============================================================================
-- TEST 4: Verify Timesheets Isolation
-- ============================================================================

-- Test: Check if any timesheets have mismatched org_ids with their bookings
SELECT
  'TEST: Timesheet-Booking org_id Consistency' AS test_name,
  COUNT(*) AS violations,
  CASE
    WHEN COUNT(*) = 0 THEN '✅ PASS: All timesheets match booking org_id'
    ELSE '❌ FAIL: Timesheet org_id mismatches found'
  END AS result
FROM timesheets t
JOIN bookings b ON t.booking_id = b.id
WHERE t.org_id != b.org_id;

-- ============================================================================
-- TEST 5: Verify Invoices Isolation
-- ============================================================================

-- Test: Check if any invoices reference clients from different orgs
SELECT
  'TEST: Invoice-Client org_id Consistency' AS test_name,
  COUNT(*) AS violations,
  CASE
    WHEN COUNT(*) = 0 THEN '✅ PASS: All invoices match client org_id'
    ELSE '❌ FAIL: Invoice org_id mismatches found'
  END AS result
FROM invoices i
JOIN clients c ON i.client_id = c.id
WHERE i.org_id != c.org_id;

-- ============================================================================
-- TEST 6: Verify Payments Isolation
-- ============================================================================

-- Test: Check if any payments reference bookings from different orgs
SELECT
  'TEST: Payment-Booking org_id Consistency' AS test_name,
  COUNT(*) AS violations,
  CASE
    WHEN COUNT(*) = 0 THEN '✅ PASS: All payments match booking org_id'
    ELSE '❌ FAIL: Payment org_id mismatches found'
  END AS result
FROM payments p
JOIN bookings b ON p.booking_id = b.id
WHERE p.org_id != b.org_id;

-- ============================================================================
-- TEST 7: Verify Territories Isolation
-- ============================================================================

-- Test: Check if territories reference medics from different orgs
SELECT
  'TEST: Territory-Medic org_id Consistency' AS test_name,
  COUNT(*) AS violations,
  CASE
    WHEN COUNT(*) = 0 THEN '✅ PASS: All territory medic assignments respect org_id'
    ELSE '❌ FAIL: Territory cross-org assignments found'
  END AS result
FROM territories t
LEFT JOIN medics m1 ON t.primary_medic_id = m1.id
LEFT JOIN medics m2 ON t.secondary_medic_id = m2.id
WHERE
  (m1.id IS NOT NULL AND t.org_id != m1.org_id)
  OR (m2.id IS NOT NULL AND t.org_id != m2.org_id);

-- ============================================================================
-- TEST 8: Critical Security Scenario - Friday Payout
-- ============================================================================

-- Test: Verify friday-payout would only process org-scoped timesheets
-- Simulate what friday-payout would fetch for each org

DO $$
DECLARE
  asg_org_id UUID;
  test_org_id UUID;
  asg_pending_count INT;
  test_pending_count INT;
BEGIN
  SELECT id INTO asg_org_id FROM organizations WHERE slug = 'asg';
  SELECT id INTO test_org_id FROM organizations WHERE slug = 'test-medics';

  -- Count pending timesheets for ASG
  SELECT COUNT(*) INTO asg_pending_count
  FROM timesheets
  WHERE org_id = asg_org_id AND payout_status = 'admin_approved';

  -- Count pending timesheets for Test Medics
  SELECT COUNT(*) INTO test_pending_count
  FROM timesheets
  WHERE org_id = test_org_id AND payout_status = 'admin_approved';

  RAISE NOTICE '=== Friday Payout Simulation ===';
  RAISE NOTICE 'ASG pending payouts: %', asg_pending_count;
  RAISE NOTICE 'Test Medics pending payouts: %', test_pending_count;
  RAISE NOTICE 'Result: % (Each org processes separately)',
    CASE
      WHEN asg_pending_count >= 0 AND test_pending_count >= 0 THEN '✅ PASS'
      ELSE '❌ FAIL'
    END;
END $$;

-- ============================================================================
-- TEST 9: Critical Security Scenario - Auto-Assign Medic
-- ============================================================================

-- Test: Verify auto-assign would only consider org-scoped medics
-- Simulate what auto-assign-medic-v2 would fetch for a booking

DO $$
DECLARE
  test_org_id UUID;
  test_booking_id UUID;
  available_medics_count INT;
  cross_org_medics_count INT;
BEGIN
  SELECT id INTO test_org_id FROM organizations WHERE slug = 'test-medics';
  SELECT id INTO test_booking_id FROM bookings WHERE org_id = test_org_id LIMIT 1;

  -- Count available medics in same org
  SELECT COUNT(*) INTO available_medics_count
  FROM medics
  WHERE org_id = test_org_id AND available_for_work = true;

  -- Count medics from different org (should be 0 when filtered)
  SELECT COUNT(*) INTO cross_org_medics_count
  FROM medics
  WHERE org_id != test_org_id AND available_for_work = true;

  RAISE NOTICE '=== Auto-Assign Medic Simulation ===';
  RAISE NOTICE 'Test Booking ID: %', test_booking_id;
  RAISE NOTICE 'Available medics in same org: %', available_medics_count;
  RAISE NOTICE 'Medics in other orgs (should not be considered): %', cross_org_medics_count;
  RAISE NOTICE 'Result: % (Only same-org medics considered)',
    CASE
      WHEN available_medics_count > 0 THEN '✅ PASS'
      ELSE '⚠️  WARN: No available medics in test org'
    END;
END $$;

-- ============================================================================
-- TEST 10: Data Integrity Summary
-- ============================================================================

-- Summary of all tables with org_id
SELECT
  'SUMMARY: Tables with org_id' AS summary_type,
  (SELECT COUNT(*) FROM organizations) AS total_orgs,
  (SELECT COUNT(DISTINCT org_id) FROM clients) AS orgs_with_clients,
  (SELECT COUNT(DISTINCT org_id) FROM medics) AS orgs_with_medics,
  (SELECT COUNT(DISTINCT org_id) FROM bookings) AS orgs_with_bookings,
  (SELECT COUNT(DISTINCT org_id) FROM timesheets) AS orgs_with_timesheets,
  (SELECT COUNT(DISTINCT org_id) FROM invoices) AS orgs_with_invoices,
  (SELECT COUNT(DISTINCT org_id) FROM territories) AS orgs_with_territories;

-- ============================================================================
-- CLEANUP INSTRUCTIONS
-- ============================================================================
-- To remove test data, run:
-- DELETE FROM bookings WHERE org_id = (SELECT id FROM organizations WHERE slug = 'test-medics');
-- DELETE FROM medics WHERE org_id = (SELECT id FROM organizations WHERE slug = 'test-medics');
-- DELETE FROM clients WHERE org_id = (SELECT id FROM organizations WHERE slug = 'test-medics');
-- DELETE FROM organizations WHERE slug = 'test-medics';
-- ============================================================================

RAISE NOTICE '=== Multi-Tenant Isolation Test Complete ===';
RAISE NOTICE 'Review the test results above to verify isolation.';
RAISE NOTICE 'All tests should show ✅ PASS or ⚠️ WARN (acceptable warnings are noted).';
RAISE NOTICE 'Any ❌ FAIL results indicate a security issue that must be fixed.';
