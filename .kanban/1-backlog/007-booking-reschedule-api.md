# Build: Booking Reschedule API Endpoint

**ID:** TASK-007
**Story:** [STORY-002](../stories/002-booking-lifecycle.md)
**Priority:** high
**Branch:** `feat/007-booking-reschedule-api`
**Labels:** backend, bookings

## Description
Create `POST /api/bookings/[id]/reschedule` endpoint.

## Acceptance Criteria
- [ ] Accepts `{ shift_date, shift_start_time, shift_end_time }`
- [ ] Calls conflict-detector edge function before saving
- [ ] Validates medic is still available on new date/time
- [ ] Updates booking record if no conflicts
- [ ] Returns conflict details if medic unavailable on new date
- [ ] Sends rescheduling confirmation email to client and medic

## Notes
Reuse conflict detection logic from `/api/admin/booking-conflicts/` route pattern.
