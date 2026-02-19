---
phase: 32-foundation-schema-registration
plan: 02
subsystem: ui
tags: [zustand, react, next-api-routes, cqc-api, multipart-upload, supabase-storage, registration-wizard, marketplace]

# Dependency graph
requires:
  - phase: 32-01
    provides: "marketplace_companies table, compliance_documents table, compliance-documents storage bucket, TypeScript types, CQC client, compliance utilities"
  - phase: 002_business_operations
    provides: "clients table (marketplace_enabled column added in 32-01)"
provides:
  - "Zustand registration store managing 4-step wizard state with org pre-fill"
  - "CQC verify API route proxying to public CQC API"
  - "Registration API route creating marketplace_companies with org crossover"
  - "Document upload API route with multipart FormData and storage bucket upload"
  - "Client marketplace registration API toggling marketplace_enabled"
  - "4-step registration wizard UI (company details, CQC verification, document upload, review)"
  - "Lightweight client marketplace registration page"
affects:
  - 32-03 (document management builds on upload API and compliance_documents table)
  - 32-04 (admin verification queue queries marketplace_companies created by registration)
  - 33-event-creation (client-register enables marketplace_enabled for event posting)
  - 35-payments (Stripe Connect onboarding uses marketplace_companies.stripe_account_id)

# Tech tracking
tech-stack:
  added: []
  patterns: [zustand-wizard-store, multipart-formdata-upload, service-role-api-for-registration, middleware-marketplace-route-exception]

key-files:
  created:
    - web/stores/useMarketplaceRegistrationStore.ts
    - web/app/api/marketplace/cqc-verify/route.ts
    - web/app/api/marketplace/register/route.ts
    - web/app/api/marketplace/upload-document/route.ts
    - web/app/api/marketplace/client-register/route.ts
    - web/app/marketplace/register/layout.tsx
    - web/app/marketplace/register/page.tsx
    - web/app/marketplace/register/success/page.tsx
    - web/app/marketplace/client-register/page.tsx
  modified:
    - web/lib/supabase/middleware.ts

key-decisions:
  - "Marketplace registration routes added to middleware org_id exception list so users without an org can register"
  - "Registration API creates a new organization for non-org users (onboarding_completed=true to skip SiteMedic wizard)"
  - "Document upload deferred to post-registration (company row must exist first for storage RLS)"
  - "Client registration is a single POST toggle -- no wizard, no form fields, low friction per CONTEXT decision"

patterns-established:
  - "Zustand wizard store: DEFAULT_STATE object + create() with typed actions, reset() restores defaults"
  - "Multipart upload route: FormData parsing with file validation (size, MIME), service-role storage upload"
  - "Marketplace route middleware bypass: /marketplace/* routes exempt from org_id redirect"

# Metrics
duration: 7min
completed: 2026-02-19
---

# Phase 32 Plan 02: Registration Wizard & APIs Summary

**4-step Zustand-driven registration wizard with CQC verification, multipart document upload, org crossover, and single-click client marketplace toggle**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-19T20:42:33Z
- **Completed:** 2026-02-19T20:49:14Z
- **Tasks:** 4 (auto) + 1 checkpoint (pending)
- **Files created:** 9
- **Files modified:** 1

## Accomplishments
- Built Zustand store managing wizard state across 4 steps with pre-fill from existing SiteMedic org
- Created CQC verify API that proxies to public CQC API with IP logging
- Created registration API with dual-path org crossover (existing org linking or new org auto-creation)
- Created multipart document upload API with 10MB limit, MIME validation, and compliance_documents row creation
- Built responsive 4-step wizard UI (company details, CQC verification, documents, review & submit)
- Built lightweight client marketplace registration page with single-click enable
- Updated middleware to allow marketplace routes without org_id

## Task Commits

Each task was committed atomically:

1. **Task 1a: Zustand store + CQC verify API** - `d79cefe` (feat)
2. **Task 1b: Registration + document upload APIs** - `400582c` (feat)
3. **Task 2: Registration wizard UI** - `2e8d280` (feat)
4. **Task 3: Client marketplace registration** - `21003d5` (feat)

## Files Created/Modified
- `web/stores/useMarketplaceRegistrationStore.ts` - Zustand store managing 4-step wizard state with 11 typed actions
- `web/app/api/marketplace/cqc-verify/route.ts` - POST endpoint proxying to CQC public API
- `web/app/api/marketplace/register/route.ts` - POST endpoint creating marketplace_companies with org crossover
- `web/app/api/marketplace/upload-document/route.ts` - POST endpoint for multipart compliance document upload
- `web/app/api/marketplace/client-register/route.ts` - POST endpoint toggling marketplace_enabled on clients table
- `web/app/marketplace/register/layout.tsx` - Clean public-facing layout (no dashboard sidebar)
- `web/app/marketplace/register/page.tsx` - 4-step wizard with progress bar, validation, CQC verify, doc upload, review
- `web/app/marketplace/register/success/page.tsx` - Post-registration success page with next steps
- `web/app/marketplace/client-register/page.tsx` - Single-click client marketplace registration
- `web/lib/supabase/middleware.ts` - Added /marketplace/register and /marketplace/client-register to org_id exception list

## Decisions Made
- Marketplace registration routes bypass org_id check in middleware so new users (without org) can register
- New users get an organization auto-created with `onboarding_completed=true` to skip the SiteMedic onboarding wizard
- Document upload is deferred to post-registration because the company row must exist for storage bucket RLS
- Client registration is intentionally minimal (single toggle) per CONTEXT decision -- billing details collected at award time

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added marketplace routes to middleware org_id exception**
- **Found during:** Task 2 (registration wizard UI)
- **Issue:** Users without org_id would be redirected to /setup/organization before reaching the registration wizard
- **Fix:** Added /marketplace/register and /marketplace/client-register to the isSetupRoute exception in middleware.ts
- **Files modified:** web/lib/supabase/middleware.ts
- **Verification:** TypeScript compiles cleanly
- **Committed in:** 2e8d280 (Task 2 commit)

**2. [Rule 2 - Missing Critical] Added registration success page**
- **Found during:** Task 2 (registration wizard UI)
- **Issue:** Wizard redirects to /marketplace/register/success after submission but no page existed
- **Fix:** Created success page with next-steps guidance (upload documents, await verification)
- **Files modified:** web/app/marketplace/register/success/page.tsx (new)
- **Verification:** Page renders correctly in the registration flow
- **Committed in:** 2e8d280 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 missing critical)
**Impact on plan:** Both necessary for correct operation. No scope creep.

## Issues Encountered
None -- all files compiled cleanly on first attempt.

## User Setup Required
None -- no new external services or environment variables needed. CQC API is public.

## Next Phase Readiness
- Registration wizard creates marketplace_companies rows for admin verification queue (32-04)
- Document upload API ready for post-registration document management (32-03)
- Client marketplace toggle ready for event posting flow (33)
- All 4 API routes and pages await human verification at checkpoint

---
*Phase: 32-foundation-schema-registration*
*Completed: 2026-02-19*
