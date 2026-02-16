# Roadmap: SiteMedic

## Overview

SiteMedic transforms medic clinical work into automatic compliance documentation through seven phases. We start with a rock-solid offline-first foundation (backend, auth, encryption, sync infrastructure), then build the mobile app core for local-only data capture, connect mobile to backend with robust sync, add the manager web dashboard for reporting, enable professional PDF report generation, implement smart RIDDOR auto-flagging, and complete with certification tracking. This order ensures GDPR compliance from Day 1, prevents data loss during sync transitions, and validates offline-first architecture before adding connectivity complexity.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Backend API, auth, encrypted offline storage, sync infrastructure
- [x] **Phase 1.5: Business Operations Foundation** (INSERTED) - Database schema for bookings, territories, clients, payments; Stripe Connect; Google Maps API; UK postcodes
- [x] **Phase 2: Mobile Core** - Treatment logger, worker profiles, near-miss, daily checks (local-only)
- [x] **Phase 3: Sync Engine** - Mobile-to-backend data flow with photo upload
- [ ] **Phase 4: Web Dashboard** - Manager reporting UI with compliance scoring
- [ ] **Phase 4.5: Marketing Website & Booking Portal** (INSERTED) - Public marketing site, client self-service booking portal with Stripe payments, auto-matching
- [ ] **Phase 4.6: Customer Onboarding & Contract Management** (INSERTED) - Service agreement generation, document portal, flexible payment terms, digital signatures
- [ ] **Phase 5: PDF Generation** - Weekly safety reports for HSE audits
- [ ] **Phase 5.5: Admin Operations Dashboards** (INSERTED) - Admin dashboard for bookings, medics, territories, revenue, timesheets, client management
- [ ] **Phase 6: RIDDOR Auto-Flagging** - Smart compliance detection with deadline tracking
- [ ] **Phase 6.5: Payment Processing & Payouts** (INSERTED) - Client payment processing, weekly medic payouts via UK Faster Payments, IR35 compliance, invoice generation
- [ ] **Phase 7: Certification Tracking** - Expiry monitoring with progressive alerts
- [ ] **Phase 7.5: Territory Management & Auto-Assignment** (INSERTED) - UK postcode territory system, auto-assignment algorithm, coverage gap detection, hiring triggers

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
- [x] 01-01-PLAN.md -- Expo project scaffold and Supabase client initialization
- [x] 01-02-PLAN.md -- Supabase backend schema, RLS, audit logging, GDPR tables
- [x] 01-03-PLAN.md -- WatermelonDB local database and encryption key management
- [x] 01-04-PLAN.md -- Authentication system with offline persistence and biometrics
- [x] 01-05-PLAN.md -- Sync infrastructure, network monitoring, and status UI

### Phase 1.5: Business Operations Foundation (INSERTED)
**Goal**: Database schema, payment infrastructure, and territory system operational to support booking portal, medic payouts, and UK-wide coverage management.

**Depends on**: Phase 1

**Requirements**: Booking system (online portal, auto-matching, recurring bookings), Payment processing (Stripe Connect, 40% markup, Net 30 invoicing), Territory management (UK postcode sectors, primary/secondary medics, coverage gaps), Payout automation (weekly Friday payouts via UK Faster Payments, IR35 compliance)

**Success Criteria** (what must be TRUE):
  1. Database tables exist for territories, bookings, clients, medics, timesheets, payments, invoices with RLS policies
  2. Stripe Connect account created for platform in test mode
  3. Can create Stripe Express account for test medic (onboarding flow works)
  4. Google Maps Distance Matrix API returns travel times for UK postcodes
  5. UK postcode sector database seeded (~11,232 sectors) with primary assignment capability
  6. Can create test booking with pricing calculation (base + urgency + travel + VAT)
  7. Auto-assignment algorithm ranks medics by distance, utilization, qualifications
  8. Out-of-territory cost logic calculates travel bonus vs room/board vs deny

**Plans**: 4 plans

Plans:
- [x] 01.5-01-PLAN.md -- Invoice sequencing, pricing calculation, and test data seeding (DB schema already exists)
- [x] 01.5-02-PLAN.md -- Stripe Connect integration (Express accounts, Payment Intents, webhooks)
- [x] 01.5-03-PLAN.md -- Auto-assignment algorithm and out-of-territory cost logic (Google Maps API already exists)
- [x] 01.5-04-PLAN.md -- UK postcode database seeding (~11,232 sectors with region mappings)

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

