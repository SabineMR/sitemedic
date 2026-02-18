---
phase: 22-football-sports-vertical
plan: "03"
subsystem: pdf-generation
tags: [react-pdf, deno, edge-function, supabase-storage, football, sgsa, fa-incident, sporting-events]

# Dependency graph
requires:
  - phase: 22-01
    provides: FootballPlayerFields + FootballSpectatorFields definitions in vertical_extra_fields
  - phase: 22-02
    provides: RIDDOR gate for sporting_events vertical confirmed
  - phase: 18-03
    provides: fa-incident-generator stub + incident-report-dispatcher routing table
  - phase: 20-03
    provides: event-incident-report-generator pattern (Purple Guide PDF) as reference
provides:
  - FA Match Day Injury Form PDF (FAPlayerDocument.tsx + fa-player-mapping.ts)
  - SGSA Medical Incident Report PDF (FASpectatorDocument.tsx + fa-spectator-mapping.ts)
  - fa-incident-reports Supabase Storage bucket (migration 127)
  - fa-incident-generator: 501 stub replaced with full patient_type-routed implementation
affects: [22-04, 23-analytics, future-incident-reporting]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "patient_type routing: if/else on extraFields.patient_type determines PDF format (player → FA form, spectator → SGSA form)"
    - "React.createElement() for JSX-free Deno Edge Function rendering (avoids JSX pragma issues)"
    - "vertical_extra_fields as parsed JS object — no JSON.parse() in Edge Functions (JSONB returned already parsed)"
    - "Migration numbering gap: 125 = event-incident-reports (Phase 20), 126 = motorsport concussion, 127 = fa-incident-reports"

key-files:
  created:
    - supabase/functions/fa-incident-generator/FAPlayerDocument.tsx
    - supabase/functions/fa-incident-generator/FASpectatorDocument.tsx
    - supabase/functions/fa-incident-generator/fa-player-mapping.ts
    - supabase/functions/fa-incident-generator/fa-spectator-mapping.ts
    - supabase/migrations/127_fa_incident_storage.sql
  modified:
    - supabase/functions/fa-incident-generator/index.ts
    - supabase/functions/fa-incident-generator/types.ts
    - FEATURES.md

key-decisions:
  - "Migration 125 was already taken (event-incident-reports Phase 20); fa-incident-reports uses migration 127 (after 126 motorsport)"
  - "React.createElement() used in index.ts for rendering — avoids JSX pragma requirement in .ts files"
  - "patient_type routing uses if/else (not switch) — matches plan spec; spectator falls to else branch"
  - "vertical_extra_fields NOT JSON.parse()'d in Edge Function — JSONB column already returned as parsed object by Supabase"

patterns-established:
  - "Dual PDF format routing by patient_type: single Edge Function handles two form types (player=FA, spectator=SGSA)"
  - "FA/SGSA document structure: navy header (#1E3A5F), 40pt padding A4, absolute footer at bottom 30"

# Metrics
duration: 8min
completed: 2026-02-18
---

# Phase 22 Plan 03: FA & SGSA Incident PDF Generation Summary

**`fa-incident-generator` 501 stub replaced with patient_type-routed PDF generation — FA Match Day Injury Form for players and SGSA Medical Incident Report for spectators, both using npm:@react-pdf/renderer@4.3.2, uploaded to `fa-incident-reports` bucket with 7-day signed URL**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-02-18T04:18:32Z
- **Completed:** 2026-02-18T04:26:40Z
- **Tasks:** 4 (Tasks 1, 2a, 2b, 3)
- **Files modified:** 7

## Accomplishments

- Migration 127 creates private `fa-incident-reports` storage bucket with RLS (SELECT for org members, INSERT/UPDATE for service role)
- `types.ts` fully expanded: `FAIncidentRequest`, `FootballPlayerFields`, `FootballSpectatorFields`, `FootballExtraFields` union, `FAPlayerPDFData`, `SGSASpectatorPDFData`
- `fa-player-mapping.ts`: `mapTreatmentToFAPlayer()` with label lookups for all enum fields (phase_of_play, contact_type, hia_outcome, fa_severity)
- `fa-spectator-mapping.ts`: `mapTreatmentToSGSASpectator()` with referral_outcome label lookup
- `FAPlayerDocument.tsx`: FA navy themed PDF with HIA section, amber concussion warning box, FA severity labels
- `FASpectatorDocument.tsx`: SGSA PDF with conditional safeguarding red warning box, referral outcome labels
- `index.ts`: 501 stub fully replaced — fetches treatment, reads `patient_type`, routes to correct PDF, uploads, returns signed URL

## Task Commits

Each task was committed atomically:

1. **Task 1: Storage migration, types, mapping files** — `8751b95` (feat)
2. **Task 2a: FAPlayerDocument.tsx** — `523937d` (feat)
3. **Task 2b: FASpectatorDocument.tsx** — `b4716b2` (feat)
4. **Task 3: Replace 501 stub in index.ts** — `31344cc` (feat)
5. **FEATURES.md update** — `9f52950` (docs)

