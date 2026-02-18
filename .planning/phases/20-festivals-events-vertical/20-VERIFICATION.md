---
phase: 20-festivals-events-vertical
verified: 2026-02-18T04:32:07Z
status: passed
score: 16/16 must-haves verified
re_verification: false
---

# Phase 20: Festivals & Events Vertical Verification Report

**Phase Goal:** Medics at festivals and events can log incidents using Purple Guide triage categories. The triage data model works correctly alongside — not as a replacement for — existing outcome fields. Festival-goer treatments never trigger RIDDOR. The event organiser receives a Purple Guide-format incident report PDF per treatment.

**Verified:** 2026-02-18T04:32:07Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A medic with orgVertical 'festivals' sees a TST Triage Priority picker (P1/P2/P3/P4) in the treatment form | VERIFIED | `app/treatment/new.tsx` line 1219-1270: section guarded by `orgVertical === 'festivals'`; TRIAGE_PRIORITIES array with P1–P4 at lines 141-146; BottomSheetPicker at lines 1367-1379 |
| 2 | A medic with orgVertical 'festivals' sees an Alcohol/Substance Involvement toggle on the form | VERIFIED | `app/treatment/new.tsx` lines 1237-1245: toggle Pressable with `festivalAlcoholSubstanceFlag` state, inside `orgVertical === 'festivals'` guard |
| 3 | A medic with orgVertical 'festivals' sees a Safeguarding Concern toggle on the form | VERIFIED | `app/treatment/new.tsx` lines 1247-1256: toggle Pressable with `festivalSafeguardingFlag` state, inside `orgVertical === 'festivals'` guard |
| 4 | A medic with orgVertical 'festivals' sees an Attendee Disposition picker on the form | VERIFIED | `app/treatment/new.tsx` lines 1258-1270: FESTIVAL_DISPOSITIONS (discharged_on_site, transferred_to_hospital, refused_treatment) at lines 148-152; BottomSheetPicker at lines 1381-1394 |
| 5 | The form cannot be completed without selecting a triage priority when orgVertical is 'festivals' | VERIFIED | `app/treatment/new.tsx` lines 466-474: explicit guard `if (orgVertical === 'festivals') { if (!triagePriority) { Alert.alert(...); return; } }` |
| 6 | The form cannot be completed without selecting a disposition when orgVertical is 'festivals' | VERIFIED | `app/treatment/new.tsx` lines 466-475: guard also checks `if (!disposition) { Alert.alert(...); return; }` after triage check |
| 7 | All four festival fields are written to verticalExtraFields as a JSON string in the enqueueSyncItem payload | VERIFIED | `buildVerticalExtraFields()` at lines 239-246 returns JSON string with `triage_priority`, `alcohol_substance`, `safeguarding_concern`, `disposition`; this is referenced in the enqueueSyncItem call at line 543 |
| 8 | Selecting a RIDDOR-reportable injury type when orgVertical is 'festivals' does NOT show the RIDDOR warning banner | VERIFIED | `app/treatment/new.tsx` line 310: `if (injuryType?.isRiddorReportable && orgVertical !== 'festivals')` — festivals explicitly excluded from RIDDOR flag |
| 9 | Selecting a RIDDOR-reportable injury type when orgVertical is 'construction', 'tv_film', or 'general' STILL shows the RIDDOR warning banner | VERIFIED | Same logic: `orgVertical !== 'festivals'` is true for construction, tv_film, general — banner shows for all non-festival verticals |
| 10 | The string 'festivals' appears in NON_RIDDOR_VERTICALS array in riddor-detector/index.ts | VERIFIED | `supabase/functions/riddor-detector/index.ts` line 76: `'festivals'` is first entry in `NON_RIDDOR_VERTICALS` array |
| 11 | VERTICAL_COMPLIANCE.festivals.riddorApplies is false in vertical-compliance.ts | VERIFIED | `services/taxonomy/vertical-compliance.ts` lines 122-134: `festivals` entry has `riddorApplies: false`, `primaryFramework: 'purple_guide'` |
| 12 | The event-incident-report-generator Edge Function has renderToBuffer (no longer a 501 stub) | VERIFIED | `supabase/functions/event-incident-report-generator/index.ts` line 15: `import { renderToBuffer } from 'npm:@react-pdf/renderer@4.3.2'`; line 117: `const pdfBuffer = await renderToBuffer(...)` — full implementation, no 501 |
| 13 | PurpleGuideDocument.tsx exists in event-incident-report-generator/ | VERIFIED | `/Users/sabineresoagli/GitHub/sitemedic/supabase/functions/event-incident-report-generator/PurpleGuideDocument.tsx` — 316 lines, full @react-pdf/renderer Document with 6 sections |
| 14 | purple-guide-mapping.ts exists and exports mapTreatmentToPurpleGuide | VERIFIED | `supabase/functions/event-incident-report-generator/purple-guide-mapping.ts` line 24: `export function mapTreatmentToPurpleGuide(treatment: any): PurpleGuideData` — 67 lines, maps all Purple Guide fields |
| 15 | Migration 125_event_incident_reports_storage.sql creates the event-incident-reports bucket | VERIFIED | `supabase/migrations/125_event_incident_reports_storage.sql` line 6: `INSERT INTO storage.buckets (id, name, public) VALUES ('event-incident-reports', 'event-incident-reports', false)` — also includes 3 RLS policies |
| 16 | Medic profile cert types list shows festivals vertical recommended certs including FREC 3 | VERIFIED | `web/types/certification.types.ts` lines 195-199: `festivals` in `VERTICAL_CERT_TYPES` starts with `'FREC 3'`; `web/app/medic/profile/page.tsx` line 295 calls `getRecommendedCertTypes(primaryVertical).slice(0, 6)` and renders results |

