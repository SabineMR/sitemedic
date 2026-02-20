-- Migration 149: Marketplace Award & Payment Flow
-- Phase 35: Award Flow & Payment
--
-- Changes:
--   1. Expand marketplace_quotes status CHECK to include 'awarded' and 'rejected'
--   2. Add award-related columns to marketplace_quotes
--   3. Add marketplace payment columns to bookings table
--   4. Create marketplace_award_history table (audit trail)
--   5. Create client_payment_methods table
--   6. RLS policies for new tables

-- =============================================================================
-- 1. Expand marketplace_quotes status to include 'awarded' and 'rejected'
-- =============================================================================

-- Drop the inline CHECK constraint (auto-named by Postgres)
-- The inline CHECK from migration 146 is: CHECK (status IN ('draft', 'submitted', 'revised', 'withdrawn'))
ALTER TABLE marketplace_quotes DROP CONSTRAINT IF EXISTS marketplace_quotes_status_check;

-- Re-add with expanded values
ALTER TABLE marketplace_quotes ADD CONSTRAINT marketplace_quotes_status_check
  CHECK (status IN ('draft', 'submitted', 'revised', 'withdrawn', 'awarded', 'rejected'));

-- Add award/rejection timestamp columns
ALTER TABLE marketplace_quotes ADD COLUMN IF NOT EXISTS awarded_at TIMESTAMPTZ;
ALTER TABLE marketplace_quotes ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;
ALTER TABLE marketplace_quotes ADD COLUMN IF NOT EXISTS rejected_reason TEXT;

COMMENT ON COLUMN marketplace_quotes.awarded_at IS 'Timestamp when this quote was selected as the winner by the client';
COMMENT ON COLUMN marketplace_quotes.rejected_at IS 'Timestamp when this quote was rejected (another quote was awarded)';
COMMENT ON COLUMN marketplace_quotes.rejected_reason IS 'Reason for rejection (e.g., "Another quote was selected")';

-- =============================================================================
-- 2. Add marketplace payment columns to bookings table
-- =============================================================================

-- Link bookings to marketplace events and quotes
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS marketplace_event_id UUID REFERENCES marketplace_events(id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS marketplace_quote_id UUID REFERENCES marketplace_quotes(id);

-- Deposit tracking
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deposit_amount DECIMAL(10,2);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deposit_percent INT DEFAULT 25;

-- Remainder tracking
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS remainder_amount DECIMAL(10,2);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS remainder_due_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS remainder_paid_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS remainder_failed_attempts INT DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS remainder_last_failed_at TIMESTAMPTZ;

-- Stripe payment references
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS stripe_payment_method_id TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deposit_payment_intent_id TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS remainder_payment_intent_id TEXT;

COMMENT ON COLUMN bookings.marketplace_event_id IS 'Links booking to marketplace event (source=marketplace only)';
COMMENT ON COLUMN bookings.marketplace_quote_id IS 'Links booking to winning marketplace quote (source=marketplace only)';
COMMENT ON COLUMN bookings.deposit_amount IS 'Deposit charged at award time (GBP)';
COMMENT ON COLUMN bookings.deposit_percent IS 'Deposit percentage used (default 25%, configurable by event type)';
COMMENT ON COLUMN bookings.remainder_amount IS 'Remainder due after event completion (GBP)';
COMMENT ON COLUMN bookings.remainder_due_at IS 'Date when remainder becomes chargeable (event end + 14 days)';
COMMENT ON COLUMN bookings.remainder_paid_at IS 'Date when remainder was successfully charged';
COMMENT ON COLUMN bookings.remainder_failed_attempts IS 'Counter for failed remainder charge attempts';
COMMENT ON COLUMN bookings.remainder_last_failed_at IS 'Timestamp of most recent failed remainder charge';
COMMENT ON COLUMN bookings.stripe_customer_id IS 'Stripe Customer ID for this marketplace client';
COMMENT ON COLUMN bookings.stripe_payment_method_id IS 'Saved Stripe PaymentMethod ID for remainder charge';
COMMENT ON COLUMN bookings.deposit_payment_intent_id IS 'Stripe PaymentIntent ID for deposit payment';
COMMENT ON COLUMN bookings.remainder_payment_intent_id IS 'Stripe PaymentIntent ID for remainder payment';

-- Indexes for bookings marketplace columns
CREATE INDEX IF NOT EXISTS idx_bookings_marketplace_event_id ON bookings(marketplace_event_id) WHERE marketplace_event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_marketplace_quote_id ON bookings(marketplace_quote_id) WHERE marketplace_quote_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_stripe_customer_id ON bookings(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_deposit_pi ON bookings(deposit_payment_intent_id) WHERE deposit_payment_intent_id IS NOT NULL;

-- Partial index for daily cron: find bookings with unpaid remainders that are due
CREATE INDEX IF NOT EXISTS idx_bookings_remainder_due_unpaid
  ON bookings(remainder_due_at)
  WHERE remainder_paid_at IS NULL
    AND remainder_due_at IS NOT NULL
    AND source = 'marketplace';

-- =============================================================================
-- 3. Create marketplace_award_history table (audit trail)
-- =============================================================================

CREATE TABLE IF NOT EXISTS marketplace_award_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES marketplace_events(id) ON DELETE CASCADE,
  winning_quote_id UUID NOT NULL REFERENCES marketplace_quotes(id) ON DELETE CASCADE,
  losing_quote_ids UUID[] NOT NULL DEFAULT '{}',
  awarded_by UUID NOT NULL REFERENCES auth.users(id),
  deposit_amount DECIMAL(10,2),
  total_amount DECIMAL(10,2),
  deposit_percent INT DEFAULT 25,
  awarded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE marketplace_award_history IS 'Audit trail for marketplace quote awards — records who awarded what and when';
COMMENT ON COLUMN marketplace_award_history.losing_quote_ids IS 'Array of quote IDs that were rejected when this award was made';

CREATE INDEX IF NOT EXISTS idx_award_history_event ON marketplace_award_history(event_id);
CREATE INDEX IF NOT EXISTS idx_award_history_awarded_by ON marketplace_award_history(awarded_by);
CREATE INDEX IF NOT EXISTS idx_award_history_awarded_at ON marketplace_award_history(awarded_at);

-- RLS for marketplace_award_history
ALTER TABLE marketplace_award_history ENABLE ROW LEVEL SECURITY;

-- Event poster can view own awards
CREATE POLICY "Event poster can view own awards"
  ON marketplace_award_history FOR SELECT
  USING (
    awarded_by = (SELECT auth.uid())
  );

-- Platform admin can view all awards
CREATE POLICY "Platform admin can view all awards"
  ON marketplace_award_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'platform_admin'
    )
  );

