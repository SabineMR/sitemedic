# Phase 37: Company Accounts - Context

**Gathered:** 2026-02-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Medic companies can manage a roster of individual medics, assign specific medics to events when quoting, and display rich company profiles. Individual medics cannot bid independently on the marketplace — companies are the only bidding entity. This phase builds on Phase 32 (registration) and Phase 34 (quoting).

</domain>

<decisions>
## Implementation Decisions

### Roster Onboarding
- **Both invitation and manual add** — company admin can invite existing SiteMedic users by email OR manually add medics who aren't on the platform
- **Multi-company membership allowed** — a medic can belong to multiple company rosters simultaneously (common for freelance medics)
- **Full professional profile** per roster medic — name, qualifications, certifications, DBS status, insurance, years of experience, specialisms
- **Link existing accounts** — if an invited medic already has a SiteMedic account (e.g. through another org), their existing profile is linked to the company roster. One login, multiple roles.

### Medic-to-Event Assignment
- **Either named or headcount per quote** — company can choose to name specific medics from their roster (stronger quote, shown as trust signal) or just confirm qualified headcount (more flexible, specific medics assigned after winning)
- **Substitution policy** — if a named medic becomes unavailable, company can freely substitute an equally-qualified roster medic UNLESS the client specifically chose/awarded the quote because of that named individual, in which case client approval is needed for the swap
- **Client notification on substitution** — client is always notified when a named medic is replaced

### Company Profile Display
- **"Meet the Team" section** — individual roster medics visible on the company's public profile with name, qualification, and photo
- Company profiles also show company name, roster size, average rating, total events completed, and insurance status (per success criteria)

### Claude's Discretion
- **Profile prominence** — how to balance ratings, team, qualifications, and insurance on the company profile layout
- **Verification badges** — whether to show per-medic document verification ticks or company-level verification only
- **Past event display** — whether to show individual event history/portfolio or just aggregate stats
- **Cross-company availability display** — when assigning a multi-company medic, whether to show just available/unavailable or warn about nearby cross-company commitments (leaning toward available/unavailable only to avoid leaking cross-company info)
- **Availability management approach** — calendar view, simple toggle, or auto-from-bookings for managing medic availability
- **Capacity indicators** — whether to surface "you have X available paramedics for these dates" when browsing events
- **Medic departure history** — how past event history and ratings are handled when a medic leaves a company roster
- **Qualification change ripple** — whether expired qualifications flag active quotes or only affect future quotes
- **Individual medic detail in quotes** — level of medic profile info shown to clients when reviewing named-staff quotes

</decisions>

<specifics>
## Specific Ideas

- Companies are the hiring entity — individual medics never bid independently. This is a core marketplace principle.
- Multi-company membership reflects the reality of freelance medical event cover in the UK — medics commonly work with several providers.
- The "link existing account" approach means a medic who already uses SiteMedic through an org doesn't need a second account to appear on marketplace company rosters.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 37-company-accounts*
*Context gathered: 2026-02-20*
