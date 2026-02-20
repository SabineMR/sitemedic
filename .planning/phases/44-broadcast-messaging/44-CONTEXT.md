# Phase 44: Broadcast Messaging - Context

**Gathered:** 2026-02-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Org admins can send broadcast messages to all medics in their organisation. Broadcasts appear in each medic's conversation list as a distinct message type, and the admin can track per-medic read status. Medic replies to broadcasts, broadcast scheduling, and targeted subsets are NOT in scope.

</domain>

<decisions>
## Implementation Decisions

### Compose & targeting
- Broadcasts always go to ALL active medics in the org -- no subset targeting
- Plain text only -- same message format as 1:1 messages, no subject line or rich text
- No scheduled sends -- compose and send immediately

### Broadcast display for medics
- Single "Broadcasts" channel in the medic's conversation list -- one permanent conversation entry that collects all broadcast messages chronologically (like a group announcement channel)
- Medics open the Broadcasts channel and scroll through all broadcast messages -- not separate entries per broadcast

### Claude's Discretion
- **Compose entry point:** Claude picks whether to use a dedicated "New Broadcast" button or integrate into existing conversation creation flow -- whichever fits the current messaging UI patterns
- **Confirmation step:** Claude decides whether to show "Send to X medics?" confirmation before delivering (given broadcast blast radius, a confirmation dialog is likely appropriate)
- **Visual distinction:** Claude picks how broadcasts are visually distinguished from 1:1 conversations (icon, label, colour treatment) -- should fit existing UI style
- **List ordering:** Claude decides whether the Broadcasts channel is pinned at top or sorted chronologically with other conversations
- **Reply behaviour:** Claude decides whether medics can tap a "Reply" button that opens/creates a 1:1 with admin, or whether broadcasts are strictly read-only
- **Admin section:** Claude decides whether broadcasts get a dedicated tab/section within messages or are mixed into the admin's conversation list with a visual label
- **Broadcast history:** Claude decides whether admin sees a separate broadcast history list or just scrolls the broadcast channel -- whichever is simpler
- **Delete after send:** Claude decides whether admin can delete a broadcast after sending -- consider simplicity and preventing confusion
- **Read count placement:** Claude picks where "Read by X of Y medics" appears -- inline on message, in list view, or both
- **Drilldown detail level:** Claude decides whether drilldown shows just name + read/unread, or includes the timestamp when each medic read it
- **Drilldown UI pattern:** Claude picks slide-out panel, modal, or inline expansion -- whatever fits the existing dashboard patterns
- **Real-time read tracking:** Claude decides whether read counts update live via Realtime or require refresh -- based on what the existing Realtime infrastructure already supports

</decisions>

<specifics>
## Specific Ideas

- Broadcasts use the existing `message_recipients` join table (already in the schema from Phase 40) for per-medic read tracking -- this was designed specifically for broadcast support
- Real-time delivery and push notifications should work identically to 1:1 messages (Phase 43 infrastructure) -- no special handling needed
- The single Broadcasts channel approach means one conversation record with type='broadcast' per org, rather than one per broadcast message

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 44-broadcast-messaging*
*Context gathered: 2026-02-19*
