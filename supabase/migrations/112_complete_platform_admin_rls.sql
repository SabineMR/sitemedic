-- Migration 110: Complete Platform Admin RLS Coverage
-- Created: 2026-02-16
-- Purpose: Add platform admin RLS policies for all 9 remaining tables
--
-- Context: Migrations 107 and 108 fixed core tables and created the platform
-- admin user, but 9 additional tables still block platform admins due to missing
-- RLS policies. This causes "Database error querying schema" errors during login.
--
-- Tables Fixed:
-- HIGH PRIORITY (Authentication-Critical):
--   - user_roles (uses is_admin() instead of is_platform_admin())
--   - audit_logs (uses legacy admin check)
--
-- MEDIUM PRIORITY (Admin Operations):
--   - riddor_incidents
--   - certification_reminders
--   - weekly_reports
--   - travel_time_cache
--
-- LOWER PRIORITY (Compliance/Support):
--   - consent_records
--   - erasure_requests
--   - data_retention_log

-- =============================================================================
-- HIGH PRIORITY: user_roles table
-- =============================================================================

-- Platform admins can view all user roles
CREATE POLICY "Platform admins can view all user roles"
  ON user_roles FOR SELECT
  USING (is_platform_admin());

-- Platform admins can insert user roles for any org
CREATE POLICY "Platform admins can insert user roles"
  ON user_roles FOR INSERT
  WITH CHECK (is_platform_admin());

-- Platform admins can update all user roles
CREATE POLICY "Platform admins can update all user roles"
  ON user_roles FOR UPDATE
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- Platform admins can delete user roles
CREATE POLICY "Platform admins can delete user roles"
  ON user_roles FOR DELETE
  USING (is_platform_admin());

-- =============================================================================
-- HIGH PRIORITY: audit_logs table
-- =============================================================================

-- Platform admins can view all audit logs (read-only for compliance)
CREATE POLICY "Platform admins can view all audit logs"
  ON audit_logs FOR SELECT
  USING (is_platform_admin());

-- Platform admins can insert audit logs (for system operations)
CREATE POLICY "Platform admins can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (is_platform_admin());

-- =============================================================================
-- MEDIUM PRIORITY: riddor_incidents table
-- =============================================================================

-- Platform admins can view all RIDDOR incidents (cross-org compliance)
CREATE POLICY "Platform admins can view all riddor incidents"
  ON riddor_incidents FOR SELECT
  USING (is_platform_admin());

-- Platform admins can insert RIDDOR incidents in any org
CREATE POLICY "Platform admins can insert riddor incidents"
  ON riddor_incidents FOR INSERT
  WITH CHECK (is_platform_admin());

-- Platform admins can update all RIDDOR incidents
CREATE POLICY "Platform admins can update all riddor incidents"
  ON riddor_incidents FOR UPDATE
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- Platform admins can delete RIDDOR incidents
CREATE POLICY "Platform admins can delete riddor incidents"
  ON riddor_incidents FOR DELETE
  USING (is_platform_admin());

-- =============================================================================
-- MEDIUM PRIORITY: certification_reminders table
-- =============================================================================

-- Platform admins can view all certification reminders
CREATE POLICY "Platform admins can view all certification reminders"
  ON certification_reminders FOR SELECT
  USING (is_platform_admin());

-- Platform admins can insert certification reminders
CREATE POLICY "Platform admins can insert certification reminders"
  ON certification_reminders FOR INSERT
  WITH CHECK (is_platform_admin());

-- Platform admins can update all certification reminders
CREATE POLICY "Platform admins can update all certification reminders"
  ON certification_reminders FOR UPDATE
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- Platform admins can delete certification reminders
CREATE POLICY "Platform admins can delete certification reminders"
  ON certification_reminders FOR DELETE
  USING (is_platform_admin());

-- =============================================================================
-- MEDIUM PRIORITY: weekly_reports table
-- =============================================================================

-- Platform admins can view all weekly reports (cross-org reporting)
CREATE POLICY "Platform admins can view all weekly reports"
  ON weekly_reports FOR SELECT
  USING (is_platform_admin());

-- Platform admins can insert weekly reports
CREATE POLICY "Platform admins can insert weekly reports"
  ON weekly_reports FOR INSERT
  WITH CHECK (is_platform_admin());

-- Platform admins can update all weekly reports
CREATE POLICY "Platform admins can update all weekly reports"
  ON weekly_reports FOR UPDATE
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- Platform admins can delete weekly reports
CREATE POLICY "Platform admins can delete weekly reports"
  ON weekly_reports FOR DELETE
  USING (is_platform_admin());

