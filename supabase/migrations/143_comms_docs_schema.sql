-- Migration 143: Comms & Docs Foundation (Phase 40-01)
-- Creates messaging tables (conversations, messages, message_recipients, conversation_read_status)
-- and document management tables (document_categories, documents, document_versions)
-- with org_id-scoped RLS policies, performance indexes, and default category seeding.
-- Part of v5.0 Internal Comms & Document Management.

-- =============================================================================
-- 1. TABLE: document_categories (lookup table with org_id)
-- =============================================================================

CREATE TABLE document_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, slug)
);

-- =============================================================================
-- 2. TABLE: conversations
-- =============================================================================

CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'direct' CHECK (type IN ('direct', 'broadcast')),
  subject TEXT,
  medic_id UUID REFERENCES medics(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Partial unique index: one direct conversation per org+medic pair
CREATE UNIQUE INDEX idx_conversations_org_medic_direct
  ON conversations(org_id, medic_id) WHERE type = 'direct';

-- =============================================================================
-- 3. TABLE: messages (with denormalized org_id)
-- =============================================================================

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'attachment', 'system')),
  content TEXT,
  metadata JSONB,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read')),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 4. TABLE: message_recipients (for broadcast read tracking, denormalized org_id)
-- =============================================================================

CREATE TABLE message_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, recipient_id)
);

-- =============================================================================
-- 5. TABLE: conversation_read_status (lightweight unread tracking)
-- =============================================================================

CREATE TABLE conversation_read_status (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, conversation_id)
);

