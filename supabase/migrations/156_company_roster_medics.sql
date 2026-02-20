-- Migration 156: Company Roster Medics
-- Phase 37: Company Accounts — Plan 01
-- Created: 2026-02-20
-- Purpose: Create company_roster_medics junction table for many-to-many company/medic
--          relationships. Add RLS policies, triggers for roster aggregation and
--          quote-roster validation, and denormalized columns on marketplace_companies.

-- =============================================================================
-- STEP 1: ALTER marketplace_companies — Add denormalized roster columns
-- =============================================================================

ALTER TABLE marketplace_companies ADD COLUMN IF NOT EXISTS roster_size INTEGER DEFAULT 0;
ALTER TABLE marketplace_companies ADD COLUMN IF NOT EXISTS insurance_status TEXT DEFAULT 'unverified'
  CHECK (insurance_status IN ('verified', 'expired', 'unverified'));

COMMENT ON COLUMN marketplace_companies.roster_size IS 'Denormalized count of active roster medics; updated by trigger on company_roster_medics';
COMMENT ON COLUMN marketplace_companies.insurance_status IS 'Company insurance verification status: verified, expired, or unverified';

-- =============================================================================
-- STEP 2: TABLE company_roster_medics
-- Purpose: Many-to-many junction between marketplace_companies and medics.
--          Supports invitation workflow (pending), active membership, and
--          availability tracking per-company.
-- =============================================================================

CREATE TABLE company_roster_medics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  company_id UUID NOT NULL REFERENCES marketplace_companies(id) ON DELETE CASCADE,
  medic_id UUID REFERENCES medics(id) ON DELETE CASCADE,
  -- medic_id is nullable for pending invitations where the medic hasn't accepted yet

  -- Roster status lifecycle: pending → active → inactive | suspended
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('pending', 'active', 'inactive', 'suspended')),

  -- Company-specific role and rate
  title TEXT,                          -- e.g. "Senior Paramedic", "Lead First Aider"
  hourly_rate DECIMAL(10,2),           -- Company-specific rate override (nullable = use medic's default)
  qualifications TEXT[],               -- Company-specific qualification list (nullable = inherit from medics table)

  -- Availability management
  available BOOLEAN DEFAULT TRUE,
  unavailable_reason TEXT,
  unavailable_from DATE,
  unavailable_until DATE,

  -- Invitation workflow (for pending invitations)
  invitation_email TEXT,               -- Email address for pending invitations where medic_id not yet known
  invitation_token TEXT,               -- Signed JWT token for acceptance
  invitation_sent_at TIMESTAMPTZ,
  invitation_accepted_at TIMESTAMPTZ,

  -- Membership lifecycle
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ,

  -- Audit
  added_by UUID NOT NULL REFERENCES auth.users(id),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(company_id, medic_id)
);

COMMENT ON TABLE company_roster_medics IS 'Junction table linking marketplace companies to their roster of medics. Supports invitation workflow, availability tracking, and company-specific role/rate overrides.';
COMMENT ON COLUMN company_roster_medics.company_id IS 'FK to marketplace_companies; CASCADE on delete';
COMMENT ON COLUMN company_roster_medics.medic_id IS 'FK to medics; nullable for pending invitations; CASCADE on delete';
COMMENT ON COLUMN company_roster_medics.status IS 'Lifecycle: pending (invited) → active (accepted/added) → inactive (left) | suspended';
COMMENT ON COLUMN company_roster_medics.title IS 'Company-specific role title, e.g. Senior Paramedic';
COMMENT ON COLUMN company_roster_medics.hourly_rate IS 'Company-specific hourly rate override; NULL inherits from medics table';
COMMENT ON COLUMN company_roster_medics.qualifications IS 'Company-specific qualifications; NULL inherits from medics table';
COMMENT ON COLUMN company_roster_medics.available IS 'Whether medic is currently available for assignment within this company';
COMMENT ON COLUMN company_roster_medics.invitation_email IS 'Email address for pending invitations (before medic accepts)';
COMMENT ON COLUMN company_roster_medics.invitation_token IS 'Signed JWT token used to accept roster invitation';

-- =============================================================================
-- STEP 3: RLS — Enable and create policies
-- Uses auth.uid() pattern (NOT get_user_org_id()) — marketplace is cross-org
-- =============================================================================

ALTER TABLE company_roster_medics ENABLE ROW LEVEL SECURITY;

-- Policy 1: Company admins can fully manage their own roster
CREATE POLICY "company_admin_manage_roster"
  ON company_roster_medics FOR ALL
  USING (
    company_id IN (
      SELECT id FROM marketplace_companies
      WHERE admin_user_id = auth.uid()
    )
  );

-- Policy 2: Medics can view their own roster memberships
CREATE POLICY "medic_view_own_memberships"
  ON company_roster_medics FOR SELECT
  USING (
    medic_id IN (
      SELECT id FROM medics
      WHERE user_id = auth.uid()
    )
  );

