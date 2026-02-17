# Build: Dispute Tracking Database Table

**ID:** TASK-012
**Story:** [STORY-003](../stories/003-payments-and-refunds.md)
**Priority:** high
**Branch:** `feat/012-dispute-table`
**Labels:** database, backend

## Description
Create a migration adding a `disputes` table for tracking payment/service disputes.

## Acceptance Criteria
- [ ] Migration creates `disputes` table with: id, booking_id, org_id, raised_by, type ('payment'|'service'|'cancellation'), description, status ('open'|'investigating'|'resolved'|'closed'), resolution_notes, resolved_at, created_at, updated_at
- [ ] RLS policies: org-scoped access, platform admin full access
- [ ] FK constraint to bookings table

## Notes
Model after `contact_submissions` from migration 117.
