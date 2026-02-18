-- 135: Webhook Events (Idempotency & Audit)
-- Created: 2026-02-18
-- Purpose: Store all Stripe billing webhook events for:
--   1. Idempotency: UNIQUE constraint on stripe_event_id prevents duplicate processing.
--      Stripe retries webhooks for up to 3 days — the handler INSERTs first, and if it
--      hits error code 23505 (unique violation), it skips processing.
--   2. Audit trail: Every billing event is logged with full payload for debugging
--      and compliance. Platform admins can query via RLS SELECT policy.
--
-- Also adds subscription_status_updated_at to organizations for out-of-order
-- webhook event protection.
--
-- Note: No INSERT/UPDATE/DELETE RLS policies for authenticated users. The billing
-- webhook handler uses the service-role Supabase client which bypasses RLS entirely.

-- =============================================================================
-- TABLE: webhook_events
-- =============================================================================

CREATE TABLE webhook_events (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  stripe_event_id   TEXT        NOT NULL UNIQUE,  -- Stripe event ID (evt_xxx) for idempotency
  event_type        TEXT        NOT NULL,          -- e.g. 'checkout.session.completed'
  event_data        JSONB,                         -- Full event.data.object payload
  processing_error  TEXT,                          -- Error message if processing failed
  created_at        TIMESTAMPTZ NOT NULL,          -- Stripe event created timestamp
  processed_at      TIMESTAMPTZ DEFAULT NOW()      -- When we received/processed it
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- For filtering by event type in platform admin dashboard
CREATE INDEX idx_webhook_events_type ON webhook_events (event_type);

-- For chronological queries and retention cleanup
CREATE INDEX idx_webhook_events_created ON webhook_events (created_at);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- Platform admins can view webhook events for debugging
CREATE POLICY "Platform admins can view webhook events"
  ON webhook_events FOR SELECT
  USING (is_platform_admin());

-- No INSERT/UPDATE/DELETE policies — webhook handler uses service-role client
-- which bypasses RLS. Authenticated users cannot write to this table.

-- =============================================================================
-- ALTER TABLE: Add subscription_status_updated_at to organizations
-- =============================================================================

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS subscription_status_updated_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN organizations.subscription_status_updated_at IS
  'Timestamp of the Stripe event that last changed subscription_status. '
  'Used for out-of-order webhook event protection -- only events newer than this timestamp can update status.';

-- =============================================================================
-- SUMMARY
-- =============================================================================
-- Migration complete.
--
-- Created:
--   - webhook_events table with UNIQUE stripe_event_id (idempotency)
--   - Two indexes: event_type and created_at
--   - RLS: platform admin SELECT only
--
-- Altered:
--   - organizations.subscription_status_updated_at (TIMESTAMPTZ, DEFAULT NULL)
--     Used by billing webhook handler for out-of-order event protection
--
-- Downstream dependencies:
--   - Phase 25: billing webhook handler INSERTs to webhook_events, checks 23505
--   - Phase 30: platform admin dashboard queries webhook_events via RLS
