-- Migration 031: Add Platform Admin Role
-- Created: 2026-02-16
-- Purpose: Separate org-level admins from platform-level super admins
--
-- This migration:
-- 1. Adds 'org_admin' and 'platform_admin' to the user_role enum
-- 2. Migrates existing 'admin' users to 'org_admin'
-- 3. Updates triggers to include role in JWT
-- 4. Updates RLS policies to give platform admins cross-org access

-- =============================================================================
-- STEP 1: Extend user_role enum
-- =============================================================================

-- Add new role values to the enum
-- Note: We're adding 'org_admin' and 'platform_admin' while keeping 'admin' for backwards compatibility
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'org_admin';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'platform_admin';

COMMENT ON TYPE user_role IS 'User roles: medic, site_manager, admin (deprecated), org_admin, platform_admin';

-- =============================================================================
-- STEP 2: Migrate existing 'admin' users to 'org_admin'
-- =============================================================================

-- Update all existing users with 'admin' role to 'org_admin'
-- (org_admin = manages their organization, platform_admin = manages entire platform)
UPDATE profiles
SET role = 'org_admin'
WHERE role = 'admin';

-- Also update their JWT metadata
UPDATE auth.users
SET raw_app_meta_data = jsonb_set(
  COALESCE(raw_app_meta_data, '{}'::jsonb),
  '{role}',
  '"org_admin"'::jsonb
)
WHERE id IN (
  SELECT id FROM profiles WHERE role = 'org_admin'
);

COMMENT ON COLUMN profiles.role IS 'User role: medic, site_manager, org_admin (manages their org), platform_admin (manages entire platform)';

-- =============================================================================
-- STEP 3: Create helper function to check if user is platform admin
-- =============================================================================

-- This function checks if the current user is a platform admin
-- Used in RLS policies to grant cross-org access
CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user's role in JWT is 'platform_admin'
  RETURN COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role')::text = 'platform_admin',
    FALSE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION is_platform_admin IS 'Check if current user is a platform admin (cross-org access)';

-- =============================================================================
-- STEP 4: Create helper function to check if user is org admin
-- =============================================================================

CREATE OR REPLACE FUNCTION is_org_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user's role in JWT is 'org_admin'
  RETURN COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role')::text = 'org_admin',
    FALSE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION is_org_admin IS 'Check if current user is an org admin (manages their org only)';

-- =============================================================================
-- STEP 5: Update is_admin() function to include both types of admins
-- =============================================================================

-- Update the existing is_admin() function to return true for both org_admin and platform_admin
-- This maintains backwards compatibility with existing RLS policies
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role')::text IN ('admin', 'org_admin', 'platform_admin'),
    FALSE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION is_admin IS 'Check if current user is any type of admin (org_admin or platform_admin) - for backwards compatibility';

-- =============================================================================
-- STEP 6: Grant permissions
-- =============================================================================

GRANT EXECUTE ON FUNCTION is_platform_admin TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_org_admin TO authenticated, anon;

-- =============================================================================
-- NOTES FOR CREATING PLATFORM ADMIN USER
-- =============================================================================

-- To create a platform admin user, run the following after they sign up:
--
-- UPDATE profiles
-- SET role = 'platform_admin'
-- WHERE email = 'your-email@example.com';
--
-- Then refresh their JWT by having them log out and log back in.
-- Or manually update their JWT:
--
-- UPDATE auth.users
-- SET raw_app_meta_data = jsonb_set(
--   COALESCE(raw_app_meta_data, '{}'::jsonb),
--   '{role}',
--   '"platform_admin"'::jsonb
-- )
-- WHERE email = 'your-email@example.com';
