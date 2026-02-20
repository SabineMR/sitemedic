# Plan 35-03 Summary: Remainder Charge Automation

**Phase:** 35-award-flow-payment
**Plan:** 03
**Status:** Complete
**Duration:** ~6 min

## What Was Built

### Task 1: Remainder charge Edge Function and pg_cron schedule
**Commit:** `98a745e`

- **charge-remainder-payment/index.ts**: Deno Edge Function that runs daily at 8 AM UTC. Queries marketplace bookings with due/overdue remainders (initial + retries). Creates off-session Stripe PaymentIntents with `confirm: true`. Retry logic: 3 attempts over 7 days (1d, 3d, 7d intervals). Idempotency keys (`pi_remainder_{bookingId}_attempt_{attempt}`) prevent double charges.
- **149b_remainder_charge_cron.sql**: pg_cron migration using Vault secrets pattern (from migration 022). Schedules `charge-marketplace-remainders` job daily at 8 AM UTC via `net.http_post` to Edge Function.

### Task 2: Remainder webhook handler, payment method API, and manager UI
**Commit:** `c5e2499`

- **Webhook handler update** (web/app/api/stripe/webhooks/route.ts):
  - Added remainder success handler: `payment_type === 'remainder'` in `payment_intent.succeeded` updates `remainder_paid_at` and `remainder_payment_intent_id`
  - Existing remainder failure handler from Plan 02 unchanged

- **Payment method API** (web/app/api/marketplace/payments/method/route.ts):
  - GET: Lists saved payment methods enriched with Stripe card details (brand, last4, expiry), plus upcoming remainder charges
  - PUT: Attaches new payment method to Stripe customer, sets as default, updates all unpaid marketplace bookings to use new card

- **PaymentMethodManager.tsx**:
  - Shows current default card (brand, last four, expiry)
  - Lists upcoming remainder charges with amounts and due dates
  - "Due soon" badge for charges within 7 days
  - Empty state when no payment method saved

## Deviations

- None

## Files Modified

| File | Action |
|------|--------|
| supabase/functions/charge-remainder-payment/index.ts | Created |
| supabase/migrations/149b_remainder_charge_cron.sql | Created |
| web/app/api/stripe/webhooks/route.ts | Modified |
| web/app/api/marketplace/payments/method/route.ts | Created |
| web/components/marketplace/award/PaymentMethodManager.tsx | Created |
