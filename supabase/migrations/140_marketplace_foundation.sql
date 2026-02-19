-- Migration 140: Marketplace Foundation
-- Phase 32: Foundation Schema & Registration — Plan 01
-- Created: 2026-02-19
-- Purpose: Create marketplace_companies and medic_commitments tables,
--          add bookings.source discriminator and clients.marketplace_enabled flag,
--          enable btree_gist for EXCLUSION constraints, RLS policies using auth.uid()
--          (NOT get_user_org_id() — marketplace is cross-org by design)

-- =============================================================================
-- STEP 1: Enable btree_gist extension (required for EXCLUSION constraints)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- =============================================================================
-- TABLE: marketplace_companies
-- Purpose: CQC-registered medical companies that can quote on marketplace events
-- =============================================================================

CREATE TABLE marketplace_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to existing SiteMedic org (bidirectional crossover)
  -- Nullable: new marketplace-only companies may not have an org yet
  org_id UUID UNIQUE REFERENCES organizations(id) ON DELETE RESTRICT,

  -- The user who registered this company on the marketplace
  admin_user_id UUID NOT NULL REFERENCES auth.users(id),

  -- CQC (Care Quality Commission) fields
  cqc_provider_id TEXT NOT NULL,
  cqc_registration_status TEXT NOT NULL,
  cqc_last_checked_at TIMESTAMPTZ,
  cqc_auto_verified BOOLEAN DEFAULT FALSE,

  -- Company details
  company_name TEXT NOT NULL,
  company_reg_number TEXT,
  company_address TEXT,
  company_postcode TEXT,
  company_phone TEXT,
  company_email TEXT NOT NULL,
  coverage_areas TEXT[],           -- Postcode prefixes, e.g. ARRAY['SW', 'SE', 'E']
  company_description TEXT,

  -- Stripe Connect (Express account for payouts)
  stripe_account_id TEXT UNIQUE,
  stripe_onboarding_complete BOOLEAN DEFAULT FALSE,

  -- Verification workflow
  verification_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN (
      'pending', 'cqc_verified', 'verified', 'rejected', 'suspended', 'info_requested'
    )),
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT,
  suspension_reason TEXT,
  suspended_at TIMESTAMPTZ,

  -- Marketplace permissions (set by admin during verification)
  can_browse_events BOOLEAN DEFAULT TRUE,
  can_submit_quotes BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE marketplace_companies IS 'CQC-registered medical companies participating in the MedBid marketplace';
COMMENT ON COLUMN marketplace_companies.org_id IS 'Link to existing SiteMedic org for bidirectional crossover; NULL for marketplace-only companies';
COMMENT ON COLUMN marketplace_companies.cqc_provider_id IS 'CQC provider ID verified via api.cqc.org.uk';
COMMENT ON COLUMN marketplace_companies.verification_status IS 'Workflow: pending → cqc_verified → verified (admin approved) | rejected | suspended | info_requested';
COMMENT ON COLUMN marketplace_companies.coverage_areas IS 'Postcode prefixes this company covers, e.g. {SW,SE,E}';

-- =============================================================================
-- TABLE: medic_commitments
-- Purpose: Prevent double-booking of medics using EXCLUSION constraint
-- =============================================================================

CREATE TABLE medic_commitments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medic_id UUID NOT NULL REFERENCES medics(id),
  booking_id UUID REFERENCES bookings(id),             -- Nullable until booking is created
  marketplace_company_id UUID REFERENCES marketplace_companies(id),
  event_date DATE NOT NULL,
  time_range TSRANGE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- EXCLUSION constraint: same medic cannot have overlapping time ranges
  EXCLUDE USING GIST (medic_id WITH =, time_range WITH &&)
);

COMMENT ON TABLE medic_commitments IS 'Tracks medic time commitments with EXCLUSION constraint to prevent double-booking';
COMMENT ON COLUMN medic_commitments.time_range IS 'PostgreSQL range type for the committed time window; EXCLUSION prevents overlaps per medic';

-- =============================================================================
-- ALTER: Add source column to bookings table
-- =============================================================================

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'direct'
  CHECK (source IN ('direct', 'marketplace'));

COMMENT ON COLUMN bookings.source IS 'Discriminator: direct (existing SiteMedic booking) vs marketplace (MedBid marketplace booking)';

-- =============================================================================
-- ALTER: Add marketplace_enabled flag to clients table
-- =============================================================================

ALTER TABLE clients ADD COLUMN IF NOT EXISTS marketplace_enabled BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN clients.marketplace_enabled IS 'Whether this client has opted into the MedBid marketplace to post events';

-- =============================================================================
-- RLS: marketplace_companies — uses auth.uid(), NOT get_user_org_id()
-- =============================================================================

ALTER TABLE marketplace_companies ENABLE ROW LEVEL SECURITY;

-- Company owners can manage their own registration
CREATE POLICY "company_owners_manage_own"
  ON marketplace_companies FOR ALL
  USING (admin_user_id = auth.uid());

-- Any authenticated user can browse verified companies
CREATE POLICY "browse_verified_companies"
  ON marketplace_companies FOR SELECT
  USING (verification_status = 'verified' AND auth.uid() IS NOT NULL);

-- Platform admins have full access to all companies
CREATE POLICY "platform_admin_all_companies"
  ON marketplace_companies FOR ALL
  USING (is_platform_admin());

-- =============================================================================
-- RLS: medic_commitments
-- =============================================================================

ALTER TABLE medic_commitments ENABLE ROW LEVEL SECURITY;

-- Medics can view their own commitments
CREATE POLICY "commitment_owner_read"
  ON medic_commitments FOR SELECT
  USING (medic_id IN (SELECT id FROM medics WHERE user_id = auth.uid()));

-- Platform admins have full access
CREATE POLICY "platform_admin_all_commitments"
  ON medic_commitments FOR ALL
  USING (is_platform_admin());

-- =============================================================================
-- TRIGGER: Auto-update updated_at on marketplace_companies
-- Reuses the existing update_updated_at_column() function from 002_business_operations.sql
-- =============================================================================

CREATE TRIGGER update_marketplace_companies_updated_at
  BEFORE UPDATE ON marketplace_companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX idx_marketplace_companies_admin_user_id ON marketplace_companies(admin_user_id);
CREATE INDEX idx_marketplace_companies_verification_status ON marketplace_companies(verification_status);
CREATE INDEX idx_marketplace_companies_cqc_provider_id ON marketplace_companies(cqc_provider_id);
CREATE INDEX idx_medic_commitments_medic_id ON medic_commitments(medic_id);
CREATE INDEX idx_medic_commitments_event_date ON medic_commitments(event_date);
CREATE INDEX idx_bookings_source ON bookings(source);

-- =============================================================================
-- SUMMARY
-- Tables created: marketplace_companies, medic_commitments
-- Tables altered: bookings (source column), clients (marketplace_enabled)
-- Extensions: btree_gist
-- RLS policies: 5 (3 on marketplace_companies, 2 on medic_commitments)
-- Indexes: 6
-- Trigger: 1 (updated_at on marketplace_companies)
-- =============================================================================
