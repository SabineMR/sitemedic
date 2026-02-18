# Plan 25-03 Summary: Billing Webhook Handler & Migration

**Status:** Complete
**Duration:** ~4 min
**Commits:** ed4a3f3 (migration), 8c1e960 (handler)

## What Was Done

### Task 1: Create webhook_events migration (135)
- Created `supabase/migrations/135_webhook_events.sql`:
  - `webhook_events` table with 6 columns (id, stripe_event_id, event_type, event_data, processing_error, created_at, processed_at)
  - UNIQUE constraint on `stripe_event_id` for idempotency
  - Two indexes: `idx_webhook_events_type`, `idx_webhook_events_created`
  - RLS: platform admin SELECT policy only (service-role bypasses for writes)
  - Added `subscription_status_updated_at` TIMESTAMPTZ to organizations for out-of-order protection

### Task 2: Create billing webhook route handler
- Created `web/app/api/stripe/billing-webhooks/route.ts` (381 lines):
  - **checkout.session.completed**: Writes stripe_customer_id, stripe_subscription_id, subscription_tier, subscription_status='active' to organizations
  - **customer.subscription.updated**: Updates tier and status with out-of-order protection (timestamp comparison) and spelling normalization
  - **customer.subscription.deleted**: Sets status to 'cancelled', preserves subscription_tier
  - **invoice.payment_failed**: Logs warning only — does NOT change subscription_status (waits for Stripe to fire subscription.updated with 'past_due')
  - Idempotency: INSERT to webhook_events, skip on 23505
  - `normalizeSubscriptionStatus`: maps 'canceled' (US) -> 'cancelled' (UK)
  - `priceIdToTier`: maps price IDs from env vars to tier names

## Verification
- TypeScript compiles with no new errors (pre-existing errors in bookings.ts/territory tests unrelated)
- Uses STRIPE_BILLING_WEBHOOK_SECRET (confirmed via grep)
- Uses request.text() not request.json() (confirmed)
- Connect webhook at /api/stripe/webhooks completely untouched (git diff empty)
- Imports SubscriptionTier from '@/lib/billing/feature-gates' (wired to 25-02)

## Artifacts
- `supabase/migrations/135_webhook_events.sql` (81 lines)
- `web/app/api/stripe/billing-webhooks/route.ts` (381 lines)

## Deviations
- Fixed TS error: `event.data.object` cast needed `as unknown as Record<string, unknown>` (double cast) for JSONB insert compatibility
