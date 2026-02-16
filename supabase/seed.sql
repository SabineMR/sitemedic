-- ============================================================================
-- SiteMedic Seed Data
-- Purpose: Populate database with realistic medics, clients, and bookings
-- Date Range: February 15-28, 2026 (rest of the month)
-- ============================================================================

-- Clean up existing data (for development only)
TRUNCATE bookings, medics, clients CASCADE;

-- ============================================================================
-- STEP 1: Create Auth Users (required for medics and clients)
-- ============================================================================

-- Insert auth users for medics
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, role)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'john.smith@sitemedic.co.uk', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', 'sarah.johnson@sitemedic.co.uk', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated'),
  ('33333333-3333-3333-3333-333333333333', 'mike.davis@sitemedic.co.uk', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated'),
  ('44444444-4444-4444-4444-444444444444', 'emma.wilson@sitemedic.co.uk', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated'),
  ('55555555-5555-5555-5555-555555555555', 'james.brown@sitemedic.co.uk', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated'),
  ('66666666-6666-6666-6666-666666666666', 'olivia.taylor@sitemedic.co.uk', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated'),

  -- Client users
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'contact@abcconstruction.co.uk', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'admin@xyindustries.co.uk', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'booking@techcorp.co.uk', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'safety@manufacturing.co.uk', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'ops@logistics.co.uk', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STEP 2: Create Medics
-- ============================================================================

INSERT INTO medics (
  id, user_id, first_name, last_name, email, phone,
  home_address, home_postcode,
  has_confined_space_cert, has_trauma_cert,
  star_rating, available_for_work,
  total_shifts_completed, riddor_compliance_rate
) VALUES
  -- Medic 1: John Smith (Confined Space + Trauma, High Rating)
  (
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    'John', 'Smith',
    'john.smith@sitemedic.co.uk', '+44 7700 900001',
    '123 High Street, London', 'SW1A 1AA',
    true, true,
    4.8, true,
    145, 98.5
  ),

  -- Medic 2: Sarah Johnson (Trauma Only, Good Rating)
  (
    '22222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    'Sarah', 'Johnson',
    'sarah.johnson@sitemedic.co.uk', '+44 7700 900002',
    '45 King Street, London', 'E14 8AB',
    false, true,
    4.5, true,
    98, 95.0
  ),

  -- Medic 3: Mike Davis (Confined Space Only, Excellent Rating)
  (
    '33333333-3333-3333-3333-333333333333',
    '33333333-3333-3333-3333-333333333333',
    'Mike', 'Davis',
    'mike.davis@sitemedic.co.uk', '+44 7700 900003',
    '78 Oxford Street, London', 'W1D 1BS',
    true, false,
    4.9, true,
    203, 99.2
  ),

  -- Medic 4: Emma Wilson (Both Certs, New)
  (
    '44444444-4444-4444-4444-444444444444',
    '44444444-4444-4444-4444-444444444444',
    'Emma', 'Wilson',
    'emma.wilson@sitemedic.co.uk', '+44 7700 900004',
    '12 Baker Street, London', 'NW1 6XE',
    true, true,
    4.2, true,
    34, 96.8
  ),

  -- Medic 5: James Brown (No Special Certs, Average)
  (
    '55555555-5555-5555-5555-555555555555',
    '55555555-5555-5555-5555-555555555555',
    'James', 'Brown',
    'james.brown@sitemedic.co.uk', '+44 7700 900005',
    '89 Victoria Road, London', 'SE1 7TP',
    false, false,
    4.0, true,
    67, 94.3
  ),

  -- Medic 6: Olivia Taylor (Trauma Only, High Rating)
  (
    '66666666-6666-6666-6666-666666666666',
    '66666666-6666-6666-6666-666666666666',
    'Olivia', 'Taylor',
    'olivia.taylor@sitemedic.co.uk', '+44 7700 900006',
    '34 Regent Street, London', 'W1B 5TH',
    false, true,
    4.7, true,
    112, 97.5
  );

-- ============================================================================
-- STEP 3: Create Clients (Construction Companies)
-- ============================================================================

INSERT INTO clients (
  id, user_id, company_name, vat_number,
  billing_address, billing_postcode,
  contact_name, contact_email, contact_phone,
  payment_terms, status
) VALUES
  -- Client 1: ABC Construction (Net 30 Terms)
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'ABC Construction Ltd', 'GB123456789',
    '100 Commercial Road, London', 'E1 1AB',
    'David Thompson', 'contact@abcconstruction.co.uk', '+44 20 7946 0001',
    'net_30', 'active'
  ),

  -- Client 2: XY Industries (Prepay)
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'XY Industries Plc', 'GB987654321',
    '50 Industrial Estate, London', 'E16 2QB',
    'Rachel Green', 'admin@xyindustries.co.uk', '+44 20 7946 0002',
    'prepay', 'active'
  ),

  -- Client 3: Tech Corp (Net 30)
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'Tech Corp Solutions', 'GB456789123',
    '25 Tech Park, London', 'EC1A 1BB',
    'Mark Anderson', 'booking@techcorp.co.uk', '+44 20 7946 0003',
    'net_30', 'active'
  ),

  -- Client 4: Manufacturing Ltd (Prepay)
  (
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'Manufacturing Ltd', 'GB321654987',
    '78 Factory Lane, London', 'SE10 0AG',
    'Linda White', 'safety@manufacturing.co.uk', '+44 20 7946 0004',
    'prepay', 'active'
  ),

  -- Client 5: Logistics Co (Net 30)
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    'Logistics Co International', 'GB789123456',
    '200 Warehouse Way, London', 'SE28 0BJ',
    'Peter Black', 'ops@logistics.co.uk', '+44 20 7946 0005',
    'net_30', 'active'
  );

