# Phase 47: Message Polish - Context

**Gathered:** 2026-02-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Messages show delivery and read status indicators, users can search across all their conversations by keyword, and users can attach files to messages. This completes the messaging feature set built in Phases 41-44.

Scope: delivery/read ticks, cross-conversation search, file attachments in messages. No new message types, no new conversation types, no notification changes.

</domain>

<decisions>
## Implementation Decisions

### Status tick design
- Claude's discretion on tick style (WhatsApp-style ticks vs iMessage-style text labels) -- pick what fits the existing flat Slack-style message layout
- Claude's discretion on placement -- choose what works best within the current message row design
- Claude's discretion on visibility -- decide whether only sender sees status or both parties can see it, considering the org admin <-> medic professional context
- Claude's discretion on read receipt toggleability -- decide whether always-on or user-configurable, considering this is a professional/employer messaging context

### Search experience
- Claude's discretion on search bar placement -- pick what fits the existing two-panel messaging layout (conversation list + thread)
- Claude's discretion on result format -- choose between message snippets vs conversation-grouped results
- Claude's discretion on navigation behavior when tapping a result -- jump to exact message vs open conversation at latest
- Claude's discretion on platform scope -- decide whether search is web-only or web + iOS (consider WatermelonDB local search feasibility on iOS)

### File attachment UX
- Claude's discretion on allowed file types -- pick sensible restrictions for compliance/professional messaging (documents, images, etc.)
- Claude's discretion on display style -- choose between inline previews (thumbnails for images, icon for docs) vs uniform file cards
- Claude's discretion on drag-and-drop vs button-only attachment on web
- Claude's discretion on file size limit -- pick an appropriate cap for the compliance document / photo context

### Claude's Discretion
All three areas were fully delegated to Claude's judgement. Key constraints to respect:
- Existing flat Slack-style message layout (not chat bubbles) established in Phase 41-42
- message-attachments Supabase Storage bucket already exists from Phase 40
- WatermelonDB offline cache exists on iOS from Phase 42
- Real-time delivery via Supabase Realtime from Phase 43
- Org-scoped RLS on all messaging tables
- GDPR: push notifications must not contain message content (from Phase 43 decision)

</decisions>

<specifics>
## Specific Ideas

No specific requirements -- open to standard approaches. User trusts Claude to make appropriate choices that fit the existing messaging architecture and professional org-medic context.

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope.

</deferred>

---

*Phase: 47-message-polish*
*Context gathered: 2026-02-20*
