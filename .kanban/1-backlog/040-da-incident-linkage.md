# Build: Link D&A Test to RIDDOR/Near-Miss from Mobile

**ID:** TASK-040
**Story:** [STORY-008](../stories/008-da-post-incident.md)
**Priority:** high
**Branch:** `feat/040-da-incident-linkage`
**Labels:** mobile, backend, compliance

## Description
When a medic is on a RIDDOR incident or near-miss record, a "Log D&A Test" button should be available.
The resulting test record is linked back to the parent incident.

## Acceptance Criteria
- [ ] "Log D&A Test" button added to RIDDOR incident detail screen in mobile app
- [ ] "Log D&A Test" button added to near-miss detail screen in mobile app
- [ ] Tapping the button opens the D&A test form (TASK-039) pre-set with `riddor_incident_id` or `near_miss_id`
- [ ] After saving, the test result is displayed on the incident record (e.g., "D&A: Negative" badge)
- [ ] RIDDOR incident detail in web admin also shows linked D&A test result
- [ ] Near-miss record in web dashboard also shows linked D&A test result

## Notes
Depends on TASK-038 (schema) and TASK-039 (form).
Web admin view: add a "D&A Result" column/section to RIDDOR detail page at `/web/app/(dashboard)/riddor/[id]/page.tsx`.
Web admin view: add to near-miss detail if a detail page exists.
