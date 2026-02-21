# Phase 39: Admin Dashboard - Context

**Gathered:** 2026-02-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Platform-admin-only marketplace operations in the existing `/platform` surface: health metrics, entity management/moderation, and marketplace configuration defaults. This phase does not replace org-admin workflows in `/admin` or client/company self-service flows.

</domain>

<decisions>
## Implementation Decisions

### Surface area and routing
- Build under `/platform/marketplace/*` to keep marketplace operations grouped separately from core platform analytics and org management pages.
- Keep existing `/platform/verification` and `/platform/disputes` operational; Phase 39 links to and reuses these flows instead of duplicating logic.

### Metrics and definitions (ADMIN-01)
- Marketplace metrics are computed from marketplace source-of-truth tables (`marketplace_events`, `marketplace_quotes`, `marketplace_award_history`, `bookings` with `source='marketplace'`).
- Conversion rate definition: `awarded_events / events_with_at_least_one_submitted_or_revised_quote`.
- Marketplace revenue definition: sum of platform fee amounts already represented through booking totals and fee split logic for marketplace bookings.
- Date range filtering (7d / 30d / 90d / all-time) is required from day one for operational usefulness.

### Entity management and moderation (ADMIN-02, ADMIN-04)
- One consolidated admin workspace should cover events, quotes, awards, disputes, and users with server-side pagination/filtering.
- Moderation actions are auditable; every suspend/ban/reinstate action writes an immutable audit row with actor, reason, timestamp, and target user.
- User moderation should use existing profile activation semantics where possible (`profiles.is_active`) and company quote permissions (`marketplace_companies.can_submit_quotes`) to enforce behavior quickly.

### Marketplace configuration (ADMIN-03)
- Commission/deposit/deadline defaults live in a dedicated singleton-style config table (`marketplace_admin_settings`) with platform-admin-only writes.
- Settings changes are versioned in an audit table to avoid silent business-rule drift.
- Runtime business logic (award/payment calculations and event defaults) reads settings via a typed server utility with safe fallbacks.

### Claude's Discretion
- Exact dashboard visualization choices (cards only vs cards + charts) as long as performance and readability remain strong.
- Which entity columns are shown by default vs hidden behind expandable detail panels.
- Whether moderation UI uses inline table actions or right-side detail drawers.

</decisions>

<specifics>
## Specific Ideas

- Add "Market Health" cards: total events, submitted quotes, awarded events, conversion percentage, revenue, open disputes.
- Add "Risk Watch" widgets: oldest unresolved disputes, users recently suspended, events approaching quote deadlines with zero quotes.
- Add moderation presets to speed triage (fraud, abuse, repeated no-show, policy breach) while allowing custom notes.

</specifics>

<deferred>
## Deferred Ideas

- Cross-tenant ML anomaly detection for fraud patterns.
- CSV export tooling and scheduled executive email digests.
- Granular permission tiers inside platform admin role.

</deferred>

---

*Phase: 39-admin-dashboard*
*Context gathered: 2026-02-21*
