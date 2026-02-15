# Roadmap: SiteMedic

## Overview

SiteMedic transforms medic clinical work into automatic compliance documentation through seven phases. We start with a rock-solid offline-first foundation (backend, auth, encryption, sync infrastructure), then build the mobile app core for local-only data capture, connect mobile to backend with robust sync, add the manager web dashboard for reporting, enable professional PDF report generation, implement smart RIDDOR auto-flagging, and complete with certification tracking. This order ensures GDPR compliance from Day 1, prevents data loss during sync transitions, and validates offline-first architecture before adding connectivity complexity.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation** - Backend API, auth, encrypted offline storage, sync infrastructure
- [ ] **Phase 2: Mobile Core** - Treatment logger, worker profiles, near-miss, daily checks (local-only)
- [ ] **Phase 3: Sync Engine** - Mobile-to-backend data flow with photo upload
- [ ] **Phase 4: Web Dashboard** - Manager reporting UI with compliance scoring
- [ ] **Phase 5: PDF Generation** - Weekly safety reports for HSE audits
- [ ] **Phase 6: RIDDOR Auto-Flagging** - Smart compliance detection with deadline tracking
- [ ] **Phase 7: Certification Tracking** - Expiry monitoring with progressive alerts

## Phase Details

### Phase 1: Foundation
**Goal**: Backend API, authentication, and offline-first infrastructure operational with GDPR-compliant encryption and sync architecture ready for mobile app.

**Depends on**: Nothing (first phase)

**Requirements**: ARCH-01, ARCH-02, ARCH-03, ARCH-04, ARCH-05, ARCH-06, ARCH-07, AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, GDPR-01, GDPR-02, GDPR-03, GDPR-04, GDPR-05, GDPR-06

