-- Simple seed for testing Schedule Board UI
-- This bypasses complex auth requirements

-- Clean existing test data
TRUNCATE bookings CASCADE;
DELETE FROM medics WHERE email LIKE '%@test.com';
DELETE FROM clients WHERE company_name LIKE 'Test%';

-- Insert test medics directly (with dummy user_ids that match profiles)
-- We'll use existing profile IDs if they exist
DO $$
DECLARE
  test_medic_id1 UUID := gen_random_uuid();
  test_medic_id2 UUID := gen_random_uuid();
  test_medic_id3 UUID := gen_random_uuid();
  test_client_id1 UUID := gen_random_uuid();
  test_client_id2 UUID := gen_random_uuid();
BEGIN
  -- Insert medics (assuming profiles exist or creating minimal data)
  INSERT INTO medics (id, user_id, first_name, last_name, email, phone, home_address, home_postcode,
                      has_confined_space_cert, has_trauma_cert, star_rating, available_for_work)
  VALUES
    (test_medic_id1, test_medic_id1, 'John', 'Smith', 'john@test.com', '+44 7700 900001',
     '123 Test St, London', 'SW1A 1AA', true, true, 4.8, true),
    (test_medic_id2, test_medic_id2, 'Sarah', 'Johnson', 'sarah@test.com', '+44 7700 900002',
     '45 Test Rd, London', 'E14 8AB', false, true, 4.5, true),
    (test_medic_id3, test_medic_id3, 'Mike', 'Davis', 'mike@test.com', '+44 7700 900003',
     '78 Test Ave, London', 'W1D 1BS', true, false, 4.9, true)
  ON CONFLICT DO NOTHING;

  -- Insert clients
  INSERT INTO clients (id, user_id, company_name, vat_number, billing_address, billing_postcode,
                       contact_name, contact_email, contact_phone, payment_terms, status)
  VALUES
    (test_client_id1, test_client_id1, 'Test Construction Ltd', 'GB123456789',
     '100 Test Road, London', 'E1 1AB',
     'Test Contact', 'test@construction.com', '+44 20 7946 0001', 'prepay', 'active'),
    (test_client_id2, test_client_id2, 'Test Industries Plc', 'GB987654321',
     '50 Test Estate, London', 'E16 2QB',
     'Test Admin', 'test@industries.com', '+44 20 7946 0002', 'prepay', 'active')
  ON CONFLICT DO NOTHING;

  -- Insert bookings for Feb 15-28
  INSERT INTO bookings (
    client_id, medic_id, site_name, site_address, site_postcode,
    shift_date, shift_start_time, shift_end_time, shift_hours,
    base_rate, urgency_premium_percent, subtotal, vat, total,
    platform_fee, medic_payout,
    status, confined_space_required, trauma_specialist_required
  ) VALUES
    -- Assigned bookings
    (test_client_id1, test_medic_id1, 'Canary Wharf Site A', '1 Canada Square, London', 'E14 5AB',
     '2026-02-15', '08:00:00', '16:00:00', 8.00,
     30.00, 0, 240.00, 48.00, 288.00, 115.20, 172.80,
     'confirmed', true, false),

    (test_client_id2, test_medic_id2, 'Industrial Park B', '50 Industrial Estate, London', 'E16 2QB',
     '2026-02-17', '09:00:00', '17:00:00', 8.00,
     30.00, 0, 240.00, 48.00, 288.00, 115.20, 172.80,
     'confirmed', false, true),

    (test_client_id1, test_medic_id3, 'Factory D', '78 Factory Lane, London', 'SE10 0AG',
     '2026-02-18', '06:00:00', '16:00:00', 10.00,
     30.00, 0, 300.00, 60.00, 360.00, 144.00, 216.00,
     'confirmed', true, false),

    -- Unassigned bookings for testing drag-and-drop
    (test_client_id2, NULL, 'Emergency Warehouse Site', '200 Warehouse Way, London', 'SE28 0BJ',
     '2026-02-16', '10:00:00', '18:00:00', 8.00,
     30.00, 50, 360.00, 72.00, 432.00, 172.80, 259.20,
     'pending', false, true),

    (test_client_id1, NULL, 'Office Building Renovation', '25 Tech Park, London', 'EC1A 1BB',
     '2026-02-20', '08:00:00', '16:00:00', 8.00,
     30.00, 0, 240.00, 48.00, 288.00, 115.20, 172.80,
     'pending', false, false),

    (test_client_id2, NULL, 'Underground Tunnel Project', '1 Canada Square, London', 'E14 5AB',
     '2026-02-23', '06:00:00', '14:00:00', 8.00,
     30.00, 75, 420.00, 84.00, 504.00, 201.60, 302.40,
     'pending', true, false),

    (test_client_id1, NULL, 'Medical Emergency Standby', '78 Factory Lane, London', 'SE10 0AG',
     '2026-02-27', '13:00:00', '21:00:00', 8.00,
     30.00, 20, 288.00, 57.60, 345.60, 138.24, 207.36,
     'pending', false, true),

    (test_client_id2, NULL, 'Critical Infrastructure Repair', '1 Canada Square, London', 'E14 5AB',
     '2026-02-26', '08:00:00', '20:00:00', 12.00,
     30.00, 50, 540.00, 108.00, 648.00, 259.20, 388.80,
     'pending', true, true);

  -- Print summary
  RAISE NOTICE '✅ Seed completed successfully!';
  RAISE NOTICE '📊 Created 3 medics, 2 clients, 8 bookings';
  RAISE NOTICE '📋 3 assigned, 5 unassigned';
  RAISE NOTICE '🗓️ Date range: Feb 15-28, 2026';
  RAISE NOTICE '💻 View at: http://localhost:30500/admin/schedule-board';
END $$;
