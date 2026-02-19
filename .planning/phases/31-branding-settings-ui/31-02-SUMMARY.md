---
phase: 31-branding-settings-ui
plan: 02
subsystem: ui
tags: [service-role, supabase-storage, formdata, platform-admin, branding-override]

# Dependency graph
requires:
  - phase: 31-01
    provides: BrandingForm with apiEndpoint prop, BrandingPreview component
  - phase: 24-db-foundation
    provides: org_branding table and org-logos storage bucket
  - phase: 29-org-onboarding
    provides: Platform admin activate route (service-role client pattern)
provides:
  - Platform admin branding override API (GET/PUT/POST) with service-role client
  - BrandingForm logoUploadEndpoint prop for server-side logo upload
  - Expandable branding section per org card on platform organizations page
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Server-side FormData logo upload via service-role client (bypasses RLS for platform admin)"
    - "Dual upload path: logoUploadEndpoint prop toggles server-side vs client-side storage upload"
    - "Expandable card with col-span toggle: lg:col-span-2 when branding expanded for full-width form"

key-files:
  created:
    - web/app/api/platform/organizations/[id]/branding/route.ts
  modified:
    - web/app/(dashboard)/admin/settings/branding/components/branding-form.tsx
    - web/app/platform/organizations/page.tsx

key-decisions:
  - "Service-role client for all platform admin branding ops -- platform admin JWT has org_id=NULL so RLS would block all writes"
  - "logoUploadEndpoint prop is optional -- org admin flow unchanged, zero regression"
  - "apiEndpoint and logoUploadEndpoint both point to same route -- distinguished by HTTP method (PUT vs POST)"

patterns-established:
  - "Server-side FormData upload: POST handler receives File, validates type/size, converts to Buffer, uploads via service-role storage client"
  - "Dual upload path pattern: optional prop switches between client-side and server-side upload within same component"

# Metrics
duration: 6min
completed: 2026-02-19
---

# Phase 31 Plan 02: Platform Admin Branding Override Summary

**Service-role branding API (GET/PUT/POST) with server-side FormData logo upload, BrandingForm logoUploadEndpoint prop, and expandable branding section per org card on platform organizations page**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-19T12:47:11Z
- **Completed:** 2026-02-19T12:52:48Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Platform admin branding API route with GET (read), PUT (auto-save text fields), and POST (FormData logo upload) handlers, all using service-role Supabase client
- BrandingForm enhanced with optional `logoUploadEndpoint` prop for server-side logo upload (zero regression for org admin usage)
- Platform organizations page now has expandable branding section per active org card with inline BrandingForm + BrandingPreview

## Task Commits

Each task was committed atomically:

1. **Task 1: Create platform admin branding API route** - `5259d8e` (feat)
2. **Task 2: Add logoUploadEndpoint prop to BrandingForm** - `fb9dd3c` (feat)
3. **Task 3: Add expandable branding section to platform organizations page** - `63695f8` (feat)

## Files Created/Modified
- `web/app/api/platform/organizations/[id]/branding/route.ts` - New API route: GET reads branding via service-role, PUT auto-saves text fields, POST uploads logo via FormData with file validation
- `web/app/(dashboard)/admin/settings/branding/components/branding-form.tsx` - Added optional `logoUploadEndpoint` prop; when set, logo upload POSTs FormData instead of client-side Supabase Storage
- `web/app/platform/organizations/page.tsx` - Added Branding button per org card, expandable section with BrandingForm + BrandingPreview, branding data fetch and cache

## Decisions Made
- Service-role client used for all platform admin branding operations -- platform admin JWT has `org_id=NULL` so RLS would block all direct writes
- `logoUploadEndpoint` prop is optional (defaults to undefined) -- org admin flow from 31-01 is completely unchanged
- Both `apiEndpoint` and `logoUploadEndpoint` point to the same route (`/api/platform/organizations/{id}/branding`) -- the route distinguishes by HTTP method (PUT for text auto-save, POST for logo upload FormData)
- Expanded card uses `lg:col-span-2` to fill full grid width -- provides enough room for form + preview side-by-side

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 31 is now complete (2/2 plans done)
- All branding settings UI requirements are fulfilled:
  - Org admin self-service branding (31-01)
  - Platform admin white-glove branding override (31-02)
- v3.0 milestone is now fully complete (all 8 phases, 31 plans)

---
*Phase: 31-branding-settings-ui*
*Completed: 2026-02-19*
