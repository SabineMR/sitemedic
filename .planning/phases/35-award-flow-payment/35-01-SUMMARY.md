# Plan 35-01 Summary: Award Foundation

**Phase:** 35-award-flow-payment
**Plan:** 01
**Status:** Complete
**Duration:** ~6 min

## What Was Built

### Task 1: Database migration and TypeScript types/schemas/calculations
**Commit:** `066fd7f`

- **Migration 149** (`supabase/migrations/149_marketplace_award_payment.sql`):
  - Expanded marketplace_quotes status CHECK to include 'awarded' and 'rejected'
  - Added awarded_at, rejected_at, rejected_reason columns to marketplace_quotes
  - Added 12 marketplace payment columns to bookings (marketplace_event_id, marketplace_quote_id, deposit_amount, deposit_percent, remainder_amount, remainder_due_at, remainder_paid_at, remainder_failed_attempts, remainder_last_failed_at, stripe_customer_id, stripe_payment_method_id, deposit_payment_intent_id, remainder_payment_intent_id)
  - Created marketplace_award_history table with RLS (event poster + platform admin)
  - Created client_payment_methods table with full CRUD RLS
  - 8 indexes including partial index for daily cron remainder query

- **award-types.ts**: AwardCheckoutStep, AwardCheckoutState, AwardRequest, AwardApiResponse, PaymentBreakdown, MarketplaceCommission, MarketplaceBookingPayment, MarketplaceAwardHistory, ClientPaymentMethod
- **award-schemas.ts**: awardRequestSchema (Zod v4), awardConfirmationSchema
- **award-calculations.ts**: calculateAwardAmounts, calculateMarketplaceCommission, getDepositPercentForEventType, calculateRemainderDueDate
- **quote-types.ts**: Expanded QuoteStatus with 'awarded' | 'rejected', added to QUOTE_STATUS_LABELS

### Task 2: Award API route and Zustand store
**Commit:** `b4f30cb`

- **POST /api/marketplace/quotes/[id]/award** (`web/app/api/marketplace/quotes/[id]/award/route.ts`):
  - Authenticates user, validates with awardRequestSchema
  - Verifies quote status (submitted/revised only), event ownership, event is open
  - EXCLUSION constraint check for named medics (queries medic_commitments for time overlaps)
  - Creates/retrieves Stripe Customer from client_payment_methods
  - Creates Stripe PaymentIntent with setup_future_usage: 'off_session'
  - Dev mock mode when STRIPE_SECRET_KEY absent
  - Returns AwardApiResponse with clientSecret

- **useAwardCheckoutStore** (`web/stores/useAwardCheckoutStore.ts`):
  - Multi-step flow: confirm → payment → processing → success | error
  - initializeAward calculates deposit/remainder via calculateAwardAmounts
  - setStripeData, setStep, setError, setProcessing, reset actions

- **MyQuoteCard.tsx**: Added awarded/rejected status styles and labels

## Deviations

- None

## Verification

- `pnpm exec tsc --noEmit` — zero errors
- All exported types importable
- calculateAwardAmounts(1200, 25) returns correct breakdown (deposit=300, remainder=900, subtotal=1000, vat=200)

## Files Modified

| File | Action |
|------|--------|
| supabase/migrations/149_marketplace_award_payment.sql | Created |
| web/lib/marketplace/award-types.ts | Created |
| web/lib/marketplace/award-schemas.ts | Created |
| web/lib/marketplace/award-calculations.ts | Created |
| web/lib/marketplace/quote-types.ts | Modified |
| web/app/api/marketplace/quotes/[id]/award/route.ts | Created |
| web/stores/useAwardCheckoutStore.ts | Created |
| web/components/marketplace/quote-management/MyQuoteCard.tsx | Modified |
