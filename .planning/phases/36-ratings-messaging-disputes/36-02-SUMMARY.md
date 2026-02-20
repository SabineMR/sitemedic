# Plan 36-02 Summary: Marketplace Messaging

## Status: COMPLETE

## What Was Built

### Database (Migration 153)
- `marketplace_conversations` table with UNIQUE(event_id, company_id) constraint
- `marketplace_messages` table with sender_id, content, timestamps
- `marketplace_conversation_read_status` table with UNIQUE(user_id, conversation_id)
- User-ID-scoped RLS: `auth.uid() IN (client_user_id, company_user_id)` participant checks

### TypeScript Types
- `web/lib/marketplace/messaging-types.ts` — MarketplaceConversation, MarketplaceMessage, MarketplaceConversationReadStatus, request/response types

### API Routes
- `GET /api/marketplace/messages/conversations` — List conversations with unread counts
- `POST /api/marketplace/messages/conversations` — Create or retrieve conversation (UNIQUE constraint)
- `GET /api/marketplace/messages/conversations/[id]` — Fetch conversation + messages, auto-mark read
- `PATCH /api/marketplace/messages/conversations/[id]/read` — Mark conversation as read
- `POST /api/marketplace/messages/send` — Send message, update metadata, upsert read status, fire-and-forget email notification

### UI Components
- `MarketplaceConversationRow.tsx` — Conversation row with other party name, event name, preview, timestamp, unread badge
- `MarketplaceMessageInput.tsx` — Text input, Enter to send, Shift+Enter for newline, 5000 char limit
- `MarketplaceMessageThread.tsx` — Chat-style with right-aligned blue (own) / left-aligned gray (other), 10s polling, auto-scroll
- `MarketplaceInbox.tsx` — Two-panel layout (conversation list + thread), mobile single-panel, 30s polling

### Pages
- `web-marketplace/app/messages/page.tsx` — Messages page with deep link support (?conversation= query param)

### Notifications
- `sendMarketplaceMessageNotification()` — Airbnb-style email to other party with message preview

## Files Created
- `supabase/migrations/153_marketplace_messaging.sql`
- `web/lib/marketplace/messaging-types.ts`
- `web/app/api/marketplace/messages/conversations/route.ts`
- `web/app/api/marketplace/messages/send/route.ts`
- `web/app/api/marketplace/messages/conversations/[id]/route.ts`
- `web/app/api/marketplace/messages/conversations/[id]/read/route.ts`
- `web/components/marketplace/messaging/MarketplaceConversationRow.tsx`
- `web/components/marketplace/messaging/MarketplaceMessageInput.tsx`
- `web/components/marketplace/messaging/MarketplaceMessageThread.tsx`
- `web/components/marketplace/messaging/MarketplaceInbox.tsx`
- `web-marketplace/app/messages/page.tsx`

## Files Modified
- `web/lib/marketplace/notifications.ts` — Added 4 notification functions (message, dispute filed, dispute resolved, cancellation)
- `web-marketplace/app/events/[id]/page.tsx` — Added Messages/Ratings tab navigation + MarketplaceMessageThread + MarketplaceRatingForm

## Deviations
- Fix applied to `send/route.ts`: Background agent initially called `sendMarketplaceMessageNotification` with wrong params. Fixed to resolve recipient email, sender name, and event name from database before calling.