**Success Criteria** (what must be TRUE):
  1. User can sign up and log in with email/password
  2. User session persists across app restarts (offline session handling works)
  3. Biometric authentication (Face ID/Touch ID) works for quick access
  4. Encryption key infrastructure ready in iOS Keychain via expo-secure-store (SQLCipher database encryption deferred to Phase 2 per research -- WatermelonDB PR #907 not merged)
  5. Sync queue persists locally with conflict resolution logic ready (not yet actively syncing)
  6. Multi-modal sync status indicators display correctly (color, labels, pending count badge)
  7. Network connectivity detection triggers sync status updates
  8. Audit logging captures all data access: server-side via PostgreSQL triggers on Supabase tables, client-side via local audit log service that records READ operations on sensitive WatermelonDB tables and queues for sync

**Plans**: 5 plans

Plans:
- [ ] 01-01-PLAN.md -- Expo project scaffold and Supabase client initialization
- [ ] 01-02-PLAN.md -- Supabase backend schema, RLS, audit logging, GDPR tables
- [ ] 01-03-PLAN.md -- WatermelonDB local database and encryption key management
- [ ] 01-04-PLAN.md -- Authentication system with offline persistence and biometrics
- [ ] 01-05-PLAN.md -- Sync infrastructure, network monitoring, and status UI

### Phase 2: Mobile Core
**Goal**: Medics can capture treatments, worker profiles, near-misses, and daily safety checks 100% offline with gloves-on usability.

**Depends on**: Phase 1

**Requirements**: TREAT-01, TREAT-02, TREAT-03, TREAT-04, TREAT-05, TREAT-06, TREAT-07, TREAT-08, TREAT-09, TREAT-10, TREAT-11, TREAT-12, NEAR-01, NEAR-02, NEAR-03, NEAR-04, NEAR-05, NEAR-06, NEAR-07, DAILY-01, DAILY-02, DAILY-03, DAILY-04, DAILY-05, WORK-01, WORK-02, WORK-03, WORK-04, WORK-05, WORK-06, PHOTO-01, PHOTO-02, PHOTO-03, PHOTO-04, PHOTO-05, PHOTO-06, UX-01, UX-02, UX-03, UX-04, UX-05, UX-06, UX-07, UX-08

**Success Criteria** (what must be TRUE):
  1. Medic can log minor treatment in under 30 seconds (worker + category + treatment + outcome)
  2. Medic can log full treatment with photos and signature in under 90 seconds
  3. Medic can capture near-miss with photo in under 45 seconds
  4. Medic can complete daily safety checklist (10 items) in under 5 minutes
  5. Medic can add worker during induction with health screening data
  6. Medic can view worker treatment history in 2 taps during emergency
  7. All workflows work with gloves on (48x48pt tap targets verified)
  8. App works 100% offline with no network required (airplane mode test passes)
  9. Photos compress on-device to 100-200KB before storage
  10. Treatment auto-saves locally every 10 seconds

**Plans**: TBD

Plans:
- [ ] TBD during planning

### Phase 3: Sync Engine
**Goal**: Mobile app data syncs to backend automatically when connectivity available, with photo uploads that don't block workflow and zero data loss during transitions.

**Depends on**: Phase 2

**Requirements**: (No new functional requirements — implements sync for existing Phase 2 data)

**Success Criteria** (what must be TRUE):
  1. Treatment logged offline syncs to backend when connectivity returns
  2. Photos upload in background without blocking medic workflow
  3. Sync status badge shows pending item count at all times
  4. Failed sync surfaces plain language error with manual retry button
  5. RIDDOR-reportable incident that fails to sync triggers critical alert
  6. Sync queue respects WiFi-only constraint for large photo uploads
  7. Background sync doesn't drain battery (WorkManager constraints verified)
  8. Concurrent edits resolve with last-write-wins (tested with airplane mode toggles)
  9. Client-generated UUIDs prevent duplicate records on retry
  10. Progressive photo upload syncs preview first, full-quality later

**Plans**: TBD

Plans:
- [ ] TBD during planning

### Phase 4: Web Dashboard
**Goal**: Site managers can view treatment logs, worker registry, near-miss reports, and compliance scores in real-time from desktop browser.

**Depends on**: Phase 3

**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, DASH-06, DASH-07, DASH-08, DASH-09, DASH-10, EXPORT-01, EXPORT-02, EXPORT-03

**Success Criteria** (what must be TRUE):
  1. Site manager sees traffic-light compliance score based on daily checks, overdue follow-ups, expired certs, RIDDOR deadlines
  2. Site manager can filter treatment log by date range, severity, injury type, worker, outcome
  3. Site manager can click into any treatment for full detail view including photos
  4. Site manager can view near-miss log with category, severity, date filters
  5. Site manager can search worker registry by company, role, certification status
  6. Dashboard updates via 60-second polling for near-real-time data
  7. Site manager can export treatment log as CSV or PDF
  8. Site manager can export worker registry as CSV
  9. Dashboard is responsive (works on desktop and tablets)

**Plans**: TBD

Plans:
- [ ] TBD during planning

### Phase 5: PDF Generation
**Goal**: Weekly safety reports auto-generate every Friday and on-demand with professional formatting ready for HSE audits, principal contractors, and insurers.

**Depends on**: Phase 4

**Requirements**: PDF-01, PDF-02, PDF-03, PDF-04, PDF-05, PDF-06, PDF-07, NOTIF-01

**Success Criteria** (what must be TRUE):
  1. Weekly safety report auto-generates every Friday with treatments, near-misses, certifications, compliance score, open actions
  2. PDF generation completes in under 10 seconds (server-side via Edge Functions)
  3. PDF includes company branding (logo, colors)
  4. Site manager can download PDF or receive via email
  5. PDF stored in Supabase Storage with signed URL for secure access
  6. Site manager receives email notification when weekly PDF is ready
  7. PDF is audit-ready for HSE inspectors (professional formatting verified)

**Plans**: TBD

Plans:
- [ ] TBD during planning

### Phase 6: RIDDOR Auto-Flagging
**Goal**: App automatically detects RIDDOR-reportable incidents with deadline countdown, medic override capability, and pre-filled HSE F2508 form generation.

**Depends on**: Phase 5

**Requirements**: RIDD-01, RIDD-02, RIDD-03, RIDD-04, RIDD-05, RIDD-06, NOTIF-02

**Success Criteria** (what must be TRUE):
  1. Treatment matching RIDDOR criteria auto-flags with confidence level
  2. Medic can confirm or override RIDDOR flag with reason
  3. RIDDOR-flagged incident shows deadline countdown (10 days for specified injuries, 15 days for over-7-day)
  4. App generates pre-filled HSE F2508 form PDF from treatment log data
  5. Dashboard shows RIDDOR deadline countdown for site manager
  6. Site manager receives email when RIDDOR deadline approaches (3 days before)
  7. RIDDOR report tracks status (Draft / Submitted / Confirmed)
  8. Override patterns track for algorithm tuning (if 80% overridden, review logic)

**Plans**: TBD

Plans:
- [ ] TBD during planning

### Phase 7: Certification Tracking
**Goal**: System tracks UK certifications with progressive expiry alerts, prevents expired workers from logging incidents, and surfaces compliance status to managers.

**Depends on**: Phase 6

**Requirements**: CERT-01, CERT-02, CERT-03, CERT-04, CERT-05, CERT-06, NOTIF-03, NOTIF-04

**Success Criteria** (what must be TRUE):
  1. System tracks UK certifications (CSCS, CPCS, IPAF, PASMA, Gas Safe) with expiry dates
  2. Dashboard shows certifications expiring in next 30/60/90 days
  3. Workers with expired certifications show critical alert (red) on dashboard
  4. Site manager receives email when certification expires
  5. Progressive reminders send before expiry (30, 14, 7, 1 days before)
  6. Expired certification prevents worker from being selected for incident logging (validation at point of use)
  7. Email notifications use professional template with company branding
  8. Server-side scheduled jobs check expiry daily (not device-local notifications)

**Plans**: TBD

Plans:
- [ ] TBD during planning

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 0/5 | Planning complete | - |
| 2. Mobile Core | 0/TBD | Not started | - |
| 3. Sync Engine | 0/TBD | Not started | - |
| 4. Web Dashboard | 0/TBD | Not started | - |
| 5. PDF Generation | 0/TBD | Not started | - |
| 6. RIDDOR Auto-Flagging | 0/TBD | Not started | - |
| 7. Certification Tracking | 0/TBD | Not started | - |

---
*Roadmap created: 2026-02-15*
*Phase 1 planned: 2026-02-15 -- 5 plans in 3 waves*
*Phase 1 revised: 2026-02-15 -- Updated criteria #4 (encryption deferred) and #8 (client-side audit logging added)*
*Coverage: 83/83 v1 requirements mapped*
