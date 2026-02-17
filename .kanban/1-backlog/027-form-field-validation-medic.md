# Build: Real-Time Field Validation on New Medic Form

**ID:** TASK-027
**Story:** [STORY-006](../stories/006-ux-ui-polish.md)
**Priority:** high
**Branch:** `feat/027-medic-form-validation`
**Labels:** frontend, forms, ux

## Description
`/web/app/admin/medics/new/page.tsx` has no real-time field validation.

## Acceptance Criteria
- [ ] Required fields validated on blur
- [ ] UK mobile number format validation
- [ ] UK postcode format validation
- [ ] Email format validation
- [ ] UTR number: exactly 10 digits (if self-employed)
- [ ] Zod schema + react-hook-form resolver

## Notes
Depends on zod setup from TASK-026 (shared schema utilities).
