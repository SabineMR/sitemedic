---
phase: 22-football-sports-vertical
verified: 2026-02-18T05:00:18Z
status: passed
score: 5/5 must-haves verified
re_verification:
  previous_status: gaps_found
  previous_score: 4/5
  gaps_closed:
    - "An admin can download the correct PDF for each football incident — the FA Match Day Injury Form for player incidents and the SGSA Medical Incident Report for spectator incidents"
  gaps_remaining: []
  regressions: []
---

# Phase 22: Football Sports Vertical — Verification Report

**Phase Goal:** Medics at football matches can log incidents for two distinct patient types — players and spectators — each with their own form, regulatory framework, and PDF output. Player on-pitch injuries never trigger RIDDOR. The correct PDF (FA or SGSA) is generated automatically based on patient type.
**Verified:** 2026-02-18T05:00:18Z
**Status:** passed
**Re-verification:** Yes — after gap closure (Plan 22-05)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A medic at a football match is prompted to select patient type (Player or Spectator) at the start of the treatment form — the form fields that follow differ based on this selection | VERIFIED | `app/treatment/new.tsx` line 124: `isFootball = orgVertical === 'sporting_events'`. Line 656: `{isFootball && ...}` renders Patient Type selector. Lines 704 and 816 gate player and spectator sections respectively. No regression. |
| 2 | A player incident form captures Phase of Play, Contact / Non-Contact classification, HIA Concussion Assessment outcome, and FA severity classification — these fields are present and complete-able before form submission | VERIFIED | `app/treatment/new.tsx` lines 483-487: all four player fields wired into payload. Lines 453-459: validation guards block submission when required fields missing. No regression. |
| 3 | A spectator incident form captures stand location, medical referral outcome, and a safeguarding flag — the SGSA-aligned fields are distinct from the player form fields | VERIFIED | `app/treatment/new.tsx` lines 492-496: spectator fields (stand_location, referral_outcome, safeguarding_flag, safeguarding_notes) wired into payload. Section only renders when `footballPatientType === 'spectator'` (line 816). No regression. |
| 4 | A player on-pitch injury never produces a RIDDOR flag — the vertical gate prevents RIDDOR detection before any logic runs for the football vertical | VERIFIED | `supabase/functions/riddor-detector/index.ts` line 78: `'sporting_events'` in NON_RIDDOR_VERTICALS with FOOT-04 comment. Early return at line 96 precedes `detectRIDDOR()`. No regression. |
| 5 | An admin can download the correct PDF for each football incident — the FA Match Day Injury Form for player incidents and the SGSA Medical Incident Report for spectator incidents | VERIFIED | `web/lib/queries/fa-incidents.ts` exports `generateFAIncidentPDF()` (47 lines, POSTs to `/functions/v1/fa-incident-generator` with `event_vertical: 'sporting_events'`). `web/components/dashboard/FAIncidentReportCard.tsx` exports `FAIncidentReportCard` (65 lines, imports and calls `generateFAIncidentPDF`, opens `data.signed_url` in new tab on success). `web/app/(dashboard)/treatments/[id]/page.tsx` lines 19 + 233-236: imports FAIncidentReportCard and renders it inside `{treatment.event_vertical === 'sporting_events' && ...}`. Full wiring chain confirmed. |

