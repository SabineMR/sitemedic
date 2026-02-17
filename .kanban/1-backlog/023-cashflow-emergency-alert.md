# Fix: Implement Cash-Flow Emergency SMS + Email Alert

**ID:** TASK-023
**Story:** [STORY-005](../stories/005-notification-service.md)
**Priority:** high
**Branch:** `feat/023-cashflow-emergency-alert`
**Labels:** backend, notifications, finance

## Description
`/supabase/functions/cash-flow-monitor/index.ts:317` has:
`// TODO: Implement emergency alert (SMS + email)`
Critical cash reserve breaches only log an error — admins are never notified.

## Acceptance Criteria
- [ ] When cash reserve drops below `CRITICAL_CASH_RESERVE` (5000), send SMS to admin phone
- [ ] Also send email with cash position summary and recommended actions
- [ ] Uses existing Twilio (SMS) and SendGrid (email) credentials
- [ ] Alert not repeated more than once per 24 hours (rate limiting)

## Notes
Admin phone number and email should come from `org_settings` table.
