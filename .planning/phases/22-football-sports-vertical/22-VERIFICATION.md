---
phase: 22-football-sports-vertical
verified: 2026-02-18T04:37:42Z
status: gaps_found
score: 4/5 must-haves verified
gaps:
  - truth: "An admin can download the correct PDF for each football incident — the FA Match Day Injury Form for player incidents and the SGSA Medical Incident Report for spectator incidents"
    status: failed
    reason: "The fa-incident-generator Edge Function is fully implemented and the dispatcher routes sporting_events to it, but the admin treatment detail page (/treatments/[id]/page.tsx) only renders the EventIncidentReportCard for the 'festivals' vertical. There is no FAIncidentReportCard component and no condition for sporting_events in the treatment detail page. generateIncidentReportPDF() in incident-report-dispatcher.ts is defined but never imported or called anywhere in the admin UI."
    artifacts:
      - path: "web/app/(dashboard)/treatments/[id]/page.tsx"
        issue: "Line 228: PDF download card only renders for event_vertical === 'festivals'. No branch for 'sporting_events'. Admin visiting a football treatment sees no download option."
      - path: "web/lib/pdf/incident-report-dispatcher.ts"
        issue: "generateIncidentReportPDF() is exported but has zero imports/callers in the codebase. The file comment on line 15 still reads 'currently returns 501' for fa-incident-generator, which is stale."
    missing:
      - "A FAIncidentReportCard component (analogous to EventIncidentReportCard) that calls fa-incident-generator"
      - "A condition in web/app/(dashboard)/treatments/[id]/page.tsx that renders the FA/SGSA download card when event_vertical === 'sporting_events'"
      - "Either wire generateIncidentReportPDF from the dispatcher or call supabase.functions.invoke('fa-incident-generator', ...) directly in the new card"
---

# Phase 22: Football Sports Vertical — Verification Report

**Phase Goal:** Medics at football matches can log incidents for two distinct patient types — players and spectators — each with their own form, regulatory framework, and PDF output. Player on-pitch injuries never trigger RIDDOR. The correct PDF (FA or SGSA) is generated automatically based on patient type.
**Verified:** 2026-02-18T04:37:42Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A medic at a football match is prompted to select patient type (Player or Spectator) at the start of the treatment form — the form fields that follow differ based on this selection | VERIFIED | `app/treatment/new.tsx` line 656: `{isFootball && ...}` renders Patient Type selector with Player/Spectator Pressable buttons. Selector appears before "Section 1" in JSX (line 704 onwards). `isFootball = orgVertical === 'sporting_events'` at line 124. |
| 2 | A player incident form captures Phase of Play, Contact / Non-Contact classification, HIA Concussion Assessment outcome, and FA severity classification — these fields are present and complete-able before form submission | VERIFIED | `app/treatment/new.tsx` lines 704–815: Player section contains Phase of Play (6 chip options), Contact Type (2 options), HIA toggle + conditional HIA Outcome (3 options), FA Severity (5 options). All fields wired to state. Validation guards at lines 453–459 block submission if Phase of Play, Contact Type, HIA Outcome (when required), or FA Severity are missing. |
| 3 | A spectator incident form captures stand location, medical referral outcome, and a safeguarding flag — the SGSA-aligned fields are distinct from the player form fields | VERIFIED | `app/treatment/new.tsx` lines 816–904: Spectator section contains Stand/Location (7 chip options), Row/Seat text input, Referral Outcome (4 options), Safeguarding Flag toggle + conditional Notes text area, Alcohol Involvement toggle. Section only renders when `footballPatientType === 'spectator'`, completely separate from player section. |
| 4 | A player on-pitch injury never produces a RIDDOR flag — the vertical gate prevents RIDDOR detection before any logic runs for the football vertical | VERIFIED | `supabase/functions/riddor-detector/index.ts` lines 75–107: `NON_RIDDOR_VERTICALS` array includes `'sporting_events'` with FOOT-04 comment. Early return at line 96 fires before `detectRIDDOR()` call, returning `{ detected: false }`. F2508 generator (`supabase/functions/riddor-f2508-generator/index.ts` line 104) also gates sporting_events with 400 response. Test block in `supabase/functions/riddor-detector/test.ts` (3 Deno assertions) verifies the gate. |
| 5 | An admin can download the correct PDF for each football incident — the FA Match Day Injury Form for player incidents and the SGSA Medical Incident Report for spectator incidents | FAILED | The Edge Function (`supabase/functions/fa-incident-generator/index.ts`) is fully implemented and routes by `patient_type`. Storage bucket migration (`127_fa_incident_storage.sql`) exists. Dispatcher (`web/lib/pdf/incident-report-dispatcher.ts`) routes `sporting_events` to `fa-incident-generator`. However, the admin treatment detail page (`web/app/(dashboard)/treatments/[id]/page.tsx` line 228) only renders the PDF download card for `event_vertical === 'festivals'`. No card renders for `sporting_events`. `generateIncidentReportPDF()` is defined but has zero callers in the codebase. The admin download path is not wired. |

