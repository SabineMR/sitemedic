-- Migration 108: Create Platform Admin User
-- Created: 2026-02-16
-- Purpose: Create sabineresoagli@gmail.com as platform admin in auth.users
--
-- Problem: Database resets wipe auth.users, so migrations 105/106 fail because
-- they try to UPDATE a user that doesn't exist. This migration creates the user.
--
-- STEP 1: Fix the handle_new_user() trigger to support platform admins with NULL org_id
-- STEP 2: Create the platform admin user

-- =============================================================================
-- STEP 1: Fix handle_new_user() Trigger
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_org_id UUID;
  user_role TEXT;
  user_org_id UUID;
BEGIN
  -- Get user role from metadata
  user_role := NEW.raw_user_meta_data->>'role';

  -- Platform admins have NULL org_id and should skip the default org logic
  IF user_role = 'platform_admin' THEN
    user_org_id := NULL;
  ELSE
    -- For non-platform admins, get org_id from metadata or use default
    -- Get the first organization as default (Apex Safety Group)
    SELECT id INTO default_org_id FROM public.organizations LIMIT 1;

    -- If no organization exists, create a default one
    IF default_org_id IS NULL THEN
      INSERT INTO public.organizations (name) VALUES ('Default Organization')
      RETURNING id INTO default_org_id;
    END IF;

    -- Use org_id from metadata if provided, otherwise use default
    user_org_id := COALESCE(
      (NEW.raw_user_meta_data->>'org_id')::UUID,
      default_org_id
    );
  END IF;

  -- Insert profile with the determined org_id
  INSERT INTO public.profiles (id, org_id, full_name, email, role)
  VALUES (
    NEW.id,
    user_org_id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'Unknown User'),
    NEW.email,
    COALESCE(user_role::public.user_role, 'site_manager'::public.user_role)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates a profile when a new user signs up. Platform admins get NULL org_id, others get metadata org_id or default.';

-- =============================================================================
-- STEP 2: Create Platform Admin User
-- =============================================================================

-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Generate a consistent UUID for the platform admin
DO $$
DECLARE
  admin_id UUID := 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
BEGIN
  -- Create auth.users record for platform admin
  -- All string columns must be '' not NULL — GoTrue cannot scan NULL into string fields
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    confirmation_token,
    recovery_token,
    email_change,
    email_change_token_new,
    email_change_token_current,
    phone,
    phone_change,
    phone_change_token,
    reauthentication_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    admin_id,
    'authenticated',
    'authenticated',
    'sabineresoagli@gmail.com',
    crypt('password123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"],"role":"platform_admin","org_id":null}'::jsonb,
    '{"role":"platform_admin","full_name":"Sabine Resoagli"}'::jsonb,
    false,
    '', '', '', '', '', '', '', '', ''
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    encrypted_password = EXCLUDED.encrypted_password,
    raw_app_meta_data = EXCLUDED.raw_app_meta_data,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data;

  -- Create profile for platform admin
  INSERT INTO profiles (
    id,
    org_id,
    full_name,
    email,
    role
  ) VALUES (
    admin_id,
    NULL,  -- Platform admins have no org_id
    'Sabine Resoagli',
    'sabineresoagli@gmail.com',
    'platform_admin'
  )
  ON CONFLICT (id) DO UPDATE SET
    org_id = NULL,
    role = 'platform_admin',
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name;

  RAISE NOTICE '✅ Platform admin user created successfully!';
  RAISE NOTICE '📧 Email: sabineresoagli@gmail.com';
  RAISE NOTICE '🔑 Password: password123';
  RAISE NOTICE '👤 Role: platform_admin';
  RAISE NOTICE '🏢 Org ID: NULL (cross-org access)';
END $$;
