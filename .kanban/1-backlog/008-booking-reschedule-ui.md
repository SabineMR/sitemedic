# Build: Booking Reschedule UI (Admin)

**ID:** TASK-008
**Story:** [STORY-002](../stories/002-booking-lifecycle.md)
**Priority:** high
**Branch:** `feat/008-booking-reschedule-ui`
**Labels:** frontend, bookings

## Description
Add "Reschedule" action to admin booking detail view.

## Acceptance Criteria
- [ ] "Reschedule" button visible on active bookings (admin only)
- [ ] Clicking opens date/time picker dialog
- [ ] Shows conflict warning if selected time has issues
- [ ] On success, updates displayed booking dates and shows toast
- [ ] Button hidden on cancelled/completed bookings

## Notes
Depends on TASK-007.
