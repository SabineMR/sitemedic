---
phase: 19-motorsport-vertical
verified: 2026-02-18T04:55:10Z
status: human_needed
score: 5/5 must-haves verified
re_verification:
  previous_status: gaps_found
  previous_score: 4/5
  gaps_closed:
    - "RIDDOR exclusion in mobile form now covers motorsport via getVerticalCompliance(orgVertical).riddorApplies"
    - "Dashboard RIDDOR badge now guards against non-RIDDOR verticals including motorsport"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Open a motorsport booking on the mobile app, select a RIDDOR-type injury (e.g. fracture), and confirm the RIDDOR warning banner does NOT appear"
    expected: "No yellow RIDDOR banner shown for any injury type when the booking vertical is motorsport"
    why_human: "Cannot verify UI rendering state programmatically; requires running the app with a motorsport booking"
  - test: "Complete a motorsport treatment with a fracture injury and check the web dashboard treatment row"
    expected: "No RIDDOR badge appears on the treatment row for the motorsport treatment"
    why_human: "Requires end-to-end treatment creation and sync to verify the dashboard column rendering in context"
  - test: "For a motorsport booking, open the booking detail page and click Generate Medical Statistics Sheet"
    expected: "PDF opens in new tab with the event's incident summary"
    why_human: "Edge Function invocation and PDF rendering cannot be verified without running the Supabase Edge Runtime"
  - test: "Trigger the RIDDOR detector against a motorsport treatment (call supabase.functions.invoke('riddor-detector', { body: { treatment_id: '...' } }))"
    expected: "Response: { detected: false, reason: 'RIDDOR does not apply to vertical: motorsport' }"
    why_human: "Edge function must be deployed and called against a live motorsport treatment record"
---

# Phase 19: Motorsport Vertical — Verification Report

**Phase Goal:** Medics at motorsport events can log incidents in a Motorsport UK-compliant format. A concussed competitor triggers a mandatory clearance workflow that cannot be bypassed. The event ends with an auto-generated Medical Statistics Sheet. The web dashboard shows uncleared concussion cases with a visible warning badge.

**Verified:** 2026-02-18T04:55:10Z
**Status:** human_needed
**Re-verification:** Yes — after gap closure (previous status: gaps_found, 4/5)

---

## Goal Achievement

### Observable Truths

| #  | Truth                                                                                          | Status      | Evidence                                                                                                                    |
|----|-----------------------------------------------------------------------------------------------|-------------|-----------------------------------------------------------------------------------------------------------------------------|
| 1  | A medic logging a motorsport incident sees all required MOTO-01 fields and cannot submit with concussion suspected unless all three clearance items are checked | VERIFIED | `app/treatment/new.tsx` lines 946-1112: GCS, extrication, helmet removed, circuit section, clerk of course notified, competitor car number all rendered. Concussion gate at lines 421-431 blocks submission unless hia_conducted, competitor_stood_down, and cmo_notified are all true |
| 2  | A motorsport treatment record does not produce a RIDDOR flag under any circumstance            | VERIFIED    | (1) Edge Function `supabase/functions/riddor-detector/index.ts` lines 75-81: NON_RIDDOR_VERTICALS includes 'motorsport', returns detected: false. (2) Mobile form `app/treatment/new.tsx` line 310: condition now reads `getVerticalCompliance(orgVertical).riddorApplies` — returns false for motorsport, RIDDOR banner will not fire. (3) Dashboard `web/components/dashboard/treatments-columns.tsx` lines 93-96: vertical guard `nonRiddorVerticals.includes(vertical)` suppresses RIDDOR badge for motorsport rows. |
| 3  | On the web dashboard, any motorsport head injury with no clearance record shows a "Concussion clearance required" badge until competitor_cleared_to_return is true | VERIFIED | `web/components/dashboard/treatments-columns.tsx` lines 98-117: reads event_vertical, checks concussion_suspected === true and competitor_cleared_to_return !== true, renders Badge variant="destructive" with correct text |
| 4  | At the end of a motorsport booking, an admin can generate a Medical Statistics Sheet PDF      | VERIFIED    | `supabase/functions/motorsport-stats-sheet-generator/index.ts` (174 lines): full implementation, fetches booking + treatments, calls mapBookingToStats(), renders PDF via @react-pdf/renderer, uploads to motorsport-reports bucket, returns signed URL. `web/app/admin/bookings/[id]/page.tsx` lines 297-319: conditional button renders only for event_vertical === 'motorsport', calls the Edge Function, opens signed URL |
| 5  | Medic cert profile when motorsport vertical is active shows Motorsport UK Medical Official Licence, HCPC Paramedic, and PHTLS at the top | VERIFIED | `services/taxonomy/certification-types.ts` line 179: VERTICAL_CERT_TYPES.motorsport = ['Motorsport UK Medical Official Licence', 'HCPC Paramedic', 'PHTLS', ...]. `web/types/certification.types.ts` lines 200-214: same ordering. `web/app/medic/profile/page.tsx` line 295: getRecommendedCertTypes(primaryVertical).slice(0, 6) renders top 6 for the org's vertical |

