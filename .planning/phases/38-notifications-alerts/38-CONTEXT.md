# Phase 38: Notifications & Alerts - Context

**Gathered:** 2026-02-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Multi-channel notification system for the marketplace and platform. Medics and companies receive timely notifications about matching events, marketplace actions (quotes, awards, payments, ratings, messages), and platform events through dashboard feed, email, and SMS. Users configure preferences to control what they receive and through which channels.

</domain>

<decisions>
## Implementation Decisions

### Dashboard feed design
- **Unified notification feed** — the feed surfaces ALL platform notifications, not just marketplace. Marketplace actions, internal messaging notifications, document expiry alerts, booking changes — everything in one place
- Layout approach, grouping strategy, and feed hygiene (mark-all-as-read, auto-archive) are at Claude's discretion based on existing dashboard patterns

### SMS strategy
- **Opt-in only** — SMS is off by default for all users. Must be explicitly enabled in notification preferences (PECR compliance)
- **Twilio** as SMS provider — UK coverage, well-documented API, healthcare platform standard
- SMS recipients and scope (which roles, which notification types beyond events) at Claude's discretion based on what's genuinely time-sensitive
- Daily SMS cap at Claude's discretion based on expected marketplace volume

### Notification preference controls
- **Channel x Category matrix** — grid with rows for notification categories (Events, Quotes, Awards, Payments, Ratings, etc.) and columns for channels (Dashboard, Email, SMS)
- Sensible defaults pre-filled — most users will never touch it, power users get fine control
- Standard pattern matching GitHub/Slack/LinkedIn notification settings
- Default state for new users, settings page location, and whether clients also get preferences page — all at Claude's discretion

### Event matching & alert rules
- **No default radius** — until a medic/company sets a location radius, they see all UK events nationwide. Maximises discovery for a new marketplace
- **All verified companies see all events** — no qualification-based filtering. Companies self-select based on their capabilities. Notification preferences (event type, location radius) control which alerts fire, not visibility
- Alert timing (immediate vs batched digest) and feed prioritisation at Claude's discretion

### Claude's Discretion
- Dashboard feed layout (bell icon dropdown vs dedicated page vs both)
- Notification grouping strategy (grouped by event vs individual items)
- Feed hygiene (mark-all-as-read, auto-archive threshold)
- SMS daily cap per user
- SMS recipient roles (companies only vs companies + clients for critical items)
- Alert timing (immediate notifications vs daily digest email option)
- Feed prioritisation (flat chronological vs "For You" highlighted section)
- Default notification preference state for new users (dashboard + email on, SMS off implied by opt-in decision)
- Settings page location (account settings, gear icon on feed, or both)
- Whether clients get their own preference page or just receive defaults

</decisions>

<specifics>
## Specific Ideas

- User wants a **unified notification center** — not siloed by feature area. "I want everything to be unified" was the explicit request
- Twilio specifically chosen as SMS provider (not Amazon SNS or alternatives)
- Matrix-style preferences chosen after seeing pros/cons breakdown — user values the fine-grained control for power users while keeping sensible defaults for most
- No radius filtering by default is a deliberate marketplace growth decision — show everything nationwide to maximise early engagement

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 38-notifications-alerts*
*Context gathered: 2026-02-20*
