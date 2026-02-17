# Build: Empty States for Admin Table Pages

**ID:** TASK-028
**Story:** [STORY-006](../stories/006-ux-ui-polish.md)
**Priority:** medium
**Branch:** `feat/028-empty-states`
**Labels:** frontend, ux

## Description
Customers, Medics, and Bookings admin pages render their table components with no empty state fallback.
If the table component doesn't handle empty data, users see nothing.

## Acceptance Criteria
- [ ] `/web/app/admin/customers/page.tsx` shows empty state when no clients
- [ ] `/web/app/admin/medics/page.tsx` shows empty state when no medics
- [ ] `/web/app/admin/bookings/page.tsx` shows empty state when no bookings
- [ ] Each empty state has an icon, descriptive message, and CTA button (e.g., "Add First Medic")
- [ ] Verify table components themselves handle empty arrays (fix if needed)

## Notes
Follow the pattern from `/web/app/admin/territories/page.tsx` empty state (lines 182-189).
