# Build: D&A Test Form in Mobile App

**ID:** TASK-039
**Story:** [STORY-008](../stories/008-da-post-incident.md)
**Priority:** high
**Branch:** `feat/039-da-mobile-test-form`
**Labels:** mobile, forms, compliance

## Description
Create a D&A test form in the mobile app that medics can launch directly from an incident or near-miss record.

## Acceptance Criteria
- [ ] New screen: `app/safety/da-test/new.tsx`
- [ ] Form fields:
  - Worker name (text input) + optional worker search (WorkerSearchPicker)
  - Test type selector (breathalyser / urine dipstick / oral fluid swab)
  - Consent toggle (given / refused)
  - If refused: reason text field shown
  - Result selector (negative / positive / inconclusive) — hidden if refused
  - Alcohol level numeric field — shown only for breathalyser
  - Substances detected multi-select — shown only if positive
  - Sample reference number (text input — scan barcode or type)
  - Witness name (text input)
  - Tested at (datetime picker, defaults to now)
- [ ] Medic can add a photo of the test kit result
- [ ] Signature capture (both medic and witness if available)
- [ ] AutoSave enabled — form state preserved if app backgrounded
- [ ] Offline-capable: queues to OfflineQueueManager if no connection
- [ ] On submit: saves to Supabase `da_tests` table

## Notes
Reuse: `WorkerSearchPicker`, `PhotoCapture`, `SignaturePad`, `AutoSaveForm`, `OfflineQueueManager` — all exist in `/components/`.
Use `BodyDiagramPicker` pattern for substances multi-select (similar multi-select UI).
