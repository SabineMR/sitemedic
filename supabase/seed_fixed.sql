-- ============================================================================
-- SiteMedic Seed Data (FIXED)
-- ============================================================================

-- Clean up
TRUNCATE bookings, medics, clients, profiles CASCADE;
DELETE FROM auth.users WHERE email LIKE '%@sitemedic.co.uk' OR email LIKE '%construction.co.uk' OR email LIKE '%industries.co.uk' OR email LIKE '%corp.co.uk' OR email LIKE '%manufacturing.co.uk' OR email LIKE '%logistics.co.uk';

-- Create organization
INSERT INTO organizations (id, name, created_at)
VALUES ('99999999-9999-9999-9999-999999999999', 'SiteMedic Platform', NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STEP 1: Create Medics with proper user setup
-- ============================================================================

-- Medic 1: John Smith
INSERT INTO medics (
  id, user_id, first_name, last_name, email, phone,
  home_address, home_postcode,
  has_confined_space_cert, has_trauma_cert,
  star_rating, available_for_work,
  total_shifts_completed, riddor_compliance_rate
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  'John', 'Smith',
  'john.smith@sitemedic.co.uk', '+44 7700 900001',
  '123 High Street, London', 'SW1A 1AA',
  true, true, 4.8, true, 145, 98.5
),
-- Medic 2: Sarah Johnson  
(
  '22222222-2222-2222-2222-222222222222',
  '22222222-2222-2222-2222-222222222222',
  'Sarah', 'Johnson',
  'sarah.johnson@sitemedic.co.uk', '+44 7700 900002',
  '45 King Street, London', 'E14 8AB',
  false, true, 4.5, true, 98, 95.0
),
-- Medic 3: Mike Davis
(
  '33333333-3333-3333-3333-333333333333',
  '33333333-3333-3333-3333-333333333333',
  'Mike', 'Davis',
  'mike.davis@sitemedic.co.uk', '+44 7700 900003',
  '78 Oxford Street, London', 'W1D 1BS',
  true, false, 4.9, true, 203, 99.2
),
-- Medic 4: Emma Wilson
(
  '44444444-4444-4444-4444-444444444444',
  '44444444-4444-4444-4444-444444444444',
  'Emma', 'Wilson',
  'emma.wilson@sitemedic.co.uk', '+44 7700 900004',
  '12 Baker Street, London', 'NW1 6XE',
  true, true, 4.2, true, 34, 96.8
),
-- Medic 5: James Brown
(
  '55555555-5555-5555-5555-555555555555',
  '55555555-5555-5555-5555-555555555555',
  'James', 'Brown',
  'james.brown@sitemedic.co.uk', '+44 7700 900005',
  '89 Victoria Road, London', 'SE1 7TP',
  false, false, 4.0, true, 67, 94.3
),
-- Medic 6: Olivia Taylor
(
  '66666666-6666-6666-6666-666666666666',
  '66666666-6666-6666-6666-666666666666',
  'Olivia', 'Taylor',
  'olivia.taylor@sitemedic.co.uk', '+44 7700 900006',
  '34 Regent Street, London', 'W1B 5TH',
  false, true, 4.7, true, 112, 97.5
);

-- Create profiles for medics (bypass auth.users trigger)
INSERT INTO profiles (id, org_id, full_name, email, role)
VALUES
  ('11111111-1111-1111-1111-111111111111', '99999999-9999-9999-9999-999999999999', 'John Smith', 'john.smith@sitemedic.co.uk', 'medic'),
  ('22222222-2222-2222-2222-222222222222', '99999999-9999-9999-9999-999999999999', 'Sarah Johnson', 'sarah.johnson@sitemedic.co.uk', 'medic'),
  ('33333333-3333-3333-3333-333333333333', '99999999-9999-9999-9999-999999999999', 'Mike Davis', 'mike.davis@sitemedic.co.uk', 'medic'),
  ('44444444-4444-4444-4444-444444444444', '99999999-9999-9999-9999-999999999999', 'Emma Wilson', 'emma.wilson@sitemedic.co.uk', 'medic'),
  ('55555555-5555-5555-5555-555555555555', '99999999-9999-9999-9999-999999999999', 'James Brown', 'james.brown@sitemedic.co.uk', 'medic'),
  ('66666666-6666-6666-6666-666666666666', '99999999-9999-9999-9999-999999999999', 'Olivia Taylor', 'olivia.taylor@sitemedic.co.uk', 'medic'),
  -- Clients
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '99999999-9999-9999-9999-999999999999', 'ABC Construction', 'contact@abcconstruction.co.uk', 'client'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '99999999-9999-9999-9999-999999999999', 'XY Industries', 'admin@xyindustries.co.uk', 'client'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '99999999-9999-9999-9999-999999999999', 'Tech Corp', 'booking@techcorp.co.uk', 'client'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '99999999-9999-9999-9999-999999999999', 'Manufacturing Ltd', 'safety@manufacturing.co.uk', 'client'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '99999999-9999-9999-9999-999999999999', 'Logistics Co', 'ops@logistics.co.uk', 'client')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STEP 2: Create Clients
-- ============================================================================

