---
phase: 30-subscription-management-feature-gating
plan: 01
subsystem: billing
tags: [tier-gating, feature-gates, upgrade-prompt, subscription]
dependency-graph:
  requires: [25-02]
  provides: [TierGate, UpgradePrompt, requireTier]
  affects: [30-02, 30-03, 30-04, 30-05]
tech-stack:
  added: []
  patterns: [tier-gate-wrapper, server-side-feature-gating]
key-files:
  created:
    - web/components/billing/upgrade-prompt.tsx
    - web/components/billing/tier-gate.tsx
    - web/lib/billing/require-tier.ts
  modified:
    - FEATURES.md
decisions:
  - id: "30-01-01"
    decision: "UpgradePrompt links to /admin/settings#billing for upgrade flow"
    rationale: "Settings page with billing section is the natural upgrade entry point"
  - id: "30-01-02"
    decision: "requireTier() is a pure utility (no NextResponse coupling)"
    rationale: "API routes handle HTTP responses differently; utility just throws errors"
metrics:
  duration: "~2.5 min"
  completed: "2026-02-18"
---

# Phase 30 Plan 01: Tier Gating Components & Server Helper Summary

**One-liner:** Client-side TierGate/UpgradePrompt components and server-side requireTier() helper consuming feature-gates module for subscription-based access control.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Create UpgradePrompt component and TierGate wrapper | f433dea | upgrade-prompt.tsx, tier-gate.tsx |
| 2 | Create requireTier server-side API helper | cf11215 | require-tier.ts |

## What Was Built

### UpgradePrompt Component (`web/components/billing/upgrade-prompt.tsx`)
- Client component with dark gradient card (blue-900/purple-900)
- `FEATURE_DISPLAY_NAMES` record mapping all 12 FeatureKey values to human-readable names
- `FEATURE_REQUIRED_TIER` partial record mapping Growth+ and Enterprise features to their required tier
- Sparkles icon, tier-specific heading, contextual description, CTA button linking to `/admin/settings#billing`

### TierGate Component (`web/components/billing/tier-gate.tsx`)
- Client component wrapping children in a `hasFeature()` check
- Renders children when tier includes the feature, otherwise renders UpgradePrompt
- Accepts optional `upgradeMessage` prop for contextual copy

### requireTier() Helper (`web/lib/billing/require-tier.ts`)
- Async server-side utility for API route gating
- Resolves org via `requireOrgId()`, queries `organizations.subscription_tier`
- Throws `'TIER_INSUFFICIENT'` error for denied access
- Returns the tier on success for downstream use
- NULL tier defaults to 'starter' (legacy org compatibility)

## Decisions Made

1. **30-01-01:** UpgradePrompt CTA links to `/admin/settings#billing` — the settings page billing section is the natural upgrade entry point
2. **30-01-02:** `requireTier()` is a pure utility with no NextResponse coupling — API routes catch errors and return appropriate HTTP status codes themselves

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- TypeScript compilation: `pnpm tsc --noEmit` passes with zero errors after both tasks

## Next Phase Readiness

All three artifacts (TierGate, UpgradePrompt, requireTier) are ready for consumption by:
- **30-02:** Settings/billing page integration
- **30-03:** Admin page tier gating
- **30-04:** API route tier gating
- **30-05:** Dashboard tier indicators
