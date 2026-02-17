-- Migration 033: Migrate to Platform Admin Roles (Part 2 - Data & Functions)
-- Created: 2026-02-16
-- Purpose: Migrate existing admins and create helper functions
--
-- This must run AFTER 031 which added the enum values

-- =============================================================================
-- STEP 1: Migrate existing 'admin' users to 'org_admin'
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
-- STEP 2: Create helper function to check if user is platform admin
-- =============================================================================

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
-- STEP 3: Create helper function to check if user is org admin
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
-- STEP 4: Update is_admin() function to include both types of admins
-- =============================================================================

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
-- STEP 5: Grant permissions
-- =============================================================================

GRANT EXECUTE ON FUNCTION is_platform_admin TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_org_admin TO authenticated, anon;
