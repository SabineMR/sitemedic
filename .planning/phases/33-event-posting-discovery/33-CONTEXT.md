# Phase 33: Event Posting & Discovery - Context

**Gathered:** 2026-02-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Clients can post events needing medical cover with full details (name, type, dates, location, attendance, staffing, budget), and verified medics/company owners can browse, search, and filter events matching their qualifications and location. Editing restrictions, close/cancel, and quote deadline enforcement are included. Quoting, award, and payment are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Event Posting Form
- **3-4 step wizard** (not single-page form) — guided feel, step-by-step
- **Location entry:** Primary method is postcode + address autocomplete (Google Places). Fallback options: what3words OR GPS dropped pin — for remote/field locations. All methods end with a confirmation step showing the resolved location
- **Drafts supported** — client can save a partially completed event and return later. Drafts show in their dashboard
- **Budget range:** Optional but nudged — if left blank, show a gentle prompt like "Events with budgets get more quotes". Client can still skip it

### Event Listing & Detail Views
- **List rows layout** (not cards or grid) — one event per row, dense and scannable
- **Preview info visible per row** (without clicking in): event name + type + dates, staffing needs + budget range (if set), location + distance, quote deadline + quote count
- **Event detail page:** Shows approximate area only (town/city name + postcode area), NOT the exact pin. Exact location revealed only after a medic submits a quote
- **Quote count visible** — show exact count (e.g. "4 quotes received") on both list and detail views

### Location-Based Discovery
- **Two search modes** based on who's searching:
  - **Company owners:** Browse by area using city/place name search (autocomplete) AND a UK region dropdown — both available side by side. They know their team's coverage area
  - **Individual medics:** "Near me" radius search from their profile postcode, default 50 miles, adjustable
- **Map view:** Yes — list + map toggle. Map shows event pins across the search area. Especially useful for company owners assessing coverage across multiple events
- **Key insight:** Company owners are the primary searchers, not individual medics. The owner decides which events to quote on, then assigns their medics. Distance from a single base location is less relevant than event location itself

### Staffing Requirements Structure
- **Structured role picker + quantities + free text** — predefined roles (Paramedic, EMT, First Aider, Doctor, Nurse, etc.) with quantity selector for each, PLUS a free text box for additional details or special needs
- **Per-day staffing** for multi-day events — a 3-day festival can have different staffing each day (e.g. 5 paramedics Saturday, 2 on Monday teardown)
- **Shifts: Medic proposes in quote** — client enters event start/end time per day, the quoting medic company proposes shift patterns in their quote. Client isn't expected to know how to structure medical shifts
- **Equipment: Checklist + free text** — tick boxes for common items (ambulance, defibrillator/AED, first aid tent, stretcher, oxygen supply) plus a free text box for anything else

### Claude's Discretion
- Exact wizard step grouping (which fields on which step)
- Loading states and skeleton designs
- Error state handling and validation UX
- Exact UK region list for the dropdown
- Predefined role list beyond the core ones mentioned
- Equipment checklist items beyond the core ones mentioned
- How draft auto-save works (timer vs on-blur vs manual)
- Filter persistence behaviour within a session

</decisions>

<specifics>
## Specific Ideas

- Location fallback with what3words is important for remote event sites (fields, festival grounds) where a standard address doesn't exist
- Company owners are the primary searchers — the discovery UX should cater to them managing a team, not a single medic looking for personal gigs
- The "approximate area only" location privacy is important — exact event location is revealed after a medic commits to quoting, not before
- Budget nudge should feel helpful, not pushy — the message should frame it as benefiting the client ("you'll get more quotes")

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 33-event-posting-discovery*
*Context gathered: 2026-02-19*
