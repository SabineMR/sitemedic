---
phase: 23-analytics-heat-maps-and-trend-charts
plan: 02
subsystem: ui
tags: [react-leaflet, leaflet, tanstack-query, next-dynamic, analytics, heat-map, near-miss, geospatial]

# Dependency graph
requires:
  - phase: 23-01
    provides: compliance_score_history table created; analytics infrastructure established
provides:
  - NearMissHeatMap CircleMarker component (SSR-safe, severity colour/scale coded)
  - useNearMissGeoData TanStack Query hook (GPS-filtered near-miss records)
  - AnalyticsSubNav tab component (Heat Map / Compliance Trends switcher)
  - /analytics/heat-map dashboard page with dynamic import and sub-nav
  - Analytics sidebar nav link visible to all dashboard users
affects: [23-03, 23-04, 23-05, compliance-trends-page]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "dynamic({ ssr: false }) for leaflet components — prevents SSR window errors"
    - "CircleMarker-based geo visualisation (no leaflet.heat dependency) with severity colour + radius config"
    - "RLS-first org filtering — no explicit org_id WHERE clause needed in query hook"
    - "AnalyticsSubNav shared tab component with pathname-based active state"

key-files:
  created:
    - web/lib/queries/analytics/near-miss-geo.ts
    - web/components/analytics/NearMissHeatMap.tsx
    - web/components/analytics/AnalyticsSubNav.tsx
    - web/app/(dashboard)/analytics/heat-map/page.tsx
  modified:
    - web/components/dashboard/DashboardNav.tsx

key-decisions:
  - "NearMissHeatMap fetches its own data internally via useNearMissGeoData — no data props needed; keeps page clean"
  - "DashboardNav isActive for /analytics/heat-map href checks pathname?.startsWith('/analytics') — entire analytics section stays highlighted regardless of sub-page"
  - "AnalyticsSubNav uses pathname?.includes(tab.href) for active detection — works for exact and prefix matches"
  - "Severity config (radius + color) as Record<severity, value> maps — easy to update thresholds without structural change"
  - "MapBoundsAdjuster sub-component uses useEffect + useMap to fit bounds after data load; falls back to UK centre when empty"

patterns-established:
  - "Analytics sub-pages follow pattern: page imports AnalyticsSubNav + dynamic map component; AnalyticsSubNav renders tabs"
  - "Leaflet components: default export from component file for dynamic import compatibility; 'use client' required"

# Metrics
duration: 2min
completed: 2026-02-18
---

# Phase 23 Plan 02: Near-Miss Heat Map Summary

**Leaflet CircleMarker heat map for near-miss GPS incidents, severity-colour-coded (low=blue, medium=amber, high=red, critical=purple), with AnalyticsSubNav tab bar and dashboard sidebar Analytics link**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-18T05:25:25Z
- **Completed:** 2026-02-18T05:27:31Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Site managers can navigate to Analytics from the dashboard sidebar (BarChart3 icon, highlights across all /analytics/* pages)
- NearMissHeatMap renders severity-coded CircleMarkers with Popup details; severity legend positioned bottom-right; auto-fits UK bounds; empty state when no GPS data
- AnalyticsSubNav shared tab component enables one-click switching between Heat Map and Compliance Trends (future 23-03)
- No new npm packages required — react-leaflet 5.0.0 already installed

## Task Commits

Each task was committed atomically:

1. **Task 1: near-miss geo query hook + NearMissHeatMap + AnalyticsSubNav** - `ffe67c3` (feat)
2. **Task 2: heat-map page + DashboardNav Analytics link** - `608015d` (feat)

## Files Created/Modified
- `web/lib/queries/analytics/near-miss-geo.ts` - TanStack Query hook `useNearMissGeoData`; filters gps_lat/gps_lng non-null; deleted_at IS NULL; limit 500; staleTime 5m
- `web/components/analytics/NearMissHeatMap.tsx` - CircleMarker map component; severity radius/colour config; MapBoundsAdjuster; SeverityLegend; loading skeleton; empty state
- `web/components/analytics/AnalyticsSubNav.tsx` - Named export `AnalyticsSubNav`; two tabs: Heat Map (/analytics/heat-map), Compliance Trends (/analytics/compliance)
- `web/app/(dashboard)/analytics/heat-map/page.tsx` - Dashboard page; dynamic import ssr:false; AnalyticsSubNav + NearMissHeatMap in h-[500px] container
- `web/components/dashboard/DashboardNav.tsx` - Added `Analytics` nav item with `BarChart3` icon; `isActive` updated to highlight for all `/analytics/*` paths

## Decisions Made
- NearMissHeatMap fetches its own data internally (no props) — page stays clean; single responsibility
- DashboardNav `isActive('/analytics/heat-map')` checks `pathname?.startsWith('/analytics')` — covers Heat Map, Compliance Trends, and any future analytics sub-pages without nav changes
- AnalyticsSubNav uses `pathname?.includes(tab.href)` — tolerant of trailing slashes and query params
- Severity config as typed `Record<NearMissGeoPoint['severity'], value>` — TypeScript enforces all four severity levels are handled; adding new severity updates config map only

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Heat Map page at /analytics/heat-map is live; AnalyticsSubNav already links to /analytics/compliance
- Plan 23-03 can now build the Compliance Trends chart page — AnalyticsSubNav tab will auto-activate when pathname includes /analytics/compliance
- RLS on near_misses table must include SELECT access for org site managers — verify this is already in place before testing with real data

---
*Phase: 23-analytics-heat-maps-and-trend-charts*
*Completed: 2026-02-18*