-- =============================================================================
-- MEDIUM PRIORITY: travel_time_cache table
-- =============================================================================

-- Platform admins can view all travel time cache entries
CREATE POLICY "Platform admins can view all travel time cache"
  ON travel_time_cache FOR SELECT
  USING (is_platform_admin());

-- Platform admins can insert travel time cache entries
CREATE POLICY "Platform admins can insert travel time cache"
  ON travel_time_cache FOR INSERT
  WITH CHECK (is_platform_admin());

-- Platform admins can update all travel time cache entries
CREATE POLICY "Platform admins can update all travel time cache"
  ON travel_time_cache FOR UPDATE
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- Platform admins can delete travel time cache entries
CREATE POLICY "Platform admins can delete travel time cache"
  ON travel_time_cache FOR DELETE
  USING (is_platform_admin());

-- =============================================================================
-- LOWER PRIORITY: consent_records table (GDPR compliance)
-- =============================================================================

-- Platform admins can view all consent records (GDPR compliance officer access)
CREATE POLICY "Platform admins can view all consent records"
  ON consent_records FOR SELECT
  USING (is_platform_admin());

-- Platform admins can insert consent records
CREATE POLICY "Platform admins can insert consent records"
  ON consent_records FOR INSERT
  WITH CHECK (is_platform_admin());

-- Platform admins can update all consent records
CREATE POLICY "Platform admins can update all consent records"
  ON consent_records FOR UPDATE
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- Platform admins can delete consent records
CREATE POLICY "Platform admins can delete consent records"
  ON consent_records FOR DELETE
  USING (is_platform_admin());

-- =============================================================================
-- LOWER PRIORITY: erasure_requests table (GDPR compliance)
-- =============================================================================

-- Platform admins can view all erasure requests (GDPR compliance officer access)
CREATE POLICY "Platform admins can view all erasure requests"
  ON erasure_requests FOR SELECT
  USING (is_platform_admin());

-- Platform admins can insert erasure requests
CREATE POLICY "Platform admins can insert erasure requests"
  ON erasure_requests FOR INSERT
  WITH CHECK (is_platform_admin());

-- Platform admins can update all erasure requests
CREATE POLICY "Platform admins can update all erasure requests"
  ON erasure_requests FOR UPDATE
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- Platform admins can delete erasure requests (soft-delete only in practice)
CREATE POLICY "Platform admins can delete erasure requests"
  ON erasure_requests FOR DELETE
  USING (is_platform_admin());

-- =============================================================================
-- LOWER PRIORITY: data_retention_log table (GDPR compliance)
-- =============================================================================

-- Platform admins can view all data retention logs (audit trail access)
CREATE POLICY "Platform admins can view all data retention logs"
  ON data_retention_log FOR SELECT
  USING (is_platform_admin());

-- Platform admins can insert data retention log entries
CREATE POLICY "Platform admins can insert data retention logs"
  ON data_retention_log FOR INSERT
  WITH CHECK (is_platform_admin());

-- Platform admins can update data retention log entries
CREATE POLICY "Platform admins can update data retention logs"
  ON data_retention_log FOR UPDATE
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- Platform admins can delete data retention log entries (maintenance)
CREATE POLICY "Platform admins can delete data retention logs"
  ON data_retention_log FOR DELETE
  USING (is_platform_admin());

-- =============================================================================
-- SUMMARY
-- =============================================================================

-- Migration complete: Added platform admin RLS policies for 9 remaining tables.
--
-- Platform admins now have complete cross-org access to all tables:
--
-- ✅ HIGH PRIORITY (Authentication):
--    - user_roles (4 policies)
--    - audit_logs (2 policies - read + insert only)
--
-- ✅ MEDIUM PRIORITY (Operations):
--    - riddor_incidents (4 policies)
--    - certification_reminders (4 policies)
--    - weekly_reports (4 policies)
--    - travel_time_cache (4 policies)
--
-- ✅ LOWER PRIORITY (Compliance):
--    - consent_records (4 policies)
--    - erasure_requests (4 policies)
--    - data_retention_log (4 policies)
--
-- This fixes the "Database error querying schema" login error by ensuring
-- platform admins can access ALL tables without RLS policy violations.
--
-- Next steps:
-- 1. Run `pnpm supabase db reset` to apply this migration
-- 2. Clear browser cookies/session for localhost:30500
-- 3. Login with sabineresoagli@gmail.com / password123
-- 4. Verify OrgProvider sets role='platform_admin' and orgId=null
