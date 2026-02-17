# SiteMedic Roadmap

## v1.0 — MVP
**Status:** ✅ SHIPPED 2026-02-16
**Phases:** 01 → 07.5 (13 phases, 84 plans)
See: `.planning/milestones/v1.0-ROADMAP.md`

---

## v1.1 — Post-MVP Polish & Data Completeness
**Status:** 🔧 In Progress
**Source:** Codebase gap analysis (2026-02-17)
**Phases:** 08 → 15 (8 phases, ~33 plans)

### Overview

v1.1 closes gaps identified in the post-v1.0 codebase audit. The focus is on surfacing data already being collected, completing backend features that have no UI, making the platform production-ready with proper loading/error states, and opening analytics that have been running silently in the background. No new features — just completing what was already built.

---

### Phase 08: Lead Capture & Data Persistence ✅ COMPLETE
**Goal:** Persist contact form and quote builder submissions to the database so no lead is lost and admins can follow up.
**Priority:** CRITICAL
**Completed:** 2026-02-17

**Problem:** Contact form sends email only (no DB write). Quote Builder saves to `sessionStorage` — data is lost after session. Zero lead tracking or CRM capability.

**Requirements:**
- Persist contact form submissions to `contact_submissions` table with full enquiry details
- Persist quote submissions to `quote_submissions` table with all pricing inputs
- Admin view: contact and quote submission list with follow-up status
- Quote-to-booking shortcut: admin can convert a quote to a booking pre-filled with quote data

**Success Criteria:**
1. Contact form submission is visible in admin panel within 60 seconds ✅
2. Quote submission survives browser close and is retrievable by admin ✅
3. Admin can mark leads as `new`, `contacted`, `converted`, `closed` ✅
4. Quote data pre-fills the booking form when admin clicks "Convert to Booking" ✅

**Plans:** 4 plans

Plans:
- [x] 08-01-PLAN.md — Database migration: contact_submissions + quote_submissions tables with RLS
- [x] 08-02-PLAN.md — API route updates: DB-first persistence for contact and quote routes
- [x] 08-03-PLAN.md — Admin submissions page with contact/quote tabs and inline status management
- [x] 08-04-PLAN.md — Quote-to-booking pre-fill via URL search params on new booking form

---

### Phase 09: Booking Data Completeness ✅ COMPLETE
**Goal:** Surface all booking data that is collected but never displayed — ensuring admins, clients, and medics see the full picture.
**Priority:** HIGH
**Completed:** 2026-02-17

**Problem:** Many booking fields are stored in the database but never shown in any UI view: `specialNotes`, `recurrencePattern`, `what3words_address`, `site_contact_name`, `site_contact_phone`, `approval_reason`, `cancellation_reason`, `refund_amount`.

**Requirements:**
- Booking confirmation page shows `specialNotes`, `recurrencePattern`, `recurringWeeks`, `what3words_address`
- Admin booking detail view shows `site_contact_name`, `site_contact_phone`, `approval_reason`, `cancellation_reason`, `refund_amount`
- Recurring booking chain view: list all bookings in a recurrence group with their status
- What3words address displayed with copy button and link to what3words.com

**Success Criteria:**
1. Client sees their special notes and what3words address on booking confirmation
2. Admin sees why a booking needed approval and who cancelled it (if applicable)
3. Recurring booking chain shows all N instances with per-instance status
4. Refund amount visible in admin view when applicable

**Plans:** 3 plans

Plans:
- [x] 09-01-PLAN.md — What3WordsDisplay component + API fix + confirmation page data surfacing
- [x] 09-02-PLAN.md — BookingWithRelations type fix + admin booking detail Sheet panel
- [x] 09-03-PLAN.md — Wire View Details button + What3Words integration + recurring chain view

---

