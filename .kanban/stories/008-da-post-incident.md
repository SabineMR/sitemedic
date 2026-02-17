# Phase 8 — Drug & Alcohol Post-Incident Capability

**ID:** STORY-008
**Epic:** Gap Closure
**Priority:** high
**Status:** ready

## User Story
**As a** site medic or safety officer,
**I want** to formally administer and record a drug & alcohol test immediately after an incident,
**So that** the result is documented with a full chain of custody and linked to the RIDDOR/near-miss record for compliance and legal protection.

## Acceptance Criteria
- [ ] D&A test can be triggered from a RIDDOR incident or near-miss record in the mobile app
- [ ] Test form captures: test type, result, substance detected (if any), tester name, tested worker, date/time, witness
- [ ] Result is saved with a chain of custody trail (who collected, who witnessed, sample reference)
- [ ] D&A result is linked to the parent RIDDOR incident or near-miss record
- [ ] Admin can view all D&A test results filtered by date, site, result, worker
- [ ] D&A test report can be exported as a PDF with all chain-of-custody fields
- [ ] Consent field recorded (worker accepted/refused the test)

## Tasks
- [ ] [TASK-038](../1-backlog/038-da-database-schema.md)
- [ ] [TASK-039](../1-backlog/039-da-mobile-test-form.md)
- [ ] [TASK-040](../1-backlog/040-da-incident-linkage.md)
- [ ] [TASK-041](../1-backlog/041-da-admin-results-view.md)
- [ ] [TASK-042](../1-backlog/042-da-pdf-report.md)
- [ ] [TASK-043](../1-backlog/043-da-chain-of-custody.md)

## Notes
D&A testing is standard practice on CDM-regulated sites and safety-critical construction projects.
Test types to support: breathalyser (alcohol), urine dipstick (drugs), oral fluid swab (drugs).
Refusal to test is itself a significant result — must be recordable.
Chain of custody is legally important if results are challenged — timestamps and witness signatures matter.
D&A results are sensitive health data — RLS must restrict access to medic + admin only (not client).
Consider: positive results may trigger escalation notifications to site manager.
