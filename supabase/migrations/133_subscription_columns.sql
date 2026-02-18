-- 133: Subscription Columns
-- Created: 2026-02-18
-- Purpose: Add subscription billing columns to the organizations table for v3.0
--          Stripe billing integration.
--          These columns are required by:
--            - Phase 25: Stripe billing webhook handler (writes customer/subscription IDs)
--            - Phase 30: Feature gating middleware (reads subscription_tier per request)
--
-- Note: No new RLS policies are needed. Migration 102 already has a FOR ALL policy
--       on organizations for platform admins. The existing SELECT policy from
--       migration 00004 automatically covers the new columns for org users.

-- =============================================================================
-- ALTER TABLE: Add 4 subscription columns
-- All columns are DEFAULT NULL so the ALTER TABLE is safe for existing rows.
-- Postgres CHECK constraints naturally pass when the value is NULL (NULL IN (...)
-- evaluates to NULL, not FALSE), so no explicit IS NULL OR clause is required.
-- =============================================================================

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS stripe_customer_id     TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS subscription_tier      TEXT DEFAULT NULL
    CHECK (subscription_tier IN ('starter', 'growth', 'enterprise')),
  ADD COLUMN IF NOT EXISTS subscription_status    TEXT DEFAULT NULL
    CHECK (subscription_status IN ('active', 'past_due', 'cancelled'));

-- =============================================================================
-- COLUMN COMMENTS
-- =============================================================================

COMMENT ON COLUMN organizations.stripe_customer_id IS
  'Stripe Customer ID (cus_xxx). NULL for legacy orgs not yet onboarded to billing.';

COMMENT ON COLUMN organizations.stripe_subscription_id IS
  'Stripe Subscription ID (sub_xxx). NULL for legacy orgs and orgs on free/manual plans.';

COMMENT ON COLUMN organizations.subscription_tier IS
  'Current subscription tier: starter, growth, or enterprise. '
  'NULL means legacy org with no billing -- treated as access-granted until onboarding.';

COMMENT ON COLUMN organizations.subscription_status IS
  'Current Stripe subscription status: active, past_due, or cancelled. '
  'NULL means legacy org not yet on Stripe billing -- treated as active until onboarding.';

-- =============================================================================
-- BACKFILL: Set default subscription tiers for all existing organisations
-- Apex Safety Solutions is the primary launch org and gets the growth tier.
-- All other existing orgs default to starter.
-- The WHERE subscription_tier IS NULL clause in the second UPDATE makes it
-- idempotent -- safe to re-run if the migration is ever re-applied.
-- =============================================================================

-- Apex Safety Solutions: growth tier (primary launch org)
UPDATE organizations
SET subscription_tier = 'growth'
WHERE slug = 'apex';

-- All other existing orgs: starter tier (default)
UPDATE organizations
SET subscription_tier = 'starter'
WHERE slug != 'apex'
  AND subscription_tier IS NULL;

-- =============================================================================
-- SUMMARY
-- =============================================================================
-- Migration complete: Added subscription columns to organizations table.
--
-- Columns added:
--   - stripe_customer_id     (TEXT, DEFAULT NULL) -- Stripe Customer ID (cus_xxx)
--   - stripe_subscription_id (TEXT, DEFAULT NULL) -- Stripe Subscription ID (sub_xxx)
--   - subscription_tier      (TEXT, DEFAULT NULL, CHECK: starter/growth/enterprise)
--   - subscription_status    (TEXT, DEFAULT NULL, CHECK: active/past_due/cancelled)
--
-- Backfill:
--   - Apex Safety Solutions (slug='apex'): subscription_tier = 'growth'
--   - All other orgs (slug != 'apex', tier IS NULL): subscription_tier = 'starter'
--
-- RLS: No new policies needed.
--   Migration 102 FOR ALL covers platform admin access to organizations.
--   Migration 00004 SELECT covers org users -- new columns inherit that coverage.
--
-- Legacy behaviour: NULL stripe_customer_id means the org has not yet onboarded
-- to Stripe billing. Application code treats NULL as "access granted" until the
-- org goes through the onboarding flow (Phase 29). This ensures existing orgs
-- continue to work without interruption during the v3.0 rollout.
--
-- Downstream dependencies:
--   - Phase 25: Billing webhook writes stripe_customer_id, stripe_subscription_id,
--               subscription_tier, subscription_status after Stripe events fire
--   - Phase 30: Feature gating middleware reads subscription_tier on every request
--               (tier is NOT cached in JWT -- middleware reads DB directly for
--               immediate effect after webhook updates)
