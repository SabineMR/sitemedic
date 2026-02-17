# Fix: Add Toast Confirmations to Silent Actions

**ID:** TASK-030
**Story:** [STORY-006](../stories/006-ux-ui-polish.md)
**Priority:** medium
**Branch:** `fix/030-toast-confirmations`
**Labels:** frontend, ux, quick-win

## Description
Several actions complete without any user feedback:
- Mark notification as resolved (`/web/app/admin/notifications/page.tsx` lines 68-78)
- Other silent state mutations

## Acceptance Criteria
- [ ] `markResolved()` shows `toast.success('Alert marked as resolved')` on success
- [ ] `markResolved()` shows `toast.error(...)` on failure
- [ ] Audit all mutation functions in admin pages for missing toast feedback
- [ ] Add toasts to any other silent mutations found

## Notes
`sonner` toast library is already installed.
