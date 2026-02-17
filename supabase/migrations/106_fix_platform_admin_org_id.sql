-- Migration 104: Fix Platform Admin org_id Constraint
-- Created: 2026-02-16
-- Purpose: Make org_id nullable for platform admins
--
-- Problem: The profiles.org_id column has a NOT NULL constraint, but platform
-- admins don't belong to a specific organization (they manage ALL orgs).
-- This migration removes the NOT NULL constraint and properly configures
-- the platform admin user.

-- Step 1: Make org_id nullable in profiles table
-- (Platform admins will have NULL org_id, other users will have a valid org_id)
ALTER TABLE profiles
  ALTER COLUMN org_id DROP NOT NULL;

COMMENT ON COLUMN profiles.org_id IS 'Organization ID (NULL for platform_admin, required for other roles)';

-- Step 2: Set platform admin org_id to NULL in profiles
UPDATE profiles
SET org_id = NULL
WHERE role = 'platform_admin';

-- Step 3: Ensure JWT metadata is correct for platform admin
-- Remove org_id and org_slug from JWT (platform admins don't have these)
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data - 'org_id' - 'org_slug'
WHERE id IN (
  SELECT id FROM profiles WHERE role = 'platform_admin'
);

-- Step 4: Add a check constraint to ensure data integrity
-- Platform admins must have NULL org_id, other roles must have non-NULL org_id
ALTER TABLE profiles
  ADD CONSTRAINT check_org_id_for_role CHECK (
    (role = 'platform_admin' AND org_id IS NULL) OR
    (role != 'platform_admin' AND org_id IS NOT NULL)
  );

COMMENT ON CONSTRAINT check_org_id_for_role ON profiles IS
  'Platform admins must have NULL org_id; all other roles must have a valid org_id';
