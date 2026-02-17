# Build: D&A Test PDF Report Generator

**ID:** TASK-042
**Story:** [STORY-008](../stories/008-da-post-incident.md)
**Priority:** medium
**Branch:** `feat/042-da-pdf-report`
**Labels:** backend, pdf, compliance

## Description
Generate a formal D&A test report PDF suitable for HSE, insurer, or legal use.

## Acceptance Criteria
- [ ] New edge function or API route: `POST /api/da-tests/[id]/generate-pdf`
- [ ] PDF includes:
  - Organisation name and logo
  - Test reference number (da_tests.id or formatted ref)
  - Tested worker: name, date of test, site/booking
  - Test type, result, alcohol level (if applicable), substances detected
  - Sample reference number
  - Consent statement and whether given/refused
  - Administering medic: name, qualification
  - Witness name
  - Medic signature image
  - Chain of custody declaration paragraph
  - Date/time generated
- [ ] PDF stored in Supabase storage under `da-test-reports/[org_id]/[test_id].pdf`
- [ ] "Download Report" button in admin D&A results view calls this endpoint

## Notes
Follow pattern of existing `generate-payslip-pdf` or `generate-invoice-pdf` edge functions.
Use @react-pdf/renderer (already installed) for the template.
