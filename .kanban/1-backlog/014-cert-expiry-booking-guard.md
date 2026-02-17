# Build: Certification Expiry Guard in Booking Matching

**ID:** TASK-014
**Story:** [STORY-004](../stories/004-compliance-enforcement.md)
**Priority:** critical
**Branch:** `feat/014-cert-expiry-booking-guard`
**Labels:** backend, compliance, bookings

## Description
The booking matching/auto-assignment flow must reject medics with expired certifications.

## Acceptance Criteria
- [ ] `/web/app/api/bookings/match/route.ts` checks medic cert expiry dates before assignment
- [ ] Edge function `auto-assign-medic-v2` filters out medics with expired certs
- [ ] Manual medic selection in admin also warns/blocks expired cert medics
- [ ] Expired cert status shown clearly on medic selection UI

## Notes
Cert data is in `medics.certifications` JSONB array with `expiry_date` field.
Compare against today's date server-side.