**Score:** 5/5 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `app/treatment/new.tsx` | Football dual-patient-type form | VERIFIED | 1723 lines. Patient type selector, player section (6 fields), spectator section (7 fields), validation guards, `vertical_extra_fields` built and wired into payload. |
| `supabase/functions/fa-incident-generator/index.ts` | Full FA/SGSA PDF routing | VERIFIED | 175 lines. Routes by `patient_type`, calls `renderToBuffer`, uploads to `fa-incident-reports` bucket, returns signed URL. |
| `supabase/functions/fa-incident-generator/FAPlayerDocument.tsx` | FA Match Day Injury Form PDF component | VERIFIED | 114 lines. Exports `FAPlayerDocument`. Renders Player Details, Injury Classification, HIA section, Treatment and Outcome, Footer. |
| `supabase/functions/fa-incident-generator/FASpectatorDocument.tsx` | SGSA Medical Incident Report PDF component | VERIFIED | 112 lines. Exports `FASpectatorDocument`. Renders Location, Clinical Details, conditional Safeguarding warning box, Medic, Footer. |
| `supabase/functions/fa-incident-generator/fa-player-mapping.ts` | Maps treatment to FA player PDF data | VERIFIED | 68 lines. Exports `mapTreatmentToFAPlayer`. Contains label lookups for all player fields. |
| `supabase/functions/fa-incident-generator/fa-spectator-mapping.ts` | Maps treatment to SGSA spectator PDF data | VERIFIED | 39 lines. Exports `mapTreatmentToSGSASpectator`. |
| `supabase/functions/fa-incident-generator/types.ts` | Full type definitions for football PDFs | VERIFIED | 75 lines. Defines `FAIncidentRequest`, `FootballPlayerFields`, `FootballSpectatorFields`, `FAPlayerPDFData`, `SGSASpectatorPDFData`. |
| `supabase/migrations/127_fa_incident_storage.sql` | fa-incident-reports storage bucket + RLS | VERIFIED | 39 lines. Creates private `fa-incident-reports` bucket with SELECT, INSERT, UPDATE RLS policies. |
| `supabase/functions/riddor-detector/index.ts` | RIDDOR gate with sporting_events in NON_RIDDOR_VERTICALS | VERIFIED | `'sporting_events'` at line 78 with FOOT-04 comment. Early return at line 96 precedes `detectRIDDOR()`. |
| `supabase/functions/riddor-detector/test.ts` | Deno-native FOOT-04 test block | VERIFIED | 3 test assertions: sporting_events IS gated, construction NOT gated, tv_film NOT gated. |
| `supabase/functions/riddor-f2508-generator/index.ts` | 400 guard for sporting_events | VERIFIED | `NON_RIDDOR_VERTICALS` includes `'sporting_events'`. Returns HTTP 400 with FOOT-04 comment. |
| `services/taxonomy/certification-types.ts` | 4 football cert types + sporting_events CertCategory | VERIFIED | 206 lines. ATMMiF, ITMMiF, FA Advanced Trauma Management, FA Concussion Module all present. |
| `services/taxonomy/vertical-outcome-labels.ts` | getPatientLabel='Player', getLocationLabel='Pitch / Ground', getEventLabel='Club' | VERIFIED | 176 lines. Correct labels for `sporting_events`. |
| `web/lib/org-labels.ts` | Football terminology in LABEL_MAP | VERIFIED | 180 lines. `sporting_events` entry confirmed with correct terms. |
| `web/lib/pdf/incident-report-dispatcher.ts` | Dispatcher routes sporting_events to fa-incident-generator; no stale comments | VERIFIED | Line 30: `sporting_events: 'fa-incident-generator'`. All three non-RIDDOR generators marked "fully implemented" in JSDoc. Zero occurrences of "501" confirmed by grep. |
| `web/lib/queries/fa-incidents.ts` | generateFAIncidentPDF() Edge Function caller | VERIFIED | 47 lines (NEW — Plan 05). Exports `generateFAIncidentPDF`. POSTs to `/functions/v1/fa-incident-generator` with `event_vertical: 'sporting_events'`. Returns `{ success, patient_type, signed_url, file_name }`. |
| `web/components/dashboard/FAIncidentReportCard.tsx` | FA / SGSA Match Day Report download card | VERIFIED | 65 lines (NEW — Plan 05). Exports `FAIncidentReportCard`. Imports `generateFAIncidentPDF`. Uses `useMutation`, opens `data.signed_url` in new tab on success, alerts on error. Card title "FA / SGSA Match Day Report". |
| `web/app/(dashboard)/treatments/[id]/page.tsx` | Admin PDF download for sporting_events treatments | VERIFIED | Line 19: imports `FAIncidentReportCard`. Lines 233-236: `{treatment.event_vertical === 'sporting_events' && <FAIncidentReportCard treatmentId={treatment.id} />}`. Both festivals and sporting_events branches present and mutually exclusive. |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `app/treatment/new.tsx` | `enqueueSyncItem` payload | `vertical_extra_fields` key | VERIFIED | Line 543: `vertical_extra_fields` included in sync payload. Football path uses `JSON.stringify(verticalExtraFields)` built at lines 479-499. |
| `supabase/functions/fa-incident-generator/index.ts` | `FAPlayerDocument` or `FASpectatorDocument` | `patient_type` routing (if/else) | VERIFIED | Lines 109-128: `if (patientType === 'player')` renders FAPlayerDocument, else FASpectatorDocument. |
| `supabase/functions/fa-incident-generator/index.ts` | `supabase.storage.from('fa-incident-reports')` | upload + createSignedUrl calls | VERIFIED | Lines 131-133 (upload), 149 (createSignedUrl). Both use `fa-incident-reports` bucket. |
| `web/lib/queries/fa-incidents.ts` | `fa-incident-generator` Edge Function | `fetch` POST to `/functions/v1/fa-incident-generator` | VERIFIED | Line 30: URL contains `fa-incident-generator`. Body includes `event_vertical: 'sporting_events'`. Bearer token from session. |
| `web/components/dashboard/FAIncidentReportCard.tsx` | `generateFAIncidentPDF` | `import { generateFAIncidentPDF } from '@/lib/queries/fa-incidents'` | VERIFIED | Line 15: import confirmed. Line 23: `mutationFn: () => generateFAIncidentPDF(treatmentId)`. |
| `web/components/dashboard/FAIncidentReportCard.tsx` | `window.open(data.signed_url, '_blank')` | `onSuccess` callback | VERIFIED | Lines 24-27: checks `data.signed_url` truthy, opens in new tab. |
| `web/app/(dashboard)/treatments/[id]/page.tsx` | `FAIncidentReportCard` | `import` + `event_vertical === 'sporting_events'` guard | VERIFIED | Line 19: import. Lines 234-236: conditional render with `treatmentId={treatment.id}`. |
| `supabase/functions/riddor-detector/index.ts` | early return before `detectRIDDOR()` | `NON_RIDDOR_VERTICALS.includes(effectiveVertical)` | VERIFIED | Guard at line 96, `detectRIDDOR()` call at line 103+. Order confirmed correct. |

