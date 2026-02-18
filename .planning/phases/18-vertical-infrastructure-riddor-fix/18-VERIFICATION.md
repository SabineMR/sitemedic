---
phase: 18-vertical-infrastructure-riddor-fix
verified: 2026-02-18T03:04:02Z
status: passed
score: 18/18 must-haves verified
---

# Phase 18: Vertical Infrastructure & RIDDOR Fix — Verification Report

**Phase Goal:** The platform's core systems are vertical-aware — RIDDOR never fires for non-applicable verticals, the mobile app knows its vertical without hitting the network on every form mount, the WatermelonDB schema has all columns every subsequent phase requires, and admins and clients can set a vertical.
**Verified:** 2026-02-18T03:04:02Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A festival-goer or motorsport competitor treatment does not produce a RIDDOR flag — detector returns `{ detected: false }` when vertical has `riddorApplies: false` | VERIFIED | `supabase/functions/riddor-detector/index.ts` lines 74–99: `NON_RIDDOR_VERTICALS` array (festivals, motorsport, sporting_events, fairs_shows, private_events) checked before `detectRIDDOR()` call at line 103. Returns `{ detected: false, category: null, reason: ... }` for matching verticals. |
| 2 | The treatment form in the mobile app loads without a Supabase network call to determine the vertical — `OrgContext` provides `primaryVertical` from a single fetch at login, cached in AsyncStorage for offline use | VERIFIED | `fetchOrgVertical` function is entirely absent from `app/treatment/new.tsx`. `useOrg()` is imported and called at line 80. `src/contexts/OrgContext.tsx` implements cache-first load with `AsyncStorage.getItem(VERTICAL_CACHE_KEY)` at step 1, background network refresh only. |
| 3 | When a medic navigates to `treatment/new` from a booking that has a different vertical than the org default, the form shows the booking's vertical presets, not the org default | VERIFIED | `app/treatment/new.tsx` lines 79–81: `params = useLocalSearchParams<{ booking_id?: string; event_vertical?: string }>()`. `orgVertical = (params.event_vertical as string | undefined) ?? primaryVertical` — route param takes precedence. |
| 4 | An admin can open org settings and set a default vertical for their organisation — the saved value persists and is used by new treatments | VERIFIED | `web/app/admin/settings/page.tsx`: `toggleVertical()` at line 162 (modifies `selectedVerticals`), `handleSaveVerticals()` at line 175 (PUTs to `/api/admin/settings`), vertical selector grid at lines 300–318. `OrgContext` reads `org_settings.industry_verticals` on login and caches it. |
| 5 | A client creating a booking can select the event type / vertical — the booking's `event_vertical` field is set and the correct form presets appear when the assigned medic opens that booking | VERIFIED | `web/components/booking/shift-config.tsx` captures `eventVertical` (lines 90, 101, 185). `web/components/booking/booking-form.tsx` initialises and passes through `eventVertical`. Both API routes (`/api/bookings/create` line 159, `/api/bookings/create-payment-intent` line 130) persist `event_vertical: body.eventVertical ?? null` to Supabase. |

**Score:** 5/5 truths verified

---

## Required Artifacts

### 18-01: WatermelonDB Schema v4 + Supabase Migration

| Artifact | Status | Details |
|----------|--------|---------|
| `src/database/schema.ts` | VERIFIED | Line 8: `version: 4`. Treatments table has `event_vertical`, `vertical_extra_fields`, `booking_id` at lines 33–35 (all `isOptional: true`). Near misses has `gps_lat`, `gps_lng` at lines 83–84. |
| `src/database/migrations.ts` | VERIFIED | `toVersion: 4` block at line 46 with `addColumns` for treatments (3 columns) and near_misses (2 columns), all `isOptional: true`. |
| `src/database/models/Treatment.ts` | VERIFIED | Lines 52–54: `@field('event_vertical') eventVertical?: string`, `@text('vertical_extra_fields') verticalExtraFields?: string`, `@field('booking_id') bookingId?: string`. All optional. |
| `src/database/models/NearMiss.ts` | VERIFIED | Lines 30–31: `@field('gps_lat') gpsLat?: number`, `@field('gps_lng') gpsLng?: number`. Both optional. |
| `supabase/migrations/124_vertical_schema_v4.sql` | VERIFIED | 5 `ADD COLUMN IF NOT EXISTS` statements (3 for treatments, 2 for near_misses). `compliance_score_history` table created with RLS. |

