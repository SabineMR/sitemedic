# Phase 50 Context: Marketplace Integrity Signals

## Phase

- **Phase:** 50-marketplace-integrity-signals
- **Milestone:** v6.0 Marketplace Integrity
- **Status:** Completed

## Why This Phase Exists

Phase 48 enforced immutable provenance and fee-policy invariants.
Phase 49 operationalized SOLO/PASS-ON custody lifecycle.
Phase 50 adds detection signals + explainable risk scoring to surface likely marketplace-to-direct leakage patterns.

## Scope Delivered (50-01)

- Signal persistence model and score snapshots.
- Ingestion for marketplace-to-direct migration patterns.
- PASS-ON activity signal capture.
- Read APIs for participant and platform-admin integrity visibility.
- Dashboard-side risk card integration.

## Story Board (Current Sprint)

- [x] **Story INT-SIG-01:** Signal + score schema
  - **Status:** Complete
  - **Branch:** `feature/50-int-signal-schema`
- [x] **Story INT-SIG-02:** Marketplace-to-direct ingestion and scoring
  - **Status:** Complete
  - **Branch:** `feature/50-int-ingestion-scoring`
- [x] **Story INT-SIG-03:** Integrity visibility APIs + UI card
  - **Status:** Complete
  - **Branch:** `feature/50-int-visibility`
