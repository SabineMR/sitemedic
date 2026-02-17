-- Migration 107: Platform Admin RLS Policies for Core Tables
-- Created: 2026-02-16
-- Purpose: Add platform admin policies for core tables (profiles, workers, etc.)
--
-- Problem: Migration 102 added platform admin policies for business tables,
-- but missed core tables like profiles, workers, treatments, etc. This causes
-- login errors because platform admins can't read the profiles table.

-- =============================================================================
-- PROFILES TABLE - Platform Admin Policies
-- =============================================================================

-- Platform admins can view all profiles (cross-org access)
CREATE POLICY "Platform admins can view all profiles"
  ON profiles FOR SELECT
  USING (is_platform_admin());

-- Platform admins can update all profiles
CREATE POLICY "Platform admins can update all profiles"
  ON profiles FOR UPDATE
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- Platform admins can insert profiles in any org
CREATE POLICY "Platform admins can insert profiles in any org"
  ON profiles FOR INSERT
  WITH CHECK (is_platform_admin());

-- Platform admins can delete profiles
CREATE POLICY "Platform admins can delete profiles"
  ON profiles FOR DELETE
  USING (is_platform_admin());

-- =============================================================================
-- WORKERS TABLE - Platform Admin Policies
-- =============================================================================

CREATE POLICY "Platform admins can view all workers"
  ON workers FOR SELECT
  USING (is_platform_admin());

CREATE POLICY "Platform admins can insert workers in any org"
  ON workers FOR INSERT
  WITH CHECK (is_platform_admin());

CREATE POLICY "Platform admins can update all workers"
  ON workers FOR UPDATE
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

CREATE POLICY "Platform admins can delete all workers"
  ON workers FOR DELETE
  USING (is_platform_admin());

-- =============================================================================
-- TREATMENTS TABLE - Platform Admin Policies
-- =============================================================================

CREATE POLICY "Platform admins can view all treatments"
  ON treatments FOR SELECT
  USING (is_platform_admin());

CREATE POLICY "Platform admins can insert treatments in any org"
  ON treatments FOR INSERT
  WITH CHECK (is_platform_admin());

CREATE POLICY "Platform admins can update all treatments"
  ON treatments FOR UPDATE
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

CREATE POLICY "Platform admins can delete all treatments"
  ON treatments FOR DELETE
  USING (is_platform_admin());

-- =============================================================================
-- NEAR_MISSES TABLE - Platform Admin Policies
-- =============================================================================

CREATE POLICY "Platform admins can view all near-misses"
  ON near_misses FOR SELECT
  USING (is_platform_admin());

CREATE POLICY "Platform admins can insert near-misses in any org"
  ON near_misses FOR INSERT
  WITH CHECK (is_platform_admin());

CREATE POLICY "Platform admins can update all near-misses"
  ON near_misses FOR UPDATE
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

CREATE POLICY "Platform admins can delete all near-misses"
  ON near_misses FOR DELETE
  USING (is_platform_admin());

-- =============================================================================
-- SAFETY_CHECKS TABLE - Platform Admin Policies
-- =============================================================================

CREATE POLICY "Platform admins can view all safety checks"
  ON safety_checks FOR SELECT
  USING (is_platform_admin());

CREATE POLICY "Platform admins can insert safety checks in any org"
  ON safety_checks FOR INSERT
  WITH CHECK (is_platform_admin());

CREATE POLICY "Platform admins can update all safety checks"
  ON safety_checks FOR UPDATE
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

CREATE POLICY "Platform admins can delete all safety checks"
  ON safety_checks FOR DELETE
  USING (is_platform_admin());

-- =============================================================================
-- SUMMARY
-- =============================================================================

-- Migration complete: Added platform admin RLS policies for core tables.
-- Platform admins can now access profiles, workers, treatments, near_misses,
-- and safety_checks across all organizations.
--
-- This fixes the login error "Database error querying schema" by allowing
-- platform admins to read the profiles table during authentication.