-- ============================================================================
-- STEP 4: Create Bookings (Feb 15-28, 2026)
-- Various durations: 1 day, 1 week, 2 weeks, 3 weeks, etc.
-- ============================================================================

INSERT INTO bookings (
  id, client_id, medic_id,
  site_name, site_address, site_postcode,
  shift_date, shift_start_time, shift_end_time, shift_hours,
  base_rate, urgency_premium_percent, travel_surcharge, subtotal, vat, total,
  platform_fee, medic_payout,
  status, confined_space_required, trauma_specialist_required
) VALUES

-- ===== WEEK 1: Feb 15-21 (Saturday-Friday) =====

-- SAT Feb 15 - John Smith (8-hour shift, confirmed, confined space)
(
  'b0000001-0000-0000-0000-000000000001',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11111111-1111-1111-1111-111111111111',
  'Canary Wharf Construction Site A', '1 Canada Square, London', 'E14 5AB',
  '2026-02-15', '08:00:00', '16:00:00', 8.00,
  30.00, 0, 0, 240.00, 48.00, 288.00,
  115.20, 172.80,
  'confirmed', true, false
),

-- SUN Feb 16 - Unassigned (urgent broadcast, trauma required)
(
  'b0000002-0000-0000-0000-000000000002',
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  NULL,
  'Emergency Warehouse Site', '200 Warehouse Way, London', 'SE28 0BJ',
  '2026-02-16', '10:00:00', '18:00:00', 8.00,
  30.00, 50, 0, 360.00, 72.00, 432.00,
  172.80, 259.20,
  'urgent_broadcast', false, true
),

-- MON Feb 17 - Sarah Johnson
(
  'b0000003-0000-0000-0000-000000000003',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  '22222222-2222-2222-2222-222222222222',
  'Industrial Park B', '50 Industrial Estate, London', 'E16 2QB',
  '2026-02-17', '09:00:00', '17:00:00', 8.00,
  30.00, 0, 0, 240.00, 48.00, 288.00,
  115.20, 172.80,
  'confirmed', false, true
),

