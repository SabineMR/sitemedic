-- Migration 157: Message Polish
-- Phase 47: Delivery/read status indicators, full-text search support
--
-- 1. updated_at auto-update trigger for messages table (column exists from migration 143)
-- 2. Full-text search tsvector column + GIN index for cross-conversation search (Plan 47-02)
-- 3. REPLICA IDENTITY FULL for Realtime UPDATE payloads (status tick updates)

-- 1. Auto-update updated_at on messages table
CREATE OR REPLACE FUNCTION update_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER messages_updated_at_trigger
  BEFORE UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_messages_updated_at();

-- 2. Full-text search column for cross-conversation keyword search
ALTER TABLE messages ADD COLUMN fts tsvector
  GENERATED ALWAYS AS (to_tsvector('english', COALESCE(content, ''))) STORED;

CREATE INDEX idx_messages_fts ON messages USING GIN (fts);

-- 3. Enable Supabase Realtime UPDATE payloads with full row data
ALTER TABLE messages REPLICA IDENTITY FULL;