**Score:** 5/5 truths verified

---

## Gap Closure Verification

### Gap 1: RIDDOR exclusion in mobile form (CLOSED)

**Previous state:** `app/treatment/new.tsx` line 310 read `orgVertical !== 'festivals'` — motorsport was not excluded.

**Fix applied:** Line 310 now reads:

```ts
if (injuryType?.isRiddorReportable && getVerticalCompliance(orgVertical).riddorApplies) {
```

The function `getVerticalCompliance` is imported at line 44 from `../../services/taxonomy/vertical-compliance`. The motorsport entry in `vertical-compliance.ts` (line 141) has `riddorApplies: false`. For any non-RIDDOR vertical — including motorsport, festivals, sporting_events, fairs_shows, private_events — `getVerticalCompliance(orgVertical).riddorApplies` returns `false`, so the RIDDOR banner will never be set. This approach is more robust than the previous ad-hoc exclusion list: it automatically covers all future non-RIDDOR verticals without needing further code changes.

**Verification:** `getVerticalCompliance` import confirmed at `new.tsx` line 44. Call confirmed at line 310. `vertical-compliance.ts` motorsport entry confirmed at line 141 with `riddorApplies: false`.

### Gap 2: Dashboard RIDDOR badge vertical guard (CLOSED)

**Previous state:** `web/components/dashboard/treatments-columns.tsx` lines 89-97 rendered the RIDDOR badge from `is_riddor_reportable` with no vertical check.

**Fix applied:** Lines 93-96 now read:

```ts
const vertical = row.original.event_vertical;
// Never show RIDDOR badge for non-RIDDOR verticals (motorsport, festivals, football, etc.)
const nonRiddorVerticals = ['motorsport', 'festivals', 'sporting_events'];
if (!isRiddor || (vertical && nonRiddorVerticals.includes(vertical))) return null;
```

For any row with `event_vertical` in `['motorsport', 'festivals', 'sporting_events']`, the function returns `null` regardless of the `is_riddor_reportable` boolean value. A motorsport treatment row will never show a RIDDOR badge on the dashboard.

**Verification:** Lines 93-96 of `treatments-columns.tsx` confirmed correct. The `nonRiddorVerticals` array includes 'motorsport', 'festivals', and 'sporting_events'.

---

## Required Artifacts

