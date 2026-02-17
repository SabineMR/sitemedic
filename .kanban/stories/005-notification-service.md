# Phase 5 — Wire Up Notification Service

**ID:** STORY-005
**Epic:** Gap Closure
**Priority:** high
**Status:** ready

## User Story
**As a** medic or client,
**I want** to receive timely notifications for important events,
**So that** I'm never caught off guard by shift changes, contract updates, or cert expiry.

## Acceptance Criteria
- [ ] `sendCertExpiry()` implemented — sends push + email 30 days before cert expiry
- [ ] `sendSwapRequest()` implemented — notifies target medic of a swap offer
- [ ] Shift assigned notification fires when medic is matched to a booking
- [ ] Contract signing triggers email to admin/contract creator
- [ ] Cash-flow critical alert sends SMS + email to admin (replaces TODO stub)
- [ ] Urgent shift broadcast filters medics within 30-mile radius before notifying
- [ ] All notification events are logged to a `notification_logs` table

## Tasks
- [ ] [TASK-019](../1-backlog/019-implement-cert-expiry-notification.md)
- [ ] [TASK-020](../1-backlog/020-implement-swap-request-notification.md)
- [ ] [TASK-021](../1-backlog/021-shift-assigned-notification-trigger.md)
- [ ] [TASK-022](../1-backlog/022-contract-signed-notification.md)
- [ ] [TASK-023](../1-backlog/023-cashflow-emergency-alert.md)
- [ ] [TASK-024](../1-backlog/024-urgent-broadcast-distance-filter.md)

## Notes
Infrastructure exists in `/supabase/functions/notification-service/index.ts`.
Push via Expo, Email via SendGrid, SMS via Twilio — credentials must be in Supabase secrets.
Cert expiry notifications should run via pg_cron (hook into existing cert-expiry-checker).