---

### Requirements Coverage

| Requirement | Status | Notes |
|-------------|--------|-------|
| FOOT-01: Patient type selector (Player / Spectator) | SATISFIED | Patient type selector rendered when `orgVertical === 'sporting_events'` |
| FOOT-02: Player fields (Phase of Play, Contact/Non-Contact, HIA, FA Severity) | SATISFIED | All 6 player fields implemented and validated |
| FOOT-03: Spectator fields (Stand Location, Referral Outcome, Safeguarding Flag) | SATISFIED | All 7 spectator fields implemented and validated |
| FOOT-04: Player on-pitch injury never RIDDOR | SATISFIED | NON_RIDDOR_VERTICALS gate confirmed; test block locks it |
| FOOT-05: Football terminology (Player, Pitch / Ground, Club) | SATISFIED | All three labels updated in vertical-outcome-labels.ts and org-labels.ts |
| FOOT-06: Football cert types (ATMMiF-led) | SATISFIED | 4 cert types added, ATMMiF leads VERTICAL_CERT_TYPES |
| FOOT-07: Correct PDF generated for each incident type | SATISFIED | Edge Function, storage, query function, card component, and treatment page conditional all fully wired — gap closed by Plan 22-05 |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `app/treatment/new.tsx` | 254, 486 | `hia_outcome: hiaPerformed ? hiaOutcome : null` — null included when hia_performed is false | Info | SUMMARY claimed "excluded from payload entirely (not null-included)" but code sets it to null. PDF mapping handles null gracefully via `?` operator. Functionally benign. Unchanged from initial verification. |

No blocker or warning anti-patterns remain. The stale "501" comments in `incident-report-dispatcher.ts` noted in the initial verification are confirmed removed.

---

### Human Verification Required

None — all structural verification is satisfied programmatically. The full chain from treatment detail page to Edge Function to storage is wired. Visual confirmation that the card renders correctly on an actual sporting_events treatment page would be a good smoke test before releasing to medics, but it is not blocking.

---

### Gap Closure Summary

The single gap from the initial verification (Truth 5 — admin PDF download path unwired) is closed. Plan 22-05 delivered:

1. `web/lib/queries/fa-incidents.ts` — `generateFAIncidentPDF()` function that POSTs to `fa-incident-generator` with the correct `event_vertical` and returns `{ success, patient_type, signed_url, file_name }`.
2. `web/components/dashboard/FAIncidentReportCard.tsx` — React card component that calls `generateFAIncidentPDF`, opens the returned `signed_url` in a new tab, and presents the correct card title and description to admins.
3. `web/app/(dashboard)/treatments/[id]/page.tsx` — FAIncidentReportCard imported and rendered inside `{treatment.event_vertical === 'sporting_events' && ...}` immediately after the existing festivals card block. The two blocks are mutually exclusive — no cross-contamination between verticals.
4. `web/lib/pdf/incident-report-dispatcher.ts` — Stale "currently returns 501" comments replaced with accurate descriptions. Zero occurrences of "501" remain.

All five truths are now verified. Phase 22 is complete.

---

_Verified: 2026-02-18T05:00:18Z_
_Verifier: Claude (gsd-verifier)_
_Re-verification: Yes — after gap closure via Plan 22-05_
