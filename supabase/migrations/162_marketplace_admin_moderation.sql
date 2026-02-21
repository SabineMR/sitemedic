-- Migration 162: Marketplace Admin Moderation Auditability
-- Phase 39: Admin Dashboard - Plan 02
-- Created: 2026-02-21
-- Purpose: Add immutable moderation audit trail for platform-admin user actions

CREATE TABLE marketplace_user_moderation_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  target_role TEXT,
  action TEXT NOT NULL CHECK (action IN ('suspend', 'ban', 'reinstate')),
  reason TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  performed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE marketplace_user_moderation_audit IS 'Immutable audit trail for marketplace moderation actions executed by platform admins';
COMMENT ON COLUMN marketplace_user_moderation_audit.action IS 'Moderation action value: suspend, ban, reinstate';
COMMENT ON COLUMN marketplace_user_moderation_audit.metadata IS 'Additional structured context about moderation side effects';

CREATE INDEX idx_marketplace_user_moderation_target_user
  ON marketplace_user_moderation_audit(target_user_id);

CREATE INDEX idx_marketplace_user_moderation_performed_at_desc
  ON marketplace_user_moderation_audit(performed_at DESC);

ALTER TABLE marketplace_user_moderation_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_admin_read_moderation_audit"
  ON marketplace_user_moderation_audit FOR SELECT
  USING (is_platform_admin());

CREATE POLICY "platform_admin_insert_moderation_audit"
  ON marketplace_user_moderation_audit FOR INSERT
  WITH CHECK (is_platform_admin());

CREATE OR REPLACE FUNCTION prevent_marketplace_user_moderation_audit_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'marketplace_user_moderation_audit is immutable';
END;
$$;

CREATE TRIGGER lock_marketplace_user_moderation_audit
  BEFORE UPDATE OR DELETE ON marketplace_user_moderation_audit
  FOR EACH ROW EXECUTE FUNCTION prevent_marketplace_user_moderation_audit_mutation();
