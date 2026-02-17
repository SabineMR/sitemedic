# Phase 2 — Booking Lifecycle (Cancel & Reschedule)

**ID:** STORY-002
**Epic:** Gap Closure
**Priority:** critical
**Status:** ready

## User Story
**As a** client or admin,
**I want** to cancel or reschedule a booking after it's been confirmed,
**So that** I'm not locked into shifts that need to change.

## Acceptance Criteria
- [ ] Admin can cancel a booking with a reason; booking status updates to 'cancelled'
- [ ] Cancellation triggers refund flow if payment was captured
- [ ] Cancellation sends notification to medic and client
- [ ] Admin can reschedule a booking to a new date/time
- [ ] Rescheduling checks medic availability and detects conflicts
- [ ] Rescheduling sends updated confirmation to both parties

## Tasks
- [ ] [TASK-005](../1-backlog/005-booking-cancellation-api.md)
- [ ] [TASK-006](../1-backlog/006-booking-cancellation-ui.md)
- [ ] [TASK-007](../1-backlog/007-booking-reschedule-api.md)
- [ ] [TASK-008](../1-backlog/008-booking-reschedule-ui.md)

## Notes
No `/api/bookings/cancel` endpoint exists today.
Reschedule must reuse the existing conflict-detector edge function.
Notifications feed into Phase 5 (notification service wiring).
