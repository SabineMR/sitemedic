# Build: Real-Time Field Validation on New Booking Form

**ID:** TASK-026
**Story:** [STORY-006](../stories/006-ux-ui-polish.md)
**Priority:** high
**Branch:** `feat/026-booking-form-validation`
**Labels:** frontend, forms, ux

## Description
`/web/app/admin/bookings/new/page.tsx` has no real-time field validation.
Users only see a generic error banner on submit.

## Acceptance Criteria
- [ ] Required fields show red border + message if left empty on blur
- [ ] End time must be after start time (validated live)
- [ ] UK postcode validated against regex `/^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i`
- [ ] Email field validated for correct format
- [ ] Zod schema defines all validation rules
- [ ] Form uses react-hook-form's `resolver` with the Zod schema

## Notes
react-hook-form is already installed. Add `zod` + `@hookform/resolvers` if not present.