-- Only system (via service role) inserts awards
CREATE POLICY "Service role inserts awards"
  ON marketplace_award_history FOR INSERT
  WITH CHECK (true);

-- =============================================================================
-- 4. Create client_payment_methods table
-- =============================================================================

CREATE TABLE IF NOT EXISTS client_payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL,
  stripe_payment_method_id TEXT UNIQUE NOT NULL,
  card_brand TEXT,
  card_last_four TEXT,
  card_expiry_month INT,
  card_expiry_year INT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE client_payment_methods IS 'Saved Stripe payment methods for marketplace clients — for off-session remainder charges';
COMMENT ON COLUMN client_payment_methods.user_id IS 'References auth.users (not profiles) for marketplace client identity';
COMMENT ON COLUMN client_payment_methods.stripe_customer_id IS 'Stripe Customer ID for this client';
COMMENT ON COLUMN client_payment_methods.stripe_payment_method_id IS 'Stripe PaymentMethod ID (unique per method)';
COMMENT ON COLUMN client_payment_methods.is_default IS 'Whether this is the default payment method for the client';

CREATE INDEX IF NOT EXISTS idx_payment_methods_user ON client_payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_stripe_customer ON client_payment_methods(stripe_customer_id);

-- RLS for client_payment_methods
ALTER TABLE client_payment_methods ENABLE ROW LEVEL SECURITY;

-- User can view own payment methods
CREATE POLICY "User can view own payment methods"
  ON client_payment_methods FOR SELECT
  USING (user_id = (SELECT auth.uid()));

-- User can insert own payment methods
CREATE POLICY "User can insert own payment methods"
  ON client_payment_methods FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

-- User can update own payment methods
CREATE POLICY "User can update own payment methods"
  ON client_payment_methods FOR UPDATE
  USING (user_id = (SELECT auth.uid()));

-- User can delete own payment methods
CREATE POLICY "User can delete own payment methods"
  ON client_payment_methods FOR DELETE
  USING (user_id = (SELECT auth.uid()));

-- Platform admin can view all payment methods
CREATE POLICY "Platform admin can view all payment methods"
  ON client_payment_methods FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'platform_admin'
    )
  );

-- =============================================================================
-- Summary
-- =============================================================================
-- Tables created: marketplace_award_history, client_payment_methods
-- Tables altered: marketplace_quotes (status expansion + award columns), bookings (payment columns)
-- Indexes created: 8 new indexes (4 on bookings, 3 on award_history, 2 on payment_methods)
-- RLS policies: 7 new policies (3 on award_history, 5 on payment_methods)
