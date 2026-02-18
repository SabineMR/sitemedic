---
phase: 23-analytics-heat-maps-and-trend-charts
plan: 05
subsystem: ui
tags: [recharts, tanstack-query, compliance, analytics, admin, composedchart]

# Dependency graph
requires:
  - phase: 23-04
    provides: compliance-history.ts with useComplianceHistory + useIncidentFrequency hooks; compliance_score_history table
  - phase: 23-01
    provides: compliance_score_history writer Edge Function; formula v1 frozen
provides:
  - AdminComplianceTrendPoint and OrgComplianceRanking interfaces
  - useAdminComplianceTrend() hook (queryKey admin-compliance-trend, 52-period window, avg/min/max per period)
  - useOrgComplianceRanking() hook (queryKey org-compliance-ranking, top-2 scores per org, trend up/down/stable)
  - AdminComplianceTrend component (ComposedChart with Line avg + Area min/max band)
  - OrgComplianceTable component (ranked table, top/bottom 5 accented, trend arrows)
  - Compliance tab (9th tab) added to /admin/analytics page
affects:
  - Future compliance dashboard enhancements
  - Phase 24+ if added (platform admin reporting)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ComposedChart container required when mixing Line + Area Recharts elements"
    - "Named export dynamic import: .then(m => ({ default: m.NamedExport })) for ssr:false"
    - "Admin aggregate hooks: no org filter + client-side grouping for cross-org stats"
    - "Two-step DB query: compliance_score_history then organizations WHERE id IN (uniqueOrgIds)"
    - "isNewTab guard extended with each new autonomous tab to bypass legacy loading state"

key-files:
  created:
    - web/components/analytics/AdminComplianceTrend.tsx
    - web/components/analytics/OrgComplianceTable.tsx
  modified:
    - web/lib/queries/analytics/compliance-history.ts
    - web/app/admin/analytics/page.tsx

key-decisions:
  - "ComposedChart (not LineChart) used for AdminComplianceTrend — Area elements require ComposedChart as parent"
  - "Admin compliance hooks fetch all orgs (no org filter); admin RLS policy allows all rows"
  - "Client-side grouping by period_end for trend aggregation — avoids complex SQL GROUP BY across admin boundary"
  - "Two-step query: compliance_score_history then organizations table for org names — consistent with 23-03 pattern"
  - "Top 5 / bottom 5 accent threshold hardcoded as visual convention (not configurable)"
  - "orgScoreMap takes only latest 2 scores per org (rows DESC by period_start) for trend computation"

patterns-established:
  - "ComposedChart pattern: Area(max) + Area(min fill=bg) + Line(avg) creates shaded band effect"
  - "OrgComplianceTable: border-l-4 border-green-500 for top 5, border-red-500 for bottom 5"
  - "Trend computation: compare scores[0] (latest) vs scores[1] (previous) with up/down/stable"

# Metrics
duration: 2min
completed: 2026-02-18
---

# Phase 23 Plan 05: Admin Compliance Analytics Summary

**ComposedChart aggregate compliance trend + org ranking table added as 9th tab to /admin/analytics; useAdminComplianceTrend and useOrgComplianceRanking hooks wired to compliance_score_history; ANLT-06 closed**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-18T05:38:14Z
- **Completed:** 2026-02-18T05:40:28Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Added useAdminComplianceTrend() and useOrgComplianceRanking() hooks to compliance-history.ts (now 4 hooks total)
- Created AdminComplianceTrend.tsx using ComposedChart with Line (avg) + two Area elements (min/max band) for shaded range
- Created OrgComplianceTable.tsx with full org ranking, top-5 green / bottom-5 red accents, ArrowUp/Down/Minus trend indicators
- Admin analytics page now has 9 tabs; Compliance tab lazy-loads both components via ssr:false dynamic imports

## Task Commits

Each task was committed atomically:

1. **Task 1: Add admin compliance query hooks to compliance-history.ts** - `1ae943f` (feat)
2. **Task 2: Create AdminComplianceTrend + OrgComplianceTable + add Compliance tab** - `434e0c7` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `web/lib/queries/analytics/compliance-history.ts` - Added AdminComplianceTrendPoint + OrgComplianceRanking interfaces; added useAdminComplianceTrend() and useOrgComplianceRanking() hooks
- `web/components/analytics/AdminComplianceTrend.tsx` - New: ComposedChart aggregate trend with min/max Area band and avg Line; custom tooltip showing avg/min/max/org_count
- `web/components/analytics/OrgComplianceTable.tsx` - New: full ranked compliance table; top 5 green accent; bottom 5 red accent; trend arrows from lucide-react
- `web/app/admin/analytics/page.tsx` - Added dynamic imports for both components; added 'compliance' to activeTab union + isNewTab guard + tabs array + content section (9th tab)

## Decisions Made
- ComposedChart (not LineChart) selected as container — Recharts requires ComposedChart when mixing Line and Area elements in the same chart
- Admin hooks fetch all compliance_score_history rows for vertical='general' without org filter — admin RLS allows access; client-side grouping by period_end avoids complex multi-tenant SQL
- Two-step DB query pattern for org names (compliance_score_history then organizations WHERE id IN) — consistent with useAdminNearMissGeoData pattern from 23-03
- orgScoreMap takes only the latest 2 rows per org (rows already DESC by period_start) — minimal data for trend with no extra query
- Top 5 / bottom 5 threshold hardcoded as visual convention — simple, no configuration overhead

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 23 complete — all 5 plans (23-01 through 23-05) executed successfully
- v2.0 roadmap is now 27/27 plans complete
- Platform admin has full analytics coverage: location tracking (8 legacy tabs) + Heat Map (cross-org near-miss) + Compliance (aggregate trend + org ranking)
- Org-level analytics: compliance page at /analytics/compliance with ComplianceScoreChart + IncidentFrequencyChart
- No blockers for production deployment readiness

---
*Phase: 23-analytics-heat-maps-and-trend-charts*
*Completed: 2026-02-18*
