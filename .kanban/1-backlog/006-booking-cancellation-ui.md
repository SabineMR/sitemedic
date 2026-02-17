# Build: Booking Cancellation UI (Admin)

**ID:** TASK-006
**Story:** [STORY-002](../stories/002-booking-lifecycle.md)
**Priority:** critical
**Branch:** `feat/006-booking-cancellation-ui`
**Labels:** frontend, bookings

## Description
Add "Cancel Booking" action to admin booking detail view.

## Acceptance Criteria
- [ ] "Cancel Booking" button visible on booking detail (admin only)
- [ ] Clicking opens confirmation dialog with reason text field
- [ ] On confirm, calls cancel API and shows success toast
- [ ] Booking status badge updates immediately in UI
- [ ] Button hidden if booking is already cancelled/completed

## Notes
Depends on TASK-005.
