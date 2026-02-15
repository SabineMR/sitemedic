-- 00002_profiles_and_roles.sql
-- Create user profiles with role-based access control

-- Create custom enum for user roles
CREATE TYPE user_role AS ENUM ('medic', 'site_manager', 'admin');

-- Create profiles table linking to auth.users
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id),
  role user_role NOT NULL DEFAULT 'medic',
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on org_id for RLS performance
CREATE INDEX idx_profiles_org_id ON profiles(org_id);

-- Create index on email for lookups
CREATE INDEX idx_profiles_email ON profiles(email);

-- Attach updated_at trigger
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger function to set org_id and role in JWT app_metadata
-- This runs AFTER INSERT on profiles to populate auth.users.raw_app_meta_data
-- so RLS policies can read org_id and role from JWT claims
CREATE OR REPLACE FUNCTION set_user_org_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- Update auth.users with org_id and role in raw_app_meta_data
  -- This will be included in JWT claims as app_metadata
  UPDATE auth.users
  SET raw_app_meta_data = jsonb_set(
    jsonb_set(
      COALESCE(raw_app_meta_data, '{}'::jsonb),
      '{org_id}',
      to_jsonb(NEW.org_id::text)
    ),
    '{role}',
    to_jsonb(NEW.role::text)
  )
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_created
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_user_org_metadata();

-- Trigger function to auto-create profile when new auth.users row inserted
-- Expects org_id, full_name, and role in raw_user_meta_data during signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, org_id, full_name, email, role)
  VALUES (
    NEW.id,
    (NEW.raw_user_meta_data->>'org_id')::UUID,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Unknown User'),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'medic'::user_role)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

COMMENT ON TABLE profiles IS 'User profiles with organization membership and role-based access control. Links to auth.users for authentication.';
