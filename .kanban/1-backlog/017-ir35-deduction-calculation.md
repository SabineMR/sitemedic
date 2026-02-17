# Fix: Implement IR35 Deduction Calculations

**ID:** TASK-017
**Story:** [STORY-004](../stories/004-compliance-enforcement.md)
**Priority:** high
**Branch:** `feat/017-ir35-deductions`
**Labels:** backend, compliance, finance

## Description
`calculateDeductions()` in `/web/lib/medics/ir35-validator.ts` returns 0 for all cases.
Real deductions must be calculated based on employment status.

## Acceptance Criteria
- [ ] Self-employed (outside IR35): calculates Class 4 NI (9% on profits 12,570-50,270, 2% above)
- [ ] Umbrella: calculates employer NI (13.8% above secondary threshold) + apprenticeship levy (0.5%)
- [ ] Function returns itemised deduction breakdown (not just a total)
- [ ] Results used in payslip generation and payout calculation

## Notes
These are indicative calculations — display as estimates, not definitive tax advice.
Tax bands should be configurable constants (update annually).