-- TUE Feb 18 - Mike Davis (10-hour shift)
(
  'b0000004-0000-0000-0000-000000000004',
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  '33333333-3333-3333-3333-333333333333',
  'Factory D - Assembly Line', '78 Factory Lane, London', 'SE10 0AG',
  '2026-02-18', '06:00:00', '16:00:00', 10.00,
  30.00, 0, 0, 300.00, 60.00, 360.00,
  144.00, 216.00,
  'confirmed', true, false
),

-- WED Feb 19 - Emma Wilson (12-hour shift, both certs)
(
  'b0000005-0000-0000-0000-000000000005',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '44444444-4444-4444-4444-444444444444',
  'High-Risk Site E', '100 Commercial Road, London', 'E1 1AB',
  '2026-02-19', '07:00:00', '19:00:00', 12.00,
  30.00, 0, 0, 360.00, 72.00, 432.00,
  172.80, 259.20,
  'confirmed', true, true
),

-- THU Feb 20 - Unassigned
(
  'b0000006-0000-0000-0000-000000000006',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  NULL,
  'Office Building Renovation', '25 Tech Park, London', 'EC1A 1BB',
  '2026-02-20', '08:00:00', '16:00:00', 8.00,
  30.00, 0, 0, 240.00, 48.00, 288.00,
  115.20, 172.80,
  'pending', false, false
),

-- FRI Feb 21 - Olivia Taylor
(
  'b0000007-0000-0000-0000-000000000007',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  '66666666-6666-6666-6666-666666666666',
  'Chemical Plant Site', '50 Industrial Estate, London', 'E16 2QB',
  '2026-02-21', '08:00:00', '16:00:00', 8.00,
  30.00, 0, 0, 240.00, 48.00, 288.00,
  115.20, 172.80,
  'confirmed', false, true
),

-- ===== WEEK 2: Feb 22-28 =====

-- SAT Feb 22 - James Brown
(
  'b0000008-0000-0000-0000-000000000008',
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  '55555555-5555-5555-5555-555555555555',
  'Weekend Maintenance Site', '78 Factory Lane, London', 'SE10 0AG',
  '2026-02-22', '09:00:00', '17:00:00', 8.00,
  30.00, 0, 0, 240.00, 48.00, 288.00,
  115.20, 172.80,
  'confirmed', false, false
),

-- SUN Feb 23 - Unassigned (urgent, confined space)
(
  'b0000009-0000-0000-0000-000000000009',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  NULL,
  'Underground Tunnel Project', '1 Canada Square, London', 'E14 5AB',
  '2026-02-23', '06:00:00', '14:00:00', 8.00,
  30.00, 75, 0, 420.00, 84.00, 504.00,
  201.60, 302.40,
  'urgent_broadcast', true, false
),

-- MON Feb 24 - John Smith (start of 3-week engagement)
(
  'b0000010-0000-0000-0000-000000000010',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  '11111111-1111-1111-1111-111111111111',
  'Major Infrastructure Project', '25 Tech Park, London', 'EC1A 1BB',
  '2026-02-24', '07:00:00', '17:00:00', 10.00,
  30.00, 0, 0, 300.00, 60.00, 360.00,
  144.00, 216.00,
  'confirmed', true, true
),

-- TUE Feb 25 - Sarah Johnson
(
  'b0000011-0000-0000-0000-000000000011',
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  '22222222-2222-2222-2222-222222222222',
  'Distribution Center', '200 Warehouse Way, London', 'SE28 0BJ',
  '2026-02-25', '08:00:00', '16:00:00', 8.00,
  30.00, 0, 0, 240.00, 48.00, 288.00,
  115.20, 172.80,
  'confirmed', false, false
),

-- WED Feb 26 - Mike Davis
(
  'b0000012-0000-0000-0000-000000000012',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  '33333333-3333-3333-3333-333333333333',
  'Early Shift Manufacturing', '50 Industrial Estate, London', 'E16 2QB',
  '2026-02-26', '05:00:00', '13:00:00', 8.00,
  30.00, 0, 0, 240.00, 48.00, 288.00,
  115.20, 172.80,
  'confirmed', true, false
),

