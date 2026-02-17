---
phase: 07-certification-tracking
verified: 2026-02-17T00:53:51Z
status: gaps_found
score: 5/8 must-haves verified
gaps:
  - truth: "Expired certification prevents worker from being selected for incident logging (validation at point of use)"
    status: failed
    reason: "Validation API exists but is NOT called from mobile treatment forms where incident logging happens"
    artifacts:
      - path: "web/app/api/certifications/validate/route.ts"
        issue: "API implemented but orphaned - no callers in codebase"
      - path: "app/treatment/new.tsx"
        issue: "Treatment form does not call validation API before worker selection"
      - path: "app/treatment/[id].tsx"
        issue: "Treatment edit form does not validate certifications"
    missing:
      - "Worker selection component must call POST /api/certifications/validate before allowing selection"
      - "Treatment form must block submission if worker has expired certs"
      - "Mobile app (Expo) needs fetch to web API endpoint for validation"
      - "UI must show error message listing expired cert types when validation fails"
  - truth: "Site manager receives email when certification expires"
    status: partial
    reason: "Edge Function sends email at 0 days (expiry), but only to managers - medic already received 4 prior reminders. However, no verification that manager email addresses are correctly retrieved from org structure."
    artifacts:
      - path: "supabase/functions/certification-expiry-checker/index.ts"
        issue: "Manager email retrieval logic exists but uses hardcoded 'Your Organization' orgName and may not correctly query profiles for site_manager role"
    missing:
      - "Verify manager email addresses are correctly fetched from profiles table where role = 'site_manager'"
      - "Test that expired cert (0 days) sends email to actual manager, not just medic"
  - truth: "Email notifications use professional template with company branding"
    status: partial
    reason: "Template has SiteMedic branding but uses hardcoded 'Your Organization' instead of actual org name"
    artifacts:
      - path: "supabase/functions/certification-expiry-checker/email-templates.ts"
        issue: "Professional template exists with correct urgency colors and layout, but orgName is static"
      - path: "supabase/functions/certification-expiry-checker/index.ts"
        issue: "Passes 'Your Organization' as orgName instead of querying organizations table"
    missing:
      - "Query organizations table to get actual org name for email personalization"
      - "Pass real org.name to email template instead of placeholder text"
---

# Phase 7: Certification Tracking Verification Report

**Phase Goal:** System tracks UK certifications with progressive expiry alerts, prevents expired workers from logging incidents, and surfaces compliance status to managers.

**Verified:** 2026-02-17T00:53:51Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | System tracks UK certifications (CSCS, CPCS, IPAF, PASMA, Gas Safe) with expiry dates | ✓ VERIFIED | migration 034_certification_tracking.sql defines JSONB certifications field on medics table. TypeScript types define UK_CERT_TYPES = ['CSCS', 'CPCS', 'IPAF', 'PASMA', 'Gas Safe']. Certification interface includes expiry_date field. |
| 2 | Dashboard shows certifications expiring in next 30/60/90 days | ✓ VERIFIED | web/app/(dashboard)/certifications/page.tsx has Tabs with 30/60/90 day windows. useExpiringCertifications hook filters by daysWindow. Table shows medic_name, cert_type, cert_number, expiry_date, days_remaining. |
| 3 | Workers with expired certifications show critical alert (red) on dashboard | ✓ VERIFIED | CertificationStatusBadge component shows red bg-red-100 text-red-800 badge with XCircle icon when isPast(expiryDate). Dashboard summary card shows nonCompliantCount with red text and XCircle icon. |
| 4 | Site manager receives email when certification expires | ⚠️ PARTIAL | Edge Function at line 130-150 checks for expired certs (0 days) and sends manager notification. However, manager email retrieval uses hardcoded 'Your Organization' and role query not verified. |
| 5 | Progressive reminders send before expiry (30, 14, 7, 1 days before) | ✓ VERIFIED | Edge Function index.ts lines 30-36 defines REMINDER_STAGES = [30, 14, 7, 1]. For loop processes each stage. certification_reminders table logs days_before. Duplicate prevention checks sent_at >= today 00:00. |
| 6 | Expired certification prevents worker from being selected for incident logging (validation at point of use) | ✗ FAILED | API endpoint exists at web/app/api/certifications/validate/route.ts and returns 403 when certs expired. BUT: No callers in codebase. Mobile app treatment forms (app/treatment/new.tsx, app/treatment/[id].tsx) do NOT call validation API. Enforcement layer missing. |
| 7 | Email notifications use professional template with company branding | ⚠️ PARTIAL | email-templates.ts has professional HTML template with navy header, urgency-based colors (red/amber/blue), SiteMedic branding. HOWEVER: Uses hardcoded 'Your Organization' instead of querying real org name. |
| 8 | Server-side scheduled jobs check expiry daily (not device-local notifications) | ✓ VERIFIED | migration 032_certification_expiry_cron.sql schedules pg_cron job at '0 9 * * *' (daily 9AM UTC). Job invokes certification-expiry-checker Edge Function via pg_net.http_post with vault-authenticated bearer token. Server-side only, no device notifications. |