## Files Created/Modified

- `supabase/migrations/127_fa_incident_storage.sql` — fa-incident-reports bucket + RLS policies
- `supabase/functions/fa-incident-generator/types.ts` — full type set (replaced Phase 18 stub types)
- `supabase/functions/fa-incident-generator/fa-player-mapping.ts` — mapTreatmentToFAPlayer with all label lookups
- `supabase/functions/fa-incident-generator/fa-spectator-mapping.ts` — mapTreatmentToSGSASpectator with referral labels
- `supabase/functions/fa-incident-generator/FAPlayerDocument.tsx` — FA Match Day Injury Form PDF component
- `supabase/functions/fa-incident-generator/FASpectatorDocument.tsx` — SGSA Medical Incident Report PDF component
- `supabase/functions/fa-incident-generator/index.ts` — full implementation (501 stub replaced)
- `FEATURES.md` — updated with Phase 22-03 documentation

## Decisions Made

- **Migration 127, not 125**: Migration 125 was already taken by `event-incident-reports` (Phase 20-03). Migration 126 was taken by `motorsport_concussion_alert_type` (Phase 19). fa-incident-reports uses 127.
- **React.createElement() in index.ts**: index.ts is a `.ts` file (not `.tsx`), so JSX syntax would require a pragma. Using `React.createElement(FAPlayerDocument, { data, generatedAt })` avoids this. Matches the plan spec.
- **patient_type routing via if/else**: Player branch uses `if (patientType === 'player')`, spectator falls to `else`. Simple and explicit.
- **vertical_extra_fields not JSON.parse()'d**: Supabase returns JSONB as a parsed JS object in Edge Functions. Documented in comment inside index.ts and in STATE.md decisions.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Migration number 125 already taken; used 127 instead**

- **Found during:** Task 1 (creating storage migration)
- **Issue:** The plan specified `125_fa_incident_storage.sql` but `supabase/migrations/125_event_incident_reports_storage.sql` already exists (created in Phase 20-03 for the Purple Guide event bucket). Duplicate migration numbers would break Supabase migration sequencing.
- **Fix:** Used next available number: `127_fa_incident_storage.sql` (126 is taken by motorsport concussion alert type from Phase 19)
- **Files modified:** `supabase/migrations/127_fa_incident_storage.sql` (named differently than plan spec)
- **Verification:** `ls supabase/migrations/ | sort` confirms 127 is the next free slot
- **Committed in:** `8751b95` (Task 1 commit)

**2. [Rule 2 - Missing Critical] Added UPDATE RLS policy to storage bucket migration**

- **Found during:** Task 1 (creating storage migration)
- **Issue:** The plan specified SELECT + INSERT policies only. The event-incident-reports bucket (Phase 20 reference implementation) also has an UPDATE policy for service_role (PDF regeneration). Without it, re-generating a PDF for the same treatment would fail if the file already exists with `upsert: true`.
- **Fix:** Added `CREATE POLICY "Service role can update fa incident reports"` matching the Phase 20 pattern
- **Files modified:** `supabase/migrations/127_fa_incident_storage.sql`
- **Committed in:** `8751b95` (Task 1 commit)

**3. [Rule 2 - Missing Critical] RLS SELECT policy uses org-scoped check (not just `auth.role()` check)**

- **Found during:** Task 1 reviewing plan's RLS spec
- **Issue:** The plan's migration SQL used only `auth.role() = 'authenticated'` for SELECT, which allows any authenticated user to read any org's FA incident reports. The Phase 20 reference pattern uses a `profiles JOIN treatments` subquery to restrict to the treatment's own org members.
- **Fix:** Applied org-scoped RLS: `EXISTS (SELECT 1 FROM treatments t JOIN profiles p ON p.org_id = t.org_id WHERE t.id::text = (storage.foldername(name))[1] AND p.id = auth.uid())`
- **Files modified:** `supabase/migrations/127_fa_incident_storage.sql`
- **Committed in:** `8751b95` (Task 1 commit)

---

**Total deviations:** 3 auto-fixed (1 blocking migration conflict, 2 missing critical security/completeness issues)
**Impact on plan:** All auto-fixes essential for correct operation and security. No scope creep. The 7 target files were all created/modified as planned.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required. Migration 127 applies via standard `supabase db push`.

## Next Phase Readiness

- `fa-incident-generator` fully operational — patient_type routes to correct PDF, both formats upload and return signed URLs
- Phase 22 remaining: 22-04 (cert types + terminology) — already completed per STATE.md
- Phase 22 is effectively complete (22-01 form, 22-02 RIDDOR gate, 22-03 PDF, 22-04 certs)
- Migration 127 ready to apply: `supabase db push` or deploy to Supabase cloud

---
*Phase: 22-football-sports-vertical*
*Completed: 2026-02-18*
