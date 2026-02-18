---
phase: 23-analytics-heat-maps-and-trend-charts
verified: 2026-02-18T06:45:00Z
status: passed
score: 8/8 must-haves verified
re_verification:
  previous_status: passed
  previous_score: 6/6
  gaps_closed:
    - "MOTO-07: Dashboard treatment detail page now shows MotorsportIncidentReportCard for motorsport treatments"
    - "Flow 3: Mobile treatment form now shows 'Competitor cleared to return to race' checkbox for all motorsport treatments"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Navigate to /analytics/heat-map as a site manager and confirm CircleMarker heat map renders with severity legend"
    expected: "Map loads centred on UK (zoom 6), markers appear for near-misses with GPS data, legend shows low/medium/high/critical severity rings, empty state message appears if no GPS data exists"
    why_human: "Requires authenticated dashboard session and real or seed near-miss data; map rendering and auto-fit-bounds cannot be verified structurally"
  - test: "Navigate to /analytics/compliance as a site manager and confirm both charts render"
    expected: "Compliance Score Trend shows a line chart (0-100 Y axis, amber/red reference lines at 70/40); Incident Frequency shows area chart with two series (Treatments blue, Near-Misses amber)"
    why_human: "Empty state is the likely initial state — requires weekly report to have run at least once to populate compliance_score_history; chart rendering requires browser"
  - test: "Open /admin/analytics, click the Heat Map tab, confirm cross-org near-miss map renders"
    expected: "Map shows incidents from all orgs; each org has a distinct colour from the 8-colour palette; dual legend shows org colour dots and severity size circles; popup shows org name, category, severity, date"
    why_human: "Requires platform admin session and data from multiple orgs; org colour determinism and popup content must be visually confirmed"
  - test: "Open /admin/analytics, click the Compliance tab, confirm aggregate trend chart and org ranking table render"
    expected: "ComposedChart shows avg score line with min/max shaded band; OrgComplianceTable shows all orgs ranked best-to-worst with green accent on top-5 and red accent on bottom-5; trend arrows visible"
    why_human: "Requires compliance_score_history data from multiple orgs (populated by generate-weekly-report runs); chart rendering and table accent colours require visual confirmation"
  - test: "Trigger generate-weekly-report Edge Function and confirm compliance_score_history receives a row"
    expected: "Row inserted with numeric score 0-100, vertical='general', formula_version='v1' in details JSONB, correct period_start/period_end, non-blocking (PDF still generated if upsert fails)"
    why_human: "Requires invoking the Supabase Edge Function and querying the database; compliance_score_history table state depends on runtime environment"
  - test: "Open a motorsport treatment detail page on the dashboard and verify the Motorsport UK Accident Form card is visible"
    expected: "Card appears with 'Motorsport UK — Accident Form' title, 'Generate Motorsport Incident Report' button, and footer disclaimer. Clicking the button shows 'Generating PDF...' while the Edge Function runs, then opens a signed PDF URL in a new tab on success."
    why_human: "Requires a motorsport treatment record in the database and an authenticated dashboard session; Edge Function invocation and signed URL response cannot be verified structurally"
  - test: "Open the mobile treatment form for a motorsport org and verify the competitor clearance checkbox appears"
    expected: "A '[ ] Competitor cleared to return to race' checkbox appears in the motorsport section regardless of whether 'Concussion Suspected' is toggled. Tapping it changes to '[X] Competitor cleared to return to race'. Saving the treatment includes competitor_cleared_to_return=true in vertical_extra_fields JSON."
    why_human: "Requires a physical or simulated motorsport-vertical org on the mobile app; runtime toggle behaviour and payload persistence must be confirmed in a live session"
---

# Phase 23: Analytics Heat Maps and Trend Charts Verification Report

