-- Migration 144: Comms & Docs Storage Buckets (Phase 40-02)
-- Creates private storage buckets for medic compliance documents and message attachments
-- with org_id-scoped RLS policies following the established (storage.foldername(name))[1] pattern.
-- Part of v5.0 Internal Comms & Document Management.

-- =============================================================================
-- 1. BUCKET: medic-documents (private — contains sensitive compliance documents)
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'medic-documents',
  'medic-documents',
  false,
  10485760,  -- 10 MB
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 2. BUCKET: message-attachments (private — contains conversation attachments)
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'message-attachments',
  'message-attachments',
  false,
  10485760,  -- 10 MB
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 3. STORAGE RLS POLICIES: medic-documents
-- Path convention: {org_id}/{medic_id}/{category_slug}/{filename}
-- Folder check uses 1-indexed Postgres array: (storage.foldername(name))[1]
-- =============================================================================

-- Org users can upload docs to their org folder
CREATE POLICY "Org users upload medic documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'medic-documents'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = (SELECT get_user_org_id())::text
  );

-- Org users can view docs within their org folder
CREATE POLICY "Org users view medic documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'medic-documents'
    AND (storage.foldername(name))[1] = (SELECT get_user_org_id())::text
  );

-- Org users can update docs within their org folder
CREATE POLICY "Org users update medic documents"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'medic-documents'
    AND (storage.foldername(name))[1] = (SELECT get_user_org_id())::text
  );

-- Org users can delete docs within their org folder
CREATE POLICY "Org users delete medic documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'medic-documents'
    AND (storage.foldername(name))[1] = (SELECT get_user_org_id())::text
  );

-- Platform admin: unrestricted access to all medic documents
CREATE POLICY "Platform admin all medic documents"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'medic-documents'
    AND is_platform_admin()
  );

-- =============================================================================
-- 4. STORAGE RLS POLICIES: message-attachments
-- Path convention: {org_id}/{conversation_id}/{filename}
-- Folder check uses 1-indexed Postgres array: (storage.foldername(name))[1]
-- =============================================================================

-- Org users can upload attachments to their org folder
CREATE POLICY "Org users upload message attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'message-attachments'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = (SELECT get_user_org_id())::text
  );

-- Org users can view attachments within their org folder
CREATE POLICY "Org users view message attachments"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'message-attachments'
    AND (storage.foldername(name))[1] = (SELECT get_user_org_id())::text
  );

-- Org users can update attachments within their org folder
CREATE POLICY "Org users update message attachments"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'message-attachments'
    AND (storage.foldername(name))[1] = (SELECT get_user_org_id())::text
  );

-- Org users can delete attachments within their org folder
CREATE POLICY "Org users delete message attachments"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'message-attachments'
    AND (storage.foldername(name))[1] = (SELECT get_user_org_id())::text
  );

-- Platform admin: unrestricted access to all message attachments
CREATE POLICY "Platform admin all message attachments"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'message-attachments'
    AND is_platform_admin()
  );

-- =============================================================================
-- SUMMARY
-- Buckets (2):
--   - medic-documents  (PRIVATE, 10 MB, PDF/JPEG/PNG/DOC/DOCX)
--   - message-attachments (PRIVATE, 10 MB, PDF/JPEG/PNG/DOC/DOCX)
-- Policies (10):
--   Per bucket (5):
--     INSERT x 1 — org users (folder-scoped via get_user_org_id())
--     SELECT x 1 — org users (folder-scoped)
--     UPDATE x 1 — org users (folder-scoped)
--     DELETE x 1 — org users (folder-scoped)
--     ALL    x 1 — platform admin (unrestricted)
-- Path patterns:
--   medic-documents:    {org_id}/{medic_id}/{category_slug}/{filename}
--   message-attachments: {org_id}/{conversation_id}/{filename}
-- =============================================================================
