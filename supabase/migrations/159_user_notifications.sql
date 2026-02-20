-- Migration 159: User Notifications
-- Phase 38: Notifications & Alerts — Plan 01
-- Created: 2026-02-20
-- Purpose: Create user_notifications table for the unified marketplace notification feed.
--          user_id-scoped (NOT org_id) — marketplace is cross-org by design.
--          Realtime-enabled for live bell-icon updates in the dashboard.

-- =============================================================================
-- TABLE: user_notifications
-- Stores all notification feed items for marketplace users (companies and clients).
-- Scoped by user_id, not org_id — aligns with all other marketplace tables.
-- =============================================================================

CREATE TABLE user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Notification type (must match NOTIFICATION_TYPES in notification-types.ts)
  type TEXT NOT NULL CHECK (type IN (
    'new_event',        -- New event posted matching company preferences
    'quote_received',   -- Client: a company submitted a quote on your event
    'quote_awarded',    -- Company: your quote was selected
    'quote_rejected',   -- Company: your quote was not selected
    'payment_received', -- Company: deposit payment confirmed
    'payment_failed',   -- Client: remainder payment failed
    'rating_received',  -- Either: you received a new rating
    'message_received', -- Either: new marketplace message
    'dispute_filed',    -- Either: a dispute was opened
    'dispute_resolved', -- Either: a dispute was resolved
    'event_cancelled',  -- Either: event was cancelled
    'rating_nudge'      -- Either: reminder to leave rating
  )),

  -- Notification content
  title TEXT NOT NULL,
  body  TEXT NOT NULL,
  link  TEXT,                           -- Deep link into the app (e.g. /marketplace/events/[id])
  metadata JSONB DEFAULT '{}'::jsonb,   -- Extra context (event_id, quote_id, etc.)

  -- Read status
  is_read  BOOLEAN      NOT NULL DEFAULT FALSE,
  read_at  TIMESTAMPTZ,                 -- Set when is_read flips to TRUE
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE user_notifications IS
  'Unified marketplace notification feed scoped by user_id. '
  'Realtime-enabled for live bell-icon updates. '
  'Service-role INSERT only — API routes write notifications on behalf of users.';

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Primary query pattern: user's notifications ordered by most recent
CREATE INDEX idx_user_notifications_user_id_created
  ON user_notifications(user_id, created_at DESC);

-- Unread count query (used by bell-icon badge)
CREATE INDEX idx_user_notifications_unread
  ON user_notifications(user_id, is_read)
  WHERE is_read = FALSE;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

-- Users can SELECT their own notifications
CREATE POLICY "user_sees_own_notifications"
  ON user_notifications FOR SELECT
  USING (user_id = auth.uid());

-- Users can UPDATE their own notifications (mark as read)
CREATE POLICY "user_updates_own_notifications"
  ON user_notifications FOR UPDATE
  USING (user_id = auth.uid());

-- Service role can INSERT notifications for any user
-- (API routes insert notifications for other users — e.g. fan-out to all companies
-- when a new event is posted. The anon-key client would be denied by the SELECT policy.)
CREATE POLICY "service_role_insert_notifications"
  ON user_notifications FOR INSERT
  WITH CHECK (true);

-- =============================================================================
-- REALTIME
-- Tables must be explicitly added to the supabase_realtime publication.
-- =============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE user_notifications;

-- Enable REPLICA IDENTITY FULL so that Realtime UPDATE payloads contain the
-- full before/after row data. Required for mark-as-read live updates in the feed.
-- (Same pattern as migration 157 for marketplace_messages)
ALTER TABLE user_notifications REPLICA IDENTITY FULL;

-- =============================================================================
-- SUMMARY
-- Table: user_notifications
-- Columns: id, user_id, type (CHECK constraint: 12 types), title, body, link,
--          metadata, is_read, read_at, created_at
-- Indexes: 2 (user+created DESC, partial unread)
-- RLS policies: 3 (user SELECT, user UPDATE, service-role INSERT)
-- Realtime: ADD TABLE + REPLICA IDENTITY FULL
-- =============================================================================
