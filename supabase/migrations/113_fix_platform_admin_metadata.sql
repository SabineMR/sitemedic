-- Migration 111: Fix Platform Admin Metadata
-- Created: 2026-02-16
-- Purpose: Ensure platform admin user has correct raw_app_meta_data
--
-- Problem: Migration 108 creates the user but raw_app_meta_data ends up empty.
-- This happens because either:
-- 1. The JSONB literal in the INSERT doesn't persist correctly
-- 2. Another process clears the metadata after insert
-- 3. The ON CONFLICT UPDATE doesn't preserve the values
--
-- Solution: Explicitly UPDATE the metadata after user creation to ensure it's set.

-- Update the platform admin user's app metadata
UPDATE auth.users
SET raw_app_meta_data = jsonb_build_object(
  'provider', 'email',
  'providers', jsonb_build_array('email'),
  'role', 'platform_admin'
)
WHERE email = 'sabineresoagli@gmail.com';

-- Verify the update
DO $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT raw_app_meta_data->>'role' INTO user_role
  FROM auth.users
  WHERE email = 'sabineresoagli@gmail.com';

  IF user_role = 'platform_admin' THEN
    RAISE NOTICE '✅ Platform admin metadata verified: role = %', user_role;
  ELSE
    RAISE WARNING '⚠️  Platform admin metadata issue: role = % (expected: platform_admin)', user_role;
  END IF;
END $$;

-- =============================================================================
-- SUMMARY
-- =============================================================================

-- This migration ensures that the platform admin user (sabineresoagli@gmail.com)
-- has the correct raw_app_meta_data set, which is critical for JWT token generation.
--
-- The JWT token must include app_metadata.role = 'platform_admin' for the
-- OrgProvider to correctly identify the user as a platform admin and skip the
-- organization query.
--
-- Without this metadata in the JWT:
-- - Login fails with "Database error querying schema"
-- - User cannot access any pages
-- - RLS policies block access even though they exist
