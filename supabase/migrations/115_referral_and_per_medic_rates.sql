-- Migration 115: Referral system + per-medic revenue split
-- Adds:
--   1. Per-medic platform_fee_percent / medic_payout_percent (variable per employee)
--   2. Referral fields on bookings (is_referral, referred_by, referral_payout_percent,
--      referral_payout_amount, platform_net)
-- Created: 2026-02-17

-- =============================================================================
-- 1. Per-medic revenue split on medics table
-- Default: platform 60% / medic 40% (matches DEFAULT_PLATFORM_FEE_PERCENT env var)
-- These can be edited per-medic in the admin dashboard to negotiate different rates
-- =============================================================================
ALTER TABLE medics
  ADD COLUMN IF NOT EXISTS platform_fee_percent  DECIMAL(5,2) NOT NULL DEFAULT 60.00,
  ADD COLUMN IF NOT EXISTS medic_payout_percent  DECIMAL(5,2) NOT NULL DEFAULT 40.00;

ALTER TABLE medics
  ADD CONSTRAINT medic_rate_split_check
    CHECK (
      platform_fee_percent >= 0
      AND medic_payout_percent >= 0
      AND ABS((platform_fee_percent + medic_payout_percent) - 100) < 0.01
    );

COMMENT ON COLUMN medics.platform_fee_percent IS
  'Percentage of booking total kept by SiteMedic. Default 60. Overrides the DEFAULT_PLATFORM_FEE_PERCENT env var for this specific medic.';
COMMENT ON COLUMN medics.medic_payout_percent IS
  'Percentage of booking total paid to this medic. Default 40. Must sum to 100 with platform_fee_percent.';

-- =============================================================================
-- 2. Referral fields on bookings table
-- is_referral    — was this job recommended by a third party who could not take it?
-- referred_by    — name / company of the referrer (free text for now)
-- referral_payout_percent — rate at time of booking (snapshot, not live env var)
-- referral_payout_amount  — calculated: total × referral_payout_percent / 100
-- platform_net            — platform_fee − referral_payout_amount (what SiteMedic nets)
-- =============================================================================
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS is_referral              BOOLEAN       NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS referred_by              TEXT,
  ADD COLUMN IF NOT EXISTS referral_payout_percent  DECIMAL(5,2)  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referral_payout_amount   DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS platform_net             DECIMAL(10,2);

-- Back-fill platform_net for existing rows (= platform_fee, no referral)
UPDATE bookings SET platform_net = platform_fee WHERE platform_net IS NULL;

ALTER TABLE bookings ALTER COLUMN platform_net SET NOT NULL;
ALTER TABLE bookings ALTER COLUMN platform_net SET DEFAULT 0;

-- Ensure referred_by is only set when is_referral is true
ALTER TABLE bookings
  ADD CONSTRAINT referral_consistency_check
    CHECK (is_referral = TRUE OR referred_by IS NULL);

-- Ensure referral payout never exceeds the platform fee
ALTER TABLE bookings
  ADD CONSTRAINT referral_payout_within_platform_fee
    CHECK (referral_payout_amount <= platform_fee);

COMMENT ON COLUMN bookings.is_referral IS
  'TRUE when this job was recommended by someone who could not take it themselves.';
COMMENT ON COLUMN bookings.referred_by IS
  'Name or company of the referring party. Only populated when is_referral = TRUE.';
COMMENT ON COLUMN bookings.referral_payout_percent IS
  'Snapshot of REFERRAL_PAYOUT_PERCENT at booking creation time (default 10%). Stored so rate changes do not affect historical records.';
COMMENT ON COLUMN bookings.referral_payout_amount IS
  'GBP amount owed to the referrer: total × referral_payout_percent / 100. Comes from the platform fee, not the medic payout.';
COMMENT ON COLUMN bookings.platform_net IS
  'What SiteMedic actually keeps: platform_fee − referral_payout_amount.';

-- Index for reporting (find all referral bookings quickly)
CREATE INDEX IF NOT EXISTS idx_bookings_is_referral ON bookings(is_referral) WHERE is_referral = TRUE;
