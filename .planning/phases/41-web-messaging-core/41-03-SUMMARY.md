---
phase: 41-web-messaging-core
plan: 03
subsystem: ui
tags: [messaging, conversations, new-conversation, medic-picker, duplicate-prevention, supabase, next.js]

# Dependency graph
requires:
  - phase: 41-01-conversation-list
    provides: "Conversation list page, ConversationList component, EmptyState, fetchConversationsWithUnread"
  - phase: 40-comms-docs-foundation
    provides: "conversations table with idx_conversations_org_medic_direct partial unique index"
provides:
  - "POST /api/messages/conversations endpoint for creating/finding direct conversations"
  - "MedicPicker dialog component for admin medic selection with existing conversation indicators"
  - "Medic 'Message Admin' button for single-click conversation creation"
  - "Working EmptyState CTA (no longer disabled)"
  - "'+' new conversation button in messages page header"
affects: [41-02-thread-view, 43-realtime-messaging]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SELECT-then-INSERT with 23505 catch for unique constraint race condition prevention"
    - "Role-based API flow: admin provides medicId, medic auto-resolves from auth user record"

key-files:
  created:
    - web/app/api/messages/conversations/route.ts
    - web/app/(dashboard)/messages/components/MedicPicker.tsx
  modified:
    - web/app/(dashboard)/messages/components/EmptyState.tsx
    - web/app/(dashboard)/messages/page.tsx

key-decisions:
  - "SELECT-then-INSERT pattern over upsert/ON CONFLICT for conversation creation — clearer error handling and separate 200/201 status codes"
  - "MedicPicker fetches medic roster client-side on dialog open (not server-side) to avoid stale data in long-lived pages"
  - "EmptyState converted to client component ('use client') to support MedicPicker rendering"
  - "Skipped [conversationId]/page.tsx update since 41-02 (parallel) hasn't created it yet — pattern established in messages/page.tsx for 41-02 to follow"

patterns-established:
  - "Conversation creation pattern: client POSTs to /api/messages/conversations, receives conversationId, redirects to /messages/{conversationId}"
  - "MedicPicker reuse pattern: accepts existingConversationMedicIds and existingConversations props for duplicate indicators"

# Metrics
duration: 3min
completed: 2026-02-19
---

# Phase 41 Plan 03: New Conversation Flow Summary

**Create-conversation API with SELECT-then-INSERT duplicate prevention, admin medic picker dialog with existing-conversation indicators, and medic Message Admin button**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-19T23:33:00Z
- **Completed:** 2026-02-19T23:36:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Created POST /api/messages/conversations API route handling both admin (picks medic) and medic (auto-resolves self) flows with race condition prevention via 23505 unique constraint catch
- Built MedicPicker dialog with org medic roster, search filter, existing conversation indicators ("Existing" badge with MessageSquare icon), and loading states
- Wired medic "Message Admin" button for single-click conversation creation/opening with the org admin
- Updated EmptyState from disabled placeholder to functional CTA using MedicPicker

## Task Commits

Each task was committed atomically:

1. **Task 1: Create conversation API route with duplicate prevention** - `59920aa` (feat)
2. **Task 2: Create MedicPicker dialog and wire new conversation buttons** - `3b5d07c` (feat)

## Files Created/Modified
- `web/app/api/messages/conversations/route.ts` - POST endpoint to create or find existing direct conversation with duplicate prevention
- `web/app/(dashboard)/messages/components/MedicPicker.tsx` - Dialog for admin to pick medic (with search, existing indicators) + medic "Message Admin" button
- `web/app/(dashboard)/messages/components/EmptyState.tsx` - Updated to use MedicPicker with role-aware messaging and working CTA
- `web/app/(dashboard)/messages/page.tsx` - Added MedicPicker to header and passed role/conversation data to EmptyState

## Decisions Made
- **SELECT-then-INSERT over upsert:** Chose explicit SELECT first, then INSERT with 23505 catch, rather than Supabase's `.upsert()` or raw SQL `ON CONFLICT`. This gives clean separate 200 (existing) vs 201 (created) responses and handles the partial unique index correctly.
- **Client-side medic fetch:** MedicPicker fetches medics on dialog open rather than receiving server-side data as props. This ensures fresh data even on long-lived pages and avoids passing large arrays through server/client boundary.
- **EmptyState as client component:** Converted to 'use client' since it now renders MedicPicker (a client component). The trade-off is acceptable since EmptyState is only shown when there are no conversations (lightweight render).
- **Deferred [conversationId] update:** Plan 41-02 running in parallel creates the `[conversationId]/page.tsx`. Rather than creating a placeholder that 41-02 would overwrite, the MedicPicker pattern is established in `messages/page.tsx` for 41-02 to integrate.

## Deviations from Plan

None - plan executed exactly as written. The `[conversationId]/page.tsx` update was noted as conditional in the plan ("If the file already exists when you get to it, update it. If not...") and the file does not exist yet.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- New conversation creation flow is complete, ready for 41-02 thread view integration
- MedicPicker component is reusable and can be added to the `[conversationId]/page.tsx` sidebar header by 41-02
- Pattern: pass `existingConversationMedicIds` and `existingConversations` props from server component to MedicPicker
- API route tested pattern established for future message-sending endpoint

---
*Phase: 41-web-messaging-core*
*Completed: 2026-02-19*
