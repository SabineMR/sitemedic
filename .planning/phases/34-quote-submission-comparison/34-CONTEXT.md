# Phase 34: Quote Submission & Comparison - Context

**Gathered:** 2026-02-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Verified marketplace companies can submit detailed, priced quotes on open events, and clients can compare quotes with anonymised company profiles. No contact details are visible until award and deposit. Only companies can quote — individual medics cannot bid independently on the marketplace.

</domain>

<decisions>
## Implementation Decisions

### Quote Pricing Form
- **Itemised breakdown**: Fixed categories (Staff, Equipment, Transport, Consumables) PLUS ability to add custom line items (e.g. "Specialist vehicle", "Overnight accommodation")
- **Staffing plan**: Companies can choose between naming specific medics from their roster OR specifying headcount + qualification levels (e.g. "2x Paramedic, 1x EMT"). Named staff shown as a trust signal to clients.
- **Minimum rate enforcement**: Display guideline rate ranges per qualification level and event type during quoting. Block quotes below the minimum rate — prevents race to the bottom. Rate tables to be defined (Phase 35 handles the commission/payout structure).
- **Companies only**: Individual medics CANNOT submit quotes independently. Only registered marketplace companies can quote. This removes the need for individual vs company quoting logic and eliminates the double-up prevention requirement (SC-5 from original roadmap).

### Comparison Layout
- **Ranked list layout**: Vertical list with expandable detail rows — scalable to any number of quotes, mobile-friendly. Similar to Checkatrade/Bark pattern.
- **Default sort**: Best value algorithm (balances price + star rating). A well-rated company at a fair price ranks above a poorly-rated cheaper option.
- **Re-sort options**: Clients can re-sort by lowest price, highest rating, or most recent.
- **Filtering**: Sort + filter available — filter by qualification level, price range, minimum star rating. Useful when events receive 10+ quotes.
- **Row info before expanding**: Claude's discretion on exact info density per row.

### Anonymization & Profile Reveal
- **Before award**: Company name is visible. Individual medics shown as "First Name + Last Initial" (e.g. "James S."). Company owner shown as "First Name + Last Initial". No phone, email, or full names visible.
- **Company profile visible before award**: Certifications & qualifications, star rating & review count, experience & past events completed, insurance & compliance status. Written reviews from past clients are also visible before award.
- **After award + deposit**: Full contact details revealed (phone, email, company address) PLUS full names of all assigned medics and company owner (replacing the "First Name + Initial" format).

### Quote Lifecycle
- **Quote editing**: Companies can edit/revise a submitted quote in place — client sees the latest version with a "revised" badge. No need to withdraw and resubmit.
- **Draft saving**: Companies can save a partial quote and return later to complete and submit. Useful for complex multi-staff quotes.
- **Quote withdrawal**: Companies can withdraw a submitted quote at any time before the event is awarded.
- **Quote deadline**: Soft close — no new quotes accepted after deadline, but client can extend the deadline once if they want more quotes.
- **Notification preference**: Daily digest email to client summarising new quotes received (actual notification system built in Phase 38, but preference captured here).

### Claude's Discretion
- Exact info density on ranked list rows before expanding (price, rating, quals, response time, cover letter snippet — pick the best balance)
- Loading skeleton design for quote list
- Error state handling (failed to load quotes, empty state before any quotes arrive)
- Exact form field layout and validation UX for the quote submission form
- Draft auto-save interval and UI indicators

</decisions>

<specifics>
## Specific Ideas

- Ranked list pattern inspired by Checkatrade/Bark — clients scan, expand interesting ones, click through to full profile
- Best value sort rewards quality service at fair prices — aligns marketplace incentives
- "Revised" badge on edited quotes gives clients transparency that a quote has been updated
- Guideline rate ranges enforce fair pay — this is a key platform value for SiteMedic

</specifics>

<deferred>
## Deferred Ideas

- **Rate tables and commission structure** — Phase 35 (Award Flow & Payment) handles the actual commission split and payout logic
- **Notification system implementation** — Phase 38 (Notifications & Alerts) builds the daily digest and other notification channels; Phase 34 only captures the preference
- **Company roster management** — Phase 37 (Company Accounts) handles adding/removing medics from company roster; Phase 34 assumes the roster exists from registration
- **Individual medic bidding removal** — Documentation update needed across ROADMAP.md to reflect companies-only quoting (captured below)

</deferred>

---

*Phase: 34-quote-submission-comparison*
*Context gathered: 2026-02-19*
