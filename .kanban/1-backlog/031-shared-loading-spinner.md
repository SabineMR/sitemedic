# Build: Shared LoadingSpinner Component

**ID:** TASK-031
**Story:** [STORY-006](../stories/006-ux-ui-polish.md)
**Priority:** low
**Branch:** `feat/031-shared-loading-spinner`
**Labels:** frontend, ui, refactor

## Description
Each page implements its own loading indicator with different styles and sizes.
A shared component ensures visual consistency.

## Acceptance Criteria
- [ ] Create `/web/components/ui/loading-spinner.tsx` with size prop (sm/md/lg)
- [ ] Replace bespoke spinner implementations in: admin dashboard, medic dashboard, notifications, territories
- [ ] Visual style matches design system (Tailwind classes, brand colors)

## Notes
Simple refactor — no logic changes.
