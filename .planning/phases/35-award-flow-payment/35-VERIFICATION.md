# Phase 35 Verification: Award Flow & Payment

**Status:** PASSED
**Verified:** 2026-02-20

## Must-Have Verification

### 1. Client can award quote with configurable deposit via Stripe
**Status:** PASSED
- `web/app/api/marketplace/quotes/[id]/award/route.ts`: POST endpoint creates Stripe PaymentIntent with `setup_future_usage: 'off_session'`
- `web/lib/marketplace/award-calculations.ts`: `getDepositPercentForEventType()` returns 50% for construction/motorsport, 25% for others
- `web/components/marketplace/award/AwardConfirmationModal.tsx`: Multi-step UI (confirm → payment → processing → success)
- `web/components/marketplace/award/DepositPaymentForm.tsx`: Stripe Payment Element for card collection
- `web/stores/useAwardCheckoutStore.ts`: Zustand store manages checkout flow state

### 2. Successful deposit auto-creates marketplace booking
**Status:** PASSED
- `web/lib/marketplace/booking-bridge.ts`: `createMarketplaceBooking()` creates bookings with `source: 'marketplace'`, one per event day
- `web/app/api/stripe/webhooks/route.ts`: `payment_type === 'deposit'` handler calls booking bridge, updates quote to 'awarded', event to 'awarded', rejects losing quotes
- Booking includes: org_id, marketplace_event_id, marketplace_quote_id, commission columns (platform_fee, medic_payout), deposit/remainder tracking

### 3. Winning company notified with client contact; losers get rejection
**Status:** PASSED
- `web/lib/marketplace/notifications.ts`: `sendAwardNotification()` includes client name, email, phone, address, event dates
- `web/lib/marketplace/notifications.ts`: `sendRejectionNotification()` with courteous message and link to browse events
- `web/app/api/stripe/webhooks/route.ts`: Deposit success handler sends award to winner, rejection to each loser, deposit confirmation to client
- Each email in its own try/catch (non-blocking)
- Note: Plan says "email + dashboard notification" and "email + SMS" — email is implemented, SMS/dashboard notification deferred (Phase 38 handles multi-channel notifications per roadmap)

### 4. Remainder auto-charged after event with retry and failure notification
**Status:** PASSED
- `supabase/functions/charge-remainder-payment/index.ts`: Deno Edge Function queries due remainders, creates off-session PaymentIntents with `confirm: true`
- Retry logic: 3 attempts (1d, 3d, 7d intervals), idempotency keys prevent double charges
- `supabase/migrations/149b_remainder_charge_cron.sql`: pg_cron at 8 AM UTC daily using Vault secrets pattern
- `web/app/api/stripe/webhooks/route.ts`: Remainder success updates `remainder_paid_at`; remainder failure tracks attempts + sends `sendRemainderFailedNotification()`
- `web/app/api/marketplace/payments/method/route.ts`: GET/PUT for client to view/update saved payment method
- `web/components/marketplace/award/PaymentMethodManager.tsx`: Dashboard UI for card management

### 5. Commission via platform_fee_percent/medic_payout_percent, friday-payout pipeline
**Status:** PASSED
- `web/lib/marketplace/booking-bridge.ts`: Uses `DEFAULT_PLATFORM_FEE_PERCENT=60`, `DEFAULT_MEDIC_PAYOUT_PERCENT=40` from env vars
- `web/lib/marketplace/award-calculations.ts`: `calculateMarketplaceCommission()` computes platform_fee and medic_payout from subtotal
- Booking bridge sets `platform_fee`, `medic_payout`, `platform_net` columns on each booking
- `supabase/functions/friday-payout/index.ts`: Processes timesheets by org_id with payout_amount — no source filter, so marketplace bookings flow through automatically once timesheets are created

## Artifacts Verified

| Artifact | Exists | Key Pattern |
|----------|--------|-------------|
| supabase/migrations/149_marketplace_award_payment.sql | Yes | marketplace_award_history, client_payment_methods |
| web/lib/marketplace/award-types.ts | Yes | AwardCheckoutStep, PaymentBreakdown |
| web/lib/marketplace/award-schemas.ts | Yes | awardRequestSchema, awardConfirmationSchema |
| web/lib/marketplace/award-calculations.ts | Yes | getDepositPercentForEventType, calculateMarketplaceCommission |
| web/app/api/marketplace/quotes/[id]/award/route.ts | Yes | POST, setup_future_usage |
| web/stores/useAwardCheckoutStore.ts | Yes | initializeAward, setStripeData |
| web/components/marketplace/award/AwardConfirmationModal.tsx | Yes | multi-step dialog |
| web/components/marketplace/award/PaymentBreakdownSection.tsx | Yes | subtotal, VAT, deposit |
| web/components/marketplace/award/DepositPaymentForm.tsx | Yes | PaymentElement, confirmPayment |
| web/lib/marketplace/booking-bridge.ts | Yes | source: 'marketplace' |
| supabase/functions/charge-remainder-payment/index.ts | Yes | off_session: true |
| supabase/migrations/149b_remainder_charge_cron.sql | Yes | cron.schedule |
| web/app/api/marketplace/payments/method/route.ts | Yes | GET, PUT |
| web/components/marketplace/award/PaymentMethodManager.tsx | Yes | saved card display |
| web/lib/marketplace/notifications.ts | Yes | sendAwardNotification, sendRejectionNotification |
| web/app/api/marketplace/events/[id]/awarded/route.ts | Yes | contactRevealed, viewerRole |
| web/components/marketplace/award/AwardedEventDetails.tsx | Yes | contact card, payment summary |

## Notes

- SMS notification mentioned in success criterion 4 is not implemented (Phase 38: Notifications & Alerts covers multi-channel notification system)
- Dashboard notification (criterion 3) deferred to Phase 38 notification system — email notifications are the Phase 35 deliverable
- Contact gating enforced server-side: awarded AND deposit paid required for contact reveal