**Phase Goal:** Site managers can see where near-misses are geographically clustering on a heat map. Compliance trends over time are visible as line charts on the org dashboard. Platform admins can compare compliance performance across all orgs. All charts read from properly structured history tables populated by existing background processes. Gap closure plans 23-06 (Motorsport Incident Report Card) and 23-07 (Competitor Clearance UI Toggle) address the two remaining gaps from the initial phase.
**Verified:** 2026-02-18T06:45:00Z
**Status:** PASSED
**Re-verification:** Yes — after gap closure (plans 23-06 and 23-07)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Site manager can view a Leaflet heat map of near-miss incidents with GPS-clustered severity-coded CircleMarkers | VERIFIED | `NearMissHeatMap.tsx` (216 lines): CircleMarker from react-leaflet, `useNearMissGeoData` hook, severity radius/colour config, MapBoundsAdjuster, SeverityLegend all present and wired. Page at `web/app/(dashboard)/analytics/heat-map/page.tsx` dynamically imports with `ssr: false`. |
| 2 | Platform admin can view an aggregate near-miss heat map across all orgs, colour-coded by org | VERIFIED | `AdminNearMissHeatMap.tsx` (300 lines): `useAdminNearMissGeoData` hook, org colour from `orgColorMap`, dual legend (org colours + severity sizes), CircleMarker per point. Wired in `/admin/analytics` page as 8th tab with `ssr: false` dynamic import. |
| 3 | Compliance scores are persisted automatically each week when generate-weekly-report runs | VERIFIED | `generate-weekly-report/index.tsx` lines 167-204: formula v1 numeric score (100 − penalties), upsert to `compliance_score_history` with `onConflict: 'org_id,vertical,period_start'`, non-blocking (error logged, execution continues). Migration 130 provides the UNIQUE index enabling idempotent upserts. |
| 4 | Site manager can view a compliance score trend chart showing last 12 months of weekly scores | VERIFIED | `ComplianceScoreChart.tsx` (98 lines): `LineChart` with `useComplianceHistory` hook, Y-axis 0-100, amber/red ReferenceLine thresholds at 70/40. Wired in `analytics/compliance/page.tsx` via `dynamic({ ssr: false })`. |
| 5 | Site manager can view an incident frequency trend chart showing treatment + near-miss counts per week | VERIFIED | `IncidentFrequencyChart.tsx` (85 lines): `AreaChart` with `useIncidentFrequency` hook, two Area series (treatments=blue, near-misses=amber), weekly bucketing via date-fns `startOfWeek`. Wired on same compliance page. |
| 6 | Platform admin can view aggregate compliance trends and identify top/bottom performing orgs | VERIFIED | `AdminComplianceTrend.tsx` (174 lines): `ComposedChart` with `Line` (avg) + two `Area` elements (min/max band). `OrgComplianceTable.tsx` (149 lines): full ranked table with green top-5 / red bottom-5 accents and ArrowUp/ArrowDown/Minus trend icons. Both wired in admin analytics Compliance tab (9th tab). |
| 7 | Dashboard treatment detail page shows a Motorsport UK Accident Form download card when event_vertical === 'motorsport' | VERIFIED | `web/components/dashboard/MotorsportIncidentReportCard.tsx` (64 lines): `'use client'`, useMutation, FileText icon, CardTitle "Motorsport UK — Accident Form", spinner state "Generating PDF...", window.open signed_url on success, alert on error. `web/app/(dashboard)/treatments/[id]/page.tsx` line 20 imports the component; lines 239-242 conditionally render when `event_vertical === 'motorsport'`. |
| 8 | Mobile treatment form shows a 'Competitor cleared to return to race' checkbox for all motorsport treatments, wired via toggleMotorsportBool and included in save payload | VERIFIED | `app/treatment/new.tsx` lines 1112-1127: Pressable checkbox with MOTO-07 comment, outside `concussion_suspected` gate (which closes at line 1110). `onPress={() => toggleMotorsportBool('competitor_cleared_to_return')}` confirmed at line 1118. `buildVerticalExtraFields()` at line 227-230 does `JSON.stringify(motorsportFields)` which covers the field automatically. Concussion gate (lines 421-431) checks ONLY `hia_conducted`, `competitor_stood_down`, `cmo_notified` — no reference to `competitor_cleared_to_return`. |

**Score:** 8/8 truths verified

---

### Required Artifacts

