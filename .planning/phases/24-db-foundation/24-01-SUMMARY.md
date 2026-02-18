---
phase: 24-db-foundation
plan: 01
subsystem: infra
tags: [nextjs, cve, security, typescript, eslint, recharts]

# Dependency graph
requires: []
provides:
  - "Next.js version specifier floor of ^15.2.3 patching CVE-2025-29927 middleware bypass"
  - "eslint-config-next specifier matched to next at ^15.2.3"
  - "Clean build with zero TypeScript errors (85 routes)"
affects:
  - phase-26-subdomain-routing (middleware surface expanded here first patched)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "CVE specifier floor: explicit version lower-bound in package.json prevents vulnerable installs"

key-files:
  created: []
  modified:
    - web/package.json
    - web/app/(dashboard)/treatments/[id]/page.tsx
    - web/contexts/org-context.tsx
    - web/lib/org-labels.ts
    - web/components/analytics/ComplianceScoreChart.tsx

key-decisions:
  - "Specifier-only bump (^15.1.5 -> ^15.2.3): pnpm lock already resolved 15.5.12 so no actual download"
  - "Added general to VerticalId union to match its widespread use as a fallback vertical throughout the codebase"
  - "Pre-existing TypeScript errors fixed inline as deviation Rule 1 (bugs blocking build verification)"

patterns-established:
  - "VerticalId union includes general as a valid fallback vertical"
  - "Record<string, unknown> fields in JSX use !! to coerce unknown truthiness to boolean for ReactNode compatibility"

# Metrics
duration: 8min
completed: 2026-02-18
---

# Phase 24 Plan 01: Next.js CVE Patch Summary

**Bumped next and eslint-config-next to ^15.2.3 (CVE-2025-29927 middleware bypass patch) and fixed 3 pre-existing TypeScript errors to achieve a clean build across all 85 routes**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-18T07:49:09Z
- **Completed:** 2026-02-18T07:57:33Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Set explicit version floor `^15.2.3` for both `next` and `eslint-config-next` in `web/package.json` — prevents any future install from resolving a vulnerable version
- Confirmed pnpm lock already resolved `next@15.5.12` (well above the CVE floor), so no download was required
- Fixed 3 pre-existing TypeScript build errors; build now passes cleanly with 85 routes generated

## Task Commits

Each task was committed atomically:

1. **Task 1: Bump Next.js and eslint-config-next version specifiers and install** - `78db00e` (chore)
2. **Task 2: Verify build passes with updated specifiers** - pre-existing bug fixes committed as `eed0961` (fix) in same session; build verified at exit 0

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `web/package.json` - next and eslint-config-next version specifiers bumped to ^15.2.3
- `web/app/(dashboard)/treatments/[id]/page.tsx` - Added `!!` coercion on `unknown` vertical_extra_fields values for ReactNode compatibility
- `web/contexts/org-context.tsx` - Added `'general'` to VerticalId union type (was used as fallback throughout codebase but missing from type)
- `web/lib/org-labels.ts` - Added `general` entry to LABEL_MAP to satisfy `Record<VerticalId, OrgLabels>` after VerticalId update
- `web/components/analytics/ComplianceScoreChart.tsx` - Changed recharts Tooltip formatter parameter from `number` to `number | undefined` to match Formatter<number> signature

## Decisions Made
- Specifier-only bump: pnpm lockfile already pinned `next@15.5.12` which is above the CVE floor. Only `package.json` specifiers needed updating — no lock churn.
- Added `'general'` to `VerticalId`: the literal `'general'` was used in 8+ places as a fallback vertical but was absent from the union type. Adding it is the correct fix (not casting); the `BookingVerticalId` type already includes it.
- Treated pre-existing TS errors as Rule 1 bugs: the build task required a passing build; fixing errors is required for plan completion.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Treatment detail page: `unknown` type not assignable to ReactNode**
- **Found during:** Task 2 (build verification)
- **Issue:** `treatment.vertical_extra_fields.venue_name` is `unknown` (from `Record<string, unknown>`); using it as the final operand of a `&&` JSX expression produces type `unknown` which is not `ReactNode`
- **Fix:** Added `!!` before the final truthiness check to coerce `unknown` to `boolean`, making the `&&` expression type `false | JSX.Element`
- **Files modified:** `web/app/(dashboard)/treatments/[id]/page.tsx`
- **Verification:** Build compiler no longer raises error at line 129/144
- **Committed in:** `eed0961` (fix commit)

**2. [Rule 1 - Bug] VerticalId union missing `'general'` member**
- **Found during:** Task 2 (build verification)
- **Issue:** `VerticalId` did not include `'general'`, but `'general'` was used as a fallback fallback in medic profile, riddor, and admin booking pages. TypeScript flagged the comparison `primaryVertical !== 'general'` as having no overlap.
- **Fix:** Added `| 'general'` to the `VerticalId` union in `org-context.tsx`; added corresponding `general` entry to `LABEL_MAP` in `org-labels.ts`
- **Files modified:** `web/contexts/org-context.tsx`, `web/lib/org-labels.ts`
- **Verification:** No TypeScript error at medic/profile/page.tsx:290; LABEL_MAP satisfies `Record<VerticalId, OrgLabels>`
- **Committed in:** `eed0961` (fix commit)

**3. [Rule 1 - Bug] ComplianceScoreChart recharts Tooltip formatter parameter mismatch**
- **Found during:** Task 2 (build verification)
- **Issue:** `formatter` prop typed `(value: number) => [...]` but recharts `Formatter<number, "Score">` expects `value: number | undefined`
- **Fix:** Changed annotation to `value: number | undefined` and used `value ?? ''` in the template literal
- **Files modified:** `web/components/analytics/ComplianceScoreChart.tsx`
- **Verification:** TypeScript error at line 70 resolved; build passes
- **Committed in:** `eed0961` (fix commit)

---

**Total deviations:** 3 auto-fixed (all Rule 1 - Bug)
**Impact on plan:** All fixes were pre-existing build blockers unrelated to the Next.js version bump. Required to satisfy Task 2's "build passes with zero type errors" criterion. No scope creep.

## Issues Encountered
- `pnpm build --filter=sitemedic-web` failed with `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL` — the web workspace is not set up as a pnpm workspace package. Fixed by running `pnpm build` from within the `web/` directory directly.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- CVE-2025-29927 floor is in place — Phase 26 subdomain routing middleware expansion is safe to proceed
- Build is clean with zero TypeScript errors across all 85 routes
- No blockers for Phase 24 plans 02–05

---
*Phase: 24-db-foundation*
*Completed: 2026-02-18*
