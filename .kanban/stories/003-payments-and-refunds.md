# Phase 3 — Payments: Refunds & Failure Handling

**ID:** STORY-003
**Epic:** Gap Closure
**Priority:** critical
**Status:** ready

## User Story
**As an** admin or client,
**I want** to issue refunds and receive clear communication when payments fail,
**So that** disputes are resolved quickly and clients aren't left in the dark.

## Acceptance Criteria
- [ ] Admin can issue a full or partial refund from the booking detail view
- [ ] Refund updates `payments.status`, `refund_amount`, `refund_reason`, `stripe_refund_id`
- [ ] Refund triggers Stripe API call and records the result
- [ ] When payment fails, client receives email explaining failure and retry steps
- [ ] Dispute tracking: basic `disputes` table + admin UI to log and resolve disputes
- [ ] Failed payment creates an actionable alert in admin dashboard

## Tasks
- [ ] [TASK-009](../1-backlog/009-refund-api-endpoint.md)
- [ ] [TASK-010](../1-backlog/010-refund-ui-admin.md)
- [ ] [TASK-011](../1-backlog/011-payment-failure-email.md)
- [ ] [TASK-012](../1-backlog/012-dispute-tracking-table.md)
- [ ] [TASK-013](../1-backlog/013-dispute-admin-ui.md)

## Notes
`payments` table already has refund columns — just needs the API + UI.
Dispute table needs a migration; model after `contact_submissions` pattern.