**Score:** 16/16 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `app/treatment/new.tsx` | Festival form section with triage, alcohol/substance, safeguarding, disposition | VERIFIED | 1724 lines; festival fields at lines 89-95 (state), 141-152 (constants), 1219-1271 (JSX section), 1367-1394 (pickers) |
| `supabase/functions/riddor-detector/index.ts` | NON_RIDDOR_VERTICALS contains 'festivals' | VERIFIED | 194 lines; line 76 contains `'festivals'` as first element |
| `services/taxonomy/vertical-compliance.ts` | festivals entry has riddorApplies: false | VERIFIED | 227 lines; lines 122-134 define full festivals compliance config |
| `supabase/functions/event-incident-report-generator/index.ts` | Full implementation with renderToBuffer | VERIFIED | 165 lines; imports PurpleGuideDocument and purple-guide-mapping; full PDF generation pipeline |
| `supabase/functions/event-incident-report-generator/PurpleGuideDocument.tsx` | Exists with real PDF structure | VERIFIED | 316 lines; 6 structured sections (Patient, Complaint, Treatment, Flags, Disposition, Medic) |
| `supabase/functions/event-incident-report-generator/purple-guide-mapping.ts` | Exports mapTreatmentToPurpleGuide | VERIFIED | 67 lines; maps all 14 PurpleGuideData fields from treatment record |
| `supabase/functions/event-incident-report-generator/types.ts` | EventIncidentData and PurpleGuideData types | VERIFIED | 31 lines; both interfaces defined |
| `supabase/migrations/125_event_incident_reports_storage.sql` | Creates event-incident-reports bucket | VERIFIED | 38 lines; bucket INSERT plus 3 RLS policies |
| `web/components/dashboard/EventIncidentReportCard.tsx` | Exists with 'use client', download card | VERIFIED | 65 lines; 'use client' at line 1; calls generateEventIncidentPDF via useMutation; displays signed URL on success |
| `web/app/(dashboard)/treatments/[id]/page.tsx` | Attendee/Venue/Organiser conditionals + EventIncidentReportCard | VERIFIED | 281 lines; imports EventIncidentReportCard; conditionals at lines 100-147 for Attendee/Worker, Event Organiser/Client, Venue/Site |
| `web/lib/queries/event-incidents.ts` | generateEventIncidentPDF function | VERIFIED | 46 lines; POSTs to event-incident-report-generator Edge Function |
| `web/types/certification.types.ts` | festivals entry in VERTICAL_CERT_TYPES with FREC 3 | VERIFIED | FREC 3 first in festivals array; getRecommendedCertTypes exported and used in profile page |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `app/treatment/new.tsx` | `enqueueSyncItem payload` | `buildVerticalExtraFields()` | WIRED | Lines 227-246 build JSON string; line 543 passes it as `vertical_extra_fields` in sync body |
| `app/treatment/new.tsx` | WatermelonDB `verticalExtraFields` | `treatment.update()` | WIRED | Line 511-516: `t.verticalExtraFields = extraFieldsJson` on completion |
| `riddor-detector/index.ts` | Non-detection for festivals | `NON_RIDDOR_VERTICALS.includes()` | WIRED | Line 96: early return with `detected: false` when effectiveVertical in NON_RIDDOR_VERTICALS |
| `event-incident-report-generator/index.ts` | PDF generation | `renderToBuffer(PurpleGuideDocument)` | WIRED | Lines 104-119: mapTreatmentToPurpleGuide then renderToBuffer with PurpleGuideDocument |
| `event-incident-report-generator/index.ts` | Storage upload | Supabase Storage `event-incident-reports` bucket | WIRED | Lines 124-130: `.from('event-incident-reports').upload(fileName, pdfBuffer)` |
| `EventIncidentReportCard.tsx` | Edge Function | `generateEventIncidentPDF` via useMutation | WIRED | Lines 22-32: useMutation calls generateEventIncidentPDF; success opens signed_url in new tab |
| `treatments/[id]/page.tsx` | `EventIncidentReportCard` | `treatment.event_vertical === 'festivals'` conditional | WIRED | Lines 227-230: `{treatment.event_vertical === 'festivals' && <EventIncidentReportCard treatmentId={treatment.id} />}` |
| `web/app/medic/profile/page.tsx` | `getRecommendedCertTypes` | `primaryVertical !== 'general'` guard | WIRED | Lines 290-315: renders recommended certs section only when non-general vertical; calls getRecommendedCertTypes(primaryVertical) |

