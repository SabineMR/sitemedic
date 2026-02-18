---
phase: 23-analytics-heat-maps-and-trend-charts
verified: 2026-02-18T05:44:53Z
status: passed
score: 6/6 must-haves verified
gaps: []
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
---

# Phase 23: Analytics Heat Maps and Trend Charts Verification Report

**Phase Goal:** Site managers can see where near-misses are geographically clustering on a heat map. Compliance trends over time are visible as line charts on the org dashboard. Platform admins can compare compliance performance across all orgs. All charts read from properly structured history tables populated by existing background processes.
**Verified:** 2026-02-18T05:44:53Z
**Status:** PASSED
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Site manager can view a Leaflet heat map of near-miss incidents with GPS-clustered severity-coded CircleMarkers | VERIFIED | `NearMissHeatMap.tsx` (216 lines): CircleMarker from react-leaflet, `useNearMissGeoData` hook, severity radius/colour config, MapBoundsAdjuster, SeverityLegend all present and wired. Page at `web/app/(dashboard)/analytics/heat-map/page.tsx` dynamically imports with `ssr: false`. |
| 2 | Platform admin can view an aggregate near-miss heat map across all orgs, colour-coded by org | VERIFIED | `AdminNearMissHeatMap.tsx` (300 lines): `useAdminNearMissGeoData` hook, org colour from `orgColorMap`, dual legend (org colours + severity sizes), CircleMarker per point. Wired in `/admin/analytics` page as 8th tab with `ssr: false` dynamic import. |
| 3 | Compliance scores are persisted automatically each week when generate-weekly-report runs | VERIFIED | `generate-weekly-report/index.tsx` lines 167-204: formula v1 numeric score (100 − penalties), upsert to `compliance_score_history` with `onConflict: 'org_id,vertical,period_start'`, non-blocking (error logged, execution continues). Migration 130 provides the UNIQUE index enabling idempotent upserts. |
| 4 | Site manager can view a compliance score trend chart showing last 12 months of weekly scores | VERIFIED | `ComplianceScoreChart.tsx` (98 lines): `LineChart` with `useComplianceHistory` hook, Y-axis 0–100, amber/red ReferenceLine thresholds at 70/40. Wired in `analytics/compliance/page.tsx` via `dynamic({ ssr: false })`. |
| 5 | Site manager can view an incident frequency trend chart showing treatment + near-miss counts per week | VERIFIED | `IncidentFrequencyChart.tsx` (85 lines): `AreaChart` with `useIncidentFrequency` hook, two Area series (treatments=blue, near-misses=amber), weekly bucketing via date-fns `startOfWeek`. Wired on same compliance page. |
| 6 | Platform admin can view aggregate compliance trends and identify top/bottom performing orgs | VERIFIED | `AdminComplianceTrend.tsx` (174 lines): `ComposedChart` with `Line` (avg) + two `Area` elements (min/max band). `OrgComplianceTable.tsx` (149 lines): full ranked table with green top-5 / red bottom-5 accents and ArrowUp/ArrowDown/Minus trend icons. Both wired in admin analytics Compliance tab (9th tab). |

**Score:** 6/6 truths verified

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

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `NearMissHeatMap.tsx` | 74 | `return null` | None | MapBoundsAdjuster is a map hook sub-component that returns null by design (React hook component pattern in react-leaflet) |
| `AdminNearMissHeatMap.tsx` | 68 | `return null` | None | Same MapBoundsAdjuster pattern — correct |
| `AdminComplianceTrend.tsx` | 51 | `return null` | None | Custom Recharts tooltip returns null when inactive — standard Recharts pattern |

No blockers or warnings. All `return null` instances are correct, intentional patterns.

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

---

## Summary

All 6 phase success criteria are structurally verified against the actual codebase. Every required file exists, is substantive (no stubs, no empty handlers), and is correctly wired into its consumers.

Key structural confirmations:
- Migration 130 contains exactly 3 SQL statements (DROP non-unique index, CREATE UNIQUE index, CREATE platform admin RLS policy)
- `generate-weekly-report` has the compliance score upsert block between `fetchWeeklyReportData` and `renderToBuffer` — non-blocking, idempotent via `onConflict`
- Both heat map components use `CircleMarker` (NOT `leaflet.heat`) — no new npm dependencies
- Both org dashboard analytics pages (`heat-map` and `compliance`) use `AnalyticsSubNav` for cross-page navigation
- Admin analytics page has 9 tabs with `isNewTab` guard correctly extended for both `heat-map` and `compliance`
- `AdminComplianceTrend` correctly uses `ComposedChart` (not `LineChart`) to support mixed `Line + Area` elements
- `OrgComplianceTable` shows "Top Performers" badge and "Needs Improvement" badge inline with org names; top-5 green / bottom-5 red left-border accents

The phase is complete. Human verification items (above) cover runtime behaviour that structural analysis cannot confirm.

---

_Verified: 2026-02-18T05:44:53Z_
_Verifier: Claude (gsd-verifier)_
