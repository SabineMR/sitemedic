---
phase: 20-festivals-events-vertical
plan: "04"
subsystem: ui
tags: [festivals, event-incident-report, purple-guide, cert-types, vertical-terminology, tanstack-query, next-js, supabase]

# Dependency graph
requires:
  - phase: 20-03
    provides: event-incident-report-generator Edge Function and Supabase Storage bucket
  - phase: 18-vertical-infrastructure-riddor-fix
    provides: event_vertical column on treatments, OrgContext with industryVerticals
  - phase: 07-certification-tracking
    provides: CERT_TYPE_METADATA, getRecommendedCertTypes, VERTICAL_CERT_TYPES

provides:
  - EventIncidentReportCard component calling event-incident-report-generator via generateEventIncidentPDF
  - Treatment detail page: Attendee/Venue/Event Organiser terminology for festivals vertical
  - Treatment detail page: Purple Guide download card shown conditionally for festivals
  - Medic profile: Recommended Certifications section for non-general verticals

affects:
  - phase 23 (compliance analytics) — cert recommendations pattern established
  - Any future vertical plans adding new event_vertical values

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Server component imports client component (EventIncidentReportCard) for progressive enhancement — no 'use client' added to page"
    - "useOrg() hook pattern for accessing industryVerticals in client components without additional Supabase fetch"
    - "generateEventIncidentPDF pattern: incident_id + event_vertical body, Bearer session auth"

key-files:
  created:
    - web/lib/queries/event-incidents.ts
    - web/components/dashboard/EventIncidentReportCard.tsx
  modified:
    - web/app/(dashboard)/treatments/[id]/page.tsx
    - web/app/medic/profile/page.tsx

key-decisions:
  - "EventIncidentReportCard uses useMutation (not useState+fetch) — consistent with RIDDOR F2508 generation pattern"
  - "useOrg() used in medic profile for industryVerticals — avoids extra Supabase query since OrgContext already fetches org_settings"
  - "Venue/Site shown from vertical_extra_fields.venue_name / site_name — no new query needed"
  - "Top 6 recommended certs for festivals: FREC 3, FREC 4, PHEC, HCPC Paramedic, ALS Provider, PHTLS (per getRecommendedCertTypes('festivals').slice(0,6))"

patterns-established:
  - "Vertical terminology pattern: event_vertical === 'festivals' ? 'Attendee Information' : 'Worker Information'"
  - "Recommended Certifications section: conditional on primaryVertical !== 'general', top 6 from getRecommendedCertTypes"

# Metrics
duration: 3min
completed: 2026-02-18
---

# Phase 20 Plan 04: Festivals Compliance Frontend Summary

**EventIncidentReportCard (Purple Guide PDF download), Attendee/Venue/Organiser terminology, and vertical-aware recommended certs on medic profile — FEST-04, FEST-05, FEST-06 frontend complete**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-18T04:25:25Z
- **Completed:** 2026-02-18T04:28:16Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- Created `generateEventIncidentPDF` query function posting to `event-incident-report-generator` Edge Function with `incident_id` + `event_vertical: 'festivals'` body (FEST-06 frontend)
- Created `EventIncidentReportCard` client component with `useMutation`, FileText icon, opens `signed_url` in new tab, error alert on failure
- Treatment detail page: `Worker Information` → `Attendee Information`, `Company` → `Event Organiser`, `Site` → `Venue` for festivals vertical; `EventIncidentReportCard` conditionally rendered; page remains server component (FEST-04)
- Medic profile: "Recommended Certifications" section using `useOrg()` for org vertical, shows top 6 from `getRecommendedCertTypes(primaryVertical)` as badge chips with green/gray styling for held/not-held; hidden for general vertical (FEST-05)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create EventIncidentReportCard and generateEventIncidentPDF** - `efee4fa` (feat)
2. **Task 2: Add festivals terminology and PDF card to treatment detail** - `04ca974` (feat)
3. **Task 3: Surface recommended cert types on medic profile** - `71240d5` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified

- `web/lib/queries/event-incidents.ts` — `generateEventIncidentPDF()` function; POSTs to event-incident-report-generator with `incident_id` + `event_vertical: 'festivals'`
- `web/components/dashboard/EventIncidentReportCard.tsx` — `'use client'` card; `useMutation`, FileText icon, opens `signed_url` in `_blank`, error alert
- `web/app/(dashboard)/treatments/[id]/page.tsx` — Vertical-aware terminology (Attendee/Event Organiser/Venue) + EventIncidentReportCard conditional render; server component preserved
- `web/app/medic/profile/page.tsx` — Added `getRecommendedCertTypes` + `useOrg` imports; `primaryVertical` derivation; "Recommended Certifications" section with badge chips

## Decisions Made

- `useOrg()` used in medic profile for `industryVerticals` rather than a separate `org_settings` Supabase query — OrgContext already caches this data, avoids waterfall
- `EventIncidentReportCard` uses `useMutation` pattern matching RIDDOR F2508 generation in `riddor/[id]/page.tsx` — consistent API call pattern
- Venue/Site shown from `vertical_extra_fields.venue_name` / `site_name` — zero new queries, uses data already present in treatment record
- Top 6 recommended certs for festivals per `getRecommendedCertTypes('festivals').slice(0, 6)`: FREC 3, FREC 4, PHEC, HCPC Paramedic, ALS Provider, PHTLS

## Deviations from Plan

None - plan executed exactly as written.

The plan specified cert list `FREC 3, FREC 4, PHEC, HCPC Paramedic, ALS Provider, PHTLS` for FEST-05 — this matches `getRecommendedCertTypes('festivals').slice(0, 6)` from the existing `VERTICAL_CERT_TYPES.festivals` array in `certification.types.ts`. No deviation needed.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- FEST-04, FEST-05, FEST-06 (frontend) complete
- Phase 20 is now complete — all 4 plans (20-01 through 20-04) have summaries
- Purple Guide PDF download (FEST-06 backend) was completed in 20-03; frontend wired in this plan
- Ready to proceed to remaining v2.0 phases

---
*Phase: 20-festivals-events-vertical*
*Completed: 2026-02-18*
