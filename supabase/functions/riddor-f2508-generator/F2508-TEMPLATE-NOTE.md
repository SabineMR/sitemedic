# F2508 Template Setup Instructions

## About HSE F2508

The F2508 form is the official HSE (Health and Safety Executive) RIDDOR report form for:
- Specified injuries
- Over-7-day injuries
- Occupational diseases
- Dangerous occurrences

## Current Implementation Status

**Option A: Using pdf-lib with fillable PDF template (preferred)**

1. Manually download the official F2508 PDF from: https://www.hse.gov.uk/riddor/report.htm
2. Save as `f2508-template.pdf` in this directory
3. The Edge Function will use pdf-lib to fill form fields programmatically

**Option B: Using @react-pdf/renderer custom template (fallback)**

If HSE F2508 is not available as a fillable PDF, this Edge Function can be updated to use @react-pdf/renderer to generate a custom PDF matching F2508 structure (similar to `generate-weekly-report`).

## For MVP Development

This plan proceeds with Option A (pdf-lib). If f2508-template.pdf is not present when deployed:
- The Edge Function will return an error
- Update to Option B by implementing @react-pdf/renderer template

## Field Mapping

After obtaining f2508-template.pdf, inspect its form fields:

```typescript
// In index.ts, uncomment field inspection:
const fields = form.getFields();
console.log('Available F2508 fields:', fields.map(f => f.getName()));
```

Then update `f2508-mapping.ts` with actual field names from the PDF.

## Storage Structure

Generated PDFs stored as: `riddor-reports/{incident_id}/F2508-{timestamp}.pdf`
