# Build: Refund UI in Admin Booking Detail

**ID:** TASK-010
**Story:** [STORY-003](../stories/003-payments-and-refunds.md)
**Priority:** critical
**Branch:** `feat/010-refund-ui`
**Labels:** frontend, payments

## Description
Add "Issue Refund" action to the admin booking detail view.

## Acceptance Criteria
- [ ] "Issue Refund" button visible when booking has a captured payment
- [ ] Dialog allows full or partial refund with reason field
- [ ] On confirm, calls refund API and shows result toast
- [ ] Booking card shows refund amount and date after issuing

## Notes
Depends on TASK-009.
