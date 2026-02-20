-- Migration 151: Broadcast Messaging Indexes
-- Phase 44: Broadcast Messaging
--
-- 1. Partial unique index to prevent duplicate broadcast conversations per org
-- 2. Composite index for read tracking queries (broadcast read receipts)

-- Ensure only one broadcast conversation exists per organisation
CREATE UNIQUE INDEX idx_conversations_org_broadcast
  ON conversations(org_id) WHERE type = 'broadcast';

-- Index for efficient read tracking queries on message_recipients
-- Used by broadcast read receipt aggregation (Plan 02)
CREATE INDEX idx_message_recipients_message_read
  ON message_recipients(message_id, read_at);