| Artifact                                                              | Expected                                      | Status       | Details                                                                                          |
|-----------------------------------------------------------------------|-----------------------------------------------|--------------|--------------------------------------------------------------------------------------------------|
| `app/treatment/new.tsx`                                               | Motorsport form fields + concussion gate      | VERIFIED     | 1724+ lines; motorsport section at lines 946-1112; gate at lines 421-431; RIDDOR exclusion fixed at line 310 |
| `services/taxonomy/vertical-compliance.ts`                            | riddorApplies: false for motorsport           | VERIFIED     | 226 lines; motorsport entry at lines 136-148 has riddorApplies: false — used by new.tsx fix      |
| `services/taxonomy/motorsport-fields.ts`                              | MotorsportExtraFields interface + defaults    | VERIFIED     | 138 lines; full interface; INITIAL_MOTORSPORT_FIELDS default                                     |
| `supabase/functions/riddor-detector/index.ts`                         | Motorsport in NON_RIDDOR_VERTICALS            | VERIFIED     | 193 lines; NON_RIDDOR_VERTICALS array at lines 75-81 includes 'motorsport'                      |
| `web/components/dashboard/treatments-columns.tsx`                     | Concussion clearance badge + RIDDOR vertical guard | VERIFIED | 134 lines; motorsport_clearance column at lines 98-117; RIDDOR badge vertical guard at lines 93-96 |
| `supabase/functions/motorsport-stats-sheet-generator/index.ts`        | Full stats sheet generator (not 501)          | VERIFIED     | 174 lines; full implementation with DB fetch, PDF render, storage upload, signed URL            |
| `supabase/functions/motorsport-stats-sheet-generator/MotorsportStatsDocument.tsx` | PDF document component             | VERIFIED     | Exists; renders Document/Page/Text/View with stats data                                         |
| `supabase/functions/motorsport-stats-sheet-generator/stats-mapping.ts` | Aggregation of booking treatments           | VERIFIED     | 192 lines; mapBookingToStats() aggregates severity, concussion, extrication, GCS, incidents     |
| `supabase/functions/motorsport-incident-generator/index.ts`           | Full incident PDF generator (not 501)         | VERIFIED     | 167 lines; full implementation — fetches treatment, maps form, renders PDF                      |
| `web/app/admin/bookings/[id]/page.tsx`                                | Stats sheet button for motorsport bookings    | VERIFIED     | 338 lines; handleGenerateStatsSheet at lines 102-120; conditional button at lines 297-319       |
| `services/taxonomy/certification-types.ts`                            | Motorsport cert ordering at top               | VERIFIED     | 206 lines; VERTICAL_CERT_TYPES.motorsport = ['Motorsport UK Medical Official Licence', 'HCPC Paramedic', 'PHTLS', ...] |
| `web/types/certification.types.ts`                                    | Motorsport cert ordering at top               | VERIFIED     | Lines 200-214: same ordering as mobile cert types for motorsport vertical                       |

---

## Key Link Verification

| From                                          | To                                                   | Via                                          | Status   | Details                                                                                                 |
|-----------------------------------------------|------------------------------------------------------|----------------------------------------------|----------|---------------------------------------------------------------------------------------------------------|
| `app/treatment/new.tsx` concussion gate       | handleCompleteTreatment                              | if-block at lines 421-431                    | WIRED    | Gate fires before all other validation. Alert prevents navigation. Cannot be bypassed.                  |
| `app/treatment/new.tsx`                       | `services/taxonomy/motorsport-fields.ts`             | import at lines 47-49                        | WIRED    | MotorsportExtraFields, INITIAL_MOTORSPORT_FIELDS imported and used in state                             |
| `app/treatment/new.tsx` handleInjuryTypeSelect | `services/taxonomy/vertical-compliance.ts`          | getVerticalCompliance import at line 44, call at line 310 | WIRED | riddorApplies: false for motorsport — RIDDOR banner correctly suppressed |
| `web/components/dashboard/treatments-columns.tsx` | TreatmentWithWorker.event_vertical           | row.original.event_vertical at line 93       | WIRED    | nonRiddorVerticals guard correctly gates RIDDOR badge rendering                                         |
| `web/app/admin/bookings/[id]/page.tsx`        | `motorsport-stats-sheet-generator`                   | supabase.functions.invoke at line 106        | WIRED    | Called with booking_id, opens signed_url from response                                                  |
| `supabase/functions/motorsport-stats-sheet-generator/index.ts` | MotorsportStatsDocument.tsx | renderToBuffer + React.createElement at line 127-129 | WIRED | Document rendered from stats data                                                                 |
| `supabase/functions/riddor-detector/index.ts` | NON_RIDDOR_VERTICALS gate                            | includes() check at line 96                  | WIRED    | Edge function returns detected: false for motorsport                                                    |
| `web/app/medic/profile/page.tsx`              | `getRecommendedCertTypes`                            | import at line 17, call at line 295          | WIRED    | Reads primaryVertical from org context, renders top 6 certs for that vertical                           |

---

## Requirements Coverage

| Requirement | Status    | Blocking Issue                                                            |
|-------------|-----------|---------------------------------------------------------------------------|
| MOTO-01: Motorsport form fields (GCS, extrication, helmet, circuit, clerk, car number) | SATISFIED | All fields present and functional |
| MOTO-02: Concussion clearance gate (HIA, stood down, CMO) | SATISFIED | Hard return blocks submission unless all three checked |
| MOTO-03: Concussion alert in medic_alerts | SATISFIED | Lines 549-582 in new.tsx insert alert on completion |
| MOTO-04: RIDDOR does not apply to motorsport | SATISFIED | Edge Function gated; mobile form RIDDOR banner fixed; dashboard badge guarded |
| MOTO-02/Stats Sheet: PDF generation at booking end | SATISFIED | Full implementation in stats-sheet-generator Edge Function |
| Dashboard: concussion clearance badge visible | SATISFIED | motorsport_clearance column in treatments-columns.tsx |
| MOTO-06: Cert ordering: motorsport certs at top | SATISFIED | VERTICAL_CERT_TYPES.motorsport starts with Motorsport UK Medical Official Licence, HCPC Paramedic, PHTLS |

