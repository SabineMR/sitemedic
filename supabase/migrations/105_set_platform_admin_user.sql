-- Migration 103: Set Platform Admin User
-- Created: 2026-02-16
-- Purpose: Assign platform_admin role to sabineresoagli@gmail.com
--
-- Context: User was configured as 'org_admin' without an org_id, causing
-- "User is not assigned to an organization" errors when accessing /admin.
-- Platform admins don't belong to a specific org, so we set role='platform_admin'
-- and org_id=null in both the profiles table and JWT metadata.

-- Update the profile
UPDATE profiles
SET role = 'platform_admin'
WHERE email = 'sabineresoagli@gmail.com';

-- Update JWT metadata in auth.users
UPDATE auth.users
SET raw_app_meta_data = jsonb_set(
  jsonb_set(
    COALESCE(raw_app_meta_data, '{}'::jsonb),
    '{role}',
    '"platform_admin"'::jsonb
  ),
  '{org_id}',
  'null'::jsonb
)
WHERE email = 'sabineresoagli@gmail.com';

-- Remove org_slug from JWT (platform admins don't have one)
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data - 'org_slug'
WHERE email = 'sabineresoagli@gmail.com';

-- Add comment for documentation
COMMENT ON TABLE profiles IS 'Platform admin (sabineresoagli@gmail.com) has role=platform_admin and no org_id';
