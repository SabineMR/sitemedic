---
phase: 12-analytics-dashboard
verified: 2026-02-17T18:00:40Z
status: passed
score: 9/9 must-haves verified
gaps: []
---

# Phase 12: Analytics Dashboard Verification Report

**Phase Goal:** Visualise the operational metrics that have been computed in the background since Phase 07.5 but never surfaced to admins.
**Verified:** 2026-02-17T18:00:40Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Admin sees territory coverage heatmap on the Territory tab | VERIFIED | `TerritoryHeatmap` rendered in `TerritoryTab()` at page.tsx:101, passes territories + TerritoryMapDynamic |
| 2 | Admin sees hiring trigger cards grouped by region with severity colors | VERIFIED | `HiringTriggerCards` rendered at page.tsx:102; groups by region, red/yellow border-l-4 coloring in territory-analytics-charts.tsx:164-166 |
| 3 | Admin sees "Manchester M1 — 94% utilisation for 4 weeks — HIRE NOW" style card | VERIFIED | `isCritical = trigger.weeks_active >= 3` at line 163; "HIRE NOW" badge rendered at line 211; weeks_active enriched from territory.hiring_trigger_weeks at line 137 |
| 4 | Admin sees auto-assignment success rate line chart for the last 12 weeks | VERIFIED | `AssignmentSuccessChart` rendered in `AssignmentsTab()`; data fetched via `useAutoAssignmentStats()` querying `auto_schedule_logs` with `.gte('created_at', sinceISO)` for 84 days (12 weeks) |
| 5 | Admin sees medic utilisation table sortable by utilisation % | VERIFIED | `MedicUtilisationTable` has `sortField` state, `handleSort()` function, onClick on "Utilisation %" column header; SortIndicator component shows directional arrows |
| 6 | Admin sees out-of-territory booking frequency and cost impact | VERIFIED | `OOTBookingsChart` rendered in `UtilisationTab()`; displays total_oot_bookings, total_extra_cost, oot_percentage via 3 summary cards + bar chart |
| 7 | Admin sees late arrival pattern heatmap by medic and day of week | VERIFIED | `LateArrivalHeatmap` renders CSS grid with medic rows × Mon-Fri columns; color-coded by count (0/1-2/3-5/6+) |
| 8 | All queries include org_id filter for multi-tenant isolation | VERIFIED | 9 `.eq('org_id', orgId)` calls found in analytics.ts; territories.ts also has `.eq('org_id', orgId)` on all 3 territory queries |
| 9 | Existing 4 tabs (overview, medics, geofences, alerts) are completely untouched | VERIFIED | Original `loadAnalytics()` useEffect pattern unchanged; still queries location_tracking_metrics, medic_location_analytics, daily_location_trends, geofence_performance, alert_type_summary views |

**Score:** 9/9 truths verified

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `web/app/admin/analytics/page.tsx` | 7-tab analytics page | VERIFIED | 531 lines; exports 7 tabs; imports all 3 chart component files |
| `web/components/admin/territory-analytics-charts.tsx` | TerritoryHeatmap, HiringTriggerCards, CoverageGapTable | VERIFIED | 320 lines; 3 exports confirmed |
| `web/components/admin/assignment-analytics-charts.tsx` | AssignmentSuccessChart, FailureBreakdownChart | VERIFIED | 209 lines; 2 exports confirmed |
| `web/components/admin/medic-utilisation-charts.tsx` | MedicUtilisationTable, OOTBookingsChart, LateArrivalHeatmap | VERIFIED | 470 lines; 3 exports confirmed |
| `web/lib/queries/admin/analytics.ts` | 4 hooks with org_id filtering | VERIFIED | 630 lines; 4 hooks exported; all Supabase queries include .eq('org_id', orgId) |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `page.tsx` | `territory-analytics-charts.tsx` | static import | WIRED | `import { TerritoryHeatmap, HiringTriggerCards, CoverageGapTable }` at page.tsx:22 |
| `page.tsx` | `assignment-analytics-charts.tsx` | static import | WIRED | `import { AssignmentSuccessChart, FailureBreakdownChart }` at page.tsx:23 |
| `page.tsx` | `medic-utilisation-charts.tsx` | static import | WIRED | `import { MedicUtilisationTable, OOTBookingsChart, LateArrivalHeatmap }` at page.tsx:24 |
| `page.tsx` | `territory-map` | dynamic import ssr:false | WIRED | `TerritoryMapDynamic` at page.tsx:29-32; Leaflet SSR-safe |
| `TerritoryTab` | `useTerritories` | React Query hook | WIRED | `useTerritories()` called at page.tsx:97; result passed to all 3 territory components |
| `AssignmentsTab` | `useAutoAssignmentStats` | React Query hook | WIRED | `useAutoAssignmentStats()` called at page.tsx:109; data passed to AssignmentSuccessChart + FailureBreakdownChart |
| `UtilisationTab` | `useMedicUtilisation` | React Query hook | WIRED | `useMedicUtilisation()` called at page.tsx:126; data passed to MedicUtilisationTable |
| `UtilisationTab` | `useOutOfTerritoryBookings` | React Query hook | WIRED | `useOutOfTerritoryBookings()` called at page.tsx:127; data passed to OOTBookingsChart |
| `UtilisationTab` | `useLateArrivalPatterns` | React Query hook | WIRED | `useLateArrivalPatterns()` called at page.tsx:128; data passed to LateArrivalHeatmap |
| `territory-analytics-charts.tsx` | `hiring-triggers.ts` | detectHiringTriggers + groupTriggersByRegion | WIRED | Both functions imported and called in HiringTriggerCards; weeks_active enriched from territory data |
| `territory-analytics-charts.tsx` | `coverage-gaps.ts` | detectCoverageGaps + sortGapsBySeverity | WIRED | Both called in CoverageGapTable; filtered to minimum_volume_met === true |
| `analytics.ts` | `auto_schedule_logs` | .eq('org_id', orgId) | WIRED | Query at analytics.ts:137-142; 84-day window (12 weeks) enforced |
| `analytics.ts` | `medic_alerts` | .eq('alert_type','late_arrival').eq('org_id', orgId) | WIRED | Query at analytics.ts:369-374 |
| `analytics.ts` | `bookings` | .eq('org_id', orgId) | WIRED | Used in both fetchMedicUtilisation (278-287) and fetchOutOfTerritoryBookings (503-511) |