**Plans**: 10 plans

Plans:
- [x] 02-01-PLAN.md -- Dependencies, shared gloves-on UI components, and safety taxonomy data
- [x] 02-02-PLAN.md -- Photo capture/compression pipeline and signature pad component
- [x] 02-03-PLAN.md -- Worker profiles (search, quick-add, induction form, treatment history)
- [x] 02-04-PLAN.md -- Treatment logger core (full form with auto-save, body part picker, RIDDOR flag)
- [x] 02-05-PLAN.md -- Treatment quick mode (preset templates) and treatment list view
- [x] 02-06-PLAN.md -- Near-miss capture (photo-first, categories, severity, GPS tagging)
- [x] 02-07-PLAN.md -- Daily safety checklist (10 items, Green/Amber/Red, completion tracking)
- [x] 02-08-PLAN.md -- App navigation, home dashboard, workers tab, and integration verification
- [x] 02-09-PLAN.md -- [GAP CLOSURE] Fix auto-save timing (10s) and verify template presets
- [x] 02-10-PLAN.md -- [GAP CLOSURE] Fix import paths and verify offline functionality

### Phase 3: Sync Engine
**Goal**: Mobile app data syncs to backend automatically when connectivity available, with photo uploads that don't block workflow and zero data loss during transitions.

**Depends on**: Phase 2

**Requirements**: (No new functional requirements -- implements sync for existing Phase 2 data)

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

**Plans**: 7 plans

Plans:
- [x] 03-01-PLAN.md -- Install sync dependencies and create hybrid foreground/background sync scheduler
- [x] 03-02-PLAN.md -- Progressive photo upload pipeline with WiFi-only constraints and Supabase Storage
- [x] 03-03-PLAN.md -- Enhance SyncQueue with RIDDOR fast retry, LWW conflict resolution, and scheduler wiring
- [x] 03-04-PLAN.md -- Sync feedback UI (error display, RIDDOR critical alert, photo upload progress)
- [x] 03-05-PLAN.md -- Wire all Phase 2 forms to sync queue and mount sync UI in App.tsx
- [x] 03-06-PLAN.md -- [GAP CLOSURE] Add battery/network runtime constraints to background sync task
- [x] 03-07-PLAN.md -- [GAP CLOSURE] Add client-generated UUID idempotency keys to prevent duplicate creates on retry

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

**Plans**: 6 plans

Plans:
- [ ] 04-01-PLAN.md -- Dashboard scaffold with auth, Supabase SSR utilities, and responsive layout shell
- [ ] 04-02-PLAN.md -- Overview page with traffic-light compliance score and weekly summary stats
- [ ] 04-03-PLAN.md -- Treatment log with filtering/sorting, detail view with photos, and reusable DataTable
- [ ] 04-04-PLAN.md -- Near-miss log and worker registry pages with search and filters
- [ ] 04-05-PLAN.md -- Data export (CSV and PDF) and responsive polish
- [ ] 04-06-PLAN.md -- Integration verification checkpoint

### Phase 4.5: Marketing Website & Booking Portal (INSERTED)
**Goal**: Public-facing marketing website and client self-service booking portal operational with Stripe payment processing and auto-matching to medics.

**Depends on**: Phase 1.5, Phase 4

**Requirements**: Marketing website (Next.js SSG, <2s load, homepage/pricing/trust), Booking portal (Next.js SSR, calendar picker, site location, auto-matching, payment), Stripe integration (prepay for new clients, Net 30 for established), Client registration (company details, payment setup), Real-time availability checking, Booking confirmation (calendar invite, email notification)

**Success Criteria** (what must be TRUE):
  1. Marketing website loads in <2 seconds (Lighthouse score >90)
  2. Client can complete booking end-to-end in <5 minutes (calendar -> location -> payment -> confirmation)
  3. Stripe payment processing works in test mode (card charges successful)
  4. Auto-matching presents ranked medic candidates with transparency (distance, availability, rating)
  5. Pricing breakdown shows base + urgency premium + travel surcharge + VAT (20%)
  6. Medic receives booking notification email when assigned
  7. Client receives booking confirmation with calendar invite (.ics file)
  8. Established clients see Net 30 payment option (prepay bypassed)
  9. New clients must prepay via card (Stripe Payment Intent with 3D Secure)
  10. Recurring bookings can be created (same medic, weekly schedule)

**Plans**: 4 plans