---

### Requirements Coverage

| Requirement | Status | Notes |
|-------------|--------|-------|
| FEST-01: TST Triage Priority (P1/P2/P3/P4) picker in treatment form | SATISFIED | Picker + required validation + JSON payload write all verified |
| FEST-02: Alcohol/substance and safeguarding flags in treatment form | SATISFIED | Both toggles present and written to vertical_extra_fields |
| Festival attendee disposition (required) | SATISFIED | Picker + required validation verified |
| RIDDOR suppression for festivals vertical (mobile form) | SATISFIED | `orgVertical !== 'festivals'` guard on riddorFlagged setter |
| RIDDOR suppression for festivals vertical (Edge Function) | SATISFIED | NON_RIDDOR_VERTICALS early-return gate verified |
| VERTICAL_COMPLIANCE.festivals.riddorApplies = false | SATISFIED | Confirmed in vertical-compliance.ts |
| Purple Guide PDF generation (no 501 stub) | SATISFIED | Full renderToBuffer pipeline implemented |
| PurpleGuideDocument.tsx with all sections | SATISFIED | 6 PDF sections matching Purple Guide structure |
| purple-guide-mapping.ts with field mapping | SATISFIED | All 14 PurpleGuideData fields mapped from treatment record |
| event-incident-reports storage bucket migration | SATISFIED | Migration 125 creates bucket with 3 RLS policies |
| Web dashboard: Purple Guide download card (festivals only) | SATISFIED | EventIncidentReportCard conditionally rendered |
| Web dashboard: 'Attendee Information' heading for festivals | SATISFIED | Conditional at line 101 in treatments/[id]/page.tsx |
| Web dashboard: 'Venue' instead of 'Site' for festivals | SATISFIED | Separate conditionals at lines 128-147 — festivals shows 'Venue', others show 'Site' |
| Web dashboard: 'Event Organiser' instead of 'Client' for festivals | SATISFIED | Conditional at line 116 in treatments/[id]/page.tsx |
| Medic profile: festivals recommended certs including FREC 3 | SATISFIED | FREC 3 first in festivals VERTICAL_CERT_TYPES; getRecommendedCertTypes called in profile page |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `app/treatment/new.tsx` | 171 | `t.orgId = 'temp-org'` TODO comment | Warning | Pre-existing — not introduced by phase 20; does not affect festival fields |
| `app/treatment/new.tsx` | 172 | `t.medicId = 'temp-medic'` TODO comment | Warning | Pre-existing — not introduced by phase 20 |