**Score:** 4/5 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `app/treatment/new.tsx` | Football dual-patient-type form | VERIFIED | 1723 lines. Patient type selector, player section (6 fields), spectator section (7 fields), validation guards before try block, `vertical_extra_fields` built and wired into `treatment.update()` and `enqueueSyncItem` payload. |
| `supabase/functions/fa-incident-generator/index.ts` | Full FA/SGSA PDF routing | VERIFIED | 175 lines. No stub — routes by `patient_type`, calls `renderToBuffer`, uploads to `fa-incident-reports` bucket, returns signed URL. |
| `supabase/functions/fa-incident-generator/FAPlayerDocument.tsx` | FA Match Day Injury Form PDF component | VERIFIED | 114 lines. Exports `FAPlayerDocument`. Uses `npm:@react-pdf/renderer@4.3.2`. Renders Player Details, Injury Classification, HIA section with concussion warning, Treatment and Outcome, Footer. |
| `supabase/functions/fa-incident-generator/FASpectatorDocument.tsx` | SGSA Medical Incident Report PDF component | VERIFIED | 112 lines. Exports `FASpectatorDocument`. Uses `npm:@react-pdf/renderer@4.3.2`. Renders Location, Clinical Details, conditional Safeguarding warning box, Medic, Footer. |
| `supabase/functions/fa-incident-generator/fa-player-mapping.ts` | Maps treatment to FA player PDF data | VERIFIED | 68 lines. Exports `mapTreatmentToFAPlayer`. Contains label lookups for phase_of_play, contact_type, hia_outcome, fa_severity. |
| `supabase/functions/fa-incident-generator/fa-spectator-mapping.ts` | Maps treatment to SGSA spectator PDF data | VERIFIED | 39 lines. Exports `mapTreatmentToSGSASpectator`. Contains referral_outcome label lookup. |
| `supabase/functions/fa-incident-generator/types.ts` | Full type definitions for football PDFs | VERIFIED | 75 lines. Defines `FAIncidentRequest`, `FootballPlayerFields`, `FootballSpectatorFields`, `FootballExtraFields`, `FAPlayerPDFData`, `SGSASpectatorPDFData`. |
| `supabase/migrations/127_fa_incident_storage.sql` | fa-incident-reports storage bucket + RLS | VERIFIED | 39 lines. Creates private `fa-incident-reports` bucket. Has SELECT, INSERT, UPDATE RLS policies. Note: plan specified 125 but 125 was taken; 127 is correct. |
| `supabase/functions/riddor-detector/index.ts` | RIDDOR gate with sporting_events in NON_RIDDOR_VERTICALS | VERIFIED | `'sporting_events'` at line 78 with FOOT-04 comment. Early return at line 96 precedes `detectRIDDOR()` at line 103+. |
| `supabase/functions/riddor-detector/test.ts` | Deno-native FOOT-04 test block | VERIFIED | 3 test assertions: sporting_events IS gated, construction NOT gated, tv_film NOT gated. |
| `supabase/functions/riddor-f2508-generator/index.ts` | 400 guard for sporting_events | VERIFIED | Line 104: `NON_RIDDOR_VERTICALS` includes `'sporting_events'`. Returns HTTP 400 with FOOT-04 comment. |
| `services/taxonomy/certification-types.ts` | 4 football cert types + sporting_events CertCategory | VERIFIED | 206 lines. ATMMiF, ITMMiF, FA Advanced Trauma Management, FA Concussion Module in CERT_TYPES (lines 54-57), CERT_TYPE_INFO (lines 128-146), and VERTICAL_CERT_TYPES (lines 180-184). `'sporting_events'` in CertCategory union (line 89). |
| `services/taxonomy/vertical-outcome-labels.ts` | getPatientLabel='Player', getLocationLabel='Pitch / Ground', getEventLabel='Club' | VERIFIED | 176 lines. Lines 126, 147, 167 confirm correct labels for `sporting_events`. |
| `web/lib/org-labels.ts` | Football terminology in LABEL_MAP | VERIFIED | 180 lines. Lines 64-70: `sporting_events` entry has `personSingular: 'Player'`, `personPlural: 'Players'`, `locationTerm: 'Pitch / Ground'`, `eventTerm: 'Club'`, `periodTerm: 'Match day'`. JSDoc updated at line 14. |
| `web/lib/pdf/incident-report-dispatcher.ts` | Dispatcher routes sporting_events to fa-incident-generator | VERIFIED (partial) | Line 30: `sporting_events: 'fa-incident-generator'`. However, `generateIncidentReportPDF()` is defined but never imported or called anywhere in the admin UI. Comment at line 15 still says "currently returns 501" (stale). |
| `web/app/(dashboard)/treatments/[id]/page.tsx` | Admin PDF download for sporting_events treatments | FAILED | Line 228: Only renders `<EventIncidentReportCard>` for `event_vertical === 'festivals'`. No condition for `sporting_events`. No FAIncidentReportCard component exists in the codebase. |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `app/treatment/new.tsx` | `enqueueSyncItem` payload | `vertical_extra_fields` key | VERIFIED | Line 543: `vertical_extra_fields` included in sync payload. Football path uses `JSON.stringify(verticalExtraFields)` built at lines 479-499. |
| `supabase/functions/fa-incident-generator/index.ts` | `FAPlayerDocument` or `FASpectatorDocument` | `patient_type` routing (if/else) | VERIFIED | Lines 109-128: `if (patientType === 'player')` renders FAPlayerDocument, else FASpectatorDocument. |
| `supabase/functions/fa-incident-generator/index.ts` | `supabase.storage.from('fa-incident-reports')` | upload + createSignedUrl calls | VERIFIED | Lines 131-133 (upload), 149 (createSignedUrl). Both use `fa-incident-reports` bucket. |
| `web/lib/pdf/incident-report-dispatcher.ts` | `fa-incident-generator` | `FUNCTION_BY_VERTICAL['sporting_events']` | PARTIAL | Routing table correct (line 30). But `generateIncidentReportPDF()` is never imported by any admin UI component. |
| `web/app/(dashboard)/treatments/[id]/page.tsx` | FA/SGSA PDF download | `sporting_events` guard + card component | NOT_WIRED | No `sporting_events` branch. No FAIncidentReportCard. Admin cannot trigger a download from the treatment detail page. |
| `supabase/functions/riddor-detector/index.ts` | early return before `detectRIDDOR()` | `NON_RIDDOR_VERTICALS.includes(effectiveVertical)` | VERIFIED | Guard at line 96, `detectRIDDOR()` call at line 103+. Order confirmed correct. |