-- Policy 3: Platform admin has full access
CREATE POLICY "platform_admin_all_roster"
  ON company_roster_medics FOR ALL
  USING (is_platform_admin());

-- Policy 4: Any authenticated user can view active roster medics for verified companies
-- (Used for company profile "Meet the Team" display)
CREATE POLICY "public_view_active_roster"
  ON company_roster_medics FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND status = 'active'
    AND company_id IN (
      SELECT id FROM marketplace_companies
      WHERE verification_status = 'verified'
    )
  );

-- =============================================================================
-- STEP 4: TRIGGER FUNCTION — update_company_roster_aggregations()
-- Keeps marketplace_companies.roster_size in sync with active roster count.
-- Follows the pattern from update_company_rating_aggregate() in migration 152.
-- =============================================================================

CREATE OR REPLACE FUNCTION update_company_roster_aggregations()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id UUID;
  v_roster_count INTEGER;
BEGIN
  -- Determine which company_id to process
  IF TG_OP = 'DELETE' THEN
    v_company_id := OLD.company_id;
  ELSE
    v_company_id := COALESCE(NEW.company_id, OLD.company_id);
  END IF;

  -- Recalculate active roster size for the affected company
  SELECT COALESCE(COUNT(*)::integer, 0) INTO v_roster_count
  FROM company_roster_medics
  WHERE company_id = v_company_id
    AND status = 'active';

  -- Update denormalized column
  UPDATE marketplace_companies
  SET roster_size = v_roster_count
  WHERE id = v_company_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_update_company_roster_aggregations
  AFTER INSERT OR UPDATE OR DELETE ON company_roster_medics
  FOR EACH ROW EXECUTE FUNCTION update_company_roster_aggregations();

-- =============================================================================
-- STEP 5: TRIGGER FUNCTION — validate_quote_roster_membership()
-- Validates that named medics in quote staffing_plan belong to the company's
-- active roster. Fires BEFORE INSERT OR UPDATE on marketplace_quotes.
--
-- IMPORTANT: Uses v_medic_id as loop variable to avoid ambiguity with column name.
-- =============================================================================

CREATE OR REPLACE FUNCTION validate_quote_roster_membership()
RETURNS TRIGGER AS $$
DECLARE
  v_medic_id UUID;
  v_medic_record JSONB;
  v_roster_exists BOOLEAN;
BEGIN
  -- Only validate when staffing plan type is 'named_medics'
  IF NEW.staffing_plan IS NULL OR NEW.staffing_plan->>'type' != 'named_medics' THEN
    RETURN NEW;
  END IF;

  -- Validate each named medic exists in the company's active roster
  FOR v_medic_record IN SELECT * FROM jsonb_array_elements(NEW.staffing_plan->'named_medics')
  LOOP
    v_medic_id := (v_medic_record->>'medic_id')::UUID;

    SELECT EXISTS(
      SELECT 1 FROM company_roster_medics
      WHERE company_id = NEW.company_id
        AND medic_id = v_medic_id
        AND status = 'active'
    ) INTO v_roster_exists;

    IF NOT v_roster_exists THEN
      RAISE EXCEPTION 'Medic % is not an active member of company roster', v_medic_id;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_validate_quote_roster_membership
  BEFORE INSERT OR UPDATE ON marketplace_quotes
  FOR EACH ROW EXECUTE FUNCTION validate_quote_roster_membership();

-- =============================================================================
-- STEP 6: TRIGGER — Auto-update updated_at
-- Reuses existing update_updated_at_column() function
-- =============================================================================

CREATE TRIGGER update_company_roster_medics_updated_at
  BEFORE UPDATE ON company_roster_medics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- STEP 7: INDEXES
-- =============================================================================

-- Index for listing roster by company
CREATE INDEX idx_company_roster_medics_company_id
  ON company_roster_medics(company_id);

-- Index for finding a medic's memberships across companies
CREATE INDEX idx_company_roster_medics_medic_id
  ON company_roster_medics(medic_id);

-- Index for filtering by status
CREATE INDEX idx_company_roster_medics_status
  ON company_roster_medics(status);

-- Composite index for common query: company + active status (filtered roster)
CREATE INDEX idx_company_roster_medics_company_status
  ON company_roster_medics(company_id, status);

-- =============================================================================
-- SUMMARY
-- Tables created: company_roster_medics (1)
-- Columns added to marketplace_companies: roster_size, insurance_status (2)
-- RLS policies: 4 (company_admin, medic_own, platform_admin, public_active)
-- Trigger functions: 2 (update_company_roster_aggregations, validate_quote_roster_membership)
-- Triggers: 3 (roster aggregation, quote validation, updated_at auto-update)
-- Indexes: 4
-- =============================================================================
