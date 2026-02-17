---
phase: 06-riddor-auto-flagging
verified: 2026-02-16T18:30:00Z
status: gaps_found
score: 4/8 must-haves verified
gaps:
  - truth: "Treatment matching RIDDOR criteria auto-flags with confidence level"
    status: failed
    reason: "Detection algorithm exists but is never automatically called - no database trigger or sync-time invocation"
    artifacts:
      - path: "supabase/functions/riddor-detector/index.ts"
        issue: "Edge Function exists but has no caller - treatments table has no INSERT trigger"
    missing:
      - "Database trigger on treatments table INSERT/UPDATE to call riddor-detector Edge Function"
      - "OR sync-time invocation when treatment syncs from mobile to backend"
      - "Automatic population of riddor_incidents table when RIDDOR criteria matched"
  - truth: "Dashboard shows RIDDOR deadline countdown for site manager"
    status: partial
    reason: "Dashboard page exists and queries riddor_incidents, but table will be empty because no auto-detection happens"
    artifacts:
      - path: "web/app/(dashboard)/riddor/page.tsx"
        issue: "Page polls empty table - no incidents will appear without manual database inserts"
    missing:
      - "Working data pipeline from treatment creation to riddor_incidents table"
  - truth: "Site manager receives email when RIDDOR deadline approaches (3 days before)"
    status: partial
    reason: "Cron job and email template exist, but will find zero incidents because table is empty"
    artifacts:
      - path: "supabase/functions/riddor-deadline-checker/index.ts"
        issue: "Cron triggers daily but queries empty riddor_incidents table"
    missing:
      - "Auto-flagged incidents to trigger deadline emails for"
  - truth: "Override patterns track for algorithm tuning (if 80% overridden, review logic)"
    status: partial
    reason: "Analytics dashboard exists but will show zero data because no incidents are auto-flagged"
    artifacts:
      - path: "web/app/(dashboard)/riddor/analytics/page.tsx"
        issue: "Charts render but have no data source - override_reason never captured"
    missing:
      - "Actual override data from auto-flagged incidents"
---

# Phase 6: RIDDOR Auto-Flagging Verification Report

**Phase Goal:** App automatically detects RIDDOR-reportable incidents with deadline countdown, medic override capability, and pre-filled HSE F2508 form generation.

**Verified:** 2026-02-16T18:30:00Z
**Status:** gaps_found
**Re-verification:** No - initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Treatment matching RIDDOR criteria auto-flags with confidence level | FAILED | Detection algorithm exists (`detection-rules.ts` with 8 HSE criteria) but never automatically invoked - no database trigger on treatments table, no sync-time call |
| 2 | Medic can confirm or override RIDDOR flag with reason | VERIFIED | `RIDDOROverrideModal.tsx` (380 lines) with mandatory reason field, `riddor-client.ts` updates `riddor_incidents.medic_confirmed` + `override_reason` |
| 3 | RIDDOR-flagged incident shows deadline countdown (10 days for specified injuries, 15 days for over-7-day) | VERIFIED | `DeadlineCountdown.tsx` component calculates `daysUntilDeadline()`, urgent styling when <=3 days, database schema has `deadline_date DATE` column |
| 4 | App generates pre-filled HSE F2508 form PDF from treatment log data | VERIFIED | `riddor-f2508-generator` Edge Function with `F2508Document.tsx` React-PDF template, 6 HSE sections, stores in `riddor-reports` Storage bucket |
| 5 | Dashboard shows RIDDOR deadline countdown for site manager | PARTIAL | Dashboard page exists (`web/app/(dashboard)/riddor/page.tsx`) with deadline countdown UI, BUT table will be empty because auto-detection doesn't run |
| 6 | Site manager receives email when RIDDOR deadline approaches (3 days before) | PARTIAL | Cron job scheduled (`021_riddor_deadline_cron.sql` at 9 AM UTC), email template exists, BUT will find zero incidents because `riddor_incidents` table empty |
| 7 | RIDDOR report tracks status (Draft / Submitted / Confirmed) | VERIFIED | Database schema has `status TEXT CHECK (status IN ('draft', 'submitted', 'confirmed'))`, dashboard filters by status, `RIDDORStatusBadge.tsx` displays |
| 8 | Override patterns track for algorithm tuning (if 80% overridden, review logic) | PARTIAL | Analytics page exists (`web/app/(dashboard)/riddor/analytics/page.tsx`) with 80% threshold alert, BUT will show zero data because no auto-flagged incidents exist |

