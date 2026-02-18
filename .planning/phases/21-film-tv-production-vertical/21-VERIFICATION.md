---
phase: 21-film-tv-production-vertical
verified: 2026-02-18T04:02:38Z
status: passed
score: 10/10 must-haves verified
re_verification: false
---

# Phase 21: Film/TV Production Vertical Verification Report

**Phase Goal:** Medics on film and TV productions can log incidents with production-specific context fields. The existing RIDDOR pipeline continues to operate unchanged for crew members (who are workers under HSE). The app uses production terminology throughout, and the medic's cert profile reflects the Film/TV industry.
**Verified:** 2026-02-18T04:02:38Z
**Status:** PASSED
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Treatment form shows Production Title, Patient Role, SFX/Pyrotechnic toggle, and Scene/Shot Context when `orgVertical === 'tv_film'` | VERIFIED | `app/treatment/new.tsx` lines 447–487: full conditional JSX block with all 4 fields; Production Title TextInput, Patient Role BottomSheetPicker (9 roles incl. Cast and Stunt Performer), SFX Pressable toggle, Scene/Shot Context multiline TextInput |
| 2 | Film/TV fields are written to `verticalExtraFields` JSON string during auto-save and included in enqueueSyncItem payload | VERIFIED | `formValues.verticalExtraFields` (line 184): `orgVertical === 'tv_film' ? JSON.stringify({production_title, patient_role, sfx_involved, scene_context}) : null`; `fieldMapping.verticalExtraFields: 'vertical_extra_fields'` (line 203); `enqueueSyncItem` payload (line 361): `vertical_extra_fields: treatment.verticalExtraFields ?? null` |
| 3 | App displays "Cast & Crew" instead of "Worker", "Set" instead of "Site", "Production" instead of "Client" when Film/TV vertical is active | VERIFIED | `_layout.tsx` workers tab uses `personPluralLabel` ("Cast & Crew" for tv_film) and `registryLabel` ("Cast & Crew Registry"); `workers.tsx` empty state and Add button use `personPluralLabel`; `getLocationLabel('tv_film')` returns `'Set'`; `getEventLabel('tv_film')` returns `'Production'` in `vertical-outcome-labels.ts` |
| 4 | `treatment/[id].tsx` shows `{patientLabel} Information` instead of hardcoded "Worker Information" | VERIFIED | Line 237: `<Text style={styles.sectionTitle}>{patientLabel} Information</Text>` with `patientLabel = getPatientLabel(primaryVertical)` (line 50) |
| 5 | Crew member injury meeting RIDDOR criteria is flagged via the existing F2508 pipeline — `tv_film` routes to `riddor-f2508-generator` | VERIFIED | `web/lib/pdf/incident-report-dispatcher.ts` line 22: `tv_film: 'riddor-f2508-generator'` in `FUNCTION_BY_VERTICAL` map; no code change was needed — pipeline was already correct |
| 6 | Film/TV cert profile starts with HCPC Paramedic, ScreenSkills Production Safety Passport, FREC 4, EFR | VERIFIED | Mobile `certification-types.ts` line 144: `tv_film: ['HCPC Paramedic', 'ScreenSkills Production Safety Passport', 'FREC 4', 'EFR', ...]`; Web `certification.types.ts` lines 175–185: identical ordering |
| 7 | ScreenSkills Production Safety Passport and EFR exist in both mobile and web cert registries | VERIFIED | Mobile: `CERT_TYPES` array lines 67–68, `CERT_TYPE_INFO` lines 129–136; Web: `UK_CERT_TYPES` lines 75–76, `CERT_TYPE_METADATA` lines 146–156 |
| 8 | `getLocationLabel` and `getEventLabel` exported from `vertical-outcome-labels.ts` | VERIFIED | Lines 141 and 161 in `vertical-outcome-labels.ts`: both functions exported with full vertical-to-label maps; `tv_film` → `'Set'` and `'Production'` respectively |
| 9 | `_layout.tsx` imports `useOrg` and Workers tab uses dynamic `personPluralLabel` | VERIFIED | Lines 19, 22, 58–60: `useOrg()` destructures `primaryVertical`; `personPluralLabel` computed; Tabs.Screen `title`, `headerTitle`, `tabBarLabel` all use computed values (lines 124–126) |
| 10 | `workers.tsx` imports `useOrg` and user-facing strings use `personPluralLabel` | VERIFIED | Lines 30–31, 237: `useOrg()` inside `WorkersScreen`; `personPluralLabel` passed as prop into `WorkersList` (withObservables HOC); empty state (lines 178–183) and Add button (line 195) all use `personPluralLabel` dynamically |