Plans:
- [ ] 04.5-01-PLAN.md -- Marketing website with Next.js SSG (homepage, pricing, trust signals)
- [ ] 04.5-02-PLAN.md -- Booking portal calendar and site location input
- [ ] 04.5-03-PLAN.md -- Stripe payment integration (prepay vs Net 30 logic)
- [ ] 04.5-04-PLAN.md -- Auto-matching UI and booking confirmation flow

### Phase 4.6: Customer Onboarding & Contract Management (INSERTED)
**Goal**: Automated service agreement generation with business info auto-filled, document portal for phone sales, flexible payment terms (half upfront, remainder after completion), and digital signature collection.

**Depends on**: Phase 1.5, Phase 4.5

**Requirements**: Service agreement template generation (auto-fill client, site, dates, pricing, terms), Document portal (send agreements during phone calls, track status), Digital signature collection (DocuSign/HelloSign integration or native signing), Flexible payment schedules (full prepay, split payment, Net 30, custom terms), Payment milestone tracking (upfront payment, completion payment, 30-day terms), Document versioning and audit trail, Email notifications (document sent, viewed, signed), Admin document management (templates, sent documents, signature status)

**Success Criteria** (what must be TRUE):
  1. Service agreement auto-generates with client info (company name, contact, site address, dates) pre-filled from booking
  2. Pricing breakdown in agreement matches booking (base rate, hours, urgency premium, travel, VAT, total)
  3. Admin/sales can select payment terms per booking: Full prepay, Half upfront + half on completion, Half upfront + half Net 30, Full Net 30, Custom terms
  4. Payment terms in agreement update based on selection (e.g., "50% (500) due upon signing, 50% (500) due 30 days after service completion")
  5. Admin can send service agreement via portal during phone call with client (enter email, click send, get shareable link)
  6. Client receives email with link to view and sign agreement
  7. Client can view agreement in browser and sign digitally (signature pad or typed name)
  8. Agreement shows signature status in admin dashboard (Sent, Viewed, Signed, Completed)
  9. Signed agreement PDF stored in Supabase Storage with audit trail (who signed, when, IP address)
  10. Payment schedule enforces based on agreement (e.g., 50% charge on signature, 50% charge after booking completion)
  11. Admin can manage agreement templates (edit clauses, add custom terms, version control)
  12. Booking cannot be confirmed until agreement is signed (configurable per client)

**Plans**: 5 plans

Plans:
- [ ] 04.6-01-PLAN.md -- Service agreement template engine with auto-fill logic
- [ ] 04.6-02-PLAN.md -- Document portal for sending and tracking agreements
- [ ] 04.6-03-PLAN.md -- Digital signature capture (native signing with signature pad)
- [ ] 04.6-04-PLAN.md -- Flexible payment terms and payment schedule engine
- [ ] 04.6-05-PLAN.md -- Admin document management and template versioning

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

### Phase 5.5: Admin Operations Dashboards (INSERTED)
**Goal**: Admin dashboard operational with booking management, medic roster, territory coverage map, revenue tracking, timesheet approval, and client management capabilities.

**Depends on**: Phase 1.5, Phase 4, Phase 5

**Requirements**: Admin dashboard (extends existing Phase 4 web dashboard), Booking management (approve/reject/reassign/cancel), Medic management (roster, availability, territory assignments, utilization %, performance), Territory overview (coverage map, gap detection, hiring alerts), Revenue dashboard (per territory/medic, platform fees, cash flow projection), Timesheet approval (batch review, Friday payout preparation), Client management (accounts, payment status, booking history, Net 30 upgrades)

**Success Criteria** (what must be TRUE):
  1. Admin can view all bookings with filters (date range, status, medic, client)
  2. Admin can approve/reject bookings requiring manual review (emergency, out-of-territory, special requirements)
  3. Admin can reassign medic to different booking with reason
  4. Admin can view medic roster with availability calendar and territory assignments
  5. Admin can batch-approve 20 timesheets in <5 minutes (Friday payout workflow)
  6. Territory coverage map displays color-coded utilization (green <50%, yellow 50-80%, red >80%)
  7. Coverage gap alerts trigger when rejection rate >10% in territory
  8. Revenue dashboard shows platform fees earned per territory and per medic
  9. Cash flow projection warns when gap >30 days (pay medics before collecting from clients)
  10. Admin can upgrade client to Net 30 payment terms (from prepay)

