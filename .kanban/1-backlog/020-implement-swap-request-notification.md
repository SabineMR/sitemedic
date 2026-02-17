# Fix: Implement sendSwapRequest() Notification

**ID:** TASK-020
**Story:** [STORY-005](../stories/005-notification-service.md)
**Priority:** high
**Branch:** `feat/020-swap-request-notification`
**Labels:** backend, notifications

## Description
`sendSwapRequest()` in notification-service is a stub. Medics receiving shift swap offers get no notification.

## Acceptance Criteria
- [ ] Sends push notification to target medic with swap offer details
- [ ] Notification includes: requester name, shift date/time, site name
- [ ] Deep links to the shift-swaps page in the mobile app
- [ ] Called from the `shift-swap` edge function after creating a swap record

## Notes
Check `/supabase/functions/shift-swap/index.ts` for where to call notification.