**Score:** 10/10 truths verified

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `app/treatment/new.tsx` | Film/TV conditional form section with 4 fields | VERIFIED | 867 lines; `orgVertical === 'tv_film'` block lines 447–488; all 4 fields implemented with real TextInput/Pressable/BottomSheetPicker components |
| `services/taxonomy/certification-types.ts` | ScreenSkills and EFR in CERT_TYPES + CERT_TYPE_INFO; tv_film ordering starting with HCPC Paramedic | VERIFIED | 161 lines; both cert types in array (lines 67–68) and info record (lines 129–136); tv_film ordering line 144: HCPC first, ScreenSkills 2nd, FREC 4 3rd, EFR 4th |
| `web/types/certification.types.ts` | ScreenSkills and EFR in UK_CERT_TYPES + CERT_TYPE_METADATA; tv_film ordering mirrors mobile | VERIFIED | 421 lines; both cert types in array (lines 75–76) and metadata (lines 146–156); tv_film block lines 175–185 matches mobile ordering exactly |
| `services/taxonomy/vertical-outcome-labels.ts` | `getLocationLabel` and `getEventLabel` exported | VERIFIED | 176 lines; both functions at lines 141 and 161; `tv_film` → `'Set'` and `'Production'` |
| `app/(tabs)/_layout.tsx` | `useOrg` imported; Workers tab uses dynamic label | VERIFIED | 199 lines; `useOrg` imported (line 19); `personPluralLabel` and `registryLabel` computed (lines 59–60); Tabs.Screen uses both (lines 124–126) |
| `app/(tabs)/workers.tsx` | `useOrg` imported; dynamic labels throughout | VERIFIED | 331 lines; `useOrg` imported (line 30); `personPluralLabel` computed and passed as prop; empty state, Add button, and search all use dynamic label |
| `app/treatment/[id].tsx` | "Worker Information" replaced with `{patientLabel} Information` | VERIFIED | 537 lines; `useOrg` imported (line 38); `patientLabel` computed (line 50); section heading at line 237 uses template literal |
| `web/lib/pdf/incident-report-dispatcher.ts` | `tv_film` maps to `riddor-f2508-generator` | VERIFIED | 64 lines; `FUNCTION_BY_VERTICAL` at line 20: `tv_film: 'riddor-f2508-generator'` — no code modification was needed |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `app/treatment/new.tsx` (formValues) | `useAutoSave` (WatermelonDB `vertical_extra_fields` column) | `verticalExtraFields` in `formValues` + `fieldMapping` | WIRED | `formValues.verticalExtraFields` = JSON.stringify at line 184; `fieldMapping.verticalExtraFields: 'vertical_extra_fields'` at line 203; `useAutoSave(treatment, formValues, fieldMapping, 10000)` at line 206 |
| `app/treatment/new.tsx` (handleCompleteTreatment) | `enqueueSyncItem` payload | `vertical_extra_fields: treatment.verticalExtraFields ?? null` | WIRED | Line 361 in enqueueSyncItem payload; `treatment.verticalExtraFields` is the WatermelonDB field written by auto-save |
| `app/(tabs)/_layout.tsx` | `src/contexts/OrgContext.tsx` | `useOrg()` → `primaryVertical` | WIRED | Import at line 19; destructured at line 58; used to compute `personPluralLabel` and `registryLabel` at lines 59–60 |
| `services/taxonomy/vertical-outcome-labels.ts` (getPatientLabel) | `app/(tabs)/workers.tsx` | `getPatientLabel(primaryVertical)` → `personPluralLabel` prop | WIRED | Import at line 31; called at line 237; result passed as prop to `EnhancedWorkersList` at line 240 |
| `web/lib/pdf/incident-report-dispatcher.ts` | `riddor-f2508-generator` Supabase function | `FUNCTION_BY_VERTICAL['tv_film']` | WIRED | `tv_film: 'riddor-f2508-generator'` at line 22; `functionName` resolved at line 52; `supabase.functions.invoke(functionName, ...)` at line 58 |