**Plans**: 6 plans

Plans:
- [ ] 05.5-01-PLAN.md -- Bookings management tab with approval workflow
- [ ] 05.5-02-PLAN.md -- Medic management tab with roster and utilization
- [ ] 05.5-03-PLAN.md -- Territory coverage map with visual representation
- [ ] 05.5-04-PLAN.md -- Revenue dashboard with cash flow projections
- [ ] 05.5-05-PLAN.md -- Timesheet approval workflow for batch Friday payouts
- [ ] 05.5-06-PLAN.md -- Client management with payment terms and history

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

### Phase 6.5: Payment Processing & Payouts (INSERTED)
**Goal**: Full payment processing operational with client charging (card + Net 30), automated weekly medic payouts via UK Faster Payments, IR35 compliance, and out-of-territory cost management.

**Depends on**: Phase 1.5, Phase 5.5

**Requirements**: Stripe payment processing (card, 3D Secure, Payment Intents), Weekly medic payouts (automated Friday job via UK Faster Payments), Platform fee calculation (40% markup transparent to clients), Invoice generation (PDF with VAT 20%, Net 30 terms), Late payment handling (auto-reminders at 7/14/21 days, statutory fees), IR35 compliance (self-employed contractors, Stripe Express accounts, UTR collection), Timesheet workflow (medic logs -> manager approves -> admin batch-approves -> Friday payout), Out-of-territory cost management (travel bonus vs room/board vs deny booking)

**Success Criteria** (what must be TRUE):
  1. Client payment processing works (card charge via Stripe Payment Intent with 3D Secure)
  2. Friday payout job runs automatically (zero failures, every Friday at 9am)
  3. Medics receive funds within 2 business days via UK Faster Payments
  4. Platform fee calculation correct (medic 30/hr -> client 42/hr -> platform 12/hr)
  5. Invoice PDF generated with VAT (20%) and Net 30 terms for established clients
  6. Late payment auto-reminders send at 7, 14, 21 days with statutory late fees (40-100)
  7. Medic onboarding captures IR35 status (self-employed vs umbrella company)
  8. Stripe Express account onboarding link works (medic completes bank details)
  9. Payslip PDF generated (gross, deductions, net) for medic records
  10. Out-of-territory bookings calculate travel bonus (2/mile beyond 30 miles) vs room/board cost
  11. Admin sees cost breakdown and can approve/deny out-of-territory booking
  12. System denies booking if out-of-territory cost >50% of shift cost (admin can override)

**Plans**: 5 plans

Plans:
- [ ] 06.5-01-PLAN.md -- Client payment processing with Stripe (card, 3D Secure)
- [ ] 06.5-02-PLAN.md -- Friday payout automation with UK Faster Payments
- [ ] 06.5-03-PLAN.md -- Invoice generation with VAT and late payment handling
- [ ] 06.5-04-PLAN.md -- IR35 compliance and medic onboarding flow
- [ ] 06.5-05-PLAN.md -- Out-of-territory cost management (travel bonus vs room/board)

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

### Phase 7.5: Territory Management & Auto-Assignment (INSERTED)
**Goal**: UK-wide territory system operational with postcode-based coverage, intelligent auto-assignment algorithm, coverage gap detection, and hiring recommendations to scale medic roster.

**Depends on**: Phase 1.5, Phase 4.5, Phase 5.5

**Requirements**: Territory assignment (UK postcode sectors as primary unit, primary + secondary medic per sector), Auto-assignment algorithm (rank by distance, utilization, qualifications, availability, rating), Out-of-territory coverage logic (travel bonus vs room/board vs deny with cost comparison), Coverage gap detection (alert when rejection rate >10%), Hiring triggers (utilization >80% for 3+ weeks OR fulfillment rate <90%), Visual coverage map (choropleth with green/yellow/red utilization levels)

**Success Criteria** (what must be TRUE):
  1. UK postcode sector database fully seeded (~11,232 sectors) with assignment capability
  2. Can assign primary + secondary medic to postcode sector (drag-drop in admin UI)
  3. Auto-assignment algorithm ranks medics by: distance (via Google Maps) -> utilization (<70% preferred) -> qualifications (required certs) -> availability (calendar check) -> rating (>4.5 stars)
  4. Out-of-territory logic calculates travel time from secondary medic's home to site
  5. System compares travel bonus (2/mile beyond 30 miles) vs room/board cost (overnight stay)
  6. Admin sees cost breakdown and system recommends deny if cost >50% shift value
  7. Coverage gap alerts trigger when booking rejection rate >10% in territory for 3+ weeks
  8. Hiring recommendations display: "Hire medic in North London (N1-N22 sectors, 85% utilization)"
  9. Visual coverage map updates in real-time (5-minute refresh) with color-coded utilization
  10. Admin can click postcode sector to see assigned medic, stats, recent bookings
  11. Auto-assignment successfully matches 95% of bookings (tested with 100 simulated bookings)