### Phase 10: Real-Time Operations Polish ✅ COMPLETE
**Goal:** Make the command centre actually usable in a live shift: admins know who each dot on the map is, can act on every alert, and users can recover from payment failures without calling support.
**Priority:** HIGH
**Completed:** 2026-02-17

**Problem:** Three critical operational gaps — (1) medic location pings have no names or booking context (TODO in code), (2) payment failures have no recovery UI leaving users stuck, (3) the alert system defines 9 alert types but none are actionable with escalation, notes, or suggested actions.

**Requirements:**
- `useMedicLocationsStore` resolves the TODO: join medic name, booking site, and shift times to each location ping (photo descoped — no column exists)
- Command center map marker shows medic name + current booking site + shift hours on hover/tap
- Payment failure screen has: retry button, "Contact Support" mailto link, reference number
- Alert panel: `dismissal_notes` and `resolution_notes` input when dismissing/resolving
- Alert panel: bulk dismiss for non-critical alerts (low/medium severity only)
- Alert panel: suggested action per alert type (static lookup, 9 alert types)
- Alert panel: auto-escalation if unacknowledged after 15 minutes (red pulse + sound once per alert)
- Command center contact button: fallback to "Send Message" mailto when `medicPhone` is null

**Success Criteria:**
1. Command center shows "Kai Jensen — Royal Exchange Site, 07:00-15:00" on map marker
2. Payment failure page has a working retry button that re-attempts the same payment intent
3. Dismissing an alert prompts for a note and logs it to `medic_alerts` table
4. Unacknowledged `geofence_failure` alert escalates to red pulsing state after 15 minutes

**Plans:** 5 plans

Plans:
- [x] 10-01-PLAN.md — Resolve location store TODO: medicContext Map with joined medic+booking query
- [x] 10-02-PLAN.md — Map marker popup: add shift time display to Leaflet Popup
- [x] 10-03-PLAN.md — Payment retry: retry button, reference number, support mailto
- [x] 10-04-PLAN.md — Alert notes end-to-end + bulk dismiss for non-critical alerts
- [x] 10-05-PLAN.md — Alert escalation timer, suggested actions, contact fallback

---

### Phase 11: Organisation Settings ✅ COMPLETE
**Goal:** Replace all hardcoded business configuration values with per-organisation settings stored in the database.
**Priority:** MEDIUM
**Completed:** 2026-02-17

**Problem:** Key business values are hardcoded in source files — `baseRate: 42`, `DEFAULT_RADIUS: 200`, urgency premiums `[0, 20, 50, 75]`, admin email fallback. These cannot be customised per organisation without a code change.

**Requirements:**
- `org_settings` table with columns: `base_rate`, `geofence_default_radius`, `urgency_premiums` (JSONB), `admin_email`, `net30_eligible`, `credit_limit`
- Admin settings page at `/admin/settings` surfacing all configurable values
- Booking pricing logic reads `base_rate` from org settings (not hardcoded 42)
- Geofence creation defaults to org's `geofence_default_radius`
- Urgency premium validation reads from org settings array

**Success Criteria:**
1. Admin changes base rate from £42 to £45 in settings — new bookings use £45
2. Geofence "Add" pre-fills radius with org's configured default
3. Settings page validates: base rate must be > 0, radius must be 50–5000m

**Plans:** 3 plans

Plans:
- [x] 11-01-PLAN.md — Database migration: org_settings table with constraints, RLS, and seed data
- [x] 11-02-PLAN.md — Admin settings API route (GET/PUT) and Business Configuration UI section
- [x] 11-03-PLAN.md — Wire all 7 consumer files to read from org_settings (remove hardcoded values)

---

### Phase 12: Analytics Dashboard ✅ COMPLETE
**Goal:** Visualise the operational metrics that have been computed in the background since Phase 07.5 but never surfaced to admins.
**Priority:** MEDIUM
**Completed:** 2026-02-17

