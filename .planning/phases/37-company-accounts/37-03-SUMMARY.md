---
phase: 37-company-accounts
plan: 03
subsystem: ui, api
tags: [react, typescript, zustand, react-query, tailwind, lucide-react, radix-dialog, sonner]

# Dependency graph
requires:
  - phase: 37-01
    provides: company_roster_medics table, roster API routes, useCompanyRoster/useCompanyProfile hooks, CompanyProfileDisplay type, medic-availability utilities
  - phase: 34-quoting
    provides: StaffingPlanSection component, useQuoteFormStore, StaffingPlanItem type, STAFFING_ROLE_LABELS
  - phase: 36-ratings
    provides: CompanyRatingsSummary component, reviews API
  - phase: 32-foundation
    provides: VerifiedBadge component, VerificationStatus type
provides:
  - Company profile page at /dashboard/marketplace/company/[id] with stats, team preview, and ratings
  - CompanyProfileCard with 4-stat grid (team size, rating, insurance, coverage)
  - MeetTheTeam section with up to 6 active medics and qualification badges
  - MedicAvailabilityModal for date-range unavailability blocking
  - RosterMedicPicker for qualification-filtered medic selection in quote staffing
  - StaffingPlanSection wired to real roster data (not free-text)
  - company-profile.ts display utilities (formatCompanyProfile, getInsuranceBadgeColor)
affects: [34.1 (direct jobs may use roster picker), 35 (award flow uses company profile)]

# Tech tracking
tech-stack:
  added: []
  patterns: [auto-detect companyId from current user for roster-aware components, free-text fallback when no company found]

key-files:
  created:
    - web/lib/marketplace/company-profile.ts
    - web/components/marketplace/roster/CompanyProfileCard.tsx
    - web/components/marketplace/roster/MeetTheTeam.tsx
    - web/components/marketplace/roster/MedicAvailabilityModal.tsx
    - web/components/marketplace/roster/RosterMedicPicker.tsx
    - web/app/(dashboard)/dashboard/marketplace/company/[id]/page.tsx
  modified:
    - web/components/marketplace/quote-submission/StaffingPlanSection.tsx
    - FEATURES.md

key-decisions:
  - "companyId auto-detected in StaffingPlanSection via Supabase query (not passed through prop chain from QuoteSubmissionForm)"
  - "Free-text fallback with amber warning when no company roster found (backward compatible)"
  - "RosterMedicPicker renders inline in form (not popover/dialog) for simpler UX"
  - "MedicAvailabilityModal pre-populates existing dates on open for edit flow"

patterns-established:
  - "Auto-detect companyId pattern: useEffect with createClient().auth.getUser() then marketplace_companies query"
  - "Insurance badge colour mapping: verified=green, expired=red, unverified=gray"
  - "Team preview limited to 6 members with '+X more' overflow text"

# Metrics
duration: 10min
completed: 2026-02-20
---

# Phase 37 Plan 03: Company Profile & Quote Roster Wiring Summary

**Company profile page with stats grid and team preview, availability modal for date-range blocking, roster-aware medic picker replacing free-text entry in quote staffing plans**

## Performance

- **Duration:** 10 min
- **Started:** 2026-02-20T18:34:56Z
- **Completed:** 2026-02-20T18:45:00Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Company profile page displays full stats (roster size, rating, insurance status, coverage areas) with team preview and ratings summary
- MedicAvailabilityModal allows company admins to set/clear date-range unavailability with optional reason
- RosterMedicPicker provides qualification-filtered, availability-aware medic selection for quote staffing plans
- StaffingPlanSection named medics flow now selects from real company roster (enforces roster membership at UI level)

## Task Commits

Each task was committed atomically:

1. **Task 1: Company profile page with stats card and Meet the Team section** - `273b34f` through `6f4ac96` (feat) -- committed by parallel agent process with identical content
2. **Task 2: Availability modal, roster medic picker, and StaffingPlanSection wiring** - `dac7a34` (feat)

## Files Created/Modified
- `web/lib/marketplace/company-profile.ts` - Display utilities: formatCompanyProfile, getInsuranceBadgeColor, getVerificationBadgeLabel, formatMemberSince
- `web/components/marketplace/roster/CompanyProfileCard.tsx` - Company header card with 4-stat grid, verified badge, member since date
- `web/components/marketplace/roster/MeetTheTeam.tsx` - Team preview: up to 6 active medics with qualification badges, availability indicators, "+X more"
- `web/components/marketplace/roster/MedicAvailabilityModal.tsx` - Date-range unavailability modal with clear, pre-populate, and query invalidation
- `web/components/marketplace/roster/RosterMedicPicker.tsx` - Inline medic picker: filters by qualification, excludes selected, shows availability dots
- `web/app/(dashboard)/dashboard/marketplace/company/[id]/page.tsx` - Company profile page: stats card + team preview + ratings summary
- `web/components/marketplace/quote-submission/StaffingPlanSection.tsx` - Updated named medics flow to use RosterMedicPicker with free-text fallback
- `FEATURES.md` - Updated Phase 37 with Plan 03 documentation

## Decisions Made
- **companyId auto-detection**: StaffingPlanSection detects companyId via `createClient().auth.getUser()` + marketplace_companies query, avoiding prop drilling through QuoteSubmissionForm. This keeps the QuoteSubmissionForm interface unchanged.
- **Free-text fallback**: When no company roster found (shouldn't happen for verified companies), the named medics flow falls back to the original free-text entry with an amber warning. This maintains backward compatibility.
- **Inline picker (not popover)**: RosterMedicPicker renders directly in the form rather than as a popover or dialog, for a simpler UX. The scrollable list with max-h-60 keeps it contained.
- **Pre-populate availability modal**: MedicAvailabilityModal reads existing unavailable_from/until/reason on open, so editing existing unavailability is seamless.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Task 1 files already committed by parallel agent**
- **Found during:** Task 1 verification
- **Issue:** All Task 1 files (company-profile.ts, CompanyProfileCard.tsx, MeetTheTeam.tsx, company/[id]/page.tsx) were already committed by a parallel agent process (commits 273b34f through 6f4ac96) with correct content but different commit messages.
- **Fix:** Verified content matches plan requirements (line counts, exports, key patterns). Proceeded to Task 2 without re-committing identical files.
- **Files modified:** None (already correct)
- **Verification:** `git diff HEAD` showed no differences; TypeScript compilation clean

---

**Total deviations:** 1 (parallel agent overlap -- no re-work needed)
**Impact on plan:** No impact on deliverables. All files present and correct.

## Issues Encountered
- Task 1 files were committed by a parallel agent process with generic commit messages (e.g., "feat: enhance roster API to support optional status filtering") instead of plan-scoped messages. Content was verified to be correct and complete.

## User Setup Required
None - no external service configuration required. All components use existing API routes and React Query hooks from Plan 01.

## Next Phase Readiness
- Phase 37 (Company Accounts) is now complete with all 3 plans finished
- Company profile display, roster management, availability tracking, and roster-aware quoting are fully operational
- Ready for Phase 34.1 (Direct Jobs) which depends on Phase 37 roster
- Migration 156 still needs production deployment (tracked in STATE.md pending todos)

---
*Phase: 37-company-accounts*
*Completed: 2026-02-20*
