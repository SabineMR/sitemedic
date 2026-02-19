-- Migration 142: Marketplace Compliance Documents Storage Bucket
-- Phase 32: Foundation Schema & Registration — Plan 01
-- Created: 2026-02-19
-- Purpose: Create private storage bucket for compliance documents (insurance,
--          DBS certificates, indemnity) with owner-only + admin RLS policies.
--          Follows pattern from 134_org_logos_bucket.sql and 125_event_incident_reports_storage.sql

-- =============================================================================
-- 1. CREATE BUCKET (private — contains sensitive compliance documents)
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'compliance-documents',
  'compliance-documents',
  false,        -- PRIVATE: insurance certs, DBS certificates are sensitive
  10485760,     -- 10 MB max per file
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
-- 2. STORAGE RLS POLICIES
-- Path convention: {company_id}/{document_type}/{filename}
-- The first folder segment is the company_id.
-- Folder check uses 1-indexed Postgres array: (storage.foldername(name))[1]
-- =============================================================================

-- Policy 1: Company admins can upload compliance documents to their own folder
CREATE POLICY "Company admins upload compliance docs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'compliance-documents'
    AND EXISTS (
      SELECT 1 FROM marketplace_companies
      WHERE id::text = (storage.foldername(name))[1]
        AND admin_user_id = auth.uid()
    )
  );

-- Policy 2: Company admins can view their own compliance documents
CREATE POLICY "Company admins view own compliance docs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'compliance-documents'
    AND EXISTS (
      SELECT 1 FROM marketplace_companies
      WHERE id::text = (storage.foldername(name))[1]
        AND admin_user_id = auth.uid()
    )
  );

-- Policy 3: Company admins can delete their own compliance documents
CREATE POLICY "Company admins delete own compliance docs"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'compliance-documents'
    AND EXISTS (
      SELECT 1 FROM marketplace_companies
      WHERE id::text = (storage.foldername(name))[1]
        AND admin_user_id = auth.uid()
    )
  );

-- Policy 4: Platform admins can view all compliance documents
CREATE POLICY "Platform admins view all compliance docs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'compliance-documents'
    AND is_platform_admin()
  );

-- =============================================================================
-- SUMMARY
-- Bucket  : compliance-documents (PRIVATE)
-- Limit   : 10 MB per file
-- Types   : PDF, JPEG, JPG, PNG, DOC, DOCX
-- Policies (4):
--   INSERT x 1 — company admin (folder-scoped via marketplace_companies join)
--   SELECT x 2 — company admin (folder-scoped) + platform admin (unrestricted)
--   DELETE x 1 — company admin (folder-scoped)
-- Path    : {company_id}/{document_type}/{filename}
-- =============================================================================