| Artifact | Lines | Exists | Substantive | Wired | Status |
|----------|-------|--------|-------------|-------|--------|
| `supabase/migrations/130_compliance_score_history_index_and_rls.sql` | 32 | YES | YES (DROP INDEX + UNIQUE INDEX + RLS policy) | N/A (migration) | VERIFIED |
| `supabase/functions/generate-weekly-report/index.tsx` | 328 | YES | YES (full upsert block lines 167-204) | YES (upserts to compliance_score_history) | VERIFIED |
| `web/lib/queries/analytics/near-miss-geo.ts` | 176 | YES | YES (2 hooks: useNearMissGeoData + useAdminNearMissGeoData) | YES (imported by NearMissHeatMap + AdminNearMissHeatMap) | VERIFIED |
| `web/lib/queries/analytics/compliance-history.ts` | 304 | YES | YES (4 hooks: useComplianceHistory + useIncidentFrequency + useAdminComplianceTrend + useOrgComplianceRanking) | YES (imported by chart components) | VERIFIED |
| `web/components/analytics/NearMissHeatMap.tsx` | 216 | YES | YES (CircleMarker map, severity config, MapBoundsAdjuster, SeverityLegend, loading/empty states) | YES (imported by heat-map page via dynamic) | VERIFIED |
| `web/components/analytics/AnalyticsSubNav.tsx` | 41 | YES | YES (two tab links with pathname-based active state) | YES (imported by both analytics pages) | VERIFIED |
| `web/app/(dashboard)/analytics/heat-map/page.tsx` | 44 | YES | YES (dynamic NearMissHeatMap, ssr:false, AnalyticsSubNav rendered) | YES (accessible to dashboard users) | VERIFIED |
| `web/components/analytics/AdminNearMissHeatMap.tsx` | 300 | YES | YES (org-colour-coded CircleMarkers, dual legend, MapBoundsAdjuster, loading/empty states) | YES (imported by admin analytics page via dynamic) | VERIFIED |
| `web/components/analytics/ComplianceScoreChart.tsx` | 98 | YES | YES (LineChart, Y-axis 0-100, amber/red ReferenceLine thresholds) | YES (imported by compliance page via dynamic) | VERIFIED |
| `web/components/analytics/IncidentFrequencyChart.tsx` | 85 | YES | YES (AreaChart, two Area series, weekly bucketing) | YES (imported by compliance page via dynamic) | VERIFIED |
| `web/app/(dashboard)/analytics/compliance/page.tsx` | 75 | YES | YES (both charts dynamically imported, AnalyticsSubNav rendered, dark theme) | YES (accessible to dashboard users) | VERIFIED |
| `web/components/analytics/AdminComplianceTrend.tsx` | 174 | YES | YES (ComposedChart with Line + two Area elements for min/max band, custom tooltip) | YES (imported by admin analytics page via dynamic) | VERIFIED |
| `web/components/analytics/OrgComplianceTable.tsx` | 149 | YES | YES (full ranked table, top-5 green/bottom-5 red accents, trend arrows from lucide) | YES (imported by admin analytics page via dynamic) | VERIFIED |
| `web/components/dashboard/DashboardNav.tsx` | — | YES | YES (BarChart3 icon imported, Analytics nav item added, isActive for /analytics/* prefix) | YES (rendered in sidebar for all dashboard users) | VERIFIED |
| `web/app/admin/analytics/page.tsx` | 579 | YES | YES (9 tabs: 7 original + Heat Map + Compliance; both wired with dynamic ssr:false) | YES (accessible to platform admins) | VERIFIED |
| `web/lib/queries/motorsport-incidents.ts` | 45 | YES | YES (exports `generateMotorsportIncidentPDF`, POSTs `{ incident_id, event_vertical: 'motorsport' }` to `/functions/v1/motorsport-incident-generator`, returns `{ success, pdf_path, signed_url }`) | YES (imported by MotorsportIncidentReportCard) | VERIFIED |
| `web/components/dashboard/MotorsportIncidentReportCard.tsx` | 64 | YES | YES (`'use client'`, useMutation, FileText icon, spinner state, window.open on success, alert on error, correct card copy) | YES (imported and conditionally rendered in treatments/[id]/page.tsx) | VERIFIED |
| `app/treatment/new.tsx` (competitor_cleared_to_return checkbox) | — | YES | YES (Pressable checkbox with toggleMotorsportBool at line 1118, outside concussion gate, 4 field references) | YES (motorsportFields state flows through JSON.stringify into vertical_extra_fields payload) | VERIFIED |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `heat-map/page.tsx` | `NearMissHeatMap.tsx` | `dynamic(() => import(...), { ssr: false })` | WIRED | Line 16-24: dynamic import confirmed |
| `NearMissHeatMap.tsx` | `near-miss-geo.ts` | `useNearMissGeoData()` hook | WIRED | Lines 24, 194: imported and called |
| `compliance/page.tsx` | `ComplianceScoreChart.tsx` | `dynamic(() => import(...).then(m => ({ default: m.ComplianceScoreChart })), { ssr: false })` | WIRED | Lines 16-25 |
| `compliance/page.tsx` | `IncidentFrequencyChart.tsx` | `dynamic(...), { ssr: false }` | WIRED | Lines 27-36 |
| `ComplianceScoreChart.tsx` | `compliance-history.ts` | `useComplianceHistory()` | WIRED | Lines 23, 26: imported and called |
| `IncidentFrequencyChart.tsx` | `compliance-history.ts` | `useIncidentFrequency()` | WIRED | Lines 23, 26: imported and called |
| `heat-map/page.tsx` | `AnalyticsSubNav.tsx` | `import { AnalyticsSubNav }` | WIRED | Line 14, rendered at line 36 |
| `compliance/page.tsx` | `AnalyticsSubNav.tsx` | `import { AnalyticsSubNav }` | WIRED | Line 14, rendered at line 50 |
| `admin/analytics/page.tsx` | `AdminNearMissHeatMap.tsx` | `dynamic(() => import(...), { ssr: false })` | WIRED | Lines 34-37 |
| `AdminNearMissHeatMap.tsx` | `near-miss-geo.ts` | `useAdminNearMissGeoData()` | WIRED | Lines 23-25, 275: imported and called |
| `admin/analytics/page.tsx` | `AdminComplianceTrend.tsx` | `dynamic(...).then(m => ({ default: m.AdminComplianceTrend }))` | WIRED | Lines 39-42 |
| `admin/analytics/page.tsx` | `OrgComplianceTable.tsx` | `dynamic(...).then(m => ({ default: m.OrgComplianceTable }))` | WIRED | Lines 44-47 |
| `AdminComplianceTrend.tsx` | `compliance-history.ts` | `useAdminComplianceTrend()` | WIRED | Lines 23, 100: imported and called |
| `OrgComplianceTable.tsx` | `compliance-history.ts` | `useOrgComplianceRanking()` | WIRED | Lines 14-15, 44: imported and called |
| `generate-weekly-report/index.tsx` | `compliance_score_history` | `supabase.from('compliance_score_history').upsert(...)` | WIRED | Lines 180-198: upsert with onConflict confirmed |
| `DashboardNav.tsx` | `/analytics/heat-map` | Analytics nav item with BarChart3 icon | WIRED | Lines 26, 71-73, 85: import, nav item, isActive logic confirmed |
| `treatments/[id]/page.tsx` | `MotorsportIncidentReportCard.tsx` | `import { MotorsportIncidentReportCard }` + conditional render | WIRED | Line 20: import. Lines 239-242: `{treatment.event_vertical === 'motorsport' && (<MotorsportIncidentReportCard treatmentId={treatment.id} />)}` |
| `MotorsportIncidentReportCard.tsx` | `motorsport-incidents.ts` | `import { generateMotorsportIncidentPDF }` + `mutationFn: () => generateMotorsportIncidentPDF(treatmentId)` | WIRED | Line 15: import. Line 23: mutationFn call. |
| `motorsport-incidents.ts` | `/functions/v1/motorsport-incident-generator` | `fetch(...motorsport-incident-generator, { body: { incident_id, event_vertical: 'motorsport' } })` | WIRED | Lines 28-38: POST with correct body shape confirmed |
| `app/treatment/new.tsx` (checkbox) | `motorsportFields.competitor_cleared_to_return` | `onPress={() => toggleMotorsportBool('competitor_cleared_to_return')}` | WIRED | Line 1118: toggle call. Lines 1116, 1122, 1124: field read for display. |
| `app/treatment/new.tsx` (buildVerticalExtraFields) | `treatments.vertical_extra_fields` | `JSON.stringify(motorsportFields)` — field in INITIAL_MOTORSPORT_FIELDS spread | WIRED | Line 229: `return JSON.stringify(motorsportFields)` covers competitor_cleared_to_return automatically. |

---

### Requirements Coverage

| Requirement | Truth # | Status |
|-------------|---------|--------|
| ANLT-01: Org heat map — site manager sees GPS-clustered near-miss markers | 1 | SATISFIED |
| ANLT-02: Admin heat map — all orgs, org colour-coded | 2 | SATISFIED |
| ANLT-03: Weekly compliance score persisted to compliance_score_history | 3 | SATISFIED |
| ANLT-04: Compliance score trend chart on org dashboard | 4 | SATISFIED |
| ANLT-05: Incident frequency trend chart on org dashboard | 5 | SATISFIED |
| ANLT-06: Admin aggregate compliance trends + top/bottom org ranking | 6 | SATISFIED |
| MOTO-07: Web dashboard UI to trigger motorsport-incident-generator Edge Function | 7 | SATISFIED |
| Flow 3: Mobile competitor_cleared_to_return toggle in treatment form | 8 | SATISFIED |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `NearMissHeatMap.tsx` | 74 | `return null` | None | MapBoundsAdjuster is a map hook sub-component that returns null by design (React hook component pattern in react-leaflet) |
| `AdminNearMissHeatMap.tsx` | 68 | `return null` | None | Same MapBoundsAdjuster pattern — correct |
| `AdminComplianceTrend.tsx` | 51 | `return null` | None | Custom Recharts tooltip returns null when inactive — standard Recharts pattern |

No blockers or warnings. All `return null` instances are correct, intentional patterns. No stubs found in any gap-closure files.

---

### Human Verification Required

#### 1. Org Near-Miss Heat Map Rendering

**Test:** Log in as a site manager, navigate to `/analytics/heat-map`. Verify the Leaflet map loads without SSR errors, markers appear for any near-miss records with GPS coordinates, the severity legend is visible bottom-right, and empty state message appears if no data.
**Expected:** CircleMarkers with severity colour coding (low=blue, medium=amber, high=red, critical=purple), map auto-fits to data bounds, popup on click shows category/severity/description/date.
**Why human:** Map rendering and auto-fit-bounds requires a live browser session; near-miss data with GPS coordinates needed to confirm non-empty state.

#### 2. Org Compliance and Incident Trend Charts

**Test:** Navigate to `/analytics/compliance` as a site manager. Verify both charts render: (a) LineChart showing weekly scores with amber/red reference lines; (b) AreaChart showing treatment and near-miss counts per week.
**Expected:** Charts display correctly with dark theme, Y-axis labels, tooltips on hover. If compliance_score_history is empty, the chart shows the "No compliance history yet" message. If incident data exists, two coloured areas appear (blue=treatments, amber=near-misses).
**Why human:** Chart rendering requires browser DOM; data population depends on generate-weekly-report having run at least once.

#### 3. Admin Aggregate Near-Miss Heat Map

**Test:** Log in as platform admin, navigate to `/admin/analytics`, click the "Heat Map" tab. Verify cross-org incidents appear with distinct org colours, dual legend shows org colour dots with names and severity size reference circles.
**Expected:** All near-misses from all orgs appear; org colour palette cycles from the 8-colour set; popup shows org name alongside category/severity/date.
**Why human:** Requires platform admin session, multiple orgs with GPS-located near-miss records.

#### 4. Admin Compliance Tab — Trend Chart + Org Ranking

**Test:** Click the "Compliance" tab in admin analytics. Verify (a) ComposedChart shows avg score line with shaded min/max band; (b) OrgComplianceTable renders all orgs sorted best-to-worst with green left-border for top-5 and red left-border for bottom-5, and trend arrow icons.
**Expected:** Tooltip shows avg/min/max/org_count per period; ArrowUp (green) / ArrowDown (red) / Minus (grey) trend icons match score movement between latest and previous week.
**Why human:** Requires compliance_score_history data from multiple orgs; visual layout and colour accents need runtime confirmation.

#### 5. generate-weekly-report Compliance Upsert

**Test:** Invoke the generate-weekly-report Edge Function (POST to the function endpoint). After execution, query `SELECT * FROM compliance_score_history ORDER BY created_at DESC LIMIT 1` to verify a row was inserted.
**Expected:** Row with `score` between 0 and 100, `vertical = 'general'`, `details->>'formula_version' = 'v1'`, correct `period_start` and `period_end` (DATE values 7 days apart), `org_id` set. Re-running for the same week should update the row (upsert), not create a duplicate.
**Why human:** Requires invoking the Supabase Edge Function in a live environment; database state cannot be verified structurally.

#### 6. Motorsport Incident Report Card (Gap 23-06)

**Test:** Open a treatment detail page where `event_vertical === 'motorsport'` on the dashboard. Verify the "Motorsport UK — Accident Form" card is visible below any sporting vertical card. Click "Generate Motorsport Incident Report". Observe that the button changes to "Generating PDF..." while the Edge Function runs. On success, a new browser tab opens with the signed PDF URL.
**Expected:** Card visible only for motorsport treatments (not festivals, sporting_events, or other verticals). Spinner state visible for the duration of the Edge Function call. PDF opens in new tab with a valid signed URL from Supabase Storage.
**Why human:** Requires a motorsport treatment record, authenticated dashboard session, and a live Edge Function invocation to confirm the end-to-end PDF generation flow.

#### 7. Competitor Clearance Checkbox (Gap 23-07)

**Test:** Open the mobile treatment form for a motorsport org. Navigate to the motorsport section. Confirm "[ ] Competitor cleared to return to race" checkbox is visible without toggling "Concussion Suspected". Toggle the checkbox. Confirm it shows "[X] Competitor cleared to return to race". Save the treatment and verify `vertical_extra_fields` in the database contains `"competitor_cleared_to_return": true`.
**Expected:** Checkbox always visible for motorsport treatments regardless of concussion state. Field persists in the JSONB payload. The "Concussion Clearance Required" badge on the dashboard treatments list clears once the field is true.
**Why human:** Requires physical or simulated motorsport-vertical org on the mobile app; runtime toggle behaviour and database payload persistence must be confirmed in a live session.

---

## Summary

All 8 phase success criteria are structurally verified against the actual codebase. The two gap-closure plans (23-06 and 23-07) are confirmed implemented with no stubs.

**Gap closure confirmations:**

- `web/lib/queries/motorsport-incidents.ts` (45 lines): exports `generateMotorsportIncidentPDF`, POSTs to `/functions/v1/motorsport-incident-generator` with the correct `{ incident_id, event_vertical: 'motorsport' }` body shape confirmed from Edge Function source.
- `web/components/dashboard/MotorsportIncidentReportCard.tsx` (64 lines): full `'use client'` component with useMutation, spinner state (`isPending`), `window.open(signed_url, '_blank')` on success, alert on error. Zero stubs.
- `web/app/(dashboard)/treatments/[id]/page.tsx` line 20 imports `MotorsportIncidentReportCard`; lines 239-242 render it conditionally with `event_vertical === 'motorsport'` guard — consistent with the festivals and sporting_events vertical card pattern.
- `app/treatment/new.tsx` lines 1112-1127: "Competitor cleared to return to race" checkbox with MOTO-07 comment, positioned outside the `concussion_suspected` gate (which closes at line 1110). The concussion gate at lines 421-431 unchanged — checks ONLY `hia_conducted`, `competitor_stood_down`, `cmo_notified`. `buildVerticalExtraFields()` line 229 `JSON.stringify(motorsportFields)` automatically includes `competitor_cleared_to_return`.

**Original 6 truths (initial verification):** Unchanged — all structural evidence from 2026-02-18T05:44:53Z re-confirmed with no regressions.

The phase is complete. Human verification items (above) cover runtime behaviour that structural analysis cannot confirm.

---

_Initial verification: 2026-02-18T05:44:53Z_
_Re-verification (gap closure): 2026-02-18T06:45:00Z_
_Verifier: Claude (gsd-verifier)_