-- THU Feb 27 - Unassigned (trauma required)
(
  'b0000013-0000-0000-0000-000000000013',
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  NULL,
  'Medical Emergency Standby', '78 Factory Lane, London', 'SE10 0AG',
  '2026-02-27', '13:00:00', '21:00:00', 8.00,
  30.00, 20, 0, 288.00, 57.60, 345.60,
  138.24, 207.36,
  'pending', false, true
),

-- FRI Feb 28 - Emma Wilson
(
  'b0000014-0000-0000-0000-000000000014',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '44444444-4444-4444-4444-444444444444',
  'Friday Site Closure Monitoring', '100 Commercial Road, London', 'E1 1AB',
  '2026-02-28', '14:00:00', '22:00:00', 8.00,
  30.00, 0, 0, 240.00, 48.00, 288.00,
  115.20, 172.80,
  'confirmed', false, true
),

-- ===== 3-DAY EVENT: Feb 26-28 =====

-- Day 2 - Olivia Taylor
(
  'b0000015-0000-0000-0000-000000000015',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  '66666666-6666-6666-6666-666666666666',
  'Tech Conference Medical Cover - Day 2', '25 Tech Park, London', 'EC1A 1BB',
  '2026-02-27', '08:00:00', '18:00:00', 10.00,
  30.00, 0, 0, 300.00, 60.00, 360.00,
  144.00, 216.00,
  'confirmed', false, true
),

-- Day 3 - Olivia Taylor
(
  'b0000016-0000-0000-0000-000000000016',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  '66666666-6666-6666-6666-666666666666',
  'Tech Conference Medical Cover - Day 3', '25 Tech Park, London', 'EC1A 1BB',
  '2026-02-28', '08:00:00', '18:00:00', 10.00,
  30.00, 0, 0, 300.00, 60.00, 360.00,
  144.00, 216.00,
  'confirmed', false, true
),

-- ===== ADDITIONAL UNASSIGNED BOOKINGS =====

-- Late night shift
(
  'b0000017-0000-0000-0000-000000000017',
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  NULL,
  'Night Security Medical Standby', '200 Warehouse Way, London', 'SE28 0BJ',
  '2026-02-25', '22:00:00', '06:00:00', 8.00,
  30.00, 20, 0, 288.00, 57.60, 345.60,
  138.24, 207.36,
  'pending', false, false
),

-- High urgency, both certs
(
  'b0000018-0000-0000-0000-000000000018',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  NULL,
  'Critical Infrastructure Repair', '1 Canada Square, London', 'E14 5AB',
  '2026-02-26', '08:00:00', '20:00:00', 12.00,
  30.00, 50, 0, 540.00, 108.00, 648.00,
  259.20, 388.80,
  'urgent_broadcast', true, true
),

-- Simple day shift
(
  'b0000019-0000-0000-0000-000000000019',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  NULL,
  'Routine Site Safety Coverage', '50 Industrial Estate, London', 'E16 2QB',
  '2026-02-27', '09:00:00', '17:00:00', 8.00,
  30.00, 0, 0, 240.00, 48.00, 288.00,
  115.20, 172.80,
  'pending', false, false
);

-- Summary
DO $$
DECLARE
  medic_count INT;
  client_count INT;
  booking_count INT;
  assigned_count INT;
  unassigned_count INT;
BEGIN
  SELECT COUNT(*) INTO medic_count FROM medics;
  SELECT COUNT(*) INTO client_count FROM clients;
  SELECT COUNT(*) INTO booking_count FROM bookings;
  SELECT COUNT(*) INTO assigned_count FROM bookings WHERE medic_id IS NOT NULL;
  SELECT COUNT(*) INTO unassigned_count FROM bookings WHERE medic_id IS NULL;

  RAISE NOTICE '✅ Seed completed!';
  RAISE NOTICE '📊 Medics: %, Clients: %, Bookings: %', medic_count, client_count, booking_count;
  RAISE NOTICE '📋 Assigned: %, Unassigned: %', assigned_count, unassigned_count;
  RAISE NOTICE '🗓️  Feb 15-28, 2026';
END $$;