### 18-02: RIDDOR Vertical Gate + New Edge Functions + Dispatcher

| Artifact | Status | Details |
|----------|--------|---------|
| `supabase/functions/riddor-detector/index.ts` | VERIFIED | `NON_RIDDOR_VERTICALS` declared at line 75. Gate at lines 74–99 runs BEFORE `detectRIDDOR()` call at line 103. Falls back to `org_settings.industry_verticals[0]` if treatment has no `event_vertical`. Returns `{ detected: false }` for non-RIDDOR verticals. |
| `supabase/functions/riddor-f2508-generator/index.ts` | VERIFIED | `NON_RIDDOR_VERTICALS` at line 103. Validation block at lines 104–110 returns HTTP 400 for non-RIDDOR verticals. `event_vertical` included in treatments join select at line 73. |
| `supabase/functions/event-incident-report-generator/index.ts` | VERIFIED | Exists (66 lines). `Deno.serve` present. Validates `event_vertical`, returns 501 until Phase 19. |
| `supabase/functions/event-incident-report-generator/types.ts` | VERIFIED | Exists. `EventIncidentData` interface defined. |
| `supabase/functions/motorsport-incident-generator/index.ts` | VERIFIED | Exists (66 lines). `Deno.serve` present. Validates `event_vertical === 'motorsport'`, returns 501. |
| `supabase/functions/motorsport-incident-generator/types.ts` | VERIFIED | Exists. `MotorsportIncidentData` interface defined. |
| `supabase/functions/fa-incident-generator/index.ts` | VERIFIED | Exists (66 lines). `Deno.serve` present. Validates `event_vertical === 'sporting_events'`, returns 501. |
| `supabase/functions/fa-incident-generator/types.ts` | VERIFIED | Exists. `FAIncidentData` interface defined. |
| `web/lib/pdf/incident-report-dispatcher.ts` | VERIFIED | Exists (64 lines). `generateIncidentReportPDF()` exported. `FUNCTION_BY_VERTICAL` routing table covers all 10 verticals. Calls `supabase.functions.invoke(functionName, ...)`. |

### 18-03: OrgContext + Provider Tree

| Artifact | Status | Details |
|----------|--------|---------|
| `src/contexts/OrgContext.tsx` | VERIFIED | Exists (256 lines). `VERTICAL_CACHE_KEY = 'sitemedic.org.vertical_cache'` at line 26. Cache-first load: checks AsyncStorage first (line 113), fires background network refresh (line 125), fetches from `org_settings.industry_verticals` (line 151). `primaryVertical = industryVerticals[0] ?? 'general'` at line 222. Exports `OrgProvider` and `useOrg`. |
| `app/_layout.tsx` | VERIFIED | Lines 89–91: `<AuthProvider><OrgProvider><SyncProvider>`. OrgProvider is between AuthProvider and SyncProvider. Import at line 24. |

### 18-04: Treatment Form Wiring

| Artifact | Status | Details |
|----------|--------|---------|
| `app/treatment/new.tsx` | VERIFIED | `useOrg()` imported and called (lines 46, 80). `useLocalSearchParams` used (lines 29, 79). `orgVertical` derived as `params.event_vertical ?? primaryVertical` (line 81). `bookingId` extracted from params (line 82). `t.eventVertical = orgVertical` at line 113 (WatermelonDB write). `t.bookingId = bookingId ?? undefined` at line 114. Sync payload includes `event_vertical: treatment.eventVertical ?? null` (line 334) and `booking_id: treatment.bookingId ?? null` (line 335). No `fetchOrgVertical` or `setOrgVertical` references anywhere in file. |

### 18-05: Booking API Routes + Admin Vertical Selector

