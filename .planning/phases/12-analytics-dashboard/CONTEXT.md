# Phase 12: Analytics Dashboard

**Milestone:** v1.1
**Priority:** MEDIUM
**Status:** Pending planning

## Problem

The territory and operations analytics backend has been running since Phase 07.5 but nothing is visualised. Admins have no visibility into capacity, coverage, medic utilisation, or assignment performance.

## Goal

Build an analytics tab in the admin panel that visualises all operational metrics already being computed in the background.

## Gaps Closed

- `lib/territory/metrics.ts` — computes utilisation data, never shown in UI
- `lib/territory/hiring-triggers.ts` — identifies when to hire, never surfaced
- `lib/territory/coverage-gaps.ts` — finds coverage holes, no admin alerts
- Auto-assignment success rate tracked in tests, never shown
- Medic utilisation trends, OOT booking frequency, late arrival patterns — all computed but invisible

## Key Files

- `web/lib/territory/metrics.ts` — territory utilisation metrics
- `web/lib/territory/hiring-triggers.ts` — hiring trigger logic
- `web/lib/territory/coverage-gaps.ts` — coverage gap detection
- `web/lib/territory/auto-assignment.ts` — auto-assign with scoring
- `web/app/admin/analytics/page.tsx` — analytics page (extend this)
- `web/lib/queries/admin/` — admin query layer

## Planned Tasks

1. **12-01:** Territory coverage dashboard — heatmap (Leaflet circles by utilisation %), coverage gap table (sectors >10% rejection), hiring trigger cards with region grouping
2. **12-02:** Auto-assignment analytics — success rate chart (12-week history), failure reason breakdown, medic scoring transparency ("why this medic?")
3. **12-03:** Medic utilisation dashboard — per-medic utilisation bar chart, out-of-territory booking frequency, late arrival heatmap by day-of-week and medic
4. **12-04:** Analytics data API — server-side queries for all metrics with caching (pg_cron aggregated data already available from Phase 07.5)

## Success Criteria

1. Admin sees "Manchester M1 — 94% utilisation for 4 weeks — HIRE NOW" card
2. Auto-assignment success rate chart renders last 12 weeks without errors
3. Medic utilisation table is sortable by utilisation %
4. Coverage gap table shows sectors with >10% rejection rate and booking volume
