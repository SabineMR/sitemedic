---
phase: 13-ux-polish
plan: 04
subsystem: ui
tags: [riddor, auto-save, audit-trail, photo-gallery, supabase, postgresql, react, next-image, useRef, tanstack-query]

# Dependency graph
requires:
  - phase: 06-riddor-auto-flagging
    provides: riddor_incidents table, RIDDORIncident type, fetchRIDDORIncident, RIDDOR detail page
provides:
  - riddor_status_history table with trigger-based audit trail
  - fetchRIDDORStatusHistory() query function
  - updateRIDDORDraft() for auto-save
  - RIDDOR detail page auto-save (30s debounce, useRef, draft-only, silent)
  - Status History timeline UI with actor attribution
  - Evidence Photos gallery from treatment-photos storage bucket
  - Skeleton loading states replacing "Loading incident details..." text
affects: [future-riddor-features, compliance-reporting]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useRef for timers — prevents re-renders caused by setTimeout state"
    - "hasInitialized ref pattern — guards against save on initial data load"
    - "Silent auto-save — no toast, best-effort, only for draft status"
    - "Supabase Storage public URL computation from JSONB path arrays"
    - "DB trigger with SECURITY DEFINER for auth.uid() inside trigger context"

key-files:
  created:
    - supabase/migrations/120_riddor_status_history.sql
    - .planning/phases/13-ux-polish/13-04-SUMMARY.md
  modified:
    - web/lib/queries/riddor.ts
    - web/app/(dashboard)/riddor/[id]/page.tsx

key-decisions:
  - "useRef for autoSaveTimer (not useState) to prevent re-render cascade on debounce reschedule"
  - "hasInitialized ref prevents auto-save firing on initial incident data load"
  - "Auto-save is silent (no toast) and best-effort (catch swallowed) — UX decision"
  - "Auto-save only fires when status === 'draft' — confirmed/submitted incidents are immutable"
  - "photo_uris typed as string[] | null in treatments interface (from JSONB column)"
  - "SECURITY DEFINER on trigger function enables auth.uid() inside trigger context"

patterns-established:
  - "Auto-save pattern: useRef timer + hasInitialized guard + draft-only guard + unmount save"
  - "Storage photo display: JSONB paths -> getPublicUrl() -> next/image with fill layout"

# Metrics
duration: 6min
completed: 2026-02-17
---

# Phase 13 Plan 04: RIDDOR Auto-Save, Audit Trail, and Photo Gallery Summary

**RIDDOR compliance workflow completed: 30s debounced draft auto-save via useRef, status history audit trail with DB trigger, and treatment photo gallery from Supabase Storage**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-17T19:42:41Z
- **Completed:** 2026-02-17T19:48:36Z
- **Tasks:** 2/2
- **Files modified:** 4

## Accomplishments

- Created `riddor_status_history` table with PostgreSQL trigger (`trg_riddor_status_history`) that automatically logs every status transition with actor attribution using SECURITY DEFINER
- Added RLS policy scoping history access to org members only
- Added `StatusHistoryEntry` interface and `fetchRIDDORStatusHistory()` query to riddor.ts
- Added `updateRIDDORDraft()` for auto-save (category + override_reason, draft-only guard)
- Added `photo_uris: string[] | null` to the treatments type in `RIDDORIncident`
- Enhanced RIDDOR detail page with: useRef auto-save (30s debounce), status history timeline, Evidence Photos gallery, Skeleton loading states

## Task Commits

Each task was committed atomically:

1. **Task 1: Migration + riddor.ts queries** - `de7738f` (feat)
2. **Task 2: Enhanced RIDDOR detail page** - `c487476` (feat)

**Plan metadata:** `<tbd>` (docs: complete plan)

## Files Created/Modified

- `supabase/migrations/120_riddor_status_history.sql` - New table, index, trigger function, trigger, RLS policy for status audit trail
- `web/lib/queries/riddor.ts` - Added StatusHistoryEntry interface, photo_uris to treatments type, fetchRIDDORStatusHistory(), updateRIDDORDraft()
- `web/app/(dashboard)/riddor/[id]/page.tsx` - Auto-save (useRef), status history query, photo URLs, Skeleton loading, Status History Card, Evidence Photos Card

## Decisions Made

- Used `useRef` for `autoSaveTimer` (not `useState`) to avoid triggering re-renders on each debounce reschedule — matches plan specification
- `hasInitialized` ref prevents the auto-save `useEffect` from firing on initial data load from the query
- Auto-save is silent: no toast notification, error is swallowed (best-effort) — compliant with plan requirement
- Only saves when `status === 'draft'`; submitted/confirmed incidents are immutable
- `SECURITY DEFINER` on the trigger function is required to make `auth.uid()` accessible inside the trigger execution context (otherwise returns NULL)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Build failure in "Collecting build traces" / "rename 500.html" step — pre-existing Next.js file system issue unrelated to these changes. TypeScript type checking passed with zero errors in RIDDOR files. Build compiles successfully and generates all 83 pages before the trace collection failure.

## User Setup Required

None - no external service configuration required. Uses existing `treatment-photos` Supabase Storage bucket.

## Next Phase Readiness

- Phase 13 Plan 04 complete — this is the final plan in Phase 13 (UX Polish)
- Phase 13 is now complete (4/4 plans executed)
- All RIDDOR compliance workflow features shipped: auto-save, audit trail, photo evidence
- Ready for phase transition or milestone review

---
*Phase: 13-ux-polish*
*Completed: 2026-02-17*
