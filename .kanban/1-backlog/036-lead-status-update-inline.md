# Build: Inline Lead Status Update in Submissions Table

**ID:** TASK-036
**Story:** [STORY-007](../stories/007-lead-crm-completion.md)
**Priority:** medium
**Branch:** `feat/036-lead-status-update`
**Labels:** frontend, leads, admin

## Description
Admin should be able to update a lead's status and add follow-up notes without leaving the table.

## Acceptance Criteria
- [ ] Status dropdown inline on each row (new → contacted → converted/closed)
- [ ] Follow-up notes field (expandable textarea in row or slide-over panel)
- [ ] Updates save immediately with optimistic UI + toast
- [ ] `updated_at` refreshes on save

## Notes
Depends on TASK-035.