---

### Requirements Coverage

| Requirement | Status | Blocking Issue |
|-------------|--------|----------------|
| FOOT-01: Patient type selector (Player / Spectator) | SATISFIED | Patient type selector rendered when `orgVertical === 'sporting_events'` |
| FOOT-02: Player fields (Phase of Play, Contact/Non-Contact, HIA, FA Severity) | SATISFIED | All 6 player fields implemented and validated |
| FOOT-03: Spectator fields (Stand Location, Referral Outcome, Safeguarding Flag) | SATISFIED | All 7 spectator fields implemented and validated |
| FOOT-04: Player on-pitch injury never RIDDOR | SATISFIED | NON_RIDDOR_VERTICALS gate confirmed; test block locks it |
| FOOT-05: Football terminology (Player, Pitch / Ground, Club) | SATISFIED | All three labels updated in vertical-outcome-labels.ts and org-labels.ts |
| FOOT-06: Football cert types (ATMMiF-led) | SATISFIED | 4 cert types added, ATMMiF leads VERTICAL_CERT_TYPES |
| FOOT-07: Correct PDF generated for each incident type | BLOCKED | Edge Function and storage are complete. Admin UI download path is unwired — no FAIncidentReportCard for sporting_events in treatments/[id]/page.tsx |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `web/app/(dashboard)/treatments/[id]/page.tsx` | 228 | Only `festivals` branch for PDF download — no `sporting_events` branch | Blocker | Admin cannot download FA/SGSA PDFs from treatment detail view |
| `web/lib/pdf/incident-report-dispatcher.ts` | 15 | Comment still reads "currently returns 501" for fa-incident-generator | Warning | Misleading; fa-incident-generator is fully implemented since Phase 22-03 |
| `app/treatment/new.tsx` | 254, 486 | `hia_outcome: hiaPerformed ? hiaOutcome : null` — null included when hia_performed is false | Info | SUMMARY claimed "excluded from payload entirely (not null-included)" but code sets it to null. PDF mapping handles null gracefully via `?` operator, so functionally benign. |

---

### Human Verification Required

None — automated checks are sufficient for all structural verification. The gap (missing admin download UI) is confirmed programmatically.

---

### Gaps Summary

Four of five success criteria are fully achieved. The treatment form (Plans 22-01), RIDDOR gate (Plan 22-02), and taxonomy (Plan 22-04) are all implemented correctly and completely.

The single gap is in the admin PDF download path (Plan 22-03, success criterion 5). The Edge Function (`fa-incident-generator`) is fully implemented, the storage bucket exists (migration 127), and the dispatcher routes `sporting_events` correctly. However, the admin treatment detail page (`web/app/(dashboard)/treatments/[id]/page.tsx`) was never updated to render a download card for `sporting_events` treatments. The page only shows the Purple Guide download card for `festivals`. An admin visiting a `sporting_events` treatment detail page sees no PDF download option.

What is missing:
1. A `FAIncidentReportCard` web component that calls `fa-incident-generator` (analogous to `EventIncidentReportCard` which calls `event-incident-report-generator`)
2. A condition in `treatments/[id]/page.tsx` that renders this card when `treatment.event_vertical === 'sporting_events'`

The dispatcher function `generateIncidentReportPDF` exists and is correct but has no callers — it can be used directly by the new card component, or the card can call `supabase.functions.invoke` directly (as `EventIncidentReportCard` uses `generateEventIncidentPDF` from `web/lib/queries/event-incidents.ts`).

---

_Verified: 2026-02-18T04:37:42Z_
_Verifier: Claude (gsd-verifier)_
