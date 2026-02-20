# Phase 42: iOS Messaging & Offline - Context

**Gathered:** 2026-02-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Messaging works on the iOS app with the same functionality as web (Phase 41). Conversations and messages sync between platforms via Supabase. Medics can view cached messages offline (WatermelonDB) and queue outbound messages for delivery when connectivity returns. Real-time delivery and push notifications are Phase 43 -- this phase uses polling/manual refresh only.

</domain>

<decisions>
## Implementation Decisions

### iOS messaging navigation
- Medics can start new conversations from the iOS app -- same capability as web (medics can message their org admin)
- Feature parity: anything a medic can do on web messaging, they can do on iOS

### Offline indicators & queued message UX
- Queued (unsent) messages appear greyed out with a clock icon in the conversation thread -- clearly distinct from sent messages
- Once the message sends successfully, it transitions to normal appearance

### Message thread layout
- Same flat Slack-style layout as web -- consistent cross-platform experience (not chat bubbles)
- Return key sends the message (no multi-line via Return -- send button also available as alternative tap target)

### Claude's Discretion
- Where messaging lives in the iOS app navigation (tab bar item vs nested) -- pick best fit for existing app structure
- Tab bar badge style (count vs dot vs none)
- List-to-thread navigation pattern (push stack vs split view)
- Offline state indicator style (banner, subtle icon, or none)
- Failed message retry pattern (auto-retry with backoff vs manual tap-to-retry)
- Whether queued messages can be cancelled before sending
- Message input area style (fixed vs expandable)
- Timestamp display pattern (per-message vs grouped by time block)
- How much message history to cache locally (time-based vs count-based window)
- First-open sync experience (progressive load vs full sync)
- Whether older messages beyond the cache window are loadable on demand
- Reconnect sync behavior (automatic vs pull-to-refresh)

</decisions>

<specifics>
## Specific Ideas

- User explicitly wants Return key to send messages on iOS (not insert newline)
- Flat layout consistency with web is important -- medics should recognise the same messaging interface on both platforms
- Medics must be able to initiate conversations (not reply-only) -- same "Message Admin" capability as web

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 42-ios-messaging-offline*
*Context gathered: 2026-02-19*