-- =============================================================================
-- 6. TABLE: documents
-- =============================================================================

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  medic_id UUID NOT NULL REFERENCES medics(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES document_categories(id),
  current_version_id UUID,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired', 'archived')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 7. TABLE: document_versions (denormalized org_id)
-- =============================================================================

CREATE TABLE document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size_bytes INT,
  mime_type TEXT,
  issue_date DATE,
  expiry_date DATE,
  certificate_number TEXT,
  notes TEXT,
  version_number INT NOT NULL DEFAULT 1,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 8. Circular FK: documents.current_version_id -> document_versions.id
-- =============================================================================

ALTER TABLE documents ADD CONSTRAINT fk_documents_current_version
  FOREIGN KEY (current_version_id) REFERENCES document_versions(id);

-- =============================================================================
-- 9. INDEXES
-- =============================================================================

-- org_id indexes on every table
CREATE INDEX idx_document_categories_org_id ON document_categories(org_id);
CREATE INDEX idx_conversations_org_id ON conversations(org_id);
CREATE INDEX idx_messages_org_id ON messages(org_id);
CREATE INDEX idx_message_recipients_org_id ON message_recipients(org_id);
CREATE INDEX idx_conversation_read_status_org_id ON conversation_read_status(org_id);
CREATE INDEX idx_documents_org_id ON documents(org_id);
CREATE INDEX idx_document_versions_org_id ON document_versions(org_id);

-- Composite indexes for common query patterns
CREATE INDEX idx_conversations_medic_id ON conversations(medic_id);
CREATE INDEX idx_conversations_last_message ON conversations(org_id, last_message_at DESC);
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_message_recipients_recipient ON message_recipients(recipient_id);
CREATE INDEX idx_message_recipients_message ON message_recipients(message_id);
CREATE INDEX idx_documents_medic ON documents(medic_id);
CREATE INDEX idx_documents_category ON documents(category_id);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_document_versions_doc ON document_versions(document_id);
CREATE INDEX idx_document_versions_expiry ON document_versions(expiry_date) WHERE expiry_date IS NOT NULL;

-- =============================================================================
-- 10. ENABLE ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE document_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_read_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 11. RLS POLICIES
-- =============================================================================

-- ---------------------------------------------------------------------------
-- document_categories policies
-- ---------------------------------------------------------------------------

CREATE POLICY "Org users can view document categories"
  ON document_categories FOR SELECT
  USING (org_id = (SELECT get_user_org_id()));

CREATE POLICY "Org users can insert document categories"
  ON document_categories FOR INSERT
  WITH CHECK (org_id = (SELECT get_user_org_id()));

CREATE POLICY "Org users can update document categories"
  ON document_categories FOR UPDATE
  USING (org_id = (SELECT get_user_org_id()));

CREATE POLICY "Org users can delete document categories"
  ON document_categories FOR DELETE
  USING (org_id = (SELECT get_user_org_id()));

CREATE POLICY "Platform admin full access to document categories"
  ON document_categories FOR ALL
  USING (is_platform_admin());

-- ---------------------------------------------------------------------------
-- conversations policies
-- ---------------------------------------------------------------------------

CREATE POLICY "Org users can view conversations"
  ON conversations FOR SELECT
  USING (org_id = (SELECT get_user_org_id()));

CREATE POLICY "Org users can insert conversations"
  ON conversations FOR INSERT
  WITH CHECK (org_id = (SELECT get_user_org_id()));

CREATE POLICY "Org users can update conversations"
  ON conversations FOR UPDATE
  USING (org_id = (SELECT get_user_org_id()));

CREATE POLICY "Org users can delete conversations"
  ON conversations FOR DELETE
  USING (org_id = (SELECT get_user_org_id()));

CREATE POLICY "Platform admin full access to conversations"
  ON conversations FOR ALL
  USING (is_platform_admin());

-- ---------------------------------------------------------------------------
-- messages policies (soft-delete filter on SELECT)
-- ---------------------------------------------------------------------------

CREATE POLICY "Org users can view messages"
  ON messages FOR SELECT
  USING (org_id = (SELECT get_user_org_id()) AND deleted_at IS NULL);

CREATE POLICY "Org users can insert messages"
  ON messages FOR INSERT
  WITH CHECK (org_id = (SELECT get_user_org_id()));

CREATE POLICY "Org users can update messages"
  ON messages FOR UPDATE
  USING (org_id = (SELECT get_user_org_id()));

CREATE POLICY "Org users can delete messages"
  ON messages FOR DELETE
  USING (org_id = (SELECT get_user_org_id()));

CREATE POLICY "Platform admin full access to messages"
  ON messages FOR ALL
  USING (is_platform_admin());

-- ---------------------------------------------------------------------------
-- message_recipients policies
-- ---------------------------------------------------------------------------

CREATE POLICY "Org users can view message recipients"
  ON message_recipients FOR SELECT
  USING (org_id = (SELECT get_user_org_id()));

CREATE POLICY "Org users can insert message recipients"
  ON message_recipients FOR INSERT
  WITH CHECK (org_id = (SELECT get_user_org_id()));

CREATE POLICY "Org users can update message recipients"
  ON message_recipients FOR UPDATE
  USING (org_id = (SELECT get_user_org_id()));

CREATE POLICY "Org users can delete message recipients"
  ON message_recipients FOR DELETE
  USING (org_id = (SELECT get_user_org_id()));

CREATE POLICY "Platform admin full access to message recipients"
  ON message_recipients FOR ALL
  USING (is_platform_admin());

-- ---------------------------------------------------------------------------
-- conversation_read_status policies (user-scoped: own rows only)
-- ---------------------------------------------------------------------------

CREATE POLICY "Users can view own read status"
  ON conversation_read_status FOR SELECT
  USING (user_id = auth.uid() AND org_id = (SELECT get_user_org_id()));

CREATE POLICY "Users can insert own read status"
  ON conversation_read_status FOR INSERT
  WITH CHECK (user_id = auth.uid() AND org_id = (SELECT get_user_org_id()));

CREATE POLICY "Users can update own read status"
  ON conversation_read_status FOR UPDATE
  USING (user_id = auth.uid() AND org_id = (SELECT get_user_org_id()));

CREATE POLICY "Users can delete own read status"
  ON conversation_read_status FOR DELETE
  USING (user_id = auth.uid() AND org_id = (SELECT get_user_org_id()));

CREATE POLICY "Platform admin full access to conversation read status"
  ON conversation_read_status FOR ALL
  USING (is_platform_admin());

-- ---------------------------------------------------------------------------
-- documents policies
-- ---------------------------------------------------------------------------

CREATE POLICY "Org users can view documents"
  ON documents FOR SELECT
  USING (org_id = (SELECT get_user_org_id()));

CREATE POLICY "Org users can insert documents"
  ON documents FOR INSERT
  WITH CHECK (org_id = (SELECT get_user_org_id()));

CREATE POLICY "Org users can update documents"
  ON documents FOR UPDATE
  USING (org_id = (SELECT get_user_org_id()));

CREATE POLICY "Org users can delete documents"
  ON documents FOR DELETE
  USING (org_id = (SELECT get_user_org_id()));

CREATE POLICY "Platform admin full access to documents"
  ON documents FOR ALL
  USING (is_platform_admin());

-- ---------------------------------------------------------------------------
-- document_versions policies
-- ---------------------------------------------------------------------------

CREATE POLICY "Org users can view document versions"
  ON document_versions FOR SELECT
  USING (org_id = (SELECT get_user_org_id()));

CREATE POLICY "Org users can insert document versions"
  ON document_versions FOR INSERT
  WITH CHECK (org_id = (SELECT get_user_org_id()));

CREATE POLICY "Org users can update document versions"
  ON document_versions FOR UPDATE
  USING (org_id = (SELECT get_user_org_id()));

CREATE POLICY "Org users can delete document versions"
  ON document_versions FOR DELETE
  USING (org_id = (SELECT get_user_org_id()));

CREATE POLICY "Platform admin full access to document versions"
  ON document_versions FOR ALL
  USING (is_platform_admin());

-- =============================================================================
-- 12. UPDATED_AT TRIGGERS
-- =============================================================================

CREATE TRIGGER update_document_categories_updated_at
  BEFORE UPDATE ON document_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 13. SEED DEFAULT DOCUMENT CATEGORIES FOR EXISTING ORGS
-- =============================================================================

INSERT INTO document_categories (org_id, name, slug, sort_order)
SELECT o.id, cat.name, cat.slug, cat.sort_order
FROM organizations o
CROSS JOIN (VALUES
  ('Insurance', 'insurance', 1),
  ('DBS', 'dbs', 2),
  ('Qualification', 'qualification', 3),
  ('ID', 'id', 4),
  ('Other', 'other', 5)
) AS cat(name, slug, sort_order)
ON CONFLICT (org_id, slug) DO NOTHING;

-- =============================================================================
-- 14. TRIGGER: Seed default document categories on new org creation
-- =============================================================================

CREATE OR REPLACE FUNCTION seed_default_document_categories()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO document_categories (org_id, name, slug, sort_order) VALUES
    (NEW.id, 'Insurance', 'insurance', 1),
    (NEW.id, 'DBS', 'dbs', 2),
    (NEW.id, 'Qualification', 'qualification', 3),
    (NEW.id, 'ID', 'id', 4),
    (NEW.id, 'Other', 'other', 5);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_seed_document_categories
  AFTER INSERT ON organizations
  FOR EACH ROW EXECUTE FUNCTION seed_default_document_categories();

-- =============================================================================
-- SUMMARY
-- Tables created: 7
--   - document_categories, conversations, messages, message_recipients,
--     conversation_read_status, documents, document_versions
-- RLS policies: 35 (5 per table: SELECT, INSERT, UPDATE, DELETE + platform admin ALL)
-- Indexes: 18 (7 org_id + 11 composite/conditional)
-- Triggers: 5 (4 updated_at + 1 seed trigger)
-- Seeding: Default categories for existing orgs + trigger for new orgs
-- =============================================================================
