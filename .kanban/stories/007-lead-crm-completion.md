# Phase 7 — Lead & CRM Completion

**ID:** STORY-007
**Epic:** Gap Closure
**Priority:** medium
**Status:** ready

## User Story
**As a** sales admin,
**I want** to track leads from first contact through to a confirmed booking,
**So that** no prospect falls through the cracks.

## Acceptance Criteria
- [ ] Contact form submissions save to `contact_submissions` with correct org_id
- [ ] Quote form submissions save to `quote_submissions` with calculated_price set
- [ ] Admin submissions page shows real data in ContactSubmissionsTable and QuoteSubmissionsTable
- [ ] Admin can update a submission status (new → contacted → converted/closed) inline
- [ ] Admin can add follow-up notes to a submission
- [ ] "Convert to Booking" action on a quote submission creates a draft booking and sets `converted_booking_id`
- [ ] Lead conversion flow navigates admin to the new booking form pre-filled with quote data

## Tasks
- [ ] [TASK-033](../1-backlog/033-contact-submit-api.md)
- [ ] [TASK-034](../1-backlog/034-quote-submit-api.md)
- [ ] [TASK-035](../1-backlog/035-submissions-table-components.md)
- [ ] [TASK-036](../1-backlog/036-lead-status-update-inline.md)
- [ ] [TASK-037](../1-backlog/037-lead-to-booking-conversion.md)

## Notes
Migration 117 has the schema. API endpoints `/api/contact/submit` and `/api/quotes/submit` need to be verified/created.
Conversion uses INSERT into bookings + UPDATE quote_submissions.converted_booking_id.
QuoteBuilder component already exists (48KB) — check if it can pre-fill booking form.
