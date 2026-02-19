---
phase: 30-subscription-management-feature-gating
plan: 02
subsystem: ui, api
tags: [tier-gate, feature-gating, branding, white-label, subscription]

# Dependency graph
requires:
  - phase: 30-01
    provides: TierGate component, UpgradePrompt component, requireTier utility, feature-gates config
provides:
  - Branding section gated behind Growth tier on settings page
  - Branding API route enforces Growth tier for GET and PUT
affects: [30-05, future branding enhancements]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TierGate wraps UI sections to show UpgradePrompt for insufficient tiers"
    - "requireTier() in API routes returns 403 for tier-gated endpoints"

key-files:
  created: []
  modified:
    - web/app/admin/settings/page.tsx
    - web/app/api/admin/branding/route.ts

key-decisions:
  - "Section header (Palette icon + Branding) stays visible outside TierGate so all tiers see the feature exists"
  - "requireTier added after requireOrgId in API route — auth check first, then tier check"

patterns-established:
  - "TierGate wrapper pattern: section heading outside, form content inside"
  - "API tier gating pattern: try/catch requireTier after requireOrgId with 403 response"

# Metrics
duration: 3min
completed: 2026-02-18
---

# Phase 30 Plan 02: Branding Feature Gating Summary

**TierGate wraps branding editor on settings page; requireTier enforces Growth tier on branding API GET/PUT**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-19T00:19:52Z
- **Completed:** 2026-02-19T00:22:52Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Branding section on settings page now shows UpgradePrompt for Starter-tier orgs
- Growth/Enterprise orgs see full branding editor unchanged
- Branding API route returns 403 Forbidden for Starter-tier orgs on both GET and PUT
- Section heading remains visible for all tiers (shows feature exists, prompts upgrade)

## Task Commits

Each task was committed atomically:

1. **Task 1: Wrap branding section with TierGate on settings page** - `ec9b172` (feat)
2. **Task 2: Add requireTier to branding API route** - `7dcb60d` (feat)

## Files Created/Modified
- `web/app/admin/settings/page.tsx` - Added TierGate import and wrapped branding form content with white_label feature gate
- `web/app/api/admin/branding/route.ts` - Added requireTier import and white_label tier checks to GET and PUT handlers

## Decisions Made
- Section header kept outside TierGate so all tiers see the "Branding" heading exists — upgrade prompt appears inside the section area
- requireTier placed after requireOrgId in API route — ensures auth happens first, then tier check, matching the error handling hierarchy (401 for unauthed, 403 for insufficient tier)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Branding feature gating complete — Starter orgs blocked at both UI and API level
- Ready for Phase 30-03 (billing portal) and 30-05 (additional feature gates)
- Pattern established for gating additional features in future plans

---
*Phase: 30-subscription-management-feature-gating*
*Completed: 2026-02-18*
