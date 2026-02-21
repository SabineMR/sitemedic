# Phase 39: Admin Dashboard - Research

**Researched:** 2026-02-21
**Domain:** Platform admin marketplace operations (metrics, moderation, settings)
**Confidence:** HIGH

## Summary

The codebase already has a mature platform-admin shell (`/platform`), service-role API route patterns, and marketplace data foundations from Phases 32-38. Phase 39 should extend these established patterns rather than introducing a parallel admin stack.

Primary recommendation:
1. Add a dedicated marketplace ops area under `/platform/marketplace`.
2. Create a focused metrics RPC + API route for performant summary data.
3. Build a consolidated entity + moderation workspace with auditable actions.
4. Introduce platform-managed marketplace settings (commission/deposit/deadline defaults) with strict platform-admin RLS.

## Existing Patterns To Reuse

- **Platform admin layout and guard:** `web/app/platform/layout.tsx`
- **Platform dashboard metrics pattern:** `web/app/platform/page.tsx` + RPC `get_platform_metrics`
- **Platform service-role API pattern:** `web/app/api/platform/users/route.ts`
- **Marketplace verification/admin actions:** `web/lib/marketplace/admin-actions.ts`
- **Dispute queue UI pattern:** `web/app/platform/disputes/page.tsx`
- **Award/payment calculations affected by settings:** `web/lib/marketplace/award-calculations.ts`
- **Marketplace data model:** migrations `140`, `145`, `146`, `149`, `154`, `159`, `160`

## Data Sources for ADMIN Requirements

- **Events:** `marketplace_events`
- **Quotes:** `marketplace_quotes`
- **Awards:** `marketplace_award_history`
- **Disputes:** `marketplace_disputes`
- **Revenue/payment context:** `bookings` where `source='marketplace'`
- **Users/moderation status:** `profiles`, `marketplace_companies`

## Constraints

- Platform admin has no org context; service-role clients are required for many writes.
- Do not change live DB directly; only create migration files.
- Keep marketplace operations isolated from org-admin `/admin` tooling.
- Keep API handlers server-side filtered/paginated to avoid large payloads in platform dashboards.

## Risks and Mitigations

- **Risk:** Expensive aggregate queries on large marketplace tables.
  - **Mitigation:** Pre-aggregated SQL function/view with indexed date filters and bounded windows.
- **Risk:** Moderation side effects are hard to audit.
  - **Mitigation:** Mandatory audit table + reason requirement + actor tracking.
- **Risk:** Config drift between UI defaults and payment calculations.
  - **Mitigation:** Single settings read utility used by both APIs and UI defaults.

## Recommended Plan Split

- **39-01:** Metrics foundation and dashboard UI.
- **39-02:** Entity management + moderation workflows.
- **39-03:** Marketplace configuration table, API, and settings UI integration.

## Sources

- Codebase files listed above (primary, high confidence)
- `.planning/ROADMAP.md` (Phase 39 requirements)
- `.planning/REQUIREMENTS-v4.md` (ADMIN-01..04 traceability)

---

## Next Steps for Planning

1. Define SQL artifacts for metrics and moderation auditability.
2. Define API contracts for dashboard, entities, moderation, and settings.
3. Define UI routes/components under `/platform/marketplace`.
4. Define verification criteria for each admin requirement.
