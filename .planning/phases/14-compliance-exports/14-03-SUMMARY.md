---
phase: 14-compliance-exports
plan: 03
subsystem: ui
tags: [react, next.js, lucide-react, date-fns, certifications, medic-portal]

# Dependency graph
requires:
  - phase: 07-certification-tracking
    provides: certifications JSONB column on medics table (type, expiry_date, cert_number)
provides:
  - Certification expiry banners on medic profile page (red for <=7 days/expired, yellow for 8-30 days)
  - RENEWAL_URLS constant mapping cert types to renewal pages
  - getExpiringCerts helper function for computing expiry urgency
  - Certifications section listing all certs with color-coded expiry status
  - Extended MedicData interface with certifications, cest_assessment_date, cest_pdf_url
affects:
  - 14-04 (CEST evidence upload — uses same page.tsx, cest_assessment_date and cest_pdf_url already added to interface)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Cert expiry urgency pattern: critical (<=7 days or expired), warning (8-30 days), safe (>30 days)"
    - "In-app alert banners above action areas using dark glass styling (bg-red-900/20, bg-yellow-900/20)"
    - "RENEWAL_URLS constant for mapping cert type strings to external renewal pages"

key-files:
  created: []
  modified:
    - web/app/medic/profile/page.tsx

key-decisions:
  - "Added cest_assessment_date and cest_pdf_url to MedicData interface preemptively to avoid type conflict with plan 14-04"
  - "Banners placed above availability toggle so they are immediately visible on page load"
  - "Critical threshold is <=7 days OR expired (daysLeft <= 0), not just <=7 days"
  - "certifications || [] guard used everywhere to handle null/missing JSONB safely"

patterns-established:
  - "Cert expiry helper (getExpiringCerts) is pure function outside component — testable and reusable"
  - "daysLeft calculated with Math.ceil to avoid off-by-one on same-day expiry"

# Metrics
duration: 2min
completed: 2026-02-17
---

# Phase 14 Plan 03: Certification Expiry Banners — Summary

**In-app red/yellow expiry banners on medic profile with CSCS/CPCS/IPAF/PASMA/Gas Safe renewal links and color-coded cert list using getExpiringCerts helper**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-17T18:19:03Z
- **Completed:** 2026-02-17T18:21:38Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Red banner for certifications expired or expiring within 7 days, with "Renew now" external links
- Yellow banner for certifications expiring in 8-30 days, with "Renew now" external links
- Certifications section listing all certs with green/yellow/red color-coded expiry dates
- Extended MedicData interface with certifications, cest_assessment_date, and cest_pdf_url for plan 14-04 compatibility
- Null/empty guard via `certifications || []` throughout — page cannot crash on missing data

## Task Commits

Each task was committed atomically:

1. **Task 1: Add certification expiry banners to medic profile** - `43bfe31` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `web/app/medic/profile/page.tsx` - Added RENEWAL_URLS, CertExpiry interface, getExpiringCerts helper, critical/warning banners above availability toggle, Certifications section after Qualifications, extended MedicData interface

## Decisions Made
- Preemptively added `cest_assessment_date` and `cest_pdf_url` to MedicData interface to prevent type conflicts when plan 14-04 runs on the same file
- Placed expiry banners above the availability toggle (top of content) so they are immediately visible
- Used `Math.ceil` for daysLeft so a cert expiring today shows 0 (expired) not 1 (one day remaining)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None — `date-fns` was already installed (v4.1.0), `lucide-react` icons (AlertTriangle, ExternalLink) were available, and `select('*')` already returns certifications JSONB.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 14-04 (CEST evidence upload) can proceed — the MedicData interface already has `cest_assessment_date` and `cest_pdf_url` fields pre-added, avoiding merge conflicts
- The medic profile page styling patterns are established for further UI additions

---
*Phase: 14-compliance-exports*
*Completed: 2026-02-17*
