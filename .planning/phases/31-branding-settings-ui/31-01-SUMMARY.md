---
phase: 31-branding-settings-ui
plan: 01
subsystem: ui
tags: [react, supabase-storage, debounce, colour-picker, tier-gate, auto-save]

# Dependency graph
requires:
  - phase: 24-db-foundation
    provides: org_branding table and org-logos storage bucket
  - phase: 27-branding-web-portal
    provides: BrandingProvider, CSS custom properties
  - phase: 30-subscription-management
    provides: TierGate component, requireTier() API helper
provides:
  - BrandingForm reusable component with apiEndpoint prop
  - BrandingPreview live preview component
  - Dedicated branding settings page at /admin/settings/branding
  - logo_path support in branding API PUT handler
affects: [31-02-platform-admin-branding-override]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Auto-save with 500ms debounce via useRef<setTimeout> and hasInitialized guard"
    - "Explicit logo upload separate from auto-save (manual action with toast feedback)"
    - "onPreviewChange callback for instant live preview (no debounce)"

key-files:
  created:
    - web/app/(dashboard)/admin/settings/branding/page.tsx
    - web/app/(dashboard)/admin/settings/branding/components/branding-form.tsx
    - web/app/(dashboard)/admin/settings/branding/components/branding-preview.tsx
  modified:
    - web/app/admin/settings/page.tsx
    - web/app/api/admin/branding/route.ts

key-decisions:
  - "Auto-save (500ms debounce) for text fields, explicit upload for logo — different UX patterns for different interaction types"
  - "BrandingForm accepts apiEndpoint prop for 31-02 platform admin reuse"
  - "Preview updates instantly (no debounce) while save is debounced — snappy UX"

patterns-established:
  - "Auto-save debounce: useRef<setTimeout> + hasInitialized ref to skip initial render"
  - "Reusable form component: apiEndpoint prop for different API targets"

# Metrics
duration: 10min
completed: 2026-02-19
---

# Phase 31 Plan 01: Org Admin Branding Settings Page Summary

**Reusable BrandingForm with 500ms auto-save debounce, explicit Supabase Storage logo upload, live BrandingPreview panel, and TierGate Growth-tier enforcement**

## Performance

- **Duration:** 10 min
- **Started:** 2026-02-19T12:34:09Z
- **Completed:** 2026-02-19T12:43:45Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- BrandingForm component with auto-save debounce (500ms), logo upload, colour picker, reset button, and inline save status indicator
- BrandingPreview component with live portal header + sidebar mockup + browser tab title preview
- Dedicated branding settings page at `/admin/settings/branding` with TierGate wrapping
- Settings page simplified: inline branding form replaced with summary card + "Manage Branding" link
- Branding API PUT handler extended to accept `logo_path` for logo upload persistence

## Task Commits

Each task was committed atomically:

1. **Task 1: Create BrandingForm and BrandingPreview components** - `70a62a0` (feat)
2. **Task 2: Create branding settings page and update settings page link** - `0280d1d` (feat, as part of prior session)

**Deviation fixes:**
- `332d70a` - fix: resolve undefined previousStatus in contract signing (pre-existing build blocker)
- `7ed344f` - fix: add logo_path support to branding API PUT handler (missing critical functionality)
- `932ab13` - docs: update FEATURES.md with branding settings documentation

## Files Created/Modified
- `web/app/(dashboard)/admin/settings/branding/page.tsx` - Branding settings page with TierGate, form + preview layout
- `web/app/(dashboard)/admin/settings/branding/components/branding-form.tsx` - BrandingForm: auto-save, logo upload, colour picker, reset
- `web/app/(dashboard)/admin/settings/branding/components/branding-preview.tsx` - BrandingPreview: portal header + sidebar + tab title mockup
- `web/app/admin/settings/page.tsx` - Simplified branding section with Manage Branding link
- `web/app/api/admin/branding/route.ts` - Added logo_path to PUT handler body parsing

## Decisions Made
- Auto-save (500ms debounce) for text fields, explicit upload button for logo -- different UX patterns match different interaction types (typing vs deliberate file action)
- BrandingForm accepts apiEndpoint prop (defaults to `/api/admin/branding`) for reuse in 31-02 platform admin override
- Preview updates instantly on every keystroke (no debounce on preview, only on save) for snappy UX
- Save status uses inline text indicator ("Saving..." / "All changes saved") instead of toast -- auto-save should be unobtrusive

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed undefined previousStatus variable in contract signing page**
- **Found during:** Build verification
- **Issue:** `previousStatus` referenced but never declared in `web/app/contracts/[id]/sign/page.tsx` -- pre-existing bug from sprint-17 commit `3526823`
- **Fix:** Replaced with literal `'sent'` since the code is inside `if (contract.status === 'sent')` block
- **Files modified:** web/app/contracts/[id]/sign/page.tsx
- **Verification:** Build passes without TypeScript errors
- **Committed in:** 332d70a

**2. [Rule 2 - Missing Critical] Added logo_path support to branding API PUT handler**
- **Found during:** Code review of API route vs BrandingForm integration
- **Issue:** PUT `/api/admin/branding` did not accept `logo_path` in request body -- logo uploads would silently fail to persist the storage path to org_branding
- **Fix:** Added `logo_path` to body type and updatePayload construction with type-safe string check
- **Files modified:** web/app/api/admin/branding/route.ts
- **Verification:** Build passes, API accepts logo_path field
- **Committed in:** 7ed344f

---

**Total deviations:** 2 auto-fixed (1 bug, 1 missing critical)
**Impact on plan:** Both fixes necessary for correctness. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- BrandingForm is ready for 31-02 reuse via apiEndpoint prop
- All components tested via build verification
- Settings page links correctly to dedicated branding page

---
*Phase: 31-branding-settings-ui*
*Completed: 2026-02-19*