**Score:** 5/8 truths verified (3 partial/failed)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/034_certification_tracking.sql` | GIN index, certification_reminders table, 3 RPC functions | ✓ EXISTS, SUBSTANTIVE, WIRED | 205 lines. GIN index on medics.certifications. certification_reminders table with RLS. Functions: get_certifications_expiring_in_days, get_certification_summary_by_org, get_expired_cert_count_by_org. |
| `web/types/certification.types.ts` | TypeScript types for Certification, CertificationStatus, ReminderStage | ✓ EXISTS, SUBSTANTIVE, WIRED | 201 lines. Exports: UK_CERT_TYPES, Certification, CertificationStatus, ReminderStage, REMINDER_STAGES, CertificationSummary, ExpiringCertification, CertificationReminder, CERT_RENEWAL_URLS. Used in 2+ files. |
| `supabase/functions/certification-expiry-checker/index.ts` | Daily expiry checking Edge Function | ✓ EXISTS, SUBSTANTIVE, WIRED | 170+ lines. Iterates REMINDER_STAGES [30,14,7,1]. Calls get_certifications_expiring_in_days RPC. Duplicate prevention via certification_reminders query. Sends emails via sendCertificationExpiryEmail. Logs to audit table. Wired to pg_cron. |
| `supabase/functions/certification-expiry-checker/email-templates.ts` | Professional email template with SiteMedic branding | ✓ EXISTS, SUBSTANTIVE, PARTIAL | 150+ lines. Professional HTML template with navy header (#003366), urgency-based colors (red #fee2e2, amber #fef3c7, blue #dbeafe), Resend integration. BUT: Uses hardcoded 'Your Organization' instead of real org name. |
| `supabase/migrations/032_certification_expiry_cron.sql` | pg_cron daily job schedule | ✓ EXISTS, SUBSTANTIVE, WIRED | 84 lines. Cron expression '0 9 * * *'. Invokes Edge Function via vault-authenticated pg_net.http_post. Includes monitoring queries. |
| `web/lib/queries/admin/certifications.ts` | TanStack Query hooks for cert data | ✓ EXISTS, SUBSTANTIVE, WIRED | 120+ lines. Exports useCertificationSummary (calls RPC), useExpiringCertifications (client-side JSONB filter). 60s polling. Used by certifications dashboard page. |
| `web/app/(dashboard)/certifications/page.tsx` | Certifications dashboard page | ✓ EXISTS, SUBSTANTIVE, WIRED | 200+ lines. Summary cards (expired/expiring/compliant). Tabs for 30/60/90/expired. Table with CertificationStatusBadge. Accessible from sidebar nav. |
| `web/components/dashboard/certification-status-badge.tsx` | Reusable cert status badge component | ✓ EXISTS, SUBSTANTIVE, WIRED | 96 lines. getCertificationStatus function. Green (valid) / Amber (expiring-soon) / Red (expired) badges with icons. Used in certifications page and potentially workers table. |
| `web/app/api/certifications/validate/route.ts` | Server-side certification validation endpoint | ✓ EXISTS, SUBSTANTIVE, ✗ ORPHANED | 97 lines. POST endpoint. Queries medics.certifications. Returns 403 with expired_certs array when any cert expired. Returns 200 when valid. BUT: Zero callers in codebase. Not integrated with mobile treatment forms. |
| `web/lib/queries/compliance.ts` (updated) | Real expired cert count in compliance score | ✓ EXISTS, SUBSTANTIVE, WIRED | Lines 65-78: Queries medics.certifications JSONB, client-side filters for expired certs, counts medics with any expired cert. Replaces hardcoded 0. Used by dashboard compliance score. |
| `web/app/(dashboard)/layout.tsx` (updated) | Sidebar navigation link to certifications page | ✓ EXISTS, SUBSTANTIVE, WIRED | Lines 61-64: Certifications nav item with ShieldCheck icon, href='/certifications'. Placed after Workers, before Contracts. Visible in sidebar. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| certification-expiry-checker/index.ts | get_certifications_expiring_in_days RPC | supabase.rpc('get_certifications_expiring_in_days', { days_ahead: stage }) | ✓ WIRED | Line 40-41: RPC call inside for loop. Returns expiringCerts array. Used to iterate certs needing reminders. |
| certification-expiry-checker/index.ts | certification_reminders table | INSERT to log sent reminders | ✓ WIRED | Lines 92-100: supabase.from('certification_reminders').insert() logs each sent email with medic_id, cert_type, days_before, resend_message_id, org_id. |
| 032_certification_expiry_cron.sql | certification-expiry-checker Edge Function | pg_net.http_post invocation daily at 9AM UTC | ✓ WIRED | Lines 35-46: cron.schedule with vault-authenticated HTTP POST to /functions/v1/certification-expiry-checker. Passes trigger='cron', check_date=CURRENT_DATE. |
| web/lib/queries/admin/certifications.ts | get_certification_summary_by_org RPC | supabase.rpc('get_certification_summary_by_org', { p_org_id: orgId }) | ✓ WIRED | Lines 43-44: RPC call in fetchCertificationSummary. Returns CertificationSummary[]. Used by useCertificationSummary hook. |
| web/lib/queries/compliance.ts | medics.certifications JSONB | Client-side filtering for expired certs | ✓ WIRED | Lines 65-78: Queries medics.certifications, loops through certs, checks if expiry_date < now, counts medics. Used for compliance score. |
| web/app/(dashboard)/layout.tsx | /certifications page | Sidebar navigation link | ✓ WIRED | Lines 61-64: Certifications nav item href='/certifications'. Clicking navigates to certifications page. ShieldCheck icon displayed. |
| web/app/api/certifications/validate/route.ts | medics.certifications JSONB | Query for expired certs validation | ✗ NOT_WIRED | API correctly queries medics.certifications and filters expired certs. Returns 403 with expired_certs array. BUT: No callers. Mobile treatment forms don't invoke this endpoint. Enforcement gap. |
| Mobile treatment forms | /api/certifications/validate | POST request to validate worker before selection | ✗ NOT_WIRED | app/treatment/new.tsx and app/treatment/[id].tsx do NOT call validation API. Worker can be selected even with expired certs. Critical enforcement gap. |

### Requirements Coverage

| Requirement | Status | Blocking Issue |
|-------------|--------|----------------|
| CERT-01: System tracks UK certifications with expiry dates | ✓ SATISFIED | None - medics.certifications JSONB with expiry_date field |
| CERT-02: Dashboard shows certifications expiring in 30/60/90 days | ✓ SATISFIED | None - Tabs implemented with filtering |
| CERT-03: Workers with expired certs show critical alert (red) | ✓ SATISFIED | None - CertificationStatusBadge shows red for expired |
| CERT-04: Email notification when certification expires | ⚠️ NEEDS VERIFICATION | Manager email retrieval not verified, orgName hardcoded |
| CERT-05: Progressive reminders (30, 14, 7, 1 days) | ✓ SATISFIED | None - Edge Function implements all 4 stages with duplicate prevention |
| CERT-06: Expired cert prevents worker selection for incident logging | ✗ BLOCKED | Validation API exists but not called from mobile treatment forms - enforcement missing |
| NOTIF-03: Site manager receives email when worker cert expires | ⚠️ NEEDS VERIFICATION | Same as CERT-04 - manager email logic not verified |
| NOTIF-04: Professional email template with company branding | ⚠️ PARTIAL | Template professional but uses hardcoded 'Your Organization' |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| supabase/functions/certification-expiry-checker/index.ts | 86 | Hardcoded 'Your Organization' | ⚠️ Warning | Email personalization incomplete - should query organizations.name |
| web/app/api/certifications/validate/route.ts | N/A | Orphaned API endpoint | 🛑 Blocker | Validation API exists but has zero callers - enforcement missing |
| app/treatment/new.tsx | N/A | Missing validation call | 🛑 Blocker | Treatment form allows worker selection without cert validation |
| app/treatment/[id].tsx | N/A | Missing validation call | 🛑 Blocker | Treatment edit allows worker selection without cert validation |

### Gaps Summary

**PRIMARY GAP (Blocker):** Certification validation enforcement is NOT wired into the mobile app. The validation API (`/api/certifications/validate`) exists and correctly returns 403 when a worker has expired certifications, but the mobile treatment forms (`app/treatment/new.tsx`, `app/treatment/[id].tsx`) do not call this API before allowing worker selection. This is a CRITICAL enforcement gap - the entire point of certification tracking is to prevent expired workers from being selected, and this is not happening.

**SECONDARY GAP (Verification needed):** Manager email notifications may not be correctly configured. The Edge Function sends emails to managers at critical stages, but:
1. Manager email retrieval logic uses `role = 'site_manager'` query but this isn't verified
2. Email template uses hardcoded 'Your Organization' instead of querying actual org name from `organizations` table
3. No verification that expired cert notification (0 days) actually reaches managers

**TERTIARY GAP (Enhancement):** Email personalization incomplete. Template is professional with correct branding and urgency colors, but organization name is hardcoded as 'Your Organization' instead of querying the actual org name.

**What works:**
- Database infrastructure (GIN index, RPC functions, audit table)
- Daily cron job scheduling
- Progressive reminder system (30/14/7/1 days)
- Dashboard UI with expiry tracking
- Compliance score integration
- Sidebar navigation
- Status badge component

**What's broken:**
- Worker selection validation not enforced (API orphaned)
- Manager email retrieval not verified
- Org name personalization missing

**Next steps for gap closure:**
1. Wire validation API into mobile treatment forms worker selection component
2. Add error UI when worker has expired certs (show expired cert types)
3. Verify manager email query retrieves correct addresses
4. Replace hardcoded 'Your Organization' with real org name query

---

_Verified: 2026-02-17T00:53:51Z_
_Verifier: Claude (gsd-verifier)_
