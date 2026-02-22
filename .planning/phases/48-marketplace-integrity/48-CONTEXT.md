# Phase 48 Context: Marketplace Integrity Foundation

## Phase

- **Phase:** 48-marketplace-integrity
- **Milestone:** v6.0 Marketplace Integrity
- **Status:** Planning started

## Problem Statement

SiteMedic has two revenue models that must remain cleanly separated:

1. **Self-sourced work** uses subscription economics (no per-job commission).
2. **Marketplace-sourced work** uses per-job commission economics (10% baseline).

The main abuse risk is source misclassification: users declaring marketplace-origin relationships as self-sourced to avoid commission.

## Scenarios In Scope

- **Scenario A (Solo):** one company/medic delivers.
- **Scenario B (Pass-on):** Company A passes work to Company B.
- **Scenario C (Co-shared):** two companies split delivery on one job.

## Locked Decisions (Session)

- **B-01 Source provenance lock:** pass-on jobs keep original source provenance; no implicit reclassification at handoff.
- **C-01 Fee policy:** Scenario C uses a **dual-sided split fee (5% + 5%)**, effectively 10% total across both companies.
- **D-01 Client self-attestation:** do **not** rely on client confirmation as primary control (high lie-risk). Integrity must be signal-driven and system-enforced.

## Integrity Signal Set

1. Account-age and relationship timing
2. IP/device overlap indicators
3. Behavioral patterns over time
4. Double-booking conflicts (marketplace vs self-sourced)
5. Short/absent platform messaging before rapid award
6. Referral loop/circular chain abuse

## Execution Principle

Use a balanced enforcement model:

- declaration in flow,
- system-enforced provenance invariants,
- multi-signal risk scoring,
- manual review before punitive action.

No single weak signal should trigger automatic conviction.

## Anti-Gaming Controls To Build (from founder guidance)

1. **Source-lock at origin event**
   - First eligible source classification is persisted and immutable-by-default.
   - Pass-on and downstream booking actions cannot silently reclassify source.

2. **Marketplace-to-direct collision checks**
   - Detect near-duplicate jobs across marketplace and self-procured paths by same counterparty pair, time window, and location radius.
   - Flag collisions for review and block payout finalization until resolved.

3. **Relationship laundering detection**
   - If two parties first interact via marketplace and then rapidly switch to self-procured jobs, raise risk score and case flag.
   - Repeated rapid transitions become escalation triggers.

4. **Off-platform migration risk scoring**
   - Combine short/absent messaging trail + rapid award patterns + repeated pair behavior over time.
   - Use progressive enforcement (advisory -> hold/review) rather than single-event auto-penalties.

5. **Self-procured integrity gates**
   - Require subscription entitlement and provenance metadata at write time.
   - Add pattern controls for repeated "new client + immediate self-procured" behavior.

## Story Board (Current Sprint)

- [x] **Story INT-FOUND-01:** Provenance schema + fee invariants
  - **Status:** Complete
  - **Branch:** `feature/48-int-foundation-provenance`
- [x] **Story INT-FOUND-02:** Direct + marketplace write-path propagation
  - **Status:** Complete
  - **Branch:** `feature/48-int-writepaths-provenance`
- [x] **Story INT-FOUND-03:** Verification + integrity docs baseline
  - **Status:** Complete
  - **Branch:** `feature/48-int-verification-baseline`
