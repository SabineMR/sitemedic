-- ============================================================================
-- Working Seed Script - Creates auth.users properly
-- ============================================================================

-- Clean up
TRUNCATE bookings CASCADE;
DELETE FROM medics;
DELETE FROM clients;
DELETE FROM auth.users WHERE email LIKE '%@sitemedic.test';

-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Define UUIDs for consistency
DO $$
DECLARE
  org_id UUID := '99999999-9999-9999-9999-999999999999';
  medic1_id UUID := '11111111-1111-1111-1111-111111111111';
  medic2_id UUID := '22222222-2222-2222-2222-222222222222';
  medic3_id UUID := '33333333-3333-3333-3333-333333333333';
  client1_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  client2_id UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
BEGIN
  -- Ensure organization exists
  INSERT INTO organizations (id, name, created_at)
  VALUES (org_id, 'SiteMedic Test Org', NOW())
  ON CONFLICT (id) DO UPDATE SET name = 'SiteMedic Test Org';

  -- Create auth.users for medics
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token
  ) VALUES
    (
      '00000000-0000-0000-0000-000000000000', medic1_id, 'authenticated', 'authenticated',
      'john.smith@sitemedic.test',
      crypt('password123', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('org_id', org_id, 'full_name', 'John Smith', 'role', 'medic'),
      false, ''
    ),
    (
      '00000000-0000-0000-0000-000000000000', medic2_id, 'authenticated', 'authenticated',
      'sarah.johnson@sitemedic.test',
      crypt('password123', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('org_id', org_id, 'full_name', 'Sarah Johnson', 'role', 'medic'),
      false, ''
    ),
    (
      '00000000-0000-0000-0000-000000000000', medic3_id, 'authenticated', 'authenticated',
      'mike.davis@sitemedic.test',
      crypt('password123', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('org_id', org_id, 'full_name', 'Mike Davis', 'role', 'medic'),
      false, ''
    ),
    -- Client users
    (
      '00000000-0000-0000-0000-000000000000', client1_id, 'authenticated', 'authenticated',
      'client1@sitemedic.test',
      crypt('password123', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('org_id', org_id, 'full_name', 'ABC Construction', 'role', 'admin'),
      false, ''
    ),
    (
      '00000000-0000-0000-0000-000000000000', client2_id, 'authenticated', 'authenticated',
      'client2@sitemedic.test',
      crypt('password123', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('org_id', org_id, 'full_name', 'XY Industries', 'role', 'admin'),
      false, ''
    )
  ON CONFLICT (id) DO NOTHING;

  -- Create profiles (triggers should do this, but let's be explicit)
  INSERT INTO profiles (id, org_id, full_name, email, role)
  VALUES
    (medic1_id, org_id, 'John Smith', 'john.smith@sitemedic.test', 'medic'),
    (medic2_id, org_id, 'Sarah Johnson', 'sarah.johnson@sitemedic.test', 'medic'),
    (medic3_id, org_id, 'Mike Davis', 'mike.davis@sitemedic.test', 'medic'),
    (client1_id, org_id, 'ABC Construction', 'client1@sitemedic.test', 'admin'),
    (client2_id, org_id, 'XY Industries', 'client2@sitemedic.test', 'admin')
  ON CONFLICT (id) DO NOTHING;

  -- Create medics
  INSERT INTO medics (
    id, user_id, first_name, last_name, email, phone,
    home_address, home_postcode,
    has_confined_space_cert, has_trauma_cert,
    star_rating, available_for_work
  ) VALUES
    (medic1_id, medic1_id, 'John', 'Smith', 'john.smith@sitemedic.test', '+44 7700 900001',
     '123 High Street, London', 'SW1A 1AA', true, true, 4.8, true),
    (medic2_id, medic2_id, 'Sarah', 'Johnson', 'sarah.johnson@sitemedic.test', '+44 7700 900002',
     '45 King Street, London', 'E14 8AB', false, true, 4.5, true),
    (medic3_id, medic3_id, 'Mike', 'Davis', 'mike.davis@sitemedic.test', '+44 7700 900003',
     '78 Oxford Street, London', 'W1D 1BS', true, false, 4.9, true)
  ON CONFLICT (id) DO NOTHING;

  -- Create clients
  INSERT INTO clients (
    id, user_id, company_name, vat_number,
    billing_address, billing_postcode,
    contact_name, contact_email, contact_phone,
    payment_terms, status
  ) VALUES
    (client1_id, client1_id, 'ABC Construction Ltd', 'GB123456789',
     '100 Commercial Road, London', 'E1 1AB',
     'David Thompson', 'client1@sitemedic.test', '+44 20 7946 0001',
     'prepay', 'active'),
    (client2_id, client2_id, 'XY Industries Plc', 'GB987654321',
     '50 Industrial Estate, London', 'E16 2QB',
     'Rachel Green', 'client2@sitemedic.test', '+44 20 7946 0002',
     'prepay', 'active')
  ON CONFLICT (id) DO NOTHING;

  -- Create bookings (Feb 15-28, 2026)
  INSERT INTO bookings (
    client_id, medic_id, site_name, site_address, site_postcode,
    shift_date, shift_start_time, shift_end_time, shift_hours,
    base_rate, urgency_premium_percent, subtotal, vat, total,
    platform_fee, medic_payout,
    status, confined_space_required, trauma_specialist_required
  ) VALUES
    -- Assigned bookings
    (client1_id, medic1_id, 'Canary Wharf Site A', '1 Canada Square, London', 'E14 5AB',
     '2026-02-15', '08:00:00', '16:00:00', 8.00,
     30.00, 0, 240.00, 48.00, 288.00, 115.20, 172.80,
     'confirmed', true, false),

    (client2_id, medic2_id, 'Industrial Park B', '50 Industrial Estate, London', 'E16 2QB',
     '2026-02-17', '09:00:00', '17:00:00', 8.00,
     30.00, 0, 240.00, 48.00, 288.00, 115.20, 172.80,
     'confirmed', false, true),

    (client1_id, medic3_id, 'Factory D', '78 Factory Lane, London', 'SE10 0AG',
     '2026-02-18', '06:00:00', '16:00:00', 10.00,
     30.00, 0, 300.00, 60.00, 360.00, 144.00, 216.00,
     'confirmed', true, false),

    -- Unassigned bookings for drag-and-drop testing
    (client2_id, NULL, 'Emergency Warehouse Site', '200 Warehouse Way, London', 'SE28 0BJ',
     '2026-02-16', '10:00:00', '18:00:00', 8.00,
     30.00, 50, 360.00, 72.00, 432.00, 172.80, 259.20,
     'pending', false, true),

    (client1_id, NULL, 'Office Building Renovation', '25 Tech Park, London', 'EC1A 1BB',
     '2026-02-20', '08:00:00', '16:00:00', 8.00,
     30.00, 0, 240.00, 48.00, 288.00, 115.20, 172.80,
     'pending', false, false),

    (client2_id, NULL, 'Underground Tunnel Project', '1 Canada Square, London', 'E14 5AB',
     '2026-02-23', '06:00:00', '14:00:00', 8.00,
     30.00, 75, 420.00, 84.00, 504.00, 201.60, 302.40,
     'pending', true, false),

    (client1_id, NULL, 'Medical Emergency Standby', '78 Factory Lane, London', 'SE10 0AG',
     '2026-02-27', '13:00:00', '21:00:00', 8.00,
     30.00, 20, 288.00, 57.60, 345.60, 138.24, 207.36,
     'pending', false, true),

    (client2_id, NULL, 'Critical Infrastructure Repair', '1 Canada Square, London', 'E14 5AB',
     '2026-02-26', '08:00:00', '20:00:00', 12.00,
     30.00, 50, 540.00, 108.00, 648.00, 259.20, 388.80,
     'pending', true, true);

  RAISE NOTICE '✅ Seed completed successfully!';
  RAISE NOTICE '📊 Created 3 medics, 2 clients, 8 bookings';
  RAISE NOTICE '📋 3 assigned, 5 unassigned';
  RAISE NOTICE '🗓️ Feb 15-28, 2026';
  RAISE NOTICE '💻 http://localhost:30500/admin/schedule-board';
END $$;
