# Phase 4 — Compliance Enforcement (Certs, IR35, Onboarding)

**ID:** STORY-004
**Epic:** Gap Closure
**Priority:** critical
**Status:** ready

## User Story
**As a** platform operator,
**I want** the booking system to refuse assignment of non-compliant medics,
**So that** we are never exposed to legal liability from expired certs or incomplete IR35 assessments.

## Acceptance Criteria
- [ ] Booking matching rejects medics with expired certifications
- [ ] Medic portal shows the medic's own cert expiry dates with status badges
- [ ] Medic portal alerts medic when a cert is expiring within 30 days
- [ ] Booking matching rejects medics who have not completed onboarding (availability_for_work = false)
- [ ] IR35 `calculateDeductions()` computes real values for self-employed vs umbrella
- [ ] IR35 status checked before payout is processed for a medic

## Tasks
- [ ] [TASK-014](../1-backlog/014-cert-expiry-booking-guard.md)
- [ ] [TASK-015](../1-backlog/015-cert-expiry-medic-portal-ui.md)
- [ ] [TASK-016](../1-backlog/016-onboarding-booking-guard.md)
- [ ] [TASK-017](../1-backlog/017-ir35-deduction-calculation.md)
- [ ] [TASK-018](../1-backlog/018-ir35-payout-enforcement.md)

## Notes
Cert expiry query already exists for admin — reuse `useExpiringCertifications()` hook for medic view.
IR35 validator is in `/web/lib/medics/ir35-validator.ts` — `calculateDeductions()` currently returns 0.
