-- Migration 163: Marketplace Admin Settings + Audit
-- Phase 39: Admin Dashboard - Plan 03
-- Created: 2026-02-21
-- Purpose: Centralize configurable marketplace defaults with auditable changes

CREATE TABLE marketplace_admin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton_key TEXT NOT NULL DEFAULT 'marketplace' UNIQUE CHECK (singleton_key = 'marketplace'),
  default_commission_percent NUMERIC(5,2) NOT NULL DEFAULT 60.00 CHECK (default_commission_percent >= 0 AND default_commission_percent <= 100),
  default_deposit_percent INT NOT NULL DEFAULT 25 CHECK (default_deposit_percent >= 1 AND default_deposit_percent <= 100),
  default_quote_deadline_hours INT NOT NULL DEFAULT 72 CHECK (default_quote_deadline_hours >= 1 AND default_quote_deadline_hours <= 720),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE marketplace_admin_settings IS 'Singleton configuration for marketplace commission/deposit/deadline defaults';

CREATE TABLE marketplace_admin_settings_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settings_id UUID NOT NULL REFERENCES marketplace_admin_settings(id) ON DELETE CASCADE,
  before_values JSONB NOT NULL,
  after_values JSONB NOT NULL,
  reason TEXT NOT NULL,
  changed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE marketplace_admin_settings_audit IS 'Audit log for marketplace default-setting changes';

CREATE INDEX idx_marketplace_admin_settings_audit_changed_at_desc
  ON marketplace_admin_settings_audit(changed_at DESC);

CREATE INDEX idx_marketplace_admin_settings_audit_changed_by
  ON marketplace_admin_settings_audit(changed_by);

INSERT INTO marketplace_admin_settings (
  singleton_key,
  default_commission_percent,
  default_deposit_percent,
  default_quote_deadline_hours
) VALUES (
  'marketplace',
  60.00,
  25,
  72
)
ON CONFLICT (singleton_key) DO NOTHING;

ALTER TABLE marketplace_admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_admin_settings_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_admin_read_marketplace_settings"
  ON marketplace_admin_settings FOR SELECT
  USING (is_platform_admin());

CREATE POLICY "platform_admin_insert_marketplace_settings"
  ON marketplace_admin_settings FOR INSERT
  WITH CHECK (is_platform_admin());

CREATE POLICY "platform_admin_update_marketplace_settings"
  ON marketplace_admin_settings FOR UPDATE
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

CREATE POLICY "platform_admin_read_marketplace_settings_audit"
  ON marketplace_admin_settings_audit FOR SELECT
  USING (is_platform_admin());

CREATE POLICY "platform_admin_insert_marketplace_settings_audit"
  ON marketplace_admin_settings_audit FOR INSERT
  WITH CHECK (is_platform_admin());
