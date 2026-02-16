-- Migration 017: Contract Management System
-- Purpose: Core contract lifecycle management with templates, versioning, events, and payment schedules
-- Dependencies: Requires bookings and clients tables from 002_business_operations.sql

-- Enable UUID generation if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Table: contract_templates
-- Purpose: Reusable contract templates with clauses and legal text
-- ============================================================================
CREATE TABLE contract_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  clauses JSONB NOT NULL DEFAULT '[]',
  terms_and_conditions TEXT NOT NULL,
  cancellation_policy TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  version INT DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE contract_templates IS 'Reusable contract templates with configurable clauses, terms, and cancellation policies';
COMMENT ON COLUMN contract_templates.clauses IS 'Array of {title, body, required, order} objects defining contract sections';
COMMENT ON COLUMN contract_templates.is_default IS 'Whether this is the default template for new contracts';

CREATE INDEX idx_contract_templates_status ON contract_templates(status);
CREATE INDEX idx_contract_templates_is_default ON contract_templates(is_default) WHERE is_default = TRUE;

-- ============================================================================
-- Table: contracts
-- Purpose: Main contract records with lifecycle states and payment tracking
-- ============================================================================
CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  template_id UUID REFERENCES contract_templates(id),
  current_version_id UUID,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'sent', 'viewed', 'signed', 'completed',
    'active', 'fulfilled', 'amended', 'terminated'
  )),
  payment_terms TEXT NOT NULL DEFAULT 'full_prepay' CHECK (payment_terms IN (
    'full_prepay', 'split_50_50', 'split_50_net30', 'full_net30', 'custom'
  )),
  custom_terms_description TEXT,
  upfront_amount DECIMAL(10,2) DEFAULT 0,
  completion_amount DECIMAL(10,2) DEFAULT 0,
  net30_amount DECIMAL(10,2) DEFAULT 0,
  upfront_paid_at TIMESTAMPTZ,
  completion_paid_at TIMESTAMPTZ,
  net30_paid_at TIMESTAMPTZ,
  stripe_payment_intent_id TEXT,
  requires_signature_before_booking BOOLEAN DEFAULT TRUE,
  internal_review_completed_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  fulfilled_at TIMESTAMPTZ,
  terminated_at TIMESTAMPTZ,
  termination_reason TEXT,
  shareable_token TEXT UNIQUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE contracts IS 'Contract records tracking full lifecycle from draft to fulfillment with payment milestones';
COMMENT ON COLUMN contracts.status IS 'Contract state: draft -> sent -> viewed -> signed -> completed -> active -> fulfilled (or amended/terminated)';
COMMENT ON COLUMN contracts.payment_terms IS 'Payment schedule type: full_prepay (100% upfront), split_50_50 (50% upfront, 50% on completion), split_50_net30 (50% upfront, 50% net 30), full_net30 (100% net 30), custom (manual amounts)';
COMMENT ON COLUMN contracts.shareable_token IS 'UUID token for public contract signing link (no auth required)';
COMMENT ON COLUMN contracts.stripe_payment_intent_id IS 'Stripe PaymentIntent ID for authorization holds (if applicable)';

CREATE INDEX idx_contracts_booking_id ON contracts(booking_id);
CREATE INDEX idx_contracts_client_id ON contracts(client_id);
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_contracts_shareable_token ON contracts(shareable_token);
CREATE INDEX idx_contracts_template_id ON contracts(template_id);

-- ============================================================================
-- Table: contract_versions
-- Purpose: Versioned PDFs with signatures and audit trail
-- ============================================================================
CREATE TABLE contract_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  version INT NOT NULL DEFAULT 1,
  storage_path TEXT NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  generated_by UUID REFERENCES auth.users(id),
  changes TEXT,
  previous_version_id UUID REFERENCES contract_versions(id),
  client_signature_data TEXT,
  client_signed_name TEXT,
  signed_at TIMESTAMPTZ,
  signed_by_email TEXT,
  signed_by_ip TEXT,
  UNIQUE(contract_id, version)
);

COMMENT ON TABLE contract_versions IS 'Immutable contract versions stored as PDFs with signature capture and amendment tracking';
COMMENT ON COLUMN contract_versions.storage_path IS 'Path in storage.contracts bucket, e.g., contracts/{contractId}/v{version}.pdf';
COMMENT ON COLUMN contract_versions.client_signature_data IS 'Base64-encoded PNG of client signature (if captured)';
COMMENT ON COLUMN contract_versions.client_signed_name IS 'Typed name as fallback if signature not drawn';
COMMENT ON COLUMN contract_versions.signed_by_ip IS 'IP address of signer for audit trail';

CREATE INDEX idx_contract_versions_contract_id ON contract_versions(contract_id);

-- Add FK from contracts to contract_versions after contract_versions table exists
ALTER TABLE contracts
  ADD CONSTRAINT fk_current_version
  FOREIGN KEY (current_version_id) REFERENCES contract_versions(id);

-- ============================================================================
-- Table: contract_events
-- Purpose: Audit log for all contract lifecycle events
-- ============================================================================
CREATE TABLE contract_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  actor_id UUID REFERENCES auth.users(id),
  actor_ip TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE contract_events IS 'Audit log of all contract lifecycle events (status changes, emails, signatures, payments)';
COMMENT ON COLUMN contract_events.event_type IS 'Event type: status_change, email_sent, email_opened, email_clicked, signature_captured, payment_captured, version_created, etc.';
COMMENT ON COLUMN contract_events.event_data IS 'Flexible JSONB payload specific to event type (e.g., {from: "draft", to: "sent"} for status_change)';
COMMENT ON COLUMN contract_events.actor_id IS 'User who triggered the event (NULL for system/client actions)';

CREATE INDEX idx_contract_events_contract_id ON contract_events(contract_id);
CREATE INDEX idx_contract_events_event_type ON contract_events(event_type);
CREATE INDEX idx_contract_events_created_at ON contract_events(created_at DESC);

-- ============================================================================
-- Storage: contracts bucket
-- Purpose: Store versioned contract PDFs
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'contracts',
  'contracts',
  false,
  10485760,
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- COMMENT ON TABLE storage.buckets IS 'Storage bucket for contract PDFs (10MB limit, PDF-only, private)';

-- ============================================================================
-- RLS Policies for storage.contracts bucket
-- ============================================================================

-- Allow authenticated users to read their own contracts
CREATE POLICY "Users can read own contracts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'contracts' AND
  auth.uid() IN (
    SELECT c.created_by
    FROM contracts c
    JOIN contract_versions cv ON cv.contract_id = c.id
    WHERE cv.storage_path = storage.objects.name
  )
);

-- Allow service_role to manage all contracts (for backend PDF generation)
CREATE POLICY "Service role can manage all contracts"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'contracts')
WITH CHECK (bucket_id = 'contracts');

-- ============================================================================
-- Update triggers for updated_at timestamps
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_contract_templates_updated_at
  BEFORE UPDATE ON contract_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contracts_updated_at
  BEFORE UPDATE ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
