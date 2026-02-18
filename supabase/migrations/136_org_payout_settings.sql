-- Migration 136: Org Payout Settings
-- Adds configurable mileage reimbursement and referral commission settings per org.
-- Previously mileage was hardcoded at HMRC 45p/mile and referral was locked at 10% env var.

ALTER TABLE org_settings
  ADD COLUMN IF NOT EXISTS mileage_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS mileage_rate_pence INTEGER NOT NULL DEFAULT 45
    CHECK (mileage_rate_pence >= 0 AND mileage_rate_pence <= 200),
  ADD COLUMN IF NOT EXISTS referral_commission_percent DECIMAL(5,2) NOT NULL DEFAULT 10.00
    CHECK (referral_commission_percent >= 0 AND referral_commission_percent <= 100);

COMMENT ON COLUMN org_settings.mileage_enabled IS 'Whether org reimburses medics for mileage';
COMMENT ON COLUMN org_settings.mileage_rate_pence IS 'Pence per mile (HMRC guideline: 45p)';
COMMENT ON COLUMN org_settings.referral_commission_percent IS 'Referral payout % of pre-VAT subtotal';
