# Phase 49 Context: Marketplace Integrity Operations

## Phase

- **Phase:** 49-marketplace-integrity-operations
- **Milestone:** v6.0 Marketplace Integrity
- **Status:** Planning started

## Why This Phase Exists

Phase 48-01 established immutable provenance + fee-policy invariants.
Phase 49 operationalizes those invariants through real SOLO and PASS-ON workflows with chain-of-custody visibility.

## Scope for 49-01

- Implement SOLO lifecycle state and PASS-ON handoff operations.
- Preserve origin provenance through acceptance/decline flows.
- Provide operator-visible attribution timeline and audit chain.

## Locked Decisions Carried Forward

- Pass-on jobs keep original source provenance by default.
- Scenario C co-share policy is dual-sided 5% + 5% (implemented in a later plan).
- Client self-attestation is not a primary integrity control.

## Story Board (Current Sprint)

- [x] **Story INT-OPS-01:** SOLO + PASS-ON operational schema and custody ledger
  - **Status:** Complete
  - **Branch:** `feature/49-int-ops-schema-ledger`
- [x] **Story INT-OPS-02:** PASS-ON initiate/accept/decline service + APIs
  - **Status:** Complete
  - **Branch:** `feature/49-int-passon-apis`
- [x] **Story INT-OPS-03:** Attribution timeline read model + UI + invariant tests
  - **Status:** Complete
  - **Branch:** `feature/49-int-attribution-timeline`