**Score:** 4/8 truths verified (3 fully verified + 1 failed + 3 partial with blocking dependency)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/018_riddor_incidents.sql` | Database schema | VERIFIED | 97 lines, complete schema with all tracking fields (category, confidence_level, medic_confirmed, override_reason, deadline_date, status, f2508_pdf_path), RLS policies, indexes |
| `supabase/functions/riddor-detector/detection-rules.ts` | HSE criteria matching | VERIFIED | 175 lines, 8 specified injury types (fractures excluding fingers/thumbs/toes, amputations, loss of sight, crush injuries, serious burns, loss of consciousness, scalping, hypothermia/asphyxia), over-7-day detection |
| `supabase/functions/riddor-detector/index.ts` | Edge Function handler | ORPHANED | 176 lines, exists but NEVER CALLED - no database trigger, no sync invocation, manually callable only |
| `components/treatment/RIDDOROverrideModal.tsx` | Mobile override UI | VERIFIED | 380 lines, confidence badge, deadline countdown with urgent styling, mandatory reason TextInput, gloves-on compliance (56pt targets) |
| `src/lib/riddor-client.ts` | Mobile API client | VERIFIED | 102 lines, `fetchRIDDORIncident()`, `updateRIDDORIncident()` with immediate sync (bypasses offline queue), `daysUntilDeadline()` calculation |
| `supabase/functions/riddor-f2508-generator/index.ts` | F2508 PDF generator | VERIFIED | 176 lines, React-PDF rendering, 6-section HSE form, Supabase Storage upload, 7-day signed URLs |
| `supabase/functions/riddor-f2508-generator/F2508Document.tsx` | F2508 React template | VERIFIED | 199 lines, HSE blue header, organisation/incident/injury sections, professional formatting |
| `web/app/(dashboard)/riddor/page.tsx` | Dashboard list page | PARTIAL | 176 lines, stats cards (pending/overdue/total), status filtering, deadline countdown, 60s polling - BUT queries empty table |
| `web/app/(dashboard)/riddor/[id]/page.tsx` | Dashboard detail page | PARTIAL | 293 lines, incident details, F2508 generation button, treatment/worker links - BUT no incidents to view |
| `supabase/functions/riddor-deadline-checker/index.ts` | Deadline email cron | PARTIAL | 146 lines, queries incidents 3 days before deadline, site manager lookup, Resend email - BUT finds zero incidents |
| `supabase/migrations/021_riddor_deadline_cron.sql` | pg_cron schedule | VERIFIED | 75 lines, daily 9 AM UTC trigger, vault secrets for auth, idempotent (unschedule before schedule) |
| `web/app/(dashboard)/riddor/analytics/page.tsx` | Override analytics | PARTIAL | Analytics dashboard, 80% threshold alert, override reasons chart, confidence breakdown - BUT no data source |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| Treatment creation | riddor-detector Edge Function | Database trigger OR sync hook | NOT_WIRED | **CRITICAL GAP:** No mechanism calls `riddor-detector` when treatment created - database has no INSERT trigger, sync queue doesn't invoke detection |
| riddor-detector | riddor_incidents table | INSERT query | WIRED | Edge Function inserts to `riddor_incidents` when called (line 102-115), idempotent via UNIQUE constraint on treatment_id |
| Mobile treatment detail | RIDDOROverrideModal | fetchRIDDORIncident + showRiddorModal state | WIRED | `app/treatment/[id].tsx` lines 44-70, fetches incident on load, shows modal on "Review" button |
| RIDDOROverrideModal | riddor_incidents.medic_confirmed | updateRIDDORIncident API | WIRED | `updateRIDDORIncident()` in `riddor-client.ts` lines 61-85, validates reason, immediate sync |
| Dashboard RIDDOR page | riddor_incidents table | fetchRIDDORIncidents query | WIRED | `web/lib/queries/riddor.ts` lines 59-81, Supabase SELECT with treatment/worker joins |
| Dashboard detail page | riddor-f2508-generator Edge Function | generateF2508PDF fetch | WIRED | `web/lib/queries/riddor.ts` lines 107-131, POST to Edge Function with incident_id |
| pg_cron daily job | riddor-deadline-checker Edge Function | net.http_post trigger | WIRED | Migration 021 lines 22-39, vault auth, runs 9 AM UTC |
| riddor-deadline-checker | Resend email API | sendDeadlineEmail call | WIRED | `riddor-deadline-checker/index.ts` line 104-117, personalized email with site manager name |

### Requirements Coverage

| Requirement | Status | Blocking Issue |
|-------------|--------|----------------|
| RIDD-01: App auto-flags treatment when it matches RIDDOR-reportable criteria | BLOCKED | Auto-detection exists but never called - no trigger mechanism |
| RIDD-02: Medic can confirm or override RIDDOR flag with reason | SATISFIED | Override modal functional, reason mandatory, immediate sync |
| RIDD-03: RIDDOR-flagged incident shows deadline countdown | SATISFIED | Deadline calculation correct (10 or 15 days), urgent styling <=3 days |
| RIDD-04: App generates pre-filled HSE F2508 form PDF | SATISFIED | F2508 generator functional, 6 HSE sections, Storage upload |
| RIDD-05: Dashboard shows RIDDOR deadline countdown | BLOCKED | Dashboard renders correctly but no data to display (auto-detection doesn't populate table) |
| RIDD-06: RIDDOR report tracks status (Draft/Submitted/Confirmed) | SATISFIED | Status enum in schema, dashboard filtering, badge display |
| NOTIF-02: Site manager receives email when RIDDOR deadline approaches | BLOCKED | Cron job runs but finds zero incidents to notify about |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `supabase/functions/riddor-detector/index.ts` | N/A | Orphaned Edge Function | BLOCKER | Function exists but unreachable - no caller in codebase |
| `supabase/migrations/018_riddor_incidents.sql` | N/A | Missing database trigger | BLOCKER | No automatic invocation of RIDDOR detection on treatment INSERT/UPDATE |
| `web/app/(dashboard)/riddor/page.tsx` | 27 | Hardcoded org_id for demo | WARNING | Needs auth context replacement: `const orgId = '10000000-0000-0000-0000-000000000001'` |
| `web/app/(dashboard)/riddor/analytics/page.tsx` | 24 | Hardcoded org_id for demo | WARNING | Same as above |
| `web/app/(dashboard)/riddor/[id]/page.tsx` | 24 | Hardcoded org_id for demo | WARNING | Same as above |

### Gaps Summary

**Root cause:** The RIDDOR auto-detection algorithm was built but never integrated into the data pipeline. The Edge Function `riddor-detector` exists and is correct, but nothing calls it automatically when treatments are created or synced.

**Impact:** Phase goal NOT achieved. The system cannot "automatically detect RIDDOR-reportable incidents" (Success Criterion #1). All other functionality (override UI, F2508 generation, dashboard, emails, analytics) works correctly but operates on an empty `riddor_incidents` table.

**What's missing:**

1. **Automatic detection trigger:** Need database trigger OR sync-time hook to invoke `riddor-detector` Edge Function when:
   - Treatment created/updated in `treatments` table (server-side)
   - Treatment synced from mobile to backend (sync queue completion)

2. **Suggested implementation options:**
   - **Option A (Database trigger):** PostgreSQL trigger `AFTER INSERT OR UPDATE ON treatments` calls `riddor-detector` via `pg_net.http_post` (similar to cron pattern in 021)
   - **Option B (Sync hook):** Modify sync queue completion handler to call `riddor-detector` after treatment successfully synced
   - **Option C (Backend RPC):** Create Supabase RPC function that sync queue calls with treatment_id

3. **Auth context in dashboard:** Replace hardcoded org_id with actual user organization from auth context (3 files)

**Data pipeline should be:**
```
Treatment created (mobile) 
  → Synced to backend (sync queue) 
  → Trigger calls riddor-detector Edge Function 
  → riddor-detector matches criteria 
  → INSERT into riddor_incidents 
  → Dashboard displays incident 
  → Medic reviews + overrides 
  → Cron sends deadline emails 
  → Analytics track override patterns
```

**Current broken pipeline:**
```
Treatment created (mobile) 
  → Synced to backend (sync queue) 
  → [MISSING TRIGGER] 
  → riddor_incidents table empty 
  → Dashboard shows zero incidents 
  → Emails never sent 
  → Analytics show zero data
```

---

_Verified: 2026-02-16T18:30:00Z_
_Verifier: Claude (gsd-verifier)_
