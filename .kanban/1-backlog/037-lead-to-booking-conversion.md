# Build: Convert Quote Lead to Booking

**ID:** TASK-037
**Story:** [STORY-007](../stories/007-lead-crm-completion.md)
**Priority:** medium
**Branch:** `feat/037-lead-to-booking-conversion`
**Labels:** frontend, backend, leads

## Description
Quotes have a `converted_booking_id` column but no conversion flow exists.
Admin should be able to click "Convert to Booking" on a quote and land on a pre-filled booking form.

## Acceptance Criteria
- [ ] "Convert to Booking" button on each quote row in QuoteSubmissionsTable
- [ ] Navigates to `/admin/bookings/new` with query params pre-filling quote data
- [ ] On booking save, API updates `quote_submissions.converted_booking_id` and status to 'converted'
- [ ] Converted quotes show a link to the resulting booking

## Notes
Depends on TASK-035 and TASK-036.
Pre-fill via URL query params or `sessionStorage` handoff — avoid complex state management.
