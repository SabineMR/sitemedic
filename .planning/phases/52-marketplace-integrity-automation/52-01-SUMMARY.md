# Phase 52-01 Summary: Calibration, Repeat-Offender Escalation, and SLA Visibility

## Execution Status

- Plan: `52-01-PLAN.md`
- Status: Complete
- Scope: INT-15, INT-16, INT-17, INT-18

## Completed Tasks

- [x] **Task 1:** Added calibration config + threshold-aware escalation
  - `supabase/migrations/168_marketplace_integrity_calibration.sql`
  - Introduced `marketplace_integrity_config` singleton and expanded signal check constraints.
  - Updated escalation trigger to use config thresholds and repeat-offender context.

- [x] **Task 2:** Added expanded signals and repeat-offender scoring
  - `web/lib/marketplace/integrity/signals.ts` now:
    - reads integrity config thresholds,
    - applies repeat-offender score boost,
    - ingests `EVENT_COLLISION_DUPLICATE`.
  - `web/lib/marketplace/attribution/service.ts` now emits `REFERRAL_LOOP_ABUSE` on reciprocal accepted pass-on patterns.

- [x] **Task 3:** Added queue/SLA overview monitoring
  - `web/app/api/platform/marketplace/integrity/overview/route.ts`
  - `web/components/platform/marketplace/IntegrityOverviewPanel.tsx`
  - integrated into `web/app/platform/marketplace/entities/page.tsx` for integrity tab.

## Files Added/Updated

- `supabase/migrations/168_marketplace_integrity_calibration.sql`
- `web/lib/marketplace/integrity/signals.ts`
- `web/lib/marketplace/attribution/service.ts`
- `web/app/api/platform/marketplace/integrity/overview/route.ts`
- `web/components/platform/marketplace/IntegrityOverviewPanel.tsx`
- `web/app/platform/marketplace/entities/page.tsx`

## Verification

- `pnpm --dir web exec tsc --noEmit` ✅
- `pnpm --dir web lint` ✅ warning-only
- `pnpm --dir web test -- web/lib/marketplace/attribution/__tests__/pass-on-invariants.test.ts web/lib/marketplace/integrity/__tests__/signals-risk-band.test.ts` ✅
- `pnpm --dir web-marketplace exec tsc --noEmit` ⚠️ pre-existing unrelated type debt remains

## Notes

- v6.0 marketplace integrity stack now spans provenance invariants, operational lifecycle, signal scoring, enforcement queue, and calibration/overview automation.