---

## Anti-Patterns Found

| File                           | Line | Pattern                                                      | Severity | Impact                                                                                                    |
|-------------------------------|------|--------------------------------------------------------------|----------|-----------------------------------------------------------------------------------------------------------|
| `app/treatment/new.tsx`       | 171  | `t.orgId = 'temp-org'; // TODO: Get from auth context`       | Warning  | Pre-existing across all verticals; does not affect motorsport functionality specifically                   |
| `app/treatment/new.tsx`       | 172  | `t.medicId = 'temp-medic'; // TODO: Get from auth context`   | Warning  | Pre-existing; non-blocking for treatment logging                                                          |
| `supabase/functions/motorsport-incident-generator/index.ts` | 121 | JSX syntax in a .ts file context | Warning | May require Deno JSX transform; could fail at runtime if JSX not configured for this function — pre-existing, unchanged by this fix |

No new anti-patterns introduced by the gap-fix commits. Both previously-flagged blockers are now resolved.

---

## Human Verification Required

### 1. RIDDOR banner suppression in motorsport booking (mobile)

**Test:** Open a motorsport booking on the mobile app, select a RIDDOR-type injury (e.g. fracture), and observe whether the RIDDOR warning banner appears.
**Expected:** No yellow RIDDOR banner shown for any injury type when the booking vertical is motorsport.
**Why human:** Cannot verify UI rendering state programmatically; requires running the app with a real motorsport booking context.

### 2. Dashboard RIDDOR badge absence for motorsport treatments

**Test:** Complete a motorsport treatment with a fracture injury and check the web dashboard treatment row.
**Expected:** No RIDDOR badge appears on the treatment row for the motorsport treatment, even if a RIDDOR-type injury was selected.
**Why human:** Requires end-to-end treatment creation and sync to verify the dashboard column rendering in context.

### 3. Medical Statistics Sheet PDF generation

**Test:** For a motorsport booking with at least one completed treatment, open the booking detail page and click "Generate Medical Statistics Sheet".
**Expected:** PDF opens in a new tab with the event's incident summary, competitor names, GCS scores, severity breakdown, and concussion count.
**Why human:** Edge Function invocation and PDF rendering cannot be verified without running the Supabase Edge Runtime against a live database.

### 4. RIDDOR detector Edge Function for motorsport treatment

**Test:** Invoke `supabase.functions.invoke('riddor-detector', { body: { treatment_id: '<motorsport-treatment-id>' } })`.
**Expected:** Response: `{ detected: false, reason: 'RIDDOR does not apply to vertical: motorsport' }`.
**Why human:** Edge function must be deployed and called against a live motorsport treatment record.

---

## Re-Verification Summary

The single gap from the initial verification has been fully resolved:

**Gap closed — RIDDOR exclusion (both layers):**

The original flaw was a narrow exclusion list (`orgVertical !== 'festivals'`) that missed motorsport and all other non-RIDDOR verticals. The fix replaces the ad-hoc string comparison with a policy lookup: `getVerticalCompliance(orgVertical).riddorApplies`. This reads from the authoritative `vertical-compliance.ts` compliance registry, which already carried `riddorApplies: false` for motorsport (and festivals, sporting_events, fairs_shows, private_events). The approach is extensible — any future non-RIDDOR vertical added to the compliance registry will automatically be excluded from the RIDDOR banner without additional code changes.

The dashboard fix adds a `nonRiddorVerticals` guard that prevents a RIDDOR badge from rendering for motorsport rows, defending against any historical records that might carry `is_riddor_reportable: true` incorrectly.

No regressions were found in any of the four previously-passing truths. All five truths are now verified at the structural level. Four human verification tests remain for runtime behaviour that cannot be confirmed by static analysis alone.

---

_Verified: 2026-02-18T04:55:10Z_
_Verifier: Claude (gsd-verifier)_