**Plans**: 5 plans

Plans:
- [ ] 07.5-01-PLAN.md -- Territory assignment system with UK postcode sectors
- [ ] 07.5-02-PLAN.md -- Auto-assignment algorithm with ranking logic
- [ ] 07.5-03-PLAN.md -- Out-of-territory coverage logic (travel bonus vs room/board vs deny)
- [ ] 07.5-04-PLAN.md -- Coverage gap detection and hiring trigger alerts
- [ ] 07.5-05-PLAN.md -- Visual coverage map with admin drag-drop reassignment

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 1.5 -> 2 -> 3 -> 4 -> 4.5 -> 4.6 -> 5 -> 5.5 -> 6 -> 6.5 -> 7 -> 7.5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 5/5 | Complete | 2026-02-15 |
| 1.5. Business Operations Foundation | 4/4 | Complete | 2026-02-15 |
| 2. Mobile Core | 10/10 | Complete | 2026-02-15 |
| 3. Sync Engine | 7/7 | Complete | 2026-02-16 |
| 4. Web Dashboard | 0/6 | Not started | - |
| 4.5. Marketing Website & Booking Portal | 0/4 | Not started | - |
| 4.6. Customer Onboarding & Contract Management | 0/5 | Not started | - |
| 5. PDF Generation | 0/TBD | Not started | - |
| 5.5. Admin Operations Dashboards | 0/6 | Not started | - |
| 6. RIDDOR Auto-Flagging | 0/TBD | Not started | - |
| 6.5. Payment Processing & Payouts | 0/5 | Not started | - |
| 7. Certification Tracking | 0/TBD | Not started | - |
| 7.5. Territory Management & Auto-Assignment | 0/5 | Not started | - |

---
*Roadmap created: 2026-02-15*
*Phase 1 planned: 2026-02-15 -- 5 plans in 3 waves*
*Phase 1 revised: 2026-02-15 -- Updated criteria #4 (encryption deferred) and #8 (client-side audit logging added)*
*Coverage: 83/83 v1 requirements mapped*
*Business operations phases added: 2026-02-15 -- 5 decimal phases (1.5, 4.5, 5.5, 6.5, 7.5) with 24 plans total for multi-medic scaling (booking portal, payments, territory management)*
*Phase 1.5 planned: 2026-02-15 -- 4 plans in 1 wave (all parallel, DB schema and Google Maps API already exist from prior session)*
*Phase 4.6 added: 2026-02-15 -- Customer onboarding & contract management with service agreement generation, document portal for phone sales, flexible payment terms (half upfront + remainder after completion/Net 30), digital signatures, and payment schedule enforcement (5 plans)*
*Phase 2 planned: 2026-02-15 -- 8 plans in 3 waves (2 parallel foundation, 4 parallel features, 2 integration)*
*Phase 2 gap closure: 2026-02-15 -- 2 gap closure plans (02-09, 02-10) addressing 3 verification gaps (auto-save timing, template presets, offline import paths)*
*Phase 2 complete: 2026-02-15 -- 10/10 plans executed, verification passed (10/10 must-haves), goal achieved (offline mobile core with gloves-on usability)*
*Phase 3 planned: 2026-02-15 -- 5 plans in 3 waves (2 parallel foundation, 2 parallel enhancement, 1 integration with checkpoint)*
*Phase 3 progress: 2026-02-15 -- 4/5 plans complete (03-01 through 03-04 executed, 03-05 remaining for full phase completion)*
*Phase 3 gap closure: 2026-02-15 -- 2 gap closure plans (03-06, 03-07) addressing 2 verification gaps (battery constraints for background sync, client-generated UUID idempotency keys for duplicate prevention)*
*Phase 3 complete: 2026-02-16 -- 7/7 plans executed (initial 5 + 2 gap closure), verification passed (10/10 must-haves), goal achieved (automatic background sync with battery-friendly constraints and duplicate prevention)*
