# Phase 6 — UX/UI Polish & Missing States

**ID:** STORY-006
**Epic:** Gap Closure
**Priority:** high
**Status:** ready

## User Story
**As a** user of the platform,
**I want** the interface to respond clearly to every action with feedback, proper empty states, and working links,
**So that** I always know what's happening and where to go next.

## Acceptance Criteria
- [ ] Footer legal links (Privacy Policy, Terms, Cookie Policy) are real `<Link>` components pointing to correct pages
- [ ] Footer "Use Cases" items are either links or clearly non-interactive styled text
- [ ] New Booking form has real-time field-level validation (end time > start time, UK postcode format, required fields)
- [ ] New Medic form has real-time field-level validation
- [ ] Admin pages (customers, medics, bookings) have proper empty states when no data
- [ ] All error states include a "Try Again" / retry button
- [ ] Mark-as-resolved action in notifications shows a toast confirmation
- [ ] Shared `<LoadingSpinner />` component created and used consistently across all pages
- [ ] Geofence check enforced at medic check-in (calls geofence-check edge function)

## Tasks
- [ ] [TASK-025](../1-backlog/025-fix-footer-legal-links.md)
- [ ] [TASK-026](../1-backlog/026-form-field-validation-booking.md)
- [ ] [TASK-027](../1-backlog/027-form-field-validation-medic.md)
- [ ] [TASK-028](../1-backlog/028-empty-states-admin-tables.md)
- [ ] [TASK-029](../1-backlog/029-error-states-retry-buttons.md)
- [ ] [TASK-030](../1-backlog/030-toast-confirmations.md)
- [ ] [TASK-031](../1-backlog/031-shared-loading-spinner.md)
- [ ] [TASK-032](../1-backlog/032-geofence-checkin-enforcement.md)

## Notes
Footer fix is a 10-minute change — do first.
Form validation: use react-hook-form's built-in validation with zod schemas.
Empty states: check if table components handle internally; if not, add fallback in page.
