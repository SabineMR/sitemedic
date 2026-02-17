---
phase: 14-compliance-exports
plan: 04
subsystem: ui
tags: [ir35, medic-profile, lucide-react, date-fns, compliance, cest]

# Dependency graph
requires:
  - phase: 14-03
    provides: MedicData interface extended with cest_assessment_date and cest_pdf_url fields
provides:
  - Enhanced IR35 Status card on medic profile page with employment status banner, assessment date, and CEST PDF download link
affects: [medic-portal, compliance-exports]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Colored status banners: blue for self_employed, purple for umbrella"
    - "Conditional rendering for nullable compliance fields (cest_assessment_date, cest_pdf_url)"
    - "Regex /g flag for multi-underscore replacement in display strings"

key-files:
  created: []
  modified:
    - web/app/medic/profile/page.tsx

key-decisions:
  - "Employment status banner uses color coding (blue=self_employed, purple=umbrella) for quick visual recognition"
  - "CEST result labeled as 'HMRC CEST Result' to distinguish it from the employment_status classification"
  - "Assessment date shown both as inline prose ('Last assessed DD MMM YYYY') and as a detail row in the grid"
  - "UTR and umbrella company rendered conditionally based on employment_status to avoid showing irrelevant fields"

patterns-established:
  - "IR35 two-field pattern: employment_status (primary classification) separate from cest_assessment_result (HMRC tool output)"
  - "replace(/_/g, ' ') with /g flag to handle all underscores in enum display strings"

# Metrics
duration: 2min
completed: 2026-02-17
---

# Phase 14 Plan 04: IR35 Profile Enhancement Summary

**IR35 Status card on medic profile enhanced with colored employment-status banner (blue/purple), 'Last assessed DD MMM YYYY' date, and 'Download CEST PDF' link — two separate fields (employment_status vs cest_assessment_result) clearly distinguished**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-17T18:26:16Z
- **Completed:** 2026-02-17T18:28:37Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Employment status displayed as a prominent colored banner (blue for Self Employed, purple for Umbrella)
- "Last assessed DD MMM YYYY" line shown beneath banner when `cest_assessment_date` is populated
- "Download CEST PDF" button shown when `cest_pdf_url` is available, opens in new tab
- Detail grid shows UTR (self_employed only), umbrella company (umbrella only), HMRC CEST Result, and Assessment Date as separate rows
- Fixed `.replace('_', ' ')` to `.replace(/_/g, ' ')` to handle all underscores (e.g. `outside_ir35` → `outside ir35`)
- `FileDown` and `Calendar` icons added from lucide-react

## Task Commits

Each task was committed atomically:

1. **Task 1: Enhance IR35 section with assessment date and CEST PDF link** - `62ef2d9` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified
- `web/app/medic/profile/page.tsx` - Enhanced IR35 Status card; added employment status banner, assessment date, CEST PDF download link, and fixed underscore replacement regex

## Decisions Made
- Employment status banner uses blue for `self_employed` and purple for `umbrella` — visually distinct from the green availability toggle
- CEST assessment result labeled as "HMRC CEST Result" to make clear it is the HMRC online tool output, not the overall IR35 determination
- Assessment date rendered twice: once as inline prose and once in the detail grid — this gives context at a glance and a precise value in the grid
- UTR and umbrella company conditionally rendered by employment_status value to avoid surfacing irrelevant fields

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed missing /g flag in .replace() calls for underscore replacement**
- **Found during:** Task 1 (Enhance IR35 section)
- **Issue:** Existing code used `.replace('_', ' ')` (no `/g` flag), which only replaces the first underscore. Values like `outside_ir35` would display as `outside ir35` but `self_employed` would display as `self employed` by coincidence. Multi-underscore values would be broken.
- **Fix:** Changed all `.replace('_', ' ')` to `.replace(/_/g, ' ')` throughout the IR35 section
- **Files modified:** web/app/medic/profile/page.tsx
- **Verification:** Build passes, pattern confirmed with grep
- **Committed in:** 62ef2d9 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Essential correctness fix — no scope creep.

## Issues Encountered
None — straightforward UI enhancement on an already-typed interface.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- IR35 section now fully displays all compliance fields from the medics table
- Phase 14 plans 01, 02, 03, 04, 05 all complete — compliance exports phase is done
- Ready for next milestone planning

---
*Phase: 14-compliance-exports*
*Completed: 2026-02-17*