INSERT INTO clients (
  id, user_id, company_name, vat_number,
  billing_address, billing_postcode,
  contact_name, contact_email, contact_phone,
  payment_terms, status
) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ABC Construction Ltd', 'GB123456789',
   '100 Commercial Road, London', 'E1 1AB',
   'David Thompson', 'contact@abcconstruction.co.uk', '+44 20 7946 0001',
   'net_30', 'active'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'XY Industries Plc', 'GB987654321',
   '50 Industrial Estate, London', 'E16 2QB',
   'Rachel Green', 'admin@xyindustries.co.uk', '+44 20 7946 0002',
   'prepay', 'active'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Tech Corp Solutions', 'GB456789123',
   '25 Tech Park, London', 'EC1A 1BB',
   'Mark Anderson', 'booking@techcorp.co.uk', '+44 20 7946 0003',
   'net_30', 'active'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Manufacturing Ltd', 'GB321654987',
   '78 Factory Lane, London', 'SE10 0AG',
   'Linda White', 'safety@manufacturing.co.uk', '+44 20 7946 0004',
   'prepay', 'active'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Logistics Co International', 'GB789123456',
   '200 Warehouse Way, London', 'SE28 0BJ',
   'Peter Black', 'ops@logistics.co.uk', '+44 20 7946 0005',
   'net_30', 'active');

-- ============================================================================
-- STEP 3: Create Bookings (Feb 15-28, 2026)
-- NOTE: Using 'pending' instead of 'urgent_broadcast' for urgent bookings
-- ============================================================================

INSERT INTO bookings (
  id, client_id, medic_id,
  site_name, site_address, site_postcode,
  shift_date, shift_start_time, shift_end_time, shift_hours,
  base_rate, urgency_premium_percent, subtotal, vat, total,
  platform_fee, medic_payout,
  status, confined_space_required, trauma_specialist_required
) VALUES
-- Feb 15 - John Smith
('b0000001-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111',
 'Canary Wharf Site A', '1 Canada Square, London', 'E14 5AB',
 '2026-02-15', '08:00:00', '16:00:00', 8.00,
 30.00, 0, 240.00, 48.00, 288.00, 115.20, 172.80,
 'confirmed', true, false),

-- Feb 16 - UNASSIGNED (urgent)
('b0000002-0000-0000-0000-000000000002', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', NULL,
 'Emergency Warehouse Site', '200 Warehouse Way, London', 'SE28 0BJ',
 '2026-02-16', '10:00:00', '18:00:00', 8.00,
 30.00, 50, 360.00, 72.00, 432.00, 172.80, 259.20,
 'pending', false, true),

-- Feb 17 - Sarah Johnson
('b0000003-0000-0000-0000-000000000003', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222',
 'Industrial Park B', '50 Industrial Estate, London', 'E16 2QB',
 '2026-02-17', '09:00:00', '17:00:00', 8.00,
 30.00, 0, 240.00, 48.00, 288.00, 115.20, 172.80,
 'confirmed', false, true),

-- Feb 18 - Mike Davis (10 hours)
('b0000004-0000-0000-0000-000000000004', 'dddddddd-dddd-dddd-dddd-dddddddddddd', '33333333-3333-3333-3333-333333333333',
 'Factory D - Assembly Line', '78 Factory Lane, London', 'SE10 0AG',
 '2026-02-18', '06:00:00', '16:00:00', 10.00,
 30.00, 0, 300.00, 60.00, 360.00, 144.00, 216.00,
 'confirmed', true, false),

-- Feb 19 - Emma Wilson (12 hours)
('b0000005-0000-0000-0000-000000000005', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444',
 'High-Risk Site E', '100 Commercial Road, London', 'E1 1AB',
 '2026-02-19', '07:00:00', '19:00:00', 12.00,
 30.00, 0, 360.00, 72.00, 432.00, 172.80, 259.20,
 'confirmed', true, true),

-- Feb 20 - UNASSIGNED
('b0000006-0000-0000-0000-000000000006', 'cccccccc-cccc-cccc-cccc-cccccccccccc', NULL,
 'Office Building Renovation', '25 Tech Park, London', 'EC1A 1BB',
 '2026-02-20', '08:00:00', '16:00:00', 8.00,
 30.00, 0, 240.00, 48.00, 288.00, 115.20, 172.80,
 'pending', false, false),

-- Feb 21 - Olivia Taylor
('b0000007-0000-0000-0000-000000000007', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '66666666-6666-6666-6666-666666666666',
 'Chemical Plant Site', '50 Industrial Estate, London', 'E16 2QB',
 '2026-02-21', '08:00:00', '16:00:00', 8.00,
 30.00, 0, 240.00, 48.00, 288.00, 115.20, 172.80,
 'confirmed', false, true),

