# Phase 41: Web Messaging Core - Context

**Gathered:** 2026-02-19
**Status:** Ready for planning

<domain>
## Phase Boundary

1:1 text conversations between org admins and medics on the web dashboard. Conversation list with unread counts, message thread view for sending and reading messages, and new conversation creation. No real-time (Phase 43), no offline/iOS (Phase 42), no broadcast (Phase 44), no attachments (Phase 47).

</domain>

<decisions>
## Implementation Decisions

### Conversation list layout
- Two-panel layout: conversation list sidebar on the left (~300px), message thread on the right
- Conversations sorted by most recent message first (newest at top)
- Empty state: friendly "No conversations yet" message with a prominent "Start a conversation" button

### Row content
- Claude's discretion on what info each conversation row shows (name, preview, time, badge, role — decide based on available data and clean design)

### Message thread experience
- Flat list with sender avatars/initials — all messages left-aligned, like Slack/Teams (NOT chat bubbles)
- Timestamps shown under each message (relative time: "10:30 AM", "Yesterday")
- Send via Enter key (Shift+Enter for new line) AND a visible Send button for mouse users
- On opening a conversation, scroll to bottom (latest messages). User scrolls up for history.

### New conversation flow
- Admin: "+" New button in conversation list opens a medic picker AND a "Message" button on each medic's profile page
- Medic picker shows full org roster; medics with existing conversations are marked with an indicator — clicking opens the existing thread
- If a conversation already exists with that medic, silently open the existing thread (no duplicate conversations — enforced by the partial unique index from Phase 40)
- Medic: single "Message Admin" action that opens/creates one conversation with the org. All org admins see it (shared thread per the multi-admin decision from Phase 40 context)

### Navigation & access
- Messaging accessible via sidebar nav item ("Messages") AND a top-right header icon with unread count badge
- Top-right icon click navigates to the full messaging page (not a dropdown)
- Both org admins and medics see the messaging section — same "Messages" label for both roles

### Claude's Discretion
- Unread badge placement (both sidebar + header icon, or just one)
- Exact info shown per conversation row (name, preview length, timestamp format, role indicator)
- Loading skeleton design
- Error state handling
- Thread header design (medic name, back button, etc.)

</decisions>

<specifics>
## Specific Ideas

- Flat message list like Slack/Teams — not chat bubbles. Professional staffing comms, not social messaging.
- Two entry points for new conversations: roster picker from messaging page + "Message" button on medic profiles
- One thread per medic per org — no duplicate conversations, existing ones reopened silently

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 41-web-messaging-core*
*Context gathered: 2026-02-19*
