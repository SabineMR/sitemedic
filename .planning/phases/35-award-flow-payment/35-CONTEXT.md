# Phase 35: Award Flow & Payment - Context

**Gathered:** 2026-02-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Client awards their chosen quote, pays a deposit via Stripe, system auto-creates a SiteMedic booking with source='marketplace'. Remainder is auto-charged after event completion on a payment term. Commission is deducted using the existing platform_fee_percent/medic_payout_percent pattern, and payout follows the existing friday-payout pipeline via Stripe Connect.

Locked from earlier phases:
- Two Stripe PaymentIntents: deposit + remainder (not authorize-then-capture — 7-day hold limit)
- Contact details hidden until BOTH event awarded AND deposit paid
- Commission uses existing platform_fee_percent/medic_payout_percent pattern

</domain>

<decisions>
## Implementation Decisions

### Award confirmation UX
- Claude's discretion on flow (confirmation modal vs straight to payment page)
- Claude's discretion on whether award is provisional until deposit or final once confirmed
- Claude's discretion on terms acceptance (checkbox vs implied by proceeding)

### Other quotes on award
- Hybrid approach: if named medics were specified in the quote AND those medics have EXCLUSION constraint conflicts, block the award and notify the company
- If no named medics or no conflicts, award succeeds — company resolves staffing
- Other (non-winning) quotes: Claude's discretion on whether rejected immediately or after deposit clears

### Payment & checkout
- **Embedded Stripe Elements** on SiteMedic page (NOT Stripe Checkout redirect) — more branded/seamless experience
- **Full transparency breakdown** before payment: quote total, deposit amount (% of total), remainder due after event, VAT breakdown, cancellation policy summary
- **Email receipt + on-screen confirmation** after deposit is paid — email includes payment reference, booking details, and what happens next
- Client can **see and manage their saved payment method** in their dashboard — can update card before the remainder is charged

### Deposit percentage
- **Configurable by platform admin per industry/vertical** (event type)
- Default 25% but some industries require 50% up front
- Ties into existing vertical system (construction, motorsport, festivals, etc.)

### Remainder timing & failure
- **Net 14 day payment term** — remainder auto-charged 14 days after event end date
- **3 retries over 7 days** on payment failure (day 1, day 3, day 7 after initial failure)
- Email + SMS notification to client on each retry attempt
- After 3 failures: Claude's discretion on escalation (admin alert + account flag vs auto-suspend)

### Contact reveal & notifications
- **Full client details** revealed to winning company on award + deposit: name, email, phone, event address — everything needed to coordinate
- Contact info shown on **both dashboard (event detail page) AND award email**
- Non-selected companies: notification by email — Claude's discretion on tone (generic vs encouraging with stats)
- Client confirmation email: Claude's discretion on content and whether to send beyond Stripe's auto receipt

### Claude's Discretion
- Award confirmation UX flow details (modal vs inline, provisional vs final, terms pattern)
- Timing of other-quote rejection relative to deposit success
- Escalation path after 3 failed remainder charges
- Non-selected company notification tone and content
- Client confirmation email beyond Stripe receipt

</decisions>

<specifics>
## Specific Ideas

- Deposit % should be industry-aware: "some industries we require 50% up front to reserve" — admin sets this per event type / vertical
- Net 14 day terms for remainder, not immediate charge after event
- Overbooking concern: if a company's named medics become unavailable between quoting and award, the system should catch this via EXCLUSION constraints at award time — not silently succeed
- Client should be able to manage their saved card before remainder is charged

</specifics>

<deferred>
## Deferred Ideas

### For Phase 37 (Company Accounts) — stays in v4.0 milestone
- **Travel time / distance check between shifts**: When assigning medics to events, consider geographic distance and travel time between consecutive shifts. A medic with a morning shift in one location may not be able to reach an afternoon shift elsewhere. This goes beyond time-overlap EXCLUSION constraints and requires location-aware scheduling logic.

</deferred>

---

*Phase: 35-award-flow-payment*
*Context gathered: 2026-02-20*