-- Feb 22 - James Brown
('b0000008-0000-0000-0000-000000000008', 'dddddddd-dddd-dddd-dddd-dddddddddddd', '55555555-5555-5555-5555-555555555555',
 'Weekend Maintenance', '78 Factory Lane, London', 'SE10 0AG',
 '2026-02-22', '09:00:00', '17:00:00', 8.00,
 30.00, 0, 240.00, 48.00, 288.00, 115.20, 172.80,
 'confirmed', false, false),

-- Feb 23 - UNASSIGNED (urgent)
('b0000009-0000-0000-0000-000000000009', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', NULL,
 'Underground Tunnel Project', '1 Canada Square, London', 'E14 5AB',
 '2026-02-23', '06:00:00', '14:00:00', 8.00,
 30.00, 75, 420.00, 84.00, 504.00, 201.60, 302.40,
 'pending', true, false),

-- Feb 24-28 - Various shifts
('b0000010-0000-0000-0000-000000000010', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111',
 'Infrastructure Project', '25 Tech Park, London', 'EC1A 1BB',
 '2026-02-24', '07:00:00', '17:00:00', 10.00,
 30.00, 0, 300.00, 60.00, 360.00, 144.00, 216.00,
 'confirmed', true, true),

('b0000011-0000-0000-0000-000000000011', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '22222222-2222-2222-2222-222222222222',
 'Distribution Center', '200 Warehouse Way, London', 'SE28 0BJ',
 '2026-02-25', '08:00:00', '16:00:00', 8.00,
 30.00, 0, 240.00, 48.00, 288.00, 115.20, 172.80,
 'confirmed', false, false),

('b0000012-0000-0000-0000-000000000012', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '33333333-3333-3333-3333-333333333333',
 'Early Shift Manufacturing', '50 Industrial Estate, London', 'E16 2QB',
 '2026-02-26', '05:00:00', '13:00:00', 8.00,
 30.00, 0, 240.00, 48.00, 288.00, 115.20, 172.80,
 'confirmed', true, false),

-- UNASSIGNED bookings for testing drag-and-drop
('b0000013-0000-0000-0000-000000000013', 'dddddddd-dddd-dddd-dddd-dddddddddddd', NULL,
 'Medical Emergency Standby', '78 Factory Lane, London', 'SE10 0AG',
 '2026-02-27', '13:00:00', '21:00:00', 8.00,
 30.00, 20, 288.00, 57.60, 345.60, 138.24, 207.36,
 'pending', false, true),

('b0000014-0000-0000-0000-000000000014', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444',
 'Friday Site Closure', '100 Commercial Road, London', 'E1 1AB',
 '2026-02-28', '14:00:00', '22:00:00', 8.00,
 30.00, 0, 240.00, 48.00, 288.00, 115.20, 172.80,
 'confirmed', false, true),

-- More unassigned for testing
('b0000015-0000-0000-0000-000000000015', 'cccccccc-cccc-cccc-cccc-cccccccccccc', NULL,
 'Night Security Standby', '200 Warehouse Way, London', 'SE28 0BJ',
 '2026-02-25', '22:00:00', '06:00:00', 8.00,
 30.00, 20, 288.00, 57.60, 345.60, 138.24, 207.36,
 'pending', false, false),

('b0000016-0000-0000-0000-000000000016', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', NULL,
 'Critical Infrastructure Repair', '1 Canada Square, London', 'E14 5AB',
 '2026-02-26', '08:00:00', '20:00:00', 12.00,
 30.00, 50, 540.00, 108.00, 648.00, 259.20, 388.80,
 'pending', true, true),

('b0000017-0000-0000-0000-000000000017', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', NULL,
 'Routine Site Safety', '50 Industrial Estate, London', 'E16 2QB',
 '2026-02-27', '09:00:00', '17:00:00', 8.00,
 30.00, 0, 240.00, 48.00, 288.00, 115.20, 172.80,
 'pending', false, false);

-- Summary
DO $$
DECLARE
  medic_count INT;
  client_count INT;
  booking_count INT;
  assigned INT;
  unassigned INT;
BEGIN
  SELECT COUNT(*) INTO medic_count FROM medics;
  SELECT COUNT(*) INTO client_count FROM clients;
  SELECT COUNT(*) INTO booking_count FROM bookings;
  SELECT COUNT(*) INTO assigned FROM bookings WHERE medic_id IS NOT NULL;
  SELECT COUNT(*) INTO unassigned FROM bookings WHERE medic_id IS NULL;

  RAISE NOTICE '✅ Seed completed!';
  RAISE NOTICE '📊 Medics: %, Clients: %, Bookings: %', medic_count, client_count, booking_count;
  RAISE NOTICE '📋 Assigned: %, Unassigned: %', assigned, unassigned;
  RAISE NOTICE '🗓️ Date Range: Feb 15-28, 2026';
  RAISE NOTICE '💻 View at: http://localhost:30500/admin/schedule-board';
END $$;
