---
phase: 11-org-settings
plan: "02"
subsystem: api
tags: [next.js, supabase, typescript, org-settings, admin]

# Dependency graph
requires:
  - phase: 11-01
    provides: org_settings table with RLS and seed data
provides:
  - GET /api/admin/settings — fetch org settings row
  - PUT /api/admin/settings — validate and update org settings
  - Business Configuration section in admin settings page
affects:
  - 11-03 (future plans building on org settings UI/API)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "requireOrgId + createClient pattern for authenticated API routes"
    - "Settings form with optimistic state and toast feedback"
    - "Partial update pattern: build payload dynamically with only defined fields"

key-files:
  created:
    - web/app/api/admin/settings/route.ts
  modified:
    - web/app/admin/settings/page.tsx

key-decisions:
  - "Validation in PUT handler returns 400 with specific field-level error messages"
  - "urgency_premiums stored as JSON array; UI accepts comma-separated input string"
  - "net30_eligible handled as checkbox toggle, credit_limit as numeric input"

patterns-established:
  - "GET/PUT org settings via /api/admin/settings with requireOrgId isolation"
  - "Settings page fetches on mount, saves via PUT, shows toasts for success/error"

# Metrics
duration: 3min
completed: 2026-02-17
---

# Phase 11 Plan 02: Admin Settings API and Business Configuration UI Summary

**GET/PUT /api/admin/settings route with input validation, and Business Configuration section in the admin settings page with 6 editable fields and toast feedback**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-17T17:35:42Z
- **Completed:** 2026-02-17T17:39:14Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created `GET /api/admin/settings` — fetches org_settings row for current org using requireOrgId
- Created `PUT /api/admin/settings` — validates and updates base_rate, geofence_default_radius, urgency_premiums, admin_email, net30_eligible, credit_limit with per-field 400 errors
- Fixed bug in settings page: `const { org } = useOrg()` replaced with correct `const { orgId, orgName } = useOrg()`
- Added Business Configuration section after Organisation Profile with all 6 fields, loading spinner, and save button with Loader2 spinner animation

## Task Commits

Each task was committed atomically:

1. **Task 1: Create GET + PUT API route for org settings** - `f82efdf` (feat)
2. **Task 2: Extend settings page with Business Configuration section** - `4a5137f` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `web/app/api/admin/settings/route.ts` - GET handler returns org settings row; PUT handler validates all fields and updates org_settings table
- `web/app/admin/settings/page.tsx` - Bug fix + Business Configuration section with base rate, geofence radius, urgency premiums, admin email, net30 toggle, credit limit fields

## Decisions Made

- **Partial update payload**: Only fields present in request body are updated; `updated_at` always set to `new Date().toISOString()`
- **urgency_premiums as comma-separated input**: UI stores as string in `urgencyInput` state, parsed to `number[]` on save — maps naturally to JSON array in DB
- **Validation returns field-specific 400 errors**: Each field has its own error message rather than generic "invalid input"
- **Save button uses orange gradient**: Differentiated from Contact Details save button (blue) to visually separate the two save actions

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Admin settings API is live and tested at `/api/admin/settings`
- Business Configuration UI reads from and writes to `org_settings` table
- Ready for plan 11-03 (any additional org settings work)

---
*Phase: 11-org-settings*
*Completed: 2026-02-17*
