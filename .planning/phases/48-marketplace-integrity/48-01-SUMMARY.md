# Phase 48-01 Summary: Source and Fee Integrity Foundation

## Execution Status

- Plan: `48-01-PLAN.md`
- Status: Complete
- Scope: INT-01, INT-02, INT-03, INT-04

## Completed Tasks

- [x] **Task 1:** Add provenance + fee-policy schema invariants
  - Added migration `supabase/migrations/164_marketplace_integrity_provenance.sql`.
  - Added `source_provenance`, `fee_policy`, lock metadata, consistency checks, and immutability trigger for `marketplace_events` and `bookings`.

- [x] **Task 2:** Update TypeScript contracts
  - Added provenance/fee types to direct-job and marketplace type contracts.
  - Added shared schema enums for integrity fields in direct-job schema module.

- [x] **Task 3:** Wire write paths
  - Direct job creation and direct booking bridge now persist `self_sourced` + `subscription` policy.
  - Marketplace event creation and booking bridges now persist `marketplace_sourced` + `marketplace_commission` policy.

## Files Changed

- `supabase/migrations/164_marketplace_integrity_provenance.sql`
- `web/app/api/direct-jobs/route.ts`
- `web/lib/direct-jobs/types.ts`
- `web/lib/direct-jobs/schemas.ts`
- `web/lib/direct-jobs/booking-bridge.ts`
- `web/lib/marketplace/booking-bridge.ts`
- `web-marketplace/app/api/marketplace/events/route.ts`
- `web-marketplace/lib/marketplace/event-types.ts`
- `web-marketplace/lib/marketplace/award-types.ts`
- `web-marketplace/lib/marketplace/booking-bridge.ts`

## Verification

- `rg -n "source_provenance|fee_policy|source_origin_event_id|prevent_non_admin_source_reclassification" supabase/migrations/164_marketplace_integrity_provenance.sql` ✅
- `rg -n "source_provenance|fee_policy|source_origin_event_id" <write-path files>` ✅
- `pnpm --dir web exec tsc --noEmit` ✅
- `pnpm --dir web lint` ✅ warning-only
- `pnpm --dir web-marketplace exec tsc --noEmit` ⚠️ pre-existing unrelated module/type debt remains

## Policy Decisions Applied

- Pass-on jobs preserve source provenance by default (non-admin reclassification blocked).
- Scenario C policy remains locked for future execution layers: dual-sided fee model (5% + 5%).
- Client source self-attestation is not used as primary integrity control.
