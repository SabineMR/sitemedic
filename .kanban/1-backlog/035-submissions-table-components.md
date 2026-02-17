# Build: Verify/Complete Submissions Table Components

**ID:** TASK-035
**Story:** [STORY-007](../stories/007-lead-crm-completion.md)
**Priority:** medium
**Branch:** `feat/035-submissions-tables`
**Labels:** frontend, leads, admin

## Description
`/web/app/admin/submissions/page.tsx` imports `<ContactSubmissionsTable />` and `<QuoteSubmissionsTable />`.
Verify these components exist and display real data; complete if not.

## Acceptance Criteria
- [ ] ContactSubmissionsTable fetches from `contact_submissions` and renders rows
- [ ] QuoteSubmissionsTable fetches from `quote_submissions` and renders rows
- [ ] Both show: submitter name, email, company, status, date
- [ ] Empty state when no submissions
- [ ] Loading and error states handled

## Notes
Check `/web/components/admin/contact-submissions-table.tsx` and `quote-submissions-table.tsx`.
