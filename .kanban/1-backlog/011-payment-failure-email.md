# Build: Payment Failure Email to Client

**ID:** TASK-011
**Story:** [STORY-003](../stories/003-payments-and-refunds.md)
**Priority:** high
**Branch:** `feat/011-payment-failure-email`
**Labels:** backend, email, payments

## Description
When Stripe webhook receives `payment_intent.payment_failed`, send an email to the client.

## Acceptance Criteria
- [ ] Stripe webhook handler calls email service after setting booking to cancelled
- [ ] Email explains payment failed, which booking was affected, and steps to retry
- [ ] Email uses Resend (existing email service)
- [ ] Create email template `/web/lib/email/templates/payment-failed-email.tsx`

## Notes
Hook into `/web/app/api/stripe/webhooks/route.ts` lines 96-118.
Follow pattern of existing `booking-confirmation-email.tsx` template.
