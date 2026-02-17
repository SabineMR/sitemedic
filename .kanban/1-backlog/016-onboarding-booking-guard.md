# Build: Onboarding Completion Guard in Booking Flow

**ID:** TASK-016
**Story:** [STORY-004](../stories/004-compliance-enforcement.md)
**Priority:** high
**Branch:** `feat/016-onboarding-booking-guard`
**Labels:** backend, compliance, bookings

## Description
Booking matching currently ignores `available_for_work` flag. Medics who haven't completed onboarding can be assigned to shifts.

## Acceptance Criteria
- [ ] `/web/app/api/bookings/match/route.ts` filters out medics where `available_for_work = false`
- [ ] `auto-assign-medic-v2` edge function excludes incomplete-onboarding medics
- [ ] Manual medic selection shows warning badge for medics with incomplete onboarding

## Notes
The `medics.available_for_work` column exists — just needs to be used in the query WHERE clause.
