-- Migration 141: Compliance Documents
-- Phase 32: Foundation Schema & Registration — Plan 01
-- Created: 2026-02-19
-- Purpose: Create compliance_documents table for insurance, DBS, and indemnity
--          certificates with expiry tracking and review workflow.
--          RLS restricts access to company owners and platform admins only.

-- =============================================================================
-- TABLE: compliance_documents
-- Purpose: Uploadable compliance documents (insurance, DBS, indemnity) with
--          expiry tracking and admin review workflow
-- =============================================================================

CREATE TABLE compliance_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES marketplace_companies(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),

  -- Document type discriminator
  document_type TEXT NOT NULL
    CHECK (document_type IN (
      'public_liability_insurance',
      'employers_liability_insurance',
      'professional_indemnity_insurance',
      'dbs_certificate',
      'other'
    )),

  -- Storage reference
  storage_path TEXT NOT NULL,       -- Supabase Storage path: {company_id}/{document_type}/{filename}
  file_name TEXT NOT NULL,
  file_size_bytes INT,
  mime_type TEXT,

  -- Document metadata
  issue_date DATE,
  expiry_date DATE,                 -- NULL if no expiry
  certificate_number TEXT,
  staff_member_name TEXT,           -- For DBS: which staff member this certificate is for

  -- Review workflow
  review_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (review_status IN ('pending', 'approved', 'rejected', 'expired')),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  review_notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE compliance_documents IS 'Compliance documents (insurance, DBS, indemnity) uploaded by marketplace companies with expiry tracking and admin review';
COMMENT ON COLUMN compliance_documents.document_type IS 'Type discriminator: public_liability_insurance, employers_liability_insurance, professional_indemnity_insurance, dbs_certificate, other';
COMMENT ON COLUMN compliance_documents.storage_path IS 'Supabase Storage path in compliance-documents bucket: {company_id}/{document_type}/{filename}';
COMMENT ON COLUMN compliance_documents.review_status IS 'Admin review workflow: pending → approved | rejected | expired';
COMMENT ON COLUMN compliance_documents.staff_member_name IS 'For DBS certificates: name of the staff member this certificate belongs to';

-- =============================================================================
-- RLS: compliance_documents — sensitive documents, restricted access
-- =============================================================================

ALTER TABLE compliance_documents ENABLE ROW LEVEL SECURITY;

-- Company owners can manage their own compliance documents
CREATE POLICY "company_owners_manage_own_docs"
  ON compliance_documents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM marketplace_companies
      WHERE id = compliance_documents.company_id
        AND admin_user_id = auth.uid()
    )
  );

-- Platform admins have full access to all compliance documents
CREATE POLICY "platform_admin_all_docs"
  ON compliance_documents FOR ALL
  USING (is_platform_admin());

-- NOTE: No other SELECT access — compliance documents are sensitive

-- =============================================================================
-- TRIGGER: Auto-update updated_at
-- Reuses the existing update_updated_at_column() function
-- =============================================================================

CREATE TRIGGER update_compliance_documents_updated_at
  BEFORE UPDATE ON compliance_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX idx_compliance_docs_company_id ON compliance_documents(company_id);
CREATE INDEX idx_compliance_docs_document_type ON compliance_documents(document_type);
CREATE INDEX idx_compliance_docs_expiry_date ON compliance_documents(expiry_date);
CREATE INDEX idx_compliance_docs_review_status ON compliance_documents(review_status);

-- =============================================================================
-- SUMMARY
-- Table created: compliance_documents
-- RLS policies: 2 (company owners + platform admins — no public access)
-- Indexes: 4
-- Trigger: 1 (updated_at)
-- =============================================================================
