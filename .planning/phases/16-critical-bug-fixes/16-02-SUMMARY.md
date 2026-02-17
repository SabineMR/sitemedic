---
phase: 16-critical-bug-fixes
plan: 02
subsystem: ui
tags: [riddor, react, nextjs, shadcn, auto-save, draft]

# Dependency graph
requires:
  - phase: 13-04
    provides: RIDDOR auto-save useEffect with draftCategory/draftOverrideReason state and 30s debounce timer
provides:
  - Draft Review Card UI with category <select> and override reason <textarea> wired to existing auto-save state
affects: [riddor-detail-page, auto-save-flow]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Conditional card render pattern: {incident.status === 'draft' && <Card>} to hide admin-only editing UI from non-draft incidents"
    - "Native HTML form elements (select, textarea) styled with shadcn/ui utility classes for consistent look without adding component dependencies"

key-files:
  created: []
  modified:
    - web/app/(dashboard)/riddor/[id]/page.tsx

key-decisions:
  - "No new imports needed — Card, CardHeader, CardContent, CardTitle, CardDescription were already imported from Phase 13-04"
  - "Used native <select> and <textarea> with shadcn utility classes instead of shadcn Select/Textarea components — avoids unnecessary component additions for simple form inputs in an admin-only card"
  - "Draft Review card uses md:col-span-2 to span full width on desktop, matching Treatment Information card layout"

patterns-established:
  - "Draft-only UI: conditional render on incident.status === 'draft' hides editing UI from submitted/reported incidents"

# Metrics
duration: 5min
completed: 2026-02-17
---

# Phase 16 Plan 02: RIDDOR detail draft edit inputs Summary

**Draft Review Card with RIDDOR category dropdown and override reason textarea, both wired to existing 30-second auto-save state setters in the RIDDOR detail page**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-17T20:21:53Z
- **Completed:** 2026-02-17T20:27:19Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Added Draft Review card between Incident Details and Treatment Information on the RIDDOR detail page
- Category `<select>` with all 5 UK RIDDOR 2013 categories wired to `setDraftCategory` onChange
- Override reason `<textarea>` wired to `setDraftOverrideReason` onChange
- Card conditionally renders only when `incident.status === 'draft'` — hidden for submitted/reported incidents
- Both inputs hook into the existing 30-second auto-save `useEffect` that was wired but had no UI inputs before this plan

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Draft Review card with category select and override reason textarea** - `3e36081` (feat)

**Plan metadata:** (docs commit to follow)

## Files Created/Modified
- `web/app/(dashboard)/riddor/[id]/page.tsx` - Inserted Draft Review Card JSX block (45 lines) between Incident Details card and Treatment Information card

## Decisions Made
- No new imports needed — Card components already imported from Plan 13-04
- Used native `<select>` and `<textarea>` with tailwind/shadcn utility classes — sufficient for admin-only form, avoids adding new component dependencies
- `md:col-span-2` on the card so it spans full width at desktop breakpoint, consistent with Treatment Information and F2508 Report cards

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Stale `.next` build cache (`middleware-manifest.json` missing) caused initial build failure — cleared `.next` directory and rebuilt successfully. Pre-existing infrastructure issue unrelated to code change.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- RIDDOR detail page now has full draft editing UI: admins can change category and add override reason, and both fields auto-save every 30 seconds
- Phase 16 (16-01 + 16-02) is complete — both critical bug fixes shipped

---
*Phase: 16-critical-bug-fixes*
*Completed: 2026-02-17*
