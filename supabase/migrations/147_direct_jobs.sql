-- Migration 147: Direct Jobs (Self-Procured)
-- Phase 34.1: Self-Procured Jobs — Plan 01
-- Created: 2026-02-19
-- Purpose: Create direct_clients table for client records, extend marketplace_events
--          with source/agreed_price/client_id columns for direct job discrimination,
--          add direct job status values, and RLS policies for company-managed direct jobs.
--
-- Key invariant: Direct jobs use source='direct' with 0% platform commission.
-- The marketplace_events table is extended (NOT recreated) via ALTER TABLE.

-- =============================================================================
-- TABLE: direct_clients
-- Purpose: Formal client records for self-procured jobs, owned by the company
-- =============================================================================

CREATE TABLE direct_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The marketplace company that created this client record
  company_id UUID NOT NULL REFERENCES marketplace_companies(id) ON DELETE RESTRICT,

  -- The user who created this client record
  created_by UUID NOT NULL REFERENCES auth.users(id),

  -- Client details
  client_name TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,

  -- Address fields
  address_line_1 TEXT,
  address_line_2 TEXT,
  city TEXT,
  postcode TEXT,

  -- Free-form notes
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE direct_clients IS 'Formal client records for self-procured direct jobs; owned by the marketplace company that created them';
COMMENT ON COLUMN direct_clients.company_id IS 'FK to marketplace_companies; the company that sourced this client';
COMMENT ON COLUMN direct_clients.created_by IS 'FK to auth.users; the user who entered this client record';
COMMENT ON COLUMN direct_clients.client_name IS 'Company or organisation name of the client';
COMMENT ON COLUMN direct_clients.contact_name IS 'Primary contact person name (may differ from client_name)';

-- =============================================================================
-- RLS: Enable on direct_clients
-- =============================================================================

ALTER TABLE direct_clients ENABLE ROW LEVEL SECURITY;

-- Company admin can CRUD their own company's clients
CREATE POLICY "company_admin_manage_clients"
  ON direct_clients FOR ALL
  USING (
    company_id IN (
      SELECT id FROM marketplace_companies
      WHERE admin_user_id = auth.uid()
    )
  );

-- Platform admin has full access
CREATE POLICY "platform_admin_all_clients"
  ON direct_clients FOR ALL
  USING (is_platform_admin());

-- =============================================================================
-- TRIGGER: Auto-update updated_at on direct_clients
-- Reuses the existing update_updated_at_column() function
-- =============================================================================

CREATE TRIGGER update_direct_clients_updated_at
  BEFORE UPDATE ON direct_clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- INDEX: direct_clients
-- =============================================================================

CREATE INDEX idx_direct_clients_company_id ON direct_clients(company_id);
CREATE INDEX idx_direct_clients_created_by ON direct_clients(created_by);

-- =============================================================================
-- ALTER: Add source column to marketplace_events
-- Discriminates between marketplace-posted events and direct (self-procured) jobs
-- =============================================================================

ALTER TABLE marketplace_events
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'marketplace'
    CHECK (source IN ('marketplace', 'direct'));

COMMENT ON COLUMN marketplace_events.source IS 'Discriminator: marketplace (posted on MedBid) vs direct (self-procured by company)';

-- =============================================================================
-- ALTER: Add agreed_price column to marketplace_events
-- Used by direct jobs (required); NULL for marketplace events (use budget_min/max)
-- =============================================================================

ALTER TABLE marketplace_events
  ADD COLUMN IF NOT EXISTS agreed_price NUMERIC(10,2);

COMMENT ON COLUMN marketplace_events.agreed_price IS 'Fixed agreed price for direct jobs; NULL for marketplace events which use budget_min/budget_max range';

-- =============================================================================
-- ALTER: Add client_id column to marketplace_events
-- Links direct jobs to their client record; NULL for marketplace events
-- =============================================================================

ALTER TABLE marketplace_events
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES direct_clients(id) ON DELETE SET NULL;

COMMENT ON COLUMN marketplace_events.client_id IS 'FK to direct_clients for direct jobs; NULL for marketplace-posted events';

-- =============================================================================
-- ALTER: Extend status CHECK constraint to include direct job statuses
-- Existing: draft, open, closed, cancelled, awarded
-- Adding: confirmed, in_progress, completed
-- =============================================================================

ALTER TABLE marketplace_events
  DROP CONSTRAINT IF EXISTS marketplace_events_status_check;

ALTER TABLE marketplace_events
  ADD CONSTRAINT marketplace_events_status_check
    CHECK (status IN ('draft', 'open', 'closed', 'cancelled', 'awarded', 'confirmed', 'in_progress', 'completed'));

-- =============================================================================
-- RLS: Additional policy for direct jobs on marketplace_events
-- Company admin can manage their own direct jobs
-- (The existing event_poster_manage_own policy already covers posted_by = auth.uid(),
--  but this explicit policy makes the direct job intent clear for auditability)
-- =============================================================================

CREATE POLICY "company_manage_own_direct_jobs"
  ON marketplace_events FOR ALL
  USING (
    source = 'direct'
    AND posted_by = auth.uid()
  );

-- =============================================================================
-- INDEXES: New columns
-- =============================================================================

CREATE INDEX idx_events_source ON marketplace_events(source);
CREATE INDEX idx_events_client_id ON marketplace_events(client_id);

-- =============================================================================
-- SUMMARY
-- Tables created: direct_clients (1)
-- Columns added: marketplace_events.source, marketplace_events.agreed_price, marketplace_events.client_id (3)
-- Constraints modified: marketplace_events_status_check (added confirmed, in_progress, completed)
-- RLS policies: 3 (2 on direct_clients, 1 on marketplace_events)
-- Triggers: 1 (updated_at on direct_clients)
-- Indexes: 4 (2 on direct_clients, 2 on marketplace_events)
-- =============================================================================
