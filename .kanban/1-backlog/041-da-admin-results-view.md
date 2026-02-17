# Build: D&A Test Results Admin View

**ID:** TASK-041
**Story:** [STORY-008](../stories/008-da-post-incident.md)
**Priority:** high
**Branch:** `feat/041-da-admin-results-view`
**Labels:** frontend, admin, compliance

## Description
Admins need a dedicated view to see all D&A tests across their organisation with filters.

## Acceptance Criteria
- [ ] New admin page at `/web/app/admin/da-tests/page.tsx`
- [ ] Table shows: tested worker, medic, test type, result, date, site/booking, linked incident
- [ ] Filter by: result (positive/negative/refused), test type, date range, site
- [ ] Row expands or slide-over shows full test detail including chain-of-custody fields
- [ ] "Export CSV" button for compliance reporting
- [ ] Positive results shown with red highlight for immediate visibility
- [ ] Add link in admin sidebar nav under Health & Safety section

## Notes
Add to admin navigation alongside near-misses, RIDDOR, and treatments.
Sensitive data — confirm user has admin role before rendering (RLS handles DB level, add UI guard too).
