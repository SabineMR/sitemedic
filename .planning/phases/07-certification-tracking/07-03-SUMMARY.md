---
phase: 07-certification-tracking
plan: 03
subsystem: web-dashboard
tags: [react, tanstack-query, dashboard, certification-tracking, compliance-score, ui-components]

# Dependency graph
requires:
  - phase: 07-certification-tracking
    plan: 01
    provides: GIN index, RPC functions, TypeScript types
  - phase: 07-certification-tracking
    plan: 02
    provides: Query hooks and status badge component (created ahead of schedule)
provides:
  - Certifications dashboard page with summary cards and tabbed expiry view
  - Real expired cert count integration in compliance score
  - Sidebar navigation link to certifications page
affects: [compliance-scoring, certification-management, medic-compliance-tracking]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dashboard page pattern: summary cards + tabbed data table"
    - "TanStack Query hooks with 60-second polling for real-time updates"
    - "Org-scoped data filtering via useRequireOrg context"
    - "Client-side JSONB filtering for flexible time window queries"

key-files:
  created:
    - web/app/(dashboard)/certifications/page.tsx
  modified:
    - web/lib/queries/compliance.ts
    - web/app/(dashboard)/layout.tsx

key-decisions:
  - "Client-side JSONB filtering for expiring certs - allows flexible time windows (30/60/90 days) without additional RPC functions"
  - "Summary cards show medic count, not cert count - more actionable for site managers (which medics need attention)"
  - "Compliance score counts medics with ANY expired cert - conservative approach for safety-critical industry"
  - "Sidebar placement after Workers - logical grouping (Workers → Certifications → Contracts)"

patterns-established:
  - "Pattern: Dashboard page with summary cards + tabbed table - reusable for other compliance features"
  - "Pattern: Real-time compliance metrics - polling queries keep dashboard accurate without manual refresh"
  - "Pattern: JSONB client-side filtering - trade bandwidth for flexibility (acceptable with <500 medics)"

# Metrics
duration: 3min
completed: 2026-02-16
---

# Phase 7 Plan 03: Certification Dashboard & Compliance Integration Summary

**Certifications dashboard with tabbed expiry view, real expired cert count in compliance score, and sidebar navigation**

## Performance

- **Duration:** 3 minutes
- **Started:** 2026-02-17T00:40:28Z
- **Completed:** 2026-02-17T00:44:15Z
- **Tasks:** 2 (1 pre-completed, 1 executed)
- **Files modified:** 3 (1 created, 2 modified)

## Accomplishments
- Certifications dashboard page shows summary cards (expired/expiring-soon/compliant medics) and tabbed table for 30/60/90 day windows + expired
- Compliance score now queries real expired certification count (replaces hardcoded 0 placeholder from Phase 4)
- Sidebar navigation includes Certifications link with ShieldCheck icon (placed after Workers, before Contracts)
- Empty states for tabs with no certifications in time window
- All queries use org context for multi-tenant filtering
- 60-second polling on certification data for real-time accuracy

## Task Commits

Each task was committed atomically:

1. **Task 1: Create certification query hooks and status badge component** - Pre-completed in plan 07-02 (commit `1765884`)
   - useCertificationSummary and useExpiringCertifications hooks already existed
   - CertificationStatusBadge component already existed
   - Files created ahead of schedule in previous plan

2. **Task 2: Create certifications dashboard page and integrate with compliance score** - `bd09ebb` (feat)
   - CertificationsPage with summary cards and tabbed expiry table
   - compliance.ts updated to query real expired cert count
   - layout.tsx updated with Certifications nav item

## Files Created/Modified

- `web/app/(dashboard)/certifications/page.tsx` (created) - Dashboard page with 3 summary cards (expired/expiring/compliant), Tabs component for 30/60/90/expired views, table with medic name/cert type/number/expiry/days remaining/status badge, empty states with CheckCircle2 icon
- `web/lib/queries/compliance.ts` (modified) - Replaced `const expiredCerts = 0;` with real query: fetch medics.certifications JSONB, client-side filter for expired certs, count medics with any expired cert
- `web/app/(dashboard)/layout.tsx` (modified) - Added ShieldCheck import, added Certifications nav item between Workers and Contracts

## Decisions Made

1. **Client-side JSONB filtering for expiring certs:** Chose to fetch all medics with certifications and filter client-side rather than creating additional RPC functions for each time window. Rationale: Flexible time windows (30/60/90 days, expired), no DB migration required, acceptable bandwidth with <500 medics per org, simplifies architecture.

2. **Summary cards show medic count, not cert count:** Dashboard displays "5 non-compliant medics" rather than "12 expired certifications". Rationale: Site managers care about which medics need action, not total cert count. Actionable metric aligns with workforce management workflow.

3. **Compliance score counts medics with ANY expired cert:** A medic with 1 expired cert among 5 total counts as "expired". Rationale: Safety-critical construction industry - single expired cert means medic shouldn't be on site. Conservative approach prevents compliance gaps.

4. **Sidebar placement after Workers:** Certifications nav item placed between Workers and Contracts in sidebar. Rationale: Logical flow - manage workers → check their certifications → manage their contracts. Grouping related workforce management features.

5. **Days window -1 for expired tab:** useExpiringCertifications(daysWindow: -1) fetches expired certs. Rationale: Special sentinel value distinguishes "expired" (past date) from "expiring within N days" (future date within window). Clean API for tab switching.

## Deviations from Plan

### Task 1 Pre-Completed

**[Previous plan scope creep]**

- **Found during:** Task 1 execution
- **Issue:** Plan 07-02 (certification-expiry-checker Edge Function) created query hooks and badge component that were specified for plan 07-03
- **Impact:** Task 1 files (web/lib/queries/admin/certifications.ts, web/components/dashboard/certification-status-badge.tsx) already existed in commit `1765884`
- **Resolution:** Verified existing files met all Task 1 requirements (useCertificationSummary, useExpiringCertifications hooks, getCertificationStatus function, CertificationStatusBadge component). No changes needed.
- **Files affected:** web/lib/queries/admin/certifications.ts, web/components/dashboard/certification-status-badge.tsx
- **Commit:** Already committed in plan 07-02 (`1765884`)
- **Note:** This is not a deviation of plan 07-03 - plan 07-03 was executed correctly. The deviation occurred in plan 07-02 which created files beyond its scope.

No other deviations - plan executed as written for remaining tasks.

## Issues Encountered

None. TypeScript compilation passed, dashboard page renders correctly with tabbed view, compliance score integration working.

## User Setup Required

None - no external service configuration required. This plan only creates UI components and updates existing queries.

## Next Phase Readiness

**Ready for Plan 04 (certification reminders dashboard):**
- Query hooks provide real-time certification data for reminder management UI
- Status badge component ready for reminder history display
- Sidebar navigation pattern established for adding Reminders sub-page

**Ready for certification expiry alerts:**
- Compliance score now reflects real expired cert count - activates amber/red traffic light
- Dashboard provides visibility into which medics need renewal action

**Ready for certification upload/management:**
- Dashboard shows current state - clear where new cert uploads should appear
- Status badge provides instant visual feedback when certs are uploaded

**No blockers.** Certification tracking UI complete and integrated with existing compliance infrastructure.

---
*Phase: 07-certification-tracking*
*Completed: 2026-02-16*
