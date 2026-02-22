# Phase 51-01 Summary: Escalation Queue and Review Workflow

## Execution Status

- Plan: `51-01-PLAN.md`
- Status: Complete
- Scope: INT-12, INT-13, INT-14

## Completed Tasks

- [x] **Task 1:** Added escalation schema + trigger automation
  - `supabase/migrations/167_marketplace_integrity_escalation.sql`
  - High-risk scores now auto-open integrity cases and apply booking remainder-hold.

- [x] **Task 2:** Added platform-admin case resolution API
  - `web/app/api/platform/marketplace/integrity/cases/[caseId]/resolve/route.ts`
  - Supports `resolved_dismissed` and `resolved_confirmed` outcomes with note requirements.

- [x] **Task 3:** Added integrity queue triage in entity workspace
  - Expanded entities API and query types to include `integrity` records.
  - Added `IntegrityCasePanel` for resolution actions.
  - Added integrity tab in `/platform/marketplace/entities`.

## Files Added/Updated

- `supabase/migrations/167_marketplace_integrity_escalation.sql`
- `web/app/api/platform/marketplace/integrity/cases/[caseId]/resolve/route.ts`
- `web/app/api/platform/marketplace/entities/route.ts`
- `web/lib/queries/platform/marketplace-entities.ts`
- `web/components/platform/marketplace/IntegrityCasePanel.tsx`
- `web/app/platform/marketplace/entities/page.tsx`

## Verification

- `pnpm --dir web exec tsc --noEmit` ✅
- `pnpm --dir web lint` ✅ warning-only
- `pnpm --dir web test -- web/lib/marketplace/attribution/__tests__/pass-on-invariants.test.ts web/lib/marketplace/integrity/__tests__/signals-risk-band.test.ts` ✅
- `pnpm --dir web-marketplace exec tsc --noEmit` ⚠️ pre-existing unrelated type debt remains

## Notes

- This phase keeps enforcement review-first: no automatic bans.
- Holds are automated for high-risk cases and explicitly releasable by platform-admin case resolution.
