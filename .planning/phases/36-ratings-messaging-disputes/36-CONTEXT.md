# Phase 36: Ratings, Messaging & Disputes - Context

**Gathered:** 2026-02-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Both parties (client and company) can rate each other after marketplace events, communicate through per-event platform messaging before and after award, and raise disputes with defined cancellation policies. Builds trust and safety into the marketplace. Internal org messaging (v5.0 Phases 40-43) is separate — this is marketplace-specific client ↔ company communication.

</domain>

<decisions>
## Implementation Decisions

### Rating visibility & display
- Blind ratings — neither party sees the other's rating until both have submitted or the 14-day window expires (whichever comes first)
- If only one party rates, their rating becomes visible after the 14-day window closes
- Single unsubmitted rating still counts toward the company's profile score — no special flag needed
- Company profiles show aggregate star rating (average + count) AND a scrollable list of individual written reviews with star ratings (Google Reviews style)
- Ratings influence quote sorting (existing best-value algorithm from Phase 34-02)
- Moderation is post-publish: reviews go live after the blind window, either party can report a review, admin reviews flagged ones and can remove inappropriate content

### Per-quote messaging flow
- Chat-style thread (not formal email-style) — one continuous conversational thread per event between client and company
- Companies can message about an event BEFORE submitting a quote (to ask clarifying questions) and AFTER quoting
- Messages accessible from both entry points: a "Messages" tab on the event/quote detail page AND a central marketplace inbox listing all conversations
- Email notifications include sender name, message preview (~100 chars), and event context with a link to reply on-platform (Airbnb-style)

### Dispute workflow & outcomes
- Fixed dispute categories: No-show, Late cancellation, Quality issue, Billing dispute, Safety concern — user picks one and adds details
- Evidence uploads supported: dispute form includes file upload for photos, screenshots, or documents (stored in Supabase Storage)
- Four resolution outcomes for admin: Full refund to client, Partial refund (admin sets %), Dismiss (company keeps payment), Suspend party
- Auto-hold on dispute: filing a dispute immediately freezes the remainder payment until admin resolves it (releases or refunds)

### Cancellation UX & refund handling
- Client cancellation follows tiered policy: >14 days = full deposit refund, 7-14 days = 50% deposit retained, <7 days = full deposit retained by company
- Company cancellation = full refund to client, but company can propose rescheduling/adjusting dates via marketplace messaging before formally cancelling (at company admin's discretion)
- Required cancellation reason from predefined list (e.g. "Event cancelled", "Found alternative", "Budget issue", "Scheduling conflict") before processing
- Confirmation step shows financial breakdown before cancellation: deposit paid, applicable tier, refund amount — client must confirm after seeing the numbers
- Stripe refund processed automatically based on the tier calculation

### Claude's Discretion
- Database schema design for ratings, marketplace messages, and disputes tables
- Dispute evidence storage bucket configuration
- Marketplace inbox UI layout and sorting
- Cancellation reason list (exact categories)
- Rating display component design (stars, review cards)

</decisions>

<specifics>
## Specific Ideas

- "Make email notifications like Airbnb" — sender name, message preview, event context, link to reply on-platform
- Blind rating system inspired by Uber/Airbnb — prevents retaliation ratings
- Company profiles should show individual reviews like Google Reviews (not just an aggregate number)
- Company admins should have flexibility to negotiate rescheduling before cancelling — not forced into a rigid cancellation-only flow

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 36-ratings-messaging-disputes*
*Context gathered: 2026-02-19*
