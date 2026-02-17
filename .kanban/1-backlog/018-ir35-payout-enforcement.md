# Build: IR35 Status Check Before Payout Processing

**ID:** TASK-018
**Story:** [STORY-004](../stories/004-compliance-enforcement.md)
**Priority:** high
**Branch:** `feat/018-ir35-payout-enforcement`
**Labels:** backend, compliance, payments

## Description
IR35 status is never validated before payouts are processed. This creates legal liability.

## Acceptance Criteria
- [ ] `/web/app/api/payouts/process-batch/route.ts` checks each medic has a valid IR35 status
- [ ] `friday-payout` edge function skips medics with no IR35 assessment and logs them
- [ ] Admin is alerted to medics skipped from payout due to missing IR35
- [ ] Skipped medics appear in a "pending IR35 review" queue in admin

## Notes
Depends on TASK-017 for deduction calculations to be meaningful.
