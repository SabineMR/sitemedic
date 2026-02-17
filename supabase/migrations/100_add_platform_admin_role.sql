-- Migration 031: Add Platform Admin Role (Part 1 - Enum Values)
-- Created: 2026-02-16
-- Purpose: Add new enum values for role-based admin separation
--
-- NOTE: PostgreSQL requires enum additions to be in a separate transaction
-- from using those values, so this migration ONLY adds the enum values.
-- Data migration happens in 033.

-- =============================================================================
-- Add new role values to the enum
-- =============================================================================

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'org_admin';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'platform_admin';

COMMENT ON TYPE user_role IS 'User roles: medic, site_manager, admin (deprecated), org_admin, platform_admin';
