# Build: Chain of Custody Documentation & Positive Result Escalation

**ID:** TASK-043
**Story:** [STORY-008](../stories/008-da-post-incident.md)
**Priority:** medium
**Branch:** `feat/043-da-chain-of-custody`
**Labels:** backend, compliance, notifications

## Description
Formalise chain of custody audit trail and trigger escalation notifications for positive results.

## Acceptance Criteria
- [ ] `da_tests` record stores: collection timestamp, medic who collected, witness, sample reference — all immutable after submission (no edits, only addenda)
- [ ] Append-only `da_test_events` log table: test_id, actor_id, event_type ('created'|'pdf_generated'|'viewed_by_admin'), event_at — for full audit trail
- [ ] When result is 'positive' or 'refused': send notification to admin (email + in-app alert)
- [ ] Notification includes: worker name, test type, result, site, medic name, link to full record
- [ ] Positive result creates an entry in `medic_alerts` (or a new `site_alerts` table) visible on admin dashboard

## Notes
Immutability: once submitted, only `pdf_path` and admin `notes` field can be updated.
Use a Postgres trigger or application-level guard to prevent field updates post-submission.
Escalation notification hooks into notification-service (Phase 5 — TASK-019-024).