---

## Requirements Coverage

| Requirement | Status | Supporting Truth |
|-------------|--------|-----------------|
| FILM-01: Production-specific context fields on treatment form | SATISFIED | Truth 1 — all 4 fields implemented and wired to verticalExtraFields |
| FILM-02: Film/TV terminology throughout (Cast & Crew, Set, Production) | SATISFIED | Truths 3, 4, 9, 10 — dynamic labels across all 7 screens |
| FILM-03: Film/TV cert profile shows HCPC, ScreenSkills, FREC 4, EFR at top | SATISFIED | Truths 6, 7 — ordering confirmed in both mobile and web registries |
| FILM-04: RIDDOR pipeline routes tv_film to F2508 unchanged | SATISFIED | Truth 5 — `incident-report-dispatcher.ts` confirmed; no code change was needed |

---

## Anti-Patterns Found

No blocker anti-patterns detected in Film/TV additions:

- No TODO/FIXME comments in new Film/TV conditional block
- No empty handlers (SFX toggle updates state; Patient Role picker calls setPatientRole)
- No placeholder text in functional sections
- `verticalExtraFields` is a real JSON.stringify call (not a stub return)
- `enqueueSyncItem` payload includes `vertical_extra_fields` from live WatermelonDB field

---

## Human Verification Required

### 1. Film/TV Form Section Renders Correctly

**Test:** Open the treatment form with a tv_film org active. Scroll between Section 1 (Patient) and Section 2 (Injury Details).
**Expected:** A "Production Details" section appears with Production Title text field, Patient Role picker button (shows "Select role..."), SFX/Pyrotechnic toggle (shows "No" by default with amber border when toggled to Yes), and Scene/Shot Context multiline text area.
**Why human:** Visual rendering and conditional display cannot be verified programmatically; requires the device/simulator with a tv_film org.

### 2. Cast & Crew Tab Label Active

**Test:** Log in as a medic on a Film/TV org. Check the bottom tab bar.
**Expected:** The Workers tab shows "Cast & Crew" label (not "Workers"). The screen header shows "Cast & Crew Registry".
**Why human:** Dynamic OrgContext value depends on a tv_film org being active in the database; cannot simulate without running the app.

### 3. RIDDOR Auto-Flag Works for Crew Member Injury

**Test:** Log a treatment for a crew member (e.g. fracture / amputation) that meets RIDDOR criteria.
**Expected:** The RIDDOR flag is raised (is_riddor_reportable = true) and the incident report dispatcher calls `riddor-f2508-generator`.
**Why human:** Requires end-to-end test with Supabase functions and a real F2508 generation attempt.

---

## Gaps Summary

No gaps. All 10 must-have truths verified against the actual codebase.

The phase achieved its stated goal:

1. Production-specific fields (Production Title, Patient Role with 9 crew options including Cast and Stunt Performer, SFX/Pyrotechnic Involved toggle, Scene/Shot Context) are conditionally rendered in `app/treatment/new.tsx` under `orgVertical === 'tv_film'`, and are wired to both WatermelonDB auto-save and the Supabase sync payload.

2. Film/TV terminology is applied dynamically across all affected screens using `useOrg()` + `getPatientLabel()` / explicit `'Cast & Crew'` override. No hardcoded "Worker", "Worker Registry", or "Worker Information" strings remain in user-facing UI in the verified screens.

3. The RIDDOR pipeline is unchanged — `incident-report-dispatcher.ts` already mapped `tv_film` to `riddor-f2508-generator` and required no modification.

4. The tv_film cert profile in both mobile and web registries now leads with HCPC Paramedic, ScreenSkills Production Safety Passport, FREC 4, and EFR. CSCS and IPAF are removed from the tv_film ordering but remain in the master cert type arrays for other verticals.

---

_Verified: 2026-02-18T04:02:38Z_
_Verifier: Claude (gsd-verifier)_
