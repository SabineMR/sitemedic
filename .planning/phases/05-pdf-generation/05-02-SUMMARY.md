---
phase: 05-pdf-generation
plan: 02
subsystem: storage
tags: [supabase-storage, resend, email, pdf, signed-urls]

# Dependency graph
requires:
  - phase: 05-01
    provides: Edge Function with React-PDF components and PDF generation
provides:
  - PDF storage in Supabase Storage with private bucket
  - 7-day signed URLs for secure PDF access
  - Email delivery via Resend API with HTML templates
  - weekly_reports tracking table for audit trail
  - Full pipeline: generate → upload → track → email
affects: [05-03, web-dashboard, reporting]

# Tech tracking
tech-stack:
  added: [resend-api]
  patterns: [signed-url-rotation, transactional-email, pdf-storage]

key-files:
  created:
    - supabase/migrations/015_safety_reports_storage.sql
    - supabase/functions/generate-weekly-report/storage.ts
    - supabase/functions/generate-weekly-report/email.ts
  modified:
    - supabase/functions/generate-weekly-report/index.tsx

key-decisions:
  - "D-05-02-001: 7-day signed URL expiry for security and UX balance"
  - "D-05-02-002: Upsert strategy for weekly_reports (unique on org_id + week_ending)"
  - "D-05-02-003: Email sent via Resend API (not SMTP) for reliability"
  - "D-05-02-004: PDF attached to email + download link for accessibility"
  - "D-05-02-005: Graceful degradation if RESEND_API_KEY missing (PDF still generated)"
  - "D-05-02-006: GET endpoint regenerates expired signed URLs automatically"
  - "D-05-02-007: Cron trigger returns JSON, manual trigger returns PDF buffer"

patterns-established:
  - "Storage pattern: org-scoped folders (reports/{orgId}/weekly-report-{date}.pdf)"
  - "Email template: Professional HTML with stats summary and CTA button"
  - "Dual response pattern: JSON for automation, PDF for direct download"

# Metrics
duration: 3min
completed: 2026-02-16
---

# Phase 5 Plan 2: PDF Storage and Email Delivery

**PDF storage with 7-day signed URLs, Resend email delivery with professional HTML template, and weekly_reports audit trail**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-16T05:04:07Z
- **Completed:** 2026-02-16T05:07:11Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Private storage bucket with RLS policies for authenticated access
- Signed URL generation with automatic 7-day expiration and rotation
- Professional HTML email template with compliance stats and PDF attachment
- Full delivery pipeline: generate → upload → track → email → respond
- Audit trail in weekly_reports table tracking all generated reports

## Task Commits

Each task was committed atomically:

1. **Task 1: Create storage migration, storage utility, and email utility** - `7b74a85` (feat)
2. **Task 2: Update Edge Function handler to upload, store metadata, and send email** - `67642a1` (feat)

## Files Created/Modified

- `supabase/migrations/015_safety_reports_storage.sql` - Creates safety-reports bucket, RLS policies, and weekly_reports tracking table
- `supabase/functions/generate-weekly-report/storage.ts` - Uploads PDFs to storage, generates 7-day signed URLs, saves metadata
- `supabase/functions/generate-weekly-report/email.ts` - Sends professional HTML emails via Resend API with PDF attachment
- `supabase/functions/generate-weekly-report/index.tsx` - Integrated full pipeline with GET/POST endpoints

## Decisions Made

**D-05-02-001: 7-day signed URL expiry for security and UX balance**
- Rationale: Long enough for site managers to download report (typical use within 24 hours), short enough to prevent indefinite access to historical reports
- Implementation: 604800 seconds (7 days) in createSignedUrl()

**D-05-02-002: Upsert strategy for weekly_reports (unique on org_id + week_ending)**
- Rationale: Re-generating a report should replace the old one, not create duplicate records
- Implementation: UNIQUE constraint on (org_id, week_ending) with upsert in saveReportMetadata()

**D-05-02-003: Email sent via Resend API (not SMTP) for reliability**
- Rationale: Resend provides better deliverability, easier setup, and detailed analytics
- Implementation: Fetch API call to https://api.resend.com/emails

**D-05-02-004: PDF attached to email + download link for accessibility**
- Rationale: Attachment for immediate access, download link if attachment fails or expires
- Implementation: Resend attachments array with base64-encoded PDF + signed URL in HTML

**D-05-02-005: Graceful degradation if RESEND_API_KEY missing (PDF still generated)**
- Rationale: MVP deployment may not have email configured initially; core functionality (PDF generation) should still work
- Implementation: Check for RESEND_API_KEY, log warning and skip email if missing

**D-05-02-006: GET endpoint regenerates expired signed URLs automatically**
- Rationale: Users accessing old reports shouldn't see errors; regenerate URL transparently
- Implementation: Check signed_url_expires_at, call createSignedUrl() again if expired

**D-05-02-007: Cron trigger returns JSON, manual trigger returns PDF buffer**
- Rationale: Automated cron jobs need JSON metadata for logging; manual dashboard requests need PDF for download
- Implementation: Conditional response based on trigger parameter

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

**External services require manual configuration.** Resend API key needed for email delivery:

1. **Create Resend account:**
   - Sign up at https://resend.com/signup
   - Verify sending domain: sitemedic.co.uk

2. **Generate API key:**
   - Go to Resend Dashboard → API Keys
   - Create API Key with send permission
   - Copy key

3. **Add to Supabase secrets:**
   ```bash
   # Via Supabase Dashboard: Project Settings → Edge Functions → Secrets
   RESEND_API_KEY=re_xxxxxxxxxxxxx
   ```

4. **Verification:**
   - Trigger manual report generation
   - Check Edge Function logs for "Email sent successfully"
   - Verify email received with PDF attachment

**Note:** If RESEND_API_KEY not configured, PDF generation still works but email notification is skipped.

## Next Phase Readiness

**Ready for Phase 5 Plan 3 (Cron Scheduling):**
- PDF generation pipeline complete
- Storage and email delivery functional
- Metadata tracking in place

**Next steps:**
- Add Supabase Edge Function cron trigger for Friday 5 PM generation
- Update dashboard to display report history from weekly_reports table
- Add manual regeneration UI for historical weeks

---
*Phase: 05-pdf-generation*
*Completed: 2026-02-16*
