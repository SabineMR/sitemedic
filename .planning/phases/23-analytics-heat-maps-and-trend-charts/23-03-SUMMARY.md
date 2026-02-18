---
phase: 23-analytics-heat-maps-and-trend-charts
plan: "03"
subsystem: ui
tags: [leaflet, react-leaflet, tanstack-query, analytics, heat-map, admin, near-miss]

# Dependency graph
requires:
  - phase: 23-02
    provides: NearMissHeatMap component, useNearMissGeoData hook, near-miss-geo.ts pattern

provides:
  - AdminNearMissGeoPoint interface with org_id and org_name
  - ORG_COLORS deterministic colour palette constant
  - useAdminNearMissGeoData hook (cross-org near-miss GPS data + orgColorMap)
  - AdminNearMissHeatMap component (org-colour-coded, severity-sized CircleMarkers)
  - Heat Map tab (8th tab) in admin analytics page at /admin/analytics

affects:
  - 23-04 (trend charts — analytics phase continues)
  - 23-05 (final analytics integration)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Two-step query pattern: fetch near_misses then enrich with org names from organizations table
    - orgColorMap returned from hook alongside data — component avoids recomputing colour assignments
    - isNewTab guard pattern extended for new tabs that render independently of legacy metrics loading
    - ssr: false dynamic import for Leaflet components in Next.js admin pages

key-files:
  created:
    - web/components/analytics/AdminNearMissHeatMap.tsx
  modified:
    - web/lib/queries/analytics/near-miss-geo.ts
    - web/app/admin/analytics/page.tsx

key-decisions:
  - "orgColorMap built in hook (not component) — deterministic per sorted org_id list; component gets stable reference without recomputation"
  - "ORG_COLORS[index % length] pattern — cycles gracefully when org count exceeds 8 colours"
  - "Two-step DB query: near_misses first, then organizations WHERE id IN (uniqueOrgIds) — avoids join complexity; org count typically small"
  - "org names missing from organizations fetch are non-fatal — error logged, 'Unknown Organisation' fallback used"
  - "Limit 1000 for admin hook (vs 500 for org hook) — platform admin view aggregates cross-org data"
  - "Heat Map tab uses isNewTab guard — renders independently of legacy location_tracking_metrics loading state"

patterns-established:
  - "Admin heat map: org-colour-coded CircleMarkers + dual legend (org colours section + severity sizes section)"
  - "Heat Map tab label rendered as literal 'Heat Map' string (not tab.charAt(0).toUpperCase() + tab.slice(1)) — handles hyphen in 'heat-map' slug"

# Metrics
duration: 2min
completed: "2026-02-18"
---

# Phase 23 Plan 03: Admin Near-Miss Heat Map Summary

**Cross-org admin near-miss heat map with org-colour-coded CircleMarkers, two-step org enrichment query, and Heat Map tab added as 8th tab in admin analytics page.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-18T05:30:53Z
- **Completed:** 2026-02-18T05:33:01Z
- **Tasks:** 2
- **Files modified:** 3 (1 created, 2 edited)

## Accomplishments

- Added `AdminNearMissGeoPoint` interface and `useAdminNearMissGeoData` hook to `near-miss-geo.ts` — fetches all-org near_misses (limit 1000), enriches with org names from organizations table, returns `orgColorMap` alongside data
- Created `AdminNearMissHeatMap.tsx` — CircleMarker map colour-coded by org (from orgColorMap) and sized by severity, with dual legend (org colour dots + severity size circles)
- Added Heat Map as 8th tab in `/admin/analytics` — dynamic import with `ssr: false`, renders independently of legacy metrics loading state

## Task Commits

Each task was committed atomically:

1. **Task 1: Add admin query hook + create AdminNearMissHeatMap component** - `bf51da2` (feat)
2. **Task 2: Add Heat Map tab to admin analytics page** - `a48d079` (feat)

**Plan metadata:** (to be committed below)

## Files Created/Modified

- `web/lib/queries/analytics/near-miss-geo.ts` - Added `AdminNearMissGeoPoint` interface, `ORG_COLORS` constant, `useAdminNearMissGeoData` hook (two-step query: near_misses + org names, returns orgColorMap)
- `web/components/analytics/AdminNearMissHeatMap.tsx` - New component: org-colour-coded CircleMarkers, severity-based radius, dual legend, MapBoundsAdjuster, loading/empty states
- `web/app/admin/analytics/page.tsx` - Dynamic import of AdminNearMissHeatMap (ssr: false), activeTab union extended, tabs array extended to 8, isNewTab guard extended, heat-map content section added

## Decisions Made

- **orgColorMap in hook:** Colour assignments computed once in hook, returned alongside data — component receives stable reference without recomputing on each render.
- **ORG_COLORS cycling:** `index % ORG_COLORS.length` — graceful when org count exceeds palette size; colours repeat rather than failing.
- **Two-step query:** Fetch near_misses, collect unique org_ids, then fetch org names — simpler than a join; org lookup is a small secondary query.
- **Non-fatal org fetch failure:** Error logged but execution continues; unknown orgs display 'Unknown Organisation' — heat map still renders.
- **Admin limit 1000 vs org limit 500:** Platform admin aggregate view needs more data points to identify cross-org clusters.
- **'Heat Map' label string:** Tab slug is 'heat-map' but tab label rendered as literal 'Heat Map' — avoids the generic `charAt(0).toUpperCase()` producing 'Heat-map'.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Admin heat map live at /admin/analytics (Heat Map tab)
- Platform admins can now see cross-org geographic near-miss clustering
- `near-miss-geo.ts` now exports both org-level and admin-level hooks — clean API for any future analytics consumers
- Ready for 23-04 (trend charts) and 23-05 (final analytics integration)

---
*Phase: 23-analytics-heat-maps-and-trend-charts*
*Completed: 2026-02-18*
