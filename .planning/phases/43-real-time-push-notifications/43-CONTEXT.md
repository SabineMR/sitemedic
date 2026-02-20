# Phase 43: Real-time & Push Notifications - Context

**Gathered:** 2026-02-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Messages arrive instantly when the app or web dashboard is open (Supabase Realtime -- no manual refresh needed), and medics receive iOS push notifications for new messages when the app is backgrounded. Notification content is GDPR-safe (sender name only, never message body). A single Realtime channel per user handles all conversations to avoid connection exhaustion.

</domain>

<decisions>
## Implementation Decisions

### In-app message arrival
- Claude's discretion on animation style (slide-in vs instant appear)
- Claude's discretion on sound effects (web and iOS)
- Claude's discretion on conversation list live reordering behaviour
- Claude's discretion on cross-conversation in-app banners/toasts

### Push notification experience
- Claude's discretion on deep linking (tap notification -> conversation or messages tab)
- Claude's discretion on notification grouping per conversation
- Claude's discretion on app icon badge count approach
- Claude's discretion on notification sound (default iOS vs custom)

### Permission prompt timing
- Claude's discretion on when to request push permission (first launch, first message, messages tab)
- Claude's discretion on pre-permission explainer screen
- Claude's discretion on handling denied permission (banner reminder vs respect choice)
- Claude's discretion on whether to request web browser notification permission

### Notification audience & muting
- Claude's discretion on whether admins also receive push notifications
- Claude's discretion on per-conversation mute functionality
- **No quiet hours** -- medics use iOS Do Not Disturb if they want silence (no in-app quiet hours feature)
- **Both 1:1 and broadcast messages trigger push notifications** -- broadcasts are org-wide announcements medics should see promptly (push Edge Function must handle both message types from day one)

### Claude's Discretion
Claude has full flexibility on all in-app message arrival behaviour (animation, sound, list updates, cross-conversation alerts), push notification UX (deep linking, grouping, badge, sound), and permission flow (timing, pre-prompt, denial handling, web push). The two locked decisions are: no quiet hours, and push for both 1:1 and broadcasts.

</decisions>

<specifics>
## Specific Ideas

No specific requirements -- open to standard approaches. Key constraints come from earlier phases:
- Single Supabase Realtime channel per user (decided in v5.0 architecture)
- Push notifications show sender name only, never message content (GDPR -- decided in v5.0 architecture)
- Org-scoped RLS on all message data
- WatermelonDB local cache on iOS (Phase 42) must integrate with Realtime updates
- Existing 10-second polling on active threads and 30-second polling on conversation list should be replaced by Realtime subscriptions

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 43-real-time-push-notifications*
*Context gathered: 2026-02-19*
