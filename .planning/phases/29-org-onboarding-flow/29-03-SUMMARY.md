---
phase: 29-org-onboarding-flow
plan: 03
subsystem: ui
tags: [onboarding, wizard, branding, middleware, supabase-storage, polling]

# Dependency graph
requires:
  - phase: 29-org-onboarding-flow
    provides: "29-01: checkout-status polling endpoint, org_branding row creation in checkout route"
  - phase: 27-org-branding-ui
    provides: "BrandingProvider XSS regex pattern, CSS custom properties injection"
  - phase: 24-org-branding
    provides: "org_branding table, org-logos storage bucket, RLS policies"
provides:
  - "/onboarding post-payment success page with subscription status polling"
  - "/onboarding/branding pre-activation branding setup wizard"
  - "Middleware onboarding routing (pending orgs -> /onboarding, completed orgs -> /admin)"
affects: [29-04 (platform admin activation panel), 29-05 (welcome email on activation)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Onboarding middleware gate separate from publicRoutes block"
    - "Polling with setInterval + cleanup in useEffect"
    - "Supabase Storage upsert for logo replacement"

key-files:
  created:
    - web/app/onboarding/layout.tsx
    - web/app/onboarding/page.tsx
    - web/app/onboarding/branding/page.tsx
  modified:
    - web/lib/supabase/middleware.ts
    - FEATURES.md

key-decisions:
  - "Onboarding check is separate from !isPublicRoute block because /admin is in publicRoutes"
  - "Legacy orgs (NULL onboarding_completed) treated as completed via ?? true fallback"
  - "Branding page only UPDATEs org_branding — row already exists from checkout route (29-01)"
  - "Logo upload uses upsert to allow replacing existing logo without deletion step"

patterns-established:
  - "Wizard layout pattern: dark gradient + centered max-w-2xl + SiteMedic header"
  - "Middleware onboarding gate: fires for authenticated users with org_id on /admin, /dashboard, /medic, /onboarding"

# Metrics
duration: 4min
completed: 2026-02-18
---

# Phase 29 Plan 03: Post-Payment Onboarding Wizard Summary

**Post-payment success page with Stripe webhook polling, branding setup wizard (logo/colour/name), and middleware gating pending-activation orgs away from dashboard**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-18T12:15:51Z
- **Completed:** 2026-02-18T12:19:51Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- Post-payment success page polls checkout-status every 3s, showing processing spinner then green checkmark on confirmation
- Branding wizard lets pending orgs pre-configure company name, primary colour, tagline, and logo before activation
- Middleware redirects onboarding_completed=false orgs to /onboarding and completed orgs away from /onboarding to /admin
- Legacy orgs with NULL onboarding_completed are unaffected (treated as completed)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create onboarding layout and success page** - `6754bba` (feat)
2. **Task 2: Create branding setup wizard page** - `c821b78` (feat)
3. **Task 3: Update middleware for onboarding routing** - `5de4638` (feat)

## Files Created/Modified
- `web/app/onboarding/layout.tsx` - Minimal wizard layout: dark gradient background, SiteMedic logo header, centered content column (max-w-2xl), no sidebar
- `web/app/onboarding/page.tsx` - Post-payment success page: polls GET /api/billing/checkout-status every 3s, shows processing/confirmed states, links to branding setup, redirects to /admin when onboarding complete
- `web/app/onboarding/branding/page.tsx` - Branding setup wizard: company name, hex colour picker with XSS regex, tagline, logo upload (PNG/JPEG/SVG max 2MB) to org-logos bucket, updates existing org_branding row
- `web/lib/supabase/middleware.ts` - Added onboarding routing block: onboarding_completed=false orgs redirected from /admin|/dashboard|/medic to /onboarding; completed orgs redirected from /onboarding to /admin; null treated as true
- `FEATURES.md` - Updated with post-payment onboarding wizard documentation

## Decisions Made
- **Onboarding check separate from publicRoutes block:** The plan placed the onboarding check inside `if (user && !isPublicRoute)`, but `/admin` is in `publicRoutes` (existing admin pages need public access). Moved the onboarding check to its own `if (user)` block so it fires even for /admin routes. This is a bug fix (Deviation Rule 1) — the planned approach would not have intercepted pending orgs accessing /admin.
- **Legacy org safety via ?? true:** Orgs created before the onboarding feature have NULL onboarding_completed. Using `?? true` fallback ensures they are never redirected to /onboarding.
- **Branding page UPDATE-only:** The org_branding row is created by the checkout route (29-01). The branding page only updates, never inserts. This avoids duplicate row issues.
- **Logo upsert:** Using Supabase Storage `upsert: true` allows replacing the logo without a separate delete step.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Onboarding check moved outside !isPublicRoute block**
- **Found during:** Task 3 (Middleware update)
- **Issue:** Plan specified adding onboarding check inside the `if (user && !isPublicRoute)` block, but `/admin` is listed in `publicRoutes`. This means `isPublicRoute=true` for /admin, causing the entire block to be skipped — pending orgs could access /admin freely.
- **Fix:** Moved onboarding routing to a separate `if (user)` block that fires regardless of publicRoutes. Added explanatory comment about why it's separate.
- **Files modified:** web/lib/supabase/middleware.ts
- **Verification:** TypeScript compiles. Logic analysis confirms /admin requests now trigger onboarding check.
- **Committed in:** 5de4638 (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Essential fix — without this, the middleware gate would not have worked for /admin routes, defeating the purpose of the onboarding flow.

## Issues Encountered
- Pre-existing TypeScript build error in `lib/queries/client/bookings.ts` (documented in 29-01 SUMMARY) causes `pnpm build` to fail. Verified onboarding files compile cleanly via `tsc --noEmit` filtered check. No impact on onboarding functionality.

## User Setup Required

None - no external service configuration required. Uses existing Supabase Storage bucket (org-logos from Phase 24) and existing checkout-status API (from 29-01).

## Next Phase Readiness
- Onboarding flow complete: signup -> Stripe Checkout -> /onboarding (success + branding) -> platform admin activation
- Ready for 29-04 (platform admin activation panel) to set onboarding_completed=true
- Middleware will automatically redirect to /admin once onboarding_completed is set to true
- No new migrations, no new env vars

---
*Phase: 29-org-onboarding-flow*
*Completed: 2026-02-18*
