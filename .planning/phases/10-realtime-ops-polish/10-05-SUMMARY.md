---
phase: 10-realtime-ops-polish
plan: 05
subsystem: ui
tags: [react, zustand, tailwind, web-audio-api, command-center, alerts, escalation]

# Dependency graph
requires:
  - phase: 10-04
    provides: AlertPanel with dismiss/resolve note inputs and bulk dismiss functionality

provides:
  - Auto-escalation visual (animate-pulse + red border/bg) for alerts unacknowledged >15 minutes
  - SUGGESTED_ACTIONS lookup table mapping 9 alert types to contextual admin guidance
  - Escalation sound that fires once per alert via ref-tracked Set
  - 60-second re-render tick keeping escalation status live
  - "Send Message" mailto fallback button in command center when medicPhone is null

affects:
  - future alert UX phases
  - command-center feature expansion

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useRef Set pattern for fire-once effects (escalation sound deduplication)"
    - "triggered_at server timestamp preferred over stale computed columns for client-side elapsed time"
    - "Conditional button pattern: show alternative action instead of disabled button"

key-files:
  created: []
  modified:
    - web/components/admin/AlertPanel.tsx
    - web/app/admin/command-center/page.tsx

key-decisions:
  - "Use triggered_at (server timestamp) not seconds_since_triggered (stale query-time value) for escalation threshold"
  - "escalatedSoundRef as useRef<Set<string>> — never triggers re-renders, persists across ticks"
  - "Show Send Message mailto instead of disabled Call/SMS buttons when phone is missing — always provides a contact action"
  - "Escalation styling overrides severity-based styling (red takes precedence at 15-minute threshold)"

patterns-established:
  - "fire-once-per-alert: useRef<Set<string>> tracks which alert IDs have triggered side effects"
  - "live-timer: 60s tick state + useEffect dependency keeps computed values fresh without websocket"

# Metrics
duration: 4min
completed: 2026-02-17
---

# Phase 10 Plan 05: Alert Escalation, Suggested Actions, and Contact Fallback Summary

**Auto-escalation with red pulse + sound for 15-minute unacknowledged alerts, 9-type suggested action lookup, and mailto fallback replacing disabled contact buttons**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-17T18:19:59Z
- **Completed:** 2026-02-17T18:23:40Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- AlertPanel now escalates unacknowledged alerts at 15 minutes: animate-pulse + border-red-600 + bg-red-900/20, with escalation sound fired once per alert via a ref-tracked Set
- SUGGESTED_ACTIONS constant maps all 9 alert types (battery_low, battery_critical, late_arrival, early_departure, connection_lost, not_moving_20min, geofence_failure, gps_accuracy_poor, shift_overrun) to contextual action text displayed inline on each alert card
- Command center now shows a purple "Send Message" mailto link instead of disabled Call/SMS buttons when medicPhone is null — always gives admin a contact action

## Task Commits

Each task was committed atomically:

1. **Task 1: Add suggested actions, escalation timer, and escalation sound to AlertPanel** - `aeee211` (feat)
2. **Task 2: Add "Send Message" mailto fallback when medicPhone is null** - `fa5a240` (feat)

## Files Created/Modified

- `web/components/admin/AlertPanel.tsx` - Added SUGGESTED_ACTIONS record, 60s tick interval, escalatedSoundRef Set, isEscalated computed from triggered_at, escalation CSS override, suggested action paragraph, useRef import
- `web/app/admin/command-center/page.tsx` - Replaced always-disabled Call/SMS with conditional: Call+SMS when medicPhone truthy, Send Message mailto when falsy

## Decisions Made

- **triggered_at over seconds_since_triggered:** seconds_since_triggered is computed at query time and never updates in the client — using triggered_at with Date.now() gives an always-fresh elapsed time calculation. This was a key pitfall called out in the plan.
- **useRef<Set<string>> for escalation sound deduplication:** State would reset on re-mount and cause unnecessary re-renders; a ref holds stable across renders and persists across tick cycles.
- **Mailto fallback instead of disabled buttons:** Disabled buttons with no alternative frustrate admins. A mailto pre-populated with medic name gives an action even without a phone number.
- **Escalation styling overrides severity styling:** At the 15-minute threshold, red urgency signal takes precedence over normal orange/yellow/blue severity colors.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

The `pnpm --filter web build` filter syntax did not match the monorepo structure (root package is Expo, web is a nested Next.js app). Used `cd web && pnpm build` instead. The build itself has a pre-existing prerender error on `/login` and `/admin` pages unrelated to this plan's changes — confirmed by TypeScript-only check (`tsc --noEmit`) which shows only a pre-existing test file error in `lib/territory/__tests__/auto-assignment-success-rate.test.ts`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Alert escalation system is complete for Phase 10 wave 2
- AlertPanel now has: sound/notification controls (10-01), bulk dismiss (10-04), escalation timer + suggested actions (10-05)
- Command center contact panel is complete: Call/SMS when phone available, mailto fallback when not
- Ready for any remaining Phase 10 plans (wave 2 complete if this was the last plan)

---
*Phase: 10-realtime-ops-polish*
*Completed: 2026-02-17*
