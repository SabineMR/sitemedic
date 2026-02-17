---
phase: 10-realtime-ops-polish
plan: 02
subsystem: ui
tags: [leaflet, react-leaflet, map, popup, shift-times, command-centre]

# Dependency graph
requires:
  - phase: 10-01
    provides: "MedicLocation interface with shift_start_time and shift_end_time fields populated from medicContext Map"
provides:
  - "Map marker Popup renders shift times in HH:MM–HH:MM format"
  - "MedicTrackingMap.tsx local MedicLocation interface extended with optional shift time fields"
affects: [10-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "PostgreSQL TIME slice pattern: .slice(0, 5) to trim HH:MM:SS to HH:MM for display"
    - "Conditional Popup row: show shift line only when both start and end time are present"

key-files:
  created: []
  modified:
    - web/components/admin/MedicTrackingMap.tsx

key-decisions:
  - "Keep shift_start_time and shift_end_time optional — medic pings without active booking context must not crash the popup"
  - "Use en-dash (U+2013) between start and end times for typographic correctness"
  - "MedicTrackingMap.tsx defines its own local MedicLocation interface; added shift fields there rather than importing from store to preserve component boundary"

patterns-established:
  - "Popup graceful degradation: use && guard before rendering data that may not always be present"

# Metrics
duration: 2min
completed: 2026-02-17
---

# Phase 10 Plan 02: Map Marker Popup Shift Times Summary

**Leaflet popup enhanced with conditional HH:MM–HH:MM shift time display, completing "Kai Jensen — Royal Exchange Site, 07:00–15:00" command centre format**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-17T18:19:10Z
- **Completed:** 2026-02-17T18:21:27Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Added `shift_start_time?` and `shift_end_time?` to the local `MedicLocation` interface in `MedicTrackingMap.tsx`
- Popup now conditionally renders a "Shift: HH:MM–HH:MM" line when both fields are available
- PostgreSQL `TIME` format (`07:00:00`) sliced to `HH:MM` with `.slice(0, 5)` for clean display
- Popup degrades gracefully with no crash or "undefined" output when shift context is absent

## Task Commits

Each task was committed atomically:

1. **Task 1: Add shift time fields to MedicLocation interface and render in Popup** - `981efa4` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `web/components/admin/MedicTrackingMap.tsx` - Added optional shift_start_time/shift_end_time to local interface; added conditional Popup row showing "Shift: HH:MM–HH:MM" using en-dash

## Decisions Made
- Kept shift fields optional (`?`) — medic location pings may arrive without booking context (e.g., medic travels between sites), so crash protection is mandatory
- Did not import `MedicLocation` from the store; the component already had its own interface and importing from the store would tighten coupling unnecessarily
- Used en-dash (U+2013) between times rather than hyphen for typographic correctness

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Map popup is now feature-complete for the "who, where, when" requirement
- 10-05 (if it involves further Popup enhancements) can build on this conditional rendering pattern
- The `.slice(0, 5)` TIME formatting pattern is established for reuse elsewhere

---
*Phase: 10-realtime-ops-polish*
*Completed: 2026-02-17*
