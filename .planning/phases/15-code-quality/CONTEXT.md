# Phase 15: Code Quality & Housekeeping

**Milestone:** v1.1
**Priority:** LOW
**Status:** Pending planning

## Problem

133 `console.log/warn/error` statements remain in production app code, leaking internal data and implementation details. The schedule board has leftover mock data in its fallback path. Admins have no way to manually override auto-assignment — they must accept whatever the algorithm chose.

## Goal

Clean the codebase for production: remove console noise, fix the schedule board's fallback mode, and add a manual booking assignment UI.

## Gaps Closed

- 133 `console.log/warn/error` in `/web/app/**` — not production-ready
- `/api/bookings/match` — powerful endpoint with no admin UI for manual override
- Schedule board: mock data generator still active in fallback path
- Schedule board: conflict checking incomplete in non-mock mode

## Key Files

- `web/app/**/*.{ts,tsx}` — 133 console statements to sweep
- `web/app/admin/bookings/[id]/page.tsx` — add "Assign Medic Manually" button
- `web/app/api/bookings/match/route.ts` — manual override endpoint
- `web/stores/useScheduleBoardStore.ts` — mock data generator (remove from fallback)
- `web/app/admin/schedule-board/page.tsx` — schedule board (fix conflict checking)
- `web/components/admin/schedule/ConflictModal.tsx` — conflict resolution modal

## Planned Tasks

1. **15-01:** Console sweep — remove all `console.log` and `console.warn` from `/web/app/**`; replace meaningful error logging with `console.error` only where no error boundary exists; add ESLint rule `no-console` with `warn` severity
2. **15-02:** Manual booking assignment — "Assign Medic Manually" button on admin booking detail; opens medic picker (filtered by certification, availability, proximity); calls `/api/bookings/match` with `force_medic_id` override
3. **15-03:** Schedule board cleanup — remove mock data generator from fallback path (replace with proper empty state); implement double-booking conflict detection in production data mode using existing `ConflictModal`

## Success Criteria

1. Zero `console.log` statements in production build (`grep -r "console.log" web/app` returns 0 matches)
2. Admin can manually assign a specific medic to an unmatched booking in 3 clicks
3. Schedule board shows "No bookings scheduled" empty state when data is empty (not mock shifts)
4. Schedule board detects and highlights double-booking conflicts in production data