**Problem:** `lib/territory/metrics.ts`, `lib/territory/hiring-triggers.ts`, `lib/territory/coverage-gaps.ts`, and auto-assignment success tracking all produce data that is never shown anywhere. Admins are flying blind on capacity, coverage, and medic utilisation.

**Requirements:**
- New admin analytics tab showing: territory coverage heatmap, hiring trigger alerts, coverage gap table
- Auto-assignment success rate chart (weekly, last 12 weeks)
- Medic utilisation breakdown per medic (% of available days booked)
- Out-of-territory booking frequency and cost impact
- Late arrival pattern chart (which medics, which sites, which days)
- Hiring trigger cards: show exactly which sectors need hiring and why

**Success Criteria:**
1. Admin sees "Manchester M1 — 94% utilisation for 4 weeks — HIRE NOW" card
2. Auto-assignment success rate chart shows last 12 weeks without errors
3. Medic utilisation table sortable by utilisation %
4. Coverage gap table shows sectors with >10% rejection rate

**Plans:** 5 plans

Plans:
- [x] 12-04-PLAN.md — Analytics data API: TanStack Query hooks for all chart data sources (Wave 1)
- [x] 12-01-PLAN.md — Territory analytics components: heatmap, hiring trigger cards, coverage gap table (Wave 2)
- [x] 12-02-PLAN.md — Assignment analytics components: success rate chart, failure breakdown (Wave 2)
- [x] 12-03-PLAN.md — Medic utilisation components: sortable table, OOT bookings, late arrival heatmap (Wave 2)
- [x] 12-05-PLAN.md — Wire all 3 new tabs into analytics page in single pass (Wave 3)

---

### Phase 13: UX Polish & Missing States ✅ COMPLETE
**Goal:** Add skeleton loaders to all data-heavy pages, add a visual geofence map picker, wire geofence exit alerts, and complete RIDDOR incident management.
**Priority:** MEDIUM
**Completed:** 2026-02-17

**Problem:** Multiple pages show plain "Loading..." text with no skeletons. The geofence form requires manual lat/lng entry with no map. RIDDOR drafts have no auto-save, no audit trail, no photo gallery.

**Requirements:**
- Skeleton loaders on: `/dashboard/treatments`, `/dashboard/workers`, `/platform/organizations`, `/admin/command-center`
- Geofence creation form: replace lat/lng inputs with an interactive Leaflet map picker
- Geofence: real-time exit alert — when medic location ping is outside assigned geofence, create `medic_alert` of type `geofence_failure`
- Geofence coverage analytics: show % of booking sites covered by at least one active geofence
- RIDDOR: auto-save draft every 30 seconds (debounced, no toast)
- RIDDOR detail page: audit trail section showing all status changes with timestamp + actor
- RIDDOR detail page: photo gallery for incident evidence photos

**Success Criteria:**
1. Treatments page shows 6 skeleton rows during data fetch (no layout shift) ✅
2. Geofence "Add" page has a map — click to place centre, drag to resize radius ✅
3. Medic stepping outside geofence triggers alert in admin command centre within 60 seconds ✅
4. RIDDOR draft survives a page refresh (auto-save working) ✅
5. RIDDOR detail shows "Status changed: draft → submitted by Kai Jensen at 14:32" ✅

**Plans:** 4 plans

Plans:
- [x] 13-01-PLAN.md — Skeleton loaders for treatments, workers, organizations, and command center (Wave 1)
- [x] 13-02-PLAN.md — Geofence schema fix + interactive Leaflet map picker (Wave 1)
- [x] 13-03-PLAN.md — Geofence exit alert: haversine distance check on every ping (Wave 2)
- [x] 13-04-PLAN.md — RIDDOR auto-save, audit trail, and photo gallery (Wave 2)

---

### Phase 14: Compliance, Exports & Medic Portal ✅ COMPLETE
**Goal:** Enable data export across all key record types, show certification expiry alerts in the UI, display IR35 results, surface contract version history, and allow payslip PDF download.
**Priority:** MEDIUM/LOW
**Completed:** 2026-02-17

