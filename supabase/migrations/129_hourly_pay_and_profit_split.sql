-- Migration 129: Hourly Pay Model + 4-Way Profit Split
-- Replaces the % payout model (junior/senior/lead tiers) with:
--   1. Medic pay = hourly_rate × hours worked (rate set manually by admin)
--   2. Mileage reimbursement (HMRC 45p/mile) — unchanged
--   3. Referral commission (10% of pre-VAT subtotal) — unchanged
--   4. Remaining net split equally 4 ways:
--        ¼ Sabine / ¼ Kai / ¼ operational costs / ¼ equipment/emergency
--
-- Old bookings keep pay_model = 'percentage'; new bookings default to 'hourly'.
-- All old % columns are preserved for backward compatibility.

-- ============================================================
-- 1a. Add new columns to medics
-- ============================================================

ALTER TABLE medics
  ADD COLUMN IF NOT EXISTS classification TEXT
    CHECK (classification IN (
      'first_aider', 'eca', 'efr', 'emt', 'aap',
      'paramedic', 'specialist_paramedic', 'critical_care_paramedic',
      'registered_nurse', 'doctor'
    )),
  ADD COLUMN IF NOT EXISTS years_experience INT NOT NULL DEFAULT 0
    CHECK (years_experience >= 0),
  ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS hourly_rate_override BOOLEAN NOT NULL DEFAULT FALSE;

-- Map existing experience_level to classification for current medics
UPDATE medics SET classification =
  CASE experience_level
    WHEN 'junior' THEN 'first_aider'
    WHEN 'senior' THEN 'paramedic'
    WHEN 'lead'   THEN 'specialist_paramedic'
  END
WHERE classification IS NULL AND experience_level IS NOT NULL;

-- ============================================================
-- 1b. Add new columns to bookings
-- ============================================================

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS pay_model TEXT NOT NULL DEFAULT 'percentage'
    CHECK (pay_model IN ('percentage', 'hourly')),
  ADD COLUMN IF NOT EXISTS medic_hourly_rate DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS medic_pay DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS net_after_costs DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS sabine_share DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS kai_share DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS operational_bucket_amount DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS reserve_bucket_amount DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS split_calculated_at TIMESTAMPTZ;

-- ============================================================
-- 1c. New table: apex_partners
-- Tracks Sabine and Kai's cumulative earned / paid balances.
-- ============================================================

CREATE TABLE IF NOT EXISTS apex_partners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  share_fraction DECIMAL(5,4) NOT NULL DEFAULT 0.25,
  total_earned DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total_paid_out DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  balance DECIMAL(12,2) GENERATED ALWAYS AS (total_earned - total_paid_out) STORED,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Sabine and Kai (update emails via admin after deploy)
INSERT INTO apex_partners (name, email, share_fraction) VALUES
  ('Sabine', 'sabine@placeholder.com', 0.25),
  ('Kai',    'kai@placeholder.com',    0.25)
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- 1d. New table: expense_buckets
-- Running totals for the two non-partner buckets (apex + app revenue).
-- ============================================================

CREATE TABLE IF NOT EXISTS expense_buckets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bucket_type TEXT NOT NULL CHECK (bucket_type IN ('operational', 'reserve')),
  source TEXT NOT NULL DEFAULT 'apex' CHECK (source IN ('apex', 'app')),
  label TEXT NOT NULL,
  total_in DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total_out DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  balance DECIMAL(12,2) GENERATED ALWAYS AS (total_in - total_out) STORED,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(bucket_type, source)
);

INSERT INTO expense_buckets (bucket_type, source, label) VALUES
  ('operational', 'apex', 'Operational Costs'),
  ('reserve',     'apex', 'Equipment / Emergency Fund'),
  ('operational', 'app',  'App Operational Costs'),
  ('reserve',     'app',  'Ads / Marketing / Growth')
ON CONFLICT (bucket_type, source) DO NOTHING;

-- ============================================================
-- 1e. New table: profit_splits
-- Per-booking record of the 4-way split (created when booking is paid).
-- ============================================================

CREATE TABLE IF NOT EXISTS profit_splits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
  source TEXT NOT NULL DEFAULT 'apex' CHECK (source IN ('apex', 'app')),

  gross_revenue DECIMAL(10,2) NOT NULL,
  medic_pay DECIMAL(10,2) NOT NULL DEFAULT 0,
  mileage_reimbursement DECIMAL(10,2) NOT NULL DEFAULT 0,
  referral_commission DECIMAL(10,2) NOT NULL DEFAULT 0,
  net DECIMAL(10,2) NOT NULL,

  sabine_amount DECIMAL(10,2) NOT NULL,
  kai_amount DECIMAL(10,2) NOT NULL,
  operational_amount DECIMAL(10,2) NOT NULL,
  reserve_amount DECIMAL(10,2) NOT NULL,

  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'distributed')),
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  distributed_at TIMESTAMPTZ,

  CONSTRAINT unique_booking_split UNIQUE(booking_id)
);

-- ============================================================
-- RLS: apex_partners (platform admin only)
-- ============================================================
ALTER TABLE apex_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_admin_apex_partners" ON apex_partners
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.role = 'platform_admin'
    )
  );

-- ============================================================
-- RLS: expense_buckets (platform admin only)
-- ============================================================
ALTER TABLE expense_buckets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_admin_expense_buckets" ON expense_buckets
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.role = 'platform_admin'
    )
  );

-- ============================================================
-- RLS: profit_splits (platform admin only)
-- ============================================================
ALTER TABLE profit_splits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_admin_profit_splits" ON profit_splits
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.role = 'platform_admin'
    )
  );
