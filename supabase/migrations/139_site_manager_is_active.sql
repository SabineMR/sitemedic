-- Migration 139: Add is_active flag to profiles
-- Used to distinguish active vs inactive site managers (and other users).
-- Active = currently working with us on a project.
-- Inactive = worked with in the past, not on a current project (not fired, just not currently engaged).
-- Follows the same pattern as is_active on geofences, shift_templates, site_beacons.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
COMMENT ON COLUMN profiles.is_active IS 'Whether user is currently active (used primarily for site managers)';