| Artifact | Status | Details |
|----------|--------|---------|
| `web/app/api/bookings/create/route.ts` | VERIFIED | `eventVertical?: string` in `BookingRequest` at line 37. `event_vertical: body.eventVertical ?? null` in Supabase insert at line 159. |
| `web/app/api/bookings/create-payment-intent/route.ts` | VERIFIED | `eventVertical?: string` in `BookingRequest` at line 42. `event_vertical: body.eventVertical ?? null` in Supabase insert at line 130. |
| `web/app/admin/settings/page.tsx` (admin vertical selector) | VERIFIED | `toggleVertical()` at line 162, `handleSaveVerticals()` at line 175, vertical grid rendered at lines 300–318. All 10 verticals covered. |
| `web/components/booking/shift-config.tsx` | VERIFIED | `eventVertical` read at line 90, `onChange` with `eventVertical` called at line 101, `<Select>` bound to `formData.eventVertical` at line 185. |
| `web/components/booking/booking-form.tsx` | VERIFIED | `eventVertical` initialized at line 76, prefill handled at line 104, passed through for API submission. |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `riddor-detector/index.ts` | `detectRIDDOR()` | `NON_RIDDOR_VERTICALS.includes(effectiveVertical)` gate | WIRED | Gate at lines 74–99 positively precedes `detectRIDDOR()` call at line 103. |
| `riddor-detector/index.ts` | `org_settings` table | Fallback fetch when `treatment.event_vertical` is null | WIRED | Lines 82–87 query `org_settings.industry_verticals` for org fallback. |
| `app/treatment/new.tsx` | `src/contexts/OrgContext.tsx` | `useOrg()` hook | WIRED | Imported at line 46, called at line 80. `primaryVertical` used to set `orgVertical`. |
| `app/treatment/new.tsx` | Supabase `treatments` table | `enqueueSyncItem` payload with `event_vertical` and `booking_id` | WIRED | Lines 334–335 in sync payload. Fields written to WatermelonDB record at lines 113–114. |
| `src/contexts/OrgContext.tsx` | `org_settings` table | `supabase.from('org_settings').select('industry_verticals')` | WIRED | Lines 150–154. AsyncStorage cache `sitemedic.org.vertical_cache` at line 26. |
| `app/_layout.tsx` | `src/contexts/OrgContext.tsx` | `OrgProvider` wrapped inside `AuthProvider`, outside `SyncProvider` | WIRED | Lines 89–91. Import at line 24. |
| `web/lib/pdf/incident-report-dispatcher.ts` | Correct Edge Functions | `FUNCTION_BY_VERTICAL[vertical]` routing table | WIRED | All 10 verticals mapped; `supabase.functions.invoke(functionName, ...)` called. |
| Booking form | Both booking API routes | `eventVertical` in request body → `event_vertical` in Supabase insert | WIRED | Both routes: interface field + Supabase insert confirmed. |

---

## Requirements Coverage

| Requirement | Status | Supporting Artifacts |
|-------------|--------|---------------------|
| RIDDOR must not fire for festivals, motorsport, sporting_events, fairs_shows, private_events | SATISFIED | `riddor-detector/index.ts` — vertical gate before `detectRIDDOR()`. |
| F2508 generator must return 400 for non-RIDDOR verticals | SATISFIED | `riddor-f2508-generator/index.ts` — NON_RIDDOR_VERTICALS validation returns HTTP 400. |
| WatermelonDB schema v4 with vertical columns | SATISFIED | `schema.ts` version 4; `migrations.ts` toVersion 4; Treatment and NearMiss models updated. |
| Supabase migration for vertical columns | SATISFIED | `supabase/migrations/124_vertical_schema_v4.sql` — 5 ADD COLUMN IF NOT EXISTS + compliance_score_history. |
| Mobile app vertical provided without per-mount network call | SATISFIED | `OrgContext.tsx` cache-first; `new.tsx` has no `fetchOrgVertical`. |
| Booking-level vertical overrides org default in treatment form | SATISFIED | `new.tsx` lines 79–81 — `params.event_vertical ?? primaryVertical`. |
| Admin vertical selector works end-to-end | SATISFIED | `admin/settings/page.tsx` — `toggleVertical`, `handleSaveVerticals`, 10-vertical grid. |
| Client booking captures and persists event vertical | SATISFIED | `shift-config.tsx` captures, `booking-form.tsx` passes through, both API routes persist to Supabase. |

