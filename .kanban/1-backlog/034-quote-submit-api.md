# Build: Quote Form Submission API

**ID:** TASK-034
**Story:** [STORY-007](../stories/007-lead-crm-completion.md)
**Priority:** medium
**Branch:** `feat/034-quote-submit-api`
**Labels:** backend, leads

## Description
Verify or create `POST /api/quotes/submit` endpoint that saves quote data to `quote_submissions`.

## Acceptance Criteria
- [ ] Endpoint accepts all quote fields: name, email, company, worker_count, project_type, start_date, end_date, special_requirements
- [ ] Calls `/api/bookings/calculate-cost` to set `calculated_price`
- [ ] Generates a `quote_ref` (e.g., QT-2026-001)
- [ ] Sets status to 'new', org_id from context
- [ ] Sends quote summary email to submitter

## Notes
Check if endpoint already exists — create if not.
QuoteBuilder component (48KB) may already call an endpoint; verify.