No blockers found. The two TODOs are pre-existing stubs for auth context wiring, present before phase 20, and do not affect any of the festival vertical must-haves.

---

### Human Verification Required

The following items cannot be verified by static analysis alone:

#### 1. Festival PDF visual rendering

**Test:** Complete a treatment with orgVertical 'festivals', set P2 triage, alcohol flag ON, safeguarding OFF, disposition 'Transferred to hospital'. Open the web dashboard treatment detail page and click "Generate Event Incident Report".
**Expected:** A PDF opens in a new tab with a purple header, triage badge showing "P2 — Urgent (Yellow)" in amber, ALCOHOL/SUBSTANCE: YES badge highlighted, SAFEGUARDING: NO badge dim, and disposition "Transferred to hospital". Reference number and medic name are populated.
**Why human:** PDF visual rendering and field population from real treatment data cannot be verified from static code analysis.

#### 2. RIDDOR banner suppression in live use

**Test:** Open the treatment form with orgVertical 'festivals' (pass via URL param or set org vertical). Select a RIDDOR-reportable injury type (e.g., fracture).
**Expected:** The amber RIDDOR warning banner does NOT appear. No RIDDOR flag is set in the sync payload.
**Why human:** The actual mobile UI state transition requires a live device/simulator to confirm.

#### 3. Purple Guide PDF signed URL access control

**Test:** Generate a PDF for a festivals treatment. Copy the signed URL. Attempt to access it from a session belonging to a different org.
**Expected:** The signed URL should be valid for 7 days but the RLS policy on the bucket should prevent cross-org access via direct DB queries.
**Why human:** RLS policy correctness for storage objects requires a live Supabase instance with test data to verify.

---

### Summary

All 16 must-haves from plans 20-01 through 20-04 are VERIFIED against actual source code.

**Plan 20-01 (festival form fields):** All four festival-specific fields (triage priority, alcohol/substance toggle, safeguarding toggle, attendee disposition) exist in `app/treatment/new.tsx`, are guarded by `orgVertical === 'festivals'`, require completion before submission, and are serialised into the `vertical_extra_fields` JSON string in the sync payload. The RIDDOR banner is suppressed for the festivals vertical both in the mobile form and in the riddor-detector Edge Function.

**Plan 20-02 (compliance layer):** `NON_RIDDOR_VERTICALS` in `riddor-detector/index.ts` includes `'festivals'` as its first entry, triggering an early non-detection return. `VERTICAL_COMPLIANCE.festivals.riddorApplies` is `false` and `primaryFramework` is `'purple_guide'` in `vertical-compliance.ts`.

**Plan 20-03 (PDF generator):** The `event-incident-report-generator` Edge Function has a full `renderToBuffer` implementation (not a stub). `PurpleGuideDocument.tsx` is a complete 316-line @react-pdf/renderer Document. `purple-guide-mapping.ts` exports the `mapTreatmentToPurpleGuide` function mapping all 14 Purple Guide fields. Migration 125 creates the `event-incident-reports` storage bucket with appropriate RLS policies.

**Plan 20-04 (web dashboard):** `EventIncidentReportCard.tsx` exists with `'use client'` directive and is conditionally rendered in the treatments detail page only for festivals. The heading is 'Attendee Information' (not 'Worker Information') for festivals, the company label is 'Event Organiser' (not 'Client') for festivals, and the venue label is 'Venue' (not 'Site') for festivals. The medic profile page calls `getRecommendedCertTypes(primaryVertical)` and the festivals entry in `VERTICAL_CERT_TYPES` begins with 'FREC 3'.

The phase goal is achieved at the code level. Three human verification items are flagged for live-environment testing.

---

_Verified: 2026-02-18T04:32:07Z_
_Verifier: Claude (gsd-verifier)_