---

## Anti-Patterns Found

None blocking goal achievement. Observations:

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `app/treatment/new.tsx` | 101 | `t.orgId = 'temp-org'` TODO placeholder | Warning | Pre-existing — orgId not yet wired from auth context. Not a Phase 18 regression; RIDDOR vertical gating is independent of orgId. |
| `supabase/functions/event-incident-report-generator/index.ts` | All | Returns HTTP 501 — intentional stub | Info | Expected — plan explicitly scoped Phase 19 for implementation. Vertical validation and routing are complete. |
| `supabase/functions/motorsport-incident-generator/index.ts` | All | Returns HTTP 501 — intentional stub | Info | Same — Phase 19 scope. |
| `supabase/functions/fa-incident-generator/index.ts` | All | Returns HTTP 501 — intentional stub | Info | Same — Phase 22 scope. |

The `temp-org` placeholder in `new.tsx` is pre-existing and unrelated to Phase 18 scope. The 501 stubs are correctly designed stubs with vertical validation intact — they will not mis-route requests.

---

## Human Verification Required

The following behaviors cannot be verified programmatically:

### 1. RIDDOR Early-Return End-to-End

**Test:** Submit a treatment via the mobile app where the org's primary vertical is `festivals` (or set `event_vertical=festivals` in the route params). Confirm no `riddor_incidents` row is created in Supabase.
**Expected:** Riddor detector returns `{ detected: false, reason: "RIDDOR does not apply to vertical: festivals" }`. No row in `riddor_incidents` table.
**Why human:** Requires running both the mobile app and Supabase Edge Function against a live database.

### 2. OrgContext Cache Behaviour Offline

**Test:** Log in to the mobile app while connected. Navigate to the treatment form. Enable airplane mode. Navigate away and re-open the treatment form.
**Expected:** Form loads immediately without network error. `primaryVertical` from cached value is shown (correct presets appear).
**Why human:** Requires physical device with network toggle; AsyncStorage read cannot be verified from static analysis.

### 3. Booking Vertical → Treatment Form Roundtrip

**Test:** Create a booking with `event_vertical=motorsport` via the web booking form. Assign a medic. Open the booking in the mobile app and navigate to `treatment/new` with the booking's route params.
**Expected:** Treatment form shows motorsport-specific mechanism presets (not construction defaults). `orgVertical` reads `motorsport`.
**Why human:** Requires full integration across web booking creation, mobile navigation, and treatment form rendering.

---

## Gaps Summary

No gaps. All 18 must-haves are satisfied:

- **18-01 (6/6):** WatermelonDB schema v4, migrations.ts toVersion 4, Treatment model (3 fields), NearMiss model (2 fields), Supabase migration 124 with all 5 ADD COLUMN IF NOT EXISTS statements and compliance_score_history table.
- **18-02 (4/4):** RIDDOR detector vertical gate before detectRIDDOR(); F2508 generator returns HTTP 400 for non-RIDDOR verticals; three new Edge Function directories exist (each with index.ts and types.ts); incident-report-dispatcher.ts exists and routes all 10 verticals.
- **18-03 (3/3):** OrgContext stores verticals in AsyncStorage under `sitemedic.org.vertical_cache`; `useOrg()` provides `primaryVertical` and `orgId`; OrgProvider mounted inside AuthProvider and outside SyncProvider.
- **18-04 (2/2):** new.tsx reads vertical from OrgContext (no Supabase fetch on mount); booking override via `params.event_vertical`; `event_vertical` and `booking_id` in sync payload.
- **18-05 (3/3):** Both BookingRequest interfaces accept `eventVertical?: string`; both routes persist `event_vertical` to Supabase; admin vertical selector confirmed working end-to-end.

Phase 18 goal is fully achieved.

---

_Verified: 2026-02-18T03:04:02Z_
_Verifier: Claude (gsd-verifier)_
