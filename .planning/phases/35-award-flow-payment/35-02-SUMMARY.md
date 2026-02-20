# Plan 35-02 Summary: Award UI and Deposit Flow

**Phase:** 35-award-flow-payment
**Plan:** 02
**Status:** Complete
**Duration:** ~8 min

## What Was Built

### Task 1: Award UI components
**Commit:** `9544d50`

- **AwardConfirmationModal.tsx**: Multi-step dialog (confirm → payment → processing → success | error). Step 1 shows PaymentBreakdownSection and calls award API. Step 2 wraps DepositPaymentForm in Stripe Elements provider. Success shows deposit paid and remainder info. Error offers retry.
- **PaymentBreakdownSection.tsx**: Read-only component showing subtotal (ex. VAT), VAT (20%), total (inc. VAT), deposit due now, remainder due after event, and payment terms text.
- **DepositPaymentForm.tsx**: Stripe Payment Element with confirm flow. Uses useStripe/useElements hooks. Handles succeeded, requires_action, and error states. Shows deposit summary and terms text.

### Task 2: Deposit webhook handler and marketplace booking bridge
**Commit:** `a96c293`

- **booking-bridge.ts** (`web/lib/marketplace/booking-bridge.ts`):
  - `createMarketplaceBooking()` creates booking per event day with source='marketplace'
  - Commission calculated via `calculateMarketplaceCommission` (60/40 default)
  - Remainder due date set to event end + 14 days
  - Pricing split evenly across days for multi-day events
  - Resolves org_id from marketplace_companies table

- **Webhook handler update** (`web/app/api/stripe/webhooks/route.ts`):
  - Marketplace deposit handling (payment_type='deposit'):
    1. Fetches quote and event with days
    2. Creates marketplace booking(s) via booking bridge
    3. Updates winning quote to 'awarded'
    4. Updates event to 'awarded'
    5. Rejects other submitted/revised quotes
    6. Records marketplace_award_history
    7. Saves payment method to client_payment_methods
    8. Creates medic_commitments for named medics (with EXCLUSION catch)
  - Marketplace remainder failure tracking
  - Existing direct/standard booking handling preserved unchanged

## Deviations

- None

## Files Modified

| File | Action |
|------|--------|
| web/components/marketplace/award/AwardConfirmationModal.tsx | Created |
| web/components/marketplace/award/PaymentBreakdownSection.tsx | Created |
| web/components/marketplace/award/DepositPaymentForm.tsx | Created |
| web/lib/marketplace/booking-bridge.ts | Created |
| web/app/api/stripe/webhooks/route.ts | Modified |