---

## Requirements Coverage

| Requirement | Status | Notes |
|-------------|--------|-------|
| Territory heatmap with color-coded utilisation circles | SATISFIED | TerritoryHeatmap passes territories to injected map component; map already has Leaflet circles from Phase 07.5 |
| Hiring trigger cards with HIRE NOW badge and severity | SATISFIED | HIRE NOW rendered for weeks_active >= 3; animate-ping pulsing dot for critical triggers |
| Coverage gap table with >10% rejection rate filter | SATISFIED | detectCoverageGaps filters at > 10%; CoverageGapTable further filters minimum_volume_met === true |
| Auto-assignment success rate chart (12 weeks) | SATISFIED | Line chart using Recharts; 84-day window enforced in fetch function |
| Medic utilisation table sortable by utilisation % | SATISFIED | Three-column sort: medic_name, utilisation_pct, total_shifts_completed; default sort is utilisation_pct DESC |
| OOT bookings frequency and cost impact | SATISFIED | Summary cards (total, cost, %) + vertical bar chart of top 10 by cost |
| Late arrival heatmap by medic and day-of-week | SATISFIED | CSS grid layout; Mon–Fri columns; medic rows; 4 heat levels |
| Multi-tenant org_id isolation on all queries | SATISFIED | 9 .eq('org_id', orgId) guards in analytics.ts; 3 in territories.ts |
| Existing 4 tabs untouched | SATISFIED | useEffect loadAnalytics() pattern unchanged; no refactoring of existing tab code |

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `medic-utilisation-charts.tsx` | 201 | `return null` in Recharts tooltip | Info | Legitimate — Recharts requires null return when tooltip is inactive |

No blocking stub patterns, placeholder content, or empty implementations found across any of the 5 key files.

---

## Human Verification Required

The following items require a human to confirm in a running browser session:

### 1. HIRE NOW Card Visual Rendering
**Test:** Navigate to admin/analytics, click Territory tab. If any territory has hiring_trigger_weeks >= 3, verify the card shows the postcode, utilisation/weeks info, and a red "HIRE NOW" badge with a pulsing red dot.
**Expected:** Card format similar to "Manchester M1 — 94% utilisation for 4 weeks — HIRE NOW" with red left border and pulsing indicator.
**Why human:** The hiring trigger data depends on actual seeded territory data; cannot verify visual rendering programmatically.

### 2. Assignment Success Rate Chart (12-Week Range)
**Test:** Navigate to Assignments tab. Verify the line chart x-axis shows week labels (e.g., "W5 2026", "W6 2026") and no errors appear in browser console.
**Expected:** Line chart renders without errors; shows up to 12 weeks of data; empty state message if no auto_schedule_logs exist.
**Why human:** Recharts rendering and empty state handling require a browser.

### 3. MedicUtilisationTable Sort Interaction
**Test:** Navigate to Utilisation tab. Click "Utilisation %" column header twice (sort asc then desc). Click "Medic Name" header.
**Expected:** Table rows reorder on each click; arrow indicator changes direction; "Total Shifts" column also clickable.
**Why human:** Interactive sort requires real browser click events.

### 4. Map Rendering (SSR Safety)
**Test:** Navigate to Territory tab, check browser console for Leaflet/window errors. Verify the map renders (or shows loading skeleton if no territory data).
**Expected:** No "window is not defined" or Leaflet SSR errors; map loads after skeleton.
**Why human:** SSR safety of dynamic import with ssr:false requires browser verification.

---

## Gaps Summary

No gaps found. All 9 must-have truths are verified across all three levels (exists, substantive, wired).

**Key findings:**

1. All 5 key files exist and are substantive (209–630 lines each, no stubs).
2. All imports are properly wired — chart components are statically imported in page.tsx; TerritoryMap is dynamically imported with ssr:false for Leaflet safety.
3. Multi-tenant isolation is rigorous: every Supabase query in analytics.ts and territories.ts carries `.eq('org_id', orgId)` — 12 total occurrences verified.
4. The HIRE NOW badge logic correctly uses `weeks_active >= 3` threshold with the critical fix patching `weeks_active` from `territory.hiring_trigger_weeks` (not the hardcoded 0 returned by `detectHiringTriggers()`).
5. Coverage gap table is filtered at both the `detectCoverageGaps()` level (>10% rejection rate) and the component level (`minimum_volume_met === true`).
6. Existing 4 tabs (overview, medics, geofences, alerts) use the original `loadAnalytics()` useEffect pattern — completely unmodified.

Human verification is recommended for visual rendering, interactivity, and runtime SSR safety — all automated structural checks pass.

---

_Verified: 2026-02-17T18:00:40Z_
_Verifier: Claude (gsd-verifier)_
