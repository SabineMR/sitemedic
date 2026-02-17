# Build: Refund API Endpoint

**ID:** TASK-009
**Story:** [STORY-003](../stories/003-payments-and-refunds.md)
**Priority:** critical
**Branch:** `feat/009-refund-api`
**Labels:** backend, payments

## Description
Create `POST /api/payments/refund` endpoint.

## Acceptance Criteria
- [ ] Accepts `{ booking_id, amount, reason }` (amount = null for full refund)
- [ ] Calls Stripe API to issue full or partial refund
- [ ] Updates `payments.status`, `refund_amount`, `refund_reason`, `stripe_refund_id`
- [ ] Returns error if booking has no captured payment
- [ ] Logs refund to audit trail

## Notes
Stripe API: `stripe.refunds.create({ payment_intent: ..., amount: ... })`.
The `payments` table already has all necessary columns from migration 002.
