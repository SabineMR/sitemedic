# Phase 50-01 Summary: Signal Ingestion and Explainable Risk Scoring

## Execution Status

- Plan: `50-01-PLAN.md`
- Status: Complete
- Scope: INT-09, INT-10, INT-11

## Completed Tasks

- [x] **Task 1:** Added signal + score schema
  - `supabase/migrations/166_marketplace_integrity_signals.sql`
  - Added explainable signal rows and event score snapshots with RLS.

- [x] **Task 2:** Implemented ingestion + scoring
  - `web/lib/marketplace/integrity/signals.ts`
  - Direct-job creation now emits migration/leakage signals.
  - PASS-ON service emits lifecycle activity signals.

- [x] **Task 3:** Added integrity visibility
  - Participant API: `/api/marketplace/integrity/events/[eventId]`
  - Platform-admin API: `/api/platform/marketplace/integrity/events/[eventId]`
  - UI: `IntegrityRiskCard` integrated on direct job detail page.

## Files Added/Updated

- `supabase/migrations/166_marketplace_integrity_signals.sql`
- `web/lib/marketplace/integrity/signals.ts`
- `web/lib/marketplace/integrity/__tests__/signals-risk-band.test.ts`
- `web/app/api/direct-jobs/route.ts`
- `web/lib/marketplace/attribution/service.ts`
- `web/app/api/marketplace/integrity/events/[eventId]/route.ts`
- `web/app/api/platform/marketplace/integrity/events/[eventId]/route.ts`
- `web/lib/queries/marketplace/integrity.ts`
- `web/components/marketplace/attribution/IntegrityRiskCard.tsx`
- `web/app/(dashboard)/dashboard/jobs/[id]/page.tsx`

## Verification

- `pnpm --dir web test -- web/lib/marketplace/attribution/__tests__/pass-on-invariants.test.ts web/lib/marketplace/integrity/__tests__/signals-risk-band.test.ts` ✅
- `pnpm --dir web exec tsc --noEmit` ✅
- `pnpm --dir web lint` ✅ warning-only
- `pnpm --dir web-marketplace exec tsc --noEmit` ⚠️ pre-existing unrelated type debt remains
- Targeted signal/score grep checks ✅

## Notes

- This phase is review-first detection; it does not auto-ban users.
- Co-share and advanced referral-loop scoring remain for subsequent v6 plans.
