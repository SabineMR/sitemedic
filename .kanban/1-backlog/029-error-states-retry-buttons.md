# Build: Add Retry Buttons to Error States

**ID:** TASK-029
**Story:** [STORY-006](../stories/006-ux-ui-polish.md)
**Priority:** medium
**Branch:** `feat/029-error-retry-buttons`
**Labels:** frontend, ux

## Description
Error states on admin pages (territories, dashboard, etc.) show a message but no recovery path.

## Acceptance Criteria
- [ ] All error state UI blocks include a "Try Again" button
- [ ] Clicking "Try Again" re-triggers the data fetch
- [ ] Error states pass a `onRetry` callback to child components where applicable
- [ ] Consistent error state component created: `<ErrorState message="" onRetry={fn} />`

## Notes
At minimum fix: territories, admin dashboard, medics list, bookings list.
