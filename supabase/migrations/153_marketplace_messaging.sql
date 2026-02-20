-- Migration 153: Marketplace Messaging
-- Phase 36: Ratings, Messaging & Disputes — Plan 02
-- Created: 2026-02-20
-- Purpose: Create separate marketplace messaging tables (NOT reusing internal org messaging).
--          Marketplace messaging is user_id-scoped (cross-org) vs internal messaging which is org_id-scoped.
--          One conversation per (event_id, company_id) — allows pre-quote questions AND post-quote communication.

-- =============================================================================
-- TABLE: marketplace_conversations
-- One conversation per event+company pair. Both client and company can message.
-- =============================================================================

CREATE TABLE marketplace_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES marketplace_events(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES marketplace_companies(id) ON DELETE CASCADE,
  client_user_id UUID NOT NULL REFERENCES auth.users(id),
  company_user_id UUID NOT NULL REFERENCES auth.users(id),
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_preview TEXT,
  last_message_sender_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, company_id)
);

COMMENT ON TABLE marketplace_conversations IS 'Per-event messaging threads between client and company (user_id-scoped, not org_id)';

-- =============================================================================
-- TABLE: marketplace_messages
-- Individual messages within a marketplace conversation.
-- =============================================================================

CREATE TABLE marketplace_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES marketplace_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE marketplace_messages IS 'Chat messages within marketplace conversations';

-- =============================================================================
-- TABLE: marketplace_conversation_read_status
-- Tracks when each participant last read the conversation.
-- =============================================================================

CREATE TABLE marketplace_conversation_read_status (
  user_id UUID NOT NULL REFERENCES auth.users(id),
  conversation_id UUID NOT NULL REFERENCES marketplace_conversations(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, conversation_id)
);

COMMENT ON TABLE marketplace_conversation_read_status IS 'Lightweight unread tracking per user per marketplace conversation';

-- =============================================================================
-- RLS: user_id-scoped (cross-org by design)
-- =============================================================================

ALTER TABLE marketplace_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_conversation_read_status ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- marketplace_conversations policies
-- ---------------------------------------------------------------------------

CREATE POLICY "mkt_conversations_select_participant"
  ON marketplace_conversations FOR SELECT
  USING (auth.uid() IN (client_user_id, company_user_id));

CREATE POLICY "mkt_conversations_insert_participant"
  ON marketplace_conversations FOR INSERT
  WITH CHECK (auth.uid() IN (client_user_id, company_user_id));

CREATE POLICY "mkt_conversations_update_participant"
  ON marketplace_conversations FOR UPDATE
  USING (auth.uid() IN (client_user_id, company_user_id));

CREATE POLICY "mkt_conversations_platform_admin"
  ON marketplace_conversations FOR ALL
  USING (is_platform_admin());

-- ---------------------------------------------------------------------------
-- marketplace_messages policies
-- ---------------------------------------------------------------------------

CREATE POLICY "mkt_messages_select_participant"
  ON marketplace_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM marketplace_conversations mc
      WHERE mc.id = marketplace_messages.conversation_id
        AND auth.uid() IN (mc.client_user_id, mc.company_user_id)
    )
  );

CREATE POLICY "mkt_messages_insert_sender"
  ON marketplace_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM marketplace_conversations mc
      WHERE mc.id = marketplace_messages.conversation_id
        AND auth.uid() IN (mc.client_user_id, mc.company_user_id)
    )
  );

CREATE POLICY "mkt_messages_platform_admin"
  ON marketplace_messages FOR ALL
  USING (is_platform_admin());

-- ---------------------------------------------------------------------------
-- marketplace_conversation_read_status policies
-- ---------------------------------------------------------------------------

CREATE POLICY "mkt_read_status_own"
  ON marketplace_conversation_read_status FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "mkt_read_status_platform_admin"
  ON marketplace_conversation_read_status FOR ALL
  USING (is_platform_admin());

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX idx_mkt_conversations_event ON marketplace_conversations(event_id);
CREATE INDEX idx_mkt_conversations_company ON marketplace_conversations(company_id);
CREATE INDEX idx_mkt_conversations_client ON marketplace_conversations(client_user_id);
CREATE INDEX idx_mkt_conversations_company_user ON marketplace_conversations(company_user_id);
CREATE INDEX idx_mkt_messages_conversation ON marketplace_messages(conversation_id, created_at DESC);
CREATE INDEX idx_mkt_messages_sender ON marketplace_messages(sender_id);

-- =============================================================================
-- TRIGGER: updated_at on marketplace_conversations
-- =============================================================================

CREATE TRIGGER update_marketplace_conversations_updated_at
  BEFORE UPDATE ON marketplace_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- SUMMARY
-- Tables created: 3 (marketplace_conversations, marketplace_messages, marketplace_conversation_read_status)
-- RLS policies: 9 (conversations: 4, messages: 3, read_status: 2)
-- Indexes: 6
-- Triggers: 1 (updated_at)
-- Constraints: UNIQUE(event_id, company_id) on conversations
-- =============================================================================
