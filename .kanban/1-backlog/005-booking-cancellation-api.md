# Build: Booking Cancellation API Endpoint

**ID:** TASK-005
**Story:** [STORY-002](../stories/002-booking-lifecycle.md)
**Priority:** critical
**Branch:** `feat/005-booking-cancellation-api`
**Labels:** backend, bookings

## Description
Create `POST /api/bookings/[id]/cancel` endpoint.

## Acceptance Criteria
- [ ] Accepts `{ reason: string, initiatedBy: 'admin' | 'client' | 'medic' }`
- [ ] Updates `bookings.status` to 'cancelled', sets `cancellation_reason` and `cancelled_at`
- [ ] If payment was captured, triggers refund flow (calls Stripe refund API)
- [ ] Returns error if booking is already cancelled or completed
- [ ] Logs cancellation event to audit trail

## Notes
Add `cancellation_reason`, `cancelled_at`, `cancelled_by` columns to bookings table via new migration.