**Problem:** Multiple backend systems produce data that users cannot extract or act on: certifications expire silently in the UI despite a backend cron, IR35 assessments have a form and API but show no results, contracts have an amendment trail that is invisible, and payslips can only be viewed (not downloaded).

**Requirements:**
- Payslip PDF download button in medic portal (generates signed URL from Supabase Storage)
- Export buttons for: RIDDOR reports (PDF), timesheets (CSV), booking history (CSV), invoice history (CSV)
- Certification expiry UI alerts: banner on medic profile page when any cert expires within 30 days
- IR35 assessment: show current status (`self_employed` / `umbrella` / `inside_ir35`) and last assessment date on medic profile
- IR35 assessment history: last 3 assessments with dates
- Contract detail: version history tab showing all PDF versions with download links
- Contract detail: amendment trail showing all status transitions with actor + timestamp
- Contract detail: milestone payment tracker showing completion status per milestone

**Success Criteria:**
1. Medic downloads their December 2025 payslip as a PDF in 2 clicks ✅
2. Admin exports all RIDDOR incidents for Q1 2026 as a formatted PDF ✅
3. Medic profile shows yellow banner "CSCS expires in 18 days — Renew now" ✅
4. IR35 section shows "Self-employed — last assessed 2026-01-15" ✅
5. Contract detail shows 3 versions: v1 (draft), v2 (amended), v3 (signed) ✅

**Plans:** 5 plans

Plans:
- [x] 14-01-PLAN.md — Payslip PDF download: use stored pdf_url first, edge function fallback
- [x] 14-02-PLAN.md — Export buttons: RIDDOR PDF, timesheets CSV, bookings CSV, invoices CSV
- [x] 14-03-PLAN.md — Medic profile: certification expiry banners with renewal links
- [x] 14-04-PLAN.md — Medic profile: IR35 status display with assessment date and CEST PDF
- [x] 14-05-PLAN.md — Contract detail: fix PDF downloads, readable timeline, milestone tracker

---

### Phase 15: Code Quality & Housekeeping ✅ COMPLETE
**Goal:** Remove production console statements, add admin UI for manual booking matching, and fix schedule board fallback mode.
**Priority:** LOW
**Completed:** 2026-02-17

**Problem:** 133 `console.log/warn/error` statements remain in production app code. `/api/bookings/match` has no admin UI for manual override. The schedule board's conflict checking is incomplete in fallback mode (mock data left active).

**Requirements:**
- Sweep and remove all non-error `console.log` and `console.warn` from `/web/app/**` (replace data inspection logs with proper structured logging or remove)
- Keep `console.error` only where there is no better error reporting path
- Admin booking detail: "Assign Medic Manually" button that calls `/api/bookings/match` with a selected medic override
- Schedule board: remove mock data generator from fallback path, replace with proper empty state
- Schedule board: complete conflict checking in non-mock mode (two bookings same medic same time)

**Success Criteria:**
1. Zero `console.log` statements in production build output ✅
2. Admin can manually assign a specific medic to an unmatched booking ✅
3. Schedule board shows "No bookings scheduled" empty state when data is empty (not mock shifts) ✅
4. Schedule board detects and flags double-booking conflicts in production data ✅

**Plans:** 3 plans

Plans:
- [x] 15-01-PLAN.md — Console sweep: remove 3 console.warn from API routes (Wave 1)
- [x] 15-02-PLAN.md — Schedule board: remove mock data fallback, add proper error/empty states (Wave 1)
- [x] 15-03-PLAN.md — Manual medic assignment: extend match endpoint + booking detail panel dialog (Wave 2)

---

## Upcoming (v2.0)

- Film/TV mode (different labels, same platform)
- Heat map visualisation for near-miss patterns
- Trend analysis charts
- Multi-project support per medic
- Tier 3/4 subscription features
- Android app
