---
phase: 15
plan: 02
subsystem: schedule-board
tags: [zustand, schedule, mock-data-removal, error-state, empty-state]

dependency-graph:
  requires: []
  provides: [schedule-board-error-state, schedule-board-empty-state]
  affects: [admin-schedule-board]

tech-stack:
  added: []
  patterns: [proper-error-handling, empty-state-pattern]

key-files:
  created: []
  modified:
    - web/stores/useScheduleBoardStore.ts
    - web/app/admin/schedule-board/page.tsx

decisions:
  - "Keep performBasicConflictCheck as legitimate fallback for conflict-detector edge function unavailability"
  - "Empty state shown when medics.length === 0 after successful load (not an error)"
  - "ScheduleGrid only renders when medics.length > 0 to prevent empty grid render"

metrics:
  duration: "~2 min"
  completed: "2026-02-17"
---

# Phase 15 Plan 02: Schedule Board Mock Data Removal Summary

**One-liner:** Removed 150-line mock data generator from schedule board store and replaced with proper error/empty states.

## What Was Done

Eliminated the fake data fallback from the schedule board. Previously when the Supabase edge function was unavailable, the board populated with mock medics (`mock-medic-1/2/3`) and fake bookings (`mock-booking-1` through `mock-booking-7`). This masked real errors and could confuse admins who might mistake the mock data for real assignments.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Remove mock data generator and fix fallback in store | 55511b5 | web/stores/useScheduleBoardStore.ts |
| 2 | Remove mock data banner and add empty state to schedule board page | 4632190 | web/app/admin/schedule-board/page.tsx |

## Changes Made

### Task 1 - Store (`web/stores/useScheduleBoardStore.ts`)

- **Deleted** `generateMockScheduleData` function (~150 lines) including all mock medic and booking objects with IDs like `mock-medic-1`, `mock-booking-1`, etc.
- **Replaced** the catch block in `fetchScheduleData` — instead of populating mock data, it now sets `medics: []`, `bookings: []`, and a real error message derived from the exception.
- **Removed** `console.warn` from `checkConflicts` catch block. Changed `catch (error)` to `catch {}` since the error is not used.
- **Kept** `performBasicConflictCheck` — this is a legitimate simplified conflict checker that operates against real data in state when the `conflict-detector` edge function is unreachable.
- **Updated** JSDoc on `fetchScheduleData` to reflect actual error-state behavior instead of mock data fallback.

### Task 2 - Page (`web/app/admin/schedule-board/page.tsx`)

- **Deleted** the "Mock Data Info Banner" (yellow warning block that showed when `error.includes('mock data')`).
- **Simplified** error state condition: was `{error && !error.includes('mock data') && (` — now just `{error && (`. All errors now show the red error box with Retry button.
- **Added** empty state: shown when `!isLoading && !error && medics.length === 0`. Displays "No bookings scheduled" with guidance to try a different week.
- **Updated** ScheduleGrid render condition: was `{!isLoading && !error && <ScheduleGrid />}` — now `{!isLoading && !error && medics.length > 0 && <ScheduleGrid />}`.

## Deviations from Plan

None — plan executed exactly as written.

## Success Criteria Verification

1. Schedule board shows proper error state with Retry button when API fails (not mock data) — PASS
2. Schedule board shows "No bookings scheduled" empty state when no data (not fake shifts) — PASS
3. Schedule board conflict checking still works via `performBasicConflictCheck` — PASS
4. Zero mock data IDs remain in the store — PASS

## Next Phase Readiness

No blockers. Plan 15-03 can proceed independently.
