# Plan 35-04 Summary: Award Notifications & Contact Reveal

**Phase:** 35-award-flow-payment
**Plan:** 04
**Status:** Complete
**Duration:** ~7 min

## What Was Built

### Task 1: Award notification functions and webhook email triggers
**Commit:** `3582c70`

- **notifications.ts** (`web/lib/marketplace/notifications.ts`):
  - `sendAwardNotification()`: Email to winning company with full client contact (name, email, phone, address) and event dates
  - `sendRejectionNotification()`: Courteous email to non-winning companies with link to browse new events
  - `sendClientDepositConfirmation()`: Email to client with deposit paid, remainder due, payment reference
  - `sendRemainderFailedNotification()`: Email to client with failure details and link to update payment method
  - All use shared Resend client with dev mode fallback (no RESEND_API_KEY = log only)

- **Webhook integration** (web/app/api/stripe/webhooks/route.ts):
  - Deposit success: fetches client/company profiles, sends award notification to winner, rejection to losers, deposit confirmation to client. Each email in its own try/catch.
  - Remainder failure: fetches booking details, resolves client email via client_payment_methods, sends failed notification with attempt count.

### Task 2: Awarded event details API and dashboard contact reveal
**Commit:** `227ce53`

- **GET /api/marketplace/events/[id]/awarded** (`web/app/api/marketplace/events/[id]/awarded/route.ts`):
  - Access control: winning company admin or event poster only (403 otherwise)
  - Contact gating: client contact ONLY returned when event is awarded AND deposit is paid
  - Returns event details, award info, client contact (or null), company info, booking reference, viewerRole

- **AwardedEventDetails.tsx**: Dual-view component
  - Company view: green award banner, client contact card (name, email, phone, address), event schedule, payment status, booking link
  - Client view: blue award banner, payment summary (deposit/remainder), awarded company name, manage payment method link
  - Pending deposit: amber notice "Contact details available after deposit confirmation"

- **QuoteRankRow.tsx**: Added "Award This Quote" button (green, Award icon) visible when event is open/closed and quote is submitted/revised. Shows "Awarded" badge for awarded quotes and "Not Selected" for rejected.

- **QuoteListView.tsx**: Integrated AwardConfirmationModal and AwardedEventDetails. When event status is 'awarded', shows AwardedEventDetails above dimmed quote list. onAward callback opens modal.

- **EventQuotesPage**: Passes eventType to QuoteListView for deposit percent calculation.

## Deviations

- None

## Files Modified

| File | Action |
|------|--------|
| web/lib/marketplace/notifications.ts | Created |
| web/app/api/stripe/webhooks/route.ts | Modified |
| web/app/api/marketplace/events/[id]/awarded/route.ts | Created |
| web/components/marketplace/award/AwardedEventDetails.tsx | Created |
| web/components/marketplace/quote-comparison/QuoteRankRow.tsx | Modified |
| web/components/marketplace/quote-comparison/QuoteListView.tsx | Modified |
| web/app/marketplace/events/[id]/quotes/page.tsx | Modified |
