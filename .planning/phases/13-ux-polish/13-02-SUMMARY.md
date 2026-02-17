---
phase: 13-ux-polish
plan: 02
subsystem: ui
tags: [leaflet, react-leaflet, geofences, map, schema-migration, skeleton]

# Dependency graph
requires:
  - phase: 05.5-admin-operations
    provides: admin geofences page (initial implementation with wrong column names)
  - phase: 11-org-settings
    provides: org_settings table with geofence_default_radius
provides:
  - Corrected geofence schema via migration 119 (nullable booking_id, site_name column)
  - Interactive Leaflet map picker component (GeofenceMapPicker)
  - Fixed geofences admin page using correct DB column names
affects: [geofence-check edge function, medic check-in validation, admin-operations]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dynamic Leaflet import with ssr:false (Decision D-05.5-04-003) — all Leaflet components must use dynamic() to prevent SSR crashes"
    - "leaflet/dist/leaflet.css imported inside component file (not page) to co-locate map styling"
    - "useMapEvents hook inside MapContainer child component for click-to-place pattern"

key-files:
  created:
    - supabase/migrations/119_geofence_schema_fix.sql
    - web/components/admin/GeofenceMapPicker.tsx
  modified:
    - web/app/admin/geofences/page.tsx

key-decisions:
  - "booking_id made nullable to support org-level geofences not tied to a specific booking"
  - "site_name column added via migration (does not exist in original schema)"
  - "Map defaults to London [51.5074, -0.1278] when no lat/lng set yet"
  - "Radius slider range 50-5000m covers most construction site geofence use cases"

patterns-established:
  - "Pattern: Leaflet picker components always exported as default, imported via dynamic() in page files"
  - "Pattern: Skeleton rows (4x h-16) replace loading spinners for list pages"

# Metrics
duration: 19min
completed: 2026-02-17
---

# Phase 13 Plan 02: Geofence Schema Fix + Interactive Map Picker Summary

**Replaced broken geofence admin (wrong column names: lat/lng/radius_metres) with correct schema columns (center_latitude/center_longitude/radius_meters) via migration 119 + interactive react-leaflet map picker with click-to-place and radius slider**

## Performance

- **Duration:** 19 min
- **Started:** 2026-02-17T19:18:41Z
- **Completed:** 2026-02-17T19:38:37Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Created migration 119 making `booking_id` nullable and adding `site_name` column to `geofences` table
- Built `GeofenceMapPicker` component with click-to-place marker, blue Circle overlay, and radius range slider
- Fixed `geofences/page.tsx` to use correct DB column names (`center_latitude`, `center_longitude`, `radius_meters`)
- Added dynamic import with `ssr: false` for all Leaflet components per established Decision D-05.5-04-003
- Replaced loading spinner with 4 Skeleton rows
- Fixed `fetchGeofences` ordering to use `created_at DESC` instead of non-existent `site_name` column

## Task Commits

Each task was committed atomically:

1. **Task 1: Migration 119 geofence schema fix** - `ab1dd68` (chore)
2. **Task 2: GeofenceMapPicker + fixed page** - `fef43db` (GeofenceMapPicker.tsx), `a0d9077` (page.tsx) (feat)

**Plan metadata:** (see below)

_Note: GeofenceMapPicker.tsx was committed as part of fef43db (RootLayout refactor commit that was in-flight), and geofences/page.tsx in a0d9077._

## Files Created/Modified

- `supabase/migrations/119_geofence_schema_fix.sql` - Drops NOT NULL on booking_id, adds site_name TEXT column
- `web/components/admin/GeofenceMapPicker.tsx` - New interactive map picker with MapContainer, ClickHandler, Circle, radius slider
- `web/app/admin/geofences/page.tsx` - Fixed column names, dynamic import, Skeleton loading, map-based location input

## Decisions Made

- `booking_id` column made nullable (was NOT NULL) — org-level geofences are not tied to a booking
- `site_name` added as TEXT column (was missing from schema entirely)
- GeofenceMapPicker defaults to London when lat/lng are null (consistent with MedicTrackingMap pattern)
- `fetchGeofences` orders by `created_at DESC` (old code used `site_name` which doesn't exist in original schema)
- Validation checks `center_latitude !== null && center_longitude !== null` before save (user must click the map)

## Deviations from Plan

None - plan executed exactly as written. The geofences page was already pointing to `site_name` in the display (original had `g.site_name`), so that reference was preserved with a null-safe fallback `g.site_name ?? '(Unnamed)'`.

## Issues Encountered

Intermediate `git stash` run during build verification reverted the geofences/page.tsx file to its committed version. File was re-written from the plan spec and re-committed successfully. GeofenceMapPicker.tsx was unaffected (was untracked at time of stash and was included in the concurrent fef43db commit).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Geofence schema is now correct — migration 119 must be applied to production database
- Interactive map picker is functional — admins can click to place geofence centre and drag slider for radius
- Ready for plan 13-03

---
*Phase: 13-ux-polish*
*Completed: 2026-02-17*
