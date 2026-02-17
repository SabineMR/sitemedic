# Build: Fire Shift Assigned Notification on Booking Match

**ID:** TASK-021
**Story:** [STORY-005](../stories/005-notification-service.md)
**Priority:** high
**Branch:** `feat/021-shift-assigned-notification`
**Labels:** backend, notifications, bookings

## Description
The `shift_assigned` notification type is defined in notification-service but never called.
Medics don't receive any notification when assigned to a booking.

## Acceptance Criteria
- [ ] After successful medic assignment in `/api/bookings/match/route.ts`, notification-service is called
- [ ] Medic receives push notification: "New shift assigned — [site name] on [date]"
- [ ] Medic receives email with full shift details
- [ ] Notification is also triggered from `auto-assign-medic-v2` edge function

## Notes
Call notification-service via internal HTTP or a Supabase function invocation.
