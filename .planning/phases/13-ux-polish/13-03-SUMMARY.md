---
phase: 13-ux-polish
plan: 03
subsystem: realtime
tags: [geofence, haversine, zustand, supabase-realtime, alerts, command-center]

# Dependency graph
requires:
  - phase: 13-02
    provides: geofences table with center_latitude, center_longitude, radius_meters, is_active, booking_id (nullable), org_id, site_name columns + GeofenceMapPicker
  - phase: 10-01
    provides: useMedicLocationsStore with medicContext Map, Realtime ping subscription, context-at-subscribe pattern (D-10-01-004)
  - phase: 10-04
    provides: medic_alerts table, create_medic_alert() RPC with 15-minute deduplication (migration 008), AlertPanel, useMedicAlertsStore
provides:
  - useGeofenceExitMonitor hook with haversineMeters and create_medic_alert RPC invocation
  - onPingReceived callback mechanism in useMedicLocationsStore for per-ping extensibility
  - Automatic geofence_failure alert creation on every location ping that exceeds radius
affects: [command-center, geofences, alerts, realtime-tracking]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Context-at-subscribe: load geofences once into Map, O(1) lookup per ping (extends D-10-01-004)"
    - "Callback injection: setOnPingReceived() decouples store from alert logic"
    - "15-minute RPC deduplication: prevents alert flooding from repeated out-of-bounds pings"

key-files:
  created:
    - web/hooks/useGeofenceExitMonitor.ts
  modified:
    - web/stores/useMedicLocationsStore.ts
    - web/app/admin/command-center/page.tsx

key-decisions:
  - "Used createClient() browser client in hook (not singleton supabase) to match command-center pattern"
  - "onPingReceived callback registered after loadGeofences() resolves — ensures Map populated before first ping processed"
  - "setOnPingReceived(null) on unmount prevents callback firing after component destroyed"

patterns-established:
  - "Per-ping callback pattern: store fires registered callback after updateLocation(), enables extensible side effects without coupling store to business logic"

# Metrics
duration: 6min
completed: 2026-02-17
---

# Phase 13 Plan 03: Geofence Exit Alerts Summary

**Haversine distance check on every medic ping fires create_medic_alert RPC with geofence_failure type when medic exceeds site boundary radius**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-17T19:42:06Z
- **Completed:** 2026-02-17T19:48:17Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Created `useGeofenceExitMonitor` hook with haversineMeters great-circle formula and per-booking geofence Map (context-at-subscribe pattern)
- Added `onPingReceived` callback mechanism to `useMedicLocationsStore` for extensible per-ping side effects
- Wired hook into `command-center/page.tsx`: loads geofences once, then checks every incoming medic ping against radius boundary
- Build passes cleanly (83 static pages generated)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create useGeofenceExitMonitor hook** - `45f9e63` (feat)
2. **Task 2: Wire geofence exit check into location store and command center** - `bf52d73` (feat)

**Plan metadata:** (to be filled with docs commit hash)

## Files Created/Modified

- `web/hooks/useGeofenceExitMonitor.ts` — New hook: loadGeofences() loads active geofences into Map by booking_id; checkPing() computes haversine distance and calls create_medic_alert RPC if outside radius
- `web/stores/useMedicLocationsStore.ts` — Added PingPayload type, onPingReceived state field, setOnPingReceived() action, and callback invocation after updateLocation() in INSERT handler
- `web/app/admin/command-center/page.tsx` — Imported useGeofenceExitMonitor, wired loadGeofences → setOnPingReceived(checkPing) with cleanup on unmount

## Decisions Made

- Used `createClient()` browser Supabase client inside the hook (not the module-level singleton) to align with command-center's existing pattern and ensure correct auth context in browser components
- `onPingReceived` callback is registered inside `.then()` after `loadGeofences()` resolves — this guarantees the geofence Map is fully populated before any incoming ping is evaluated
- `setOnPingReceived(null)` called in cleanup function — prevents stale callback firing if component unmounts while pings are still arriving

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. The pre-existing build race condition (ENOTEMPTY on `.next/export`) resolved after clearing `.next` directory and rebuilding from scratch.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Geofence alerts are now fully automated — any medic ping outside their booking's geofence radius triggers a `geofence_failure` alert with 15-minute dedup
- Plan 13-04 (RIDDOR status history) is ready to execute
- AlertPanel (from 10-04) will automatically display geofence_failure alerts as they arrive via Realtime

---
*Phase: 13-ux-polish*
*Completed: 2026-02-17*
