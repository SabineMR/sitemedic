-- Migration 146: Marketplace Quotes
-- Phase 34: Quote Submission & Comparison — Plan 01
-- Created: 2026-02-19
-- Purpose: Create marketplace_quotes table with RLS policies, triggers for quote counting,
--          and indexes for efficient quote discovery. Enables companies to submit detailed,
--          itemised quotes on open events.

-- =============================================================================
-- TABLE: marketplace_quotes
-- Purpose: Quotes submitted by verified companies on open events
-- Status workflow: draft → submitted → revised | withdrawn
-- RLS: Company can CRUD own quotes; event poster can view submitted (non-draft);
--      platform admin sees all
-- =============================================================================

CREATE TABLE marketplace_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  event_id UUID NOT NULL REFERENCES marketplace_events(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES marketplace_companies(id) ON DELETE CASCADE,

  -- Quote pricing and itemised breakdown
  total_price DECIMAL(10,2) NOT NULL,
  pricing_breakdown JSONB NOT NULL,
  -- Structure: {
  --   staff_cost: number,
  --   equipment_cost: number,
  --   transport_cost: number,
  --   consumables_cost: number,
  --   custom_line_items: [{ id: string, label: string, quantity: number, unitPrice: number, notes?: string }]
  -- }

  -- Staffing plan (named medics or headcount + qualifications)
  staffing_plan JSONB NOT NULL,
  -- Structure: {
  --   type: 'named_medics' | 'headcount_and_quals',
  --   named_medics?: [{ medic_id: string, name: string, qualification: string, notes?: string }],
  --   headcount_plans?: [{ role: string, quantity: number }]
  -- }

  -- Cover letter / pitch from company
  cover_letter TEXT,

  -- Availability confirmation
  availability_confirmed BOOLEAN NOT NULL DEFAULT FALSE,

  -- Quote status lifecycle
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'revised', 'withdrawn')),

  -- Timestamps for lifecycle tracking
  submitted_at TIMESTAMPTZ,
  -- Set when quote first reaches 'submitted' status
  -- Never changes after initial submission
  -- NULL for drafts

  last_revised_at TIMESTAMPTZ,
  -- Set when quote is edited after submission
  -- NULL if never revised

  withdrawn_at TIMESTAMPTZ,
  -- Set when quote is withdrawn
  -- NULL if active

  -- Standard timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE marketplace_quotes IS 'Quotes submitted by verified companies on open marketplace events';
COMMENT ON COLUMN marketplace_quotes.event_id IS 'FK to marketplace_events; on delete cascade removes quote';
COMMENT ON COLUMN marketplace_quotes.company_id IS 'FK to marketplace_companies; on delete cascade removes quote';
COMMENT ON COLUMN marketplace_quotes.total_price IS 'Sum of all pricing categories (staff, equipment, transport, consumables, custom line items); DECIMAL(10,2) for GBP';
COMMENT ON COLUMN marketplace_quotes.pricing_breakdown IS 'JSONB with itemised breakdown per category and custom line items';
COMMENT ON COLUMN marketplace_quotes.staffing_plan IS 'JSONB with either named medics (from roster) or headcount + qualification levels';
COMMENT ON COLUMN marketplace_quotes.cover_letter IS 'Free-form pitch to the client (max 5000 chars in application layer)';
COMMENT ON COLUMN marketplace_quotes.availability_confirmed IS 'Company confirms they can fulfil the event dates/times';
COMMENT ON COLUMN marketplace_quotes.status IS 'Lifecycle: draft (private, unsaved) → submitted (visible to poster) → revised (edited after submission) | withdrawn (cancelled)';
COMMENT ON COLUMN marketplace_quotes.submitted_at IS 'Set once when quote first becomes submitted; never changes; NULL for drafts';
COMMENT ON COLUMN marketplace_quotes.last_revised_at IS 'Updated each time submitted quote is edited; NULL if never revised';
COMMENT ON COLUMN marketplace_quotes.withdrawn_at IS 'Set when company withdraws quote; NULL if active';

-- =============================================================================
-- RLS: Enable Row Level Security on marketplace_quotes
-- =============================================================================

ALTER TABLE marketplace_quotes ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- RLS POLICY 1: Company manages own quotes (CRUD)
-- Verified companies can create, read, update, delete their own quotes
-- IMPORTANT: Uses marketplace_companies table to check admin_user_id
-- =============================================================================

CREATE POLICY "company_manage_own_quotes"
  ON marketplace_quotes FOR ALL
  USING (
    company_id IN (
      SELECT id FROM marketplace_companies
      WHERE admin_user_id = auth.uid()
    )
  );

-- =============================================================================
-- RLS POLICY 2: Event poster views submitted quotes only (SELECT)
-- Event poster can see non-draft quotes on their events
-- IMPORTANT: Drafts are private to the company — event poster cannot see them
-- =============================================================================

CREATE POLICY "event_poster_view_quotes"
  ON marketplace_quotes FOR SELECT
  USING (
    status != 'draft'
    AND EXISTS (
      SELECT 1 FROM marketplace_events
      WHERE id = marketplace_quotes.event_id
        AND posted_by = auth.uid()
    )
  );

-- =============================================================================
-- RLS POLICY 3: Platform admin has full access (all operations, all quotes)
-- =============================================================================

CREATE POLICY "platform_admin_all_quotes"
  ON marketplace_quotes FOR ALL
  USING (is_platform_admin());

-- =============================================================================
-- TRIGGER: Auto-update updated_at column
-- Reuses the existing update_updated_at_column() function
-- =============================================================================

CREATE TRIGGER update_marketplace_quotes_updated_at
  BEFORE UPDATE ON marketplace_quotes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- TRIGGER FUNCTION: Update marketplace_events.quote_count and has_quotes
-- Called when a quote's status changes to/from 'submitted' or 'revised'
-- This keeps the event's quote_count and has_quotes denormalized fields
-- in sync with the actual marketplace_quotes rows
-- =============================================================================

CREATE OR REPLACE FUNCTION update_event_quote_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Update quote_count and has_quotes on the event
  UPDATE marketplace_events SET
    quote_count = (
      SELECT COUNT(*) FROM marketplace_quotes
      WHERE event_id = COALESCE(NEW.event_id, OLD.event_id)
        AND status IN ('submitted', 'revised')
    ),
    has_quotes = EXISTS (
      SELECT 1 FROM marketplace_quotes
      WHERE event_id = COALESCE(NEW.event_id, OLD.event_id)
        AND status IN ('submitted', 'revised')
    )
  WHERE id = COALESCE(NEW.event_id, OLD.event_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- TRIGGER: Call update_event_quote_count on INSERT/UPDATE/DELETE
-- Fires when:
--   1. New quote inserted
--   2. Quote status changes (e.g., draft→submitted, submitted→withdrawn)
--   3. Quote deleted (ON DELETE CASCADE from marketplace_events)
-- =============================================================================

CREATE TRIGGER update_event_quote_count_on_quote_change
  AFTER INSERT OR UPDATE OR DELETE ON marketplace_quotes
  FOR EACH ROW EXECUTE FUNCTION update_event_quote_count();

-- =============================================================================
-- INDEXES: For query performance in common operations
-- =============================================================================

-- Index for listing quotes by event (query by event_id)
CREATE INDEX idx_quotes_event_id ON marketplace_quotes(event_id);

-- Index for company's own quotes (query by company_id)
CREATE INDEX idx_quotes_company_id ON marketplace_quotes(company_id);

-- Index for filtering by status (drafts private, submitted public)
CREATE INDEX idx_quotes_status ON marketplace_quotes(status);

-- Index for sorting by submission time (most recent first)
CREATE INDEX idx_quotes_submitted_at ON marketplace_quotes(submitted_at DESC);

-- Composite index for common query: event + status + time
CREATE INDEX idx_quotes_event_status_time ON marketplace_quotes(event_id, status, submitted_at DESC);

-- =============================================================================
-- SUMMARY
-- Tables created: marketplace_quotes (1)
-- RLS policies: 3 (company, event_poster, platform_admin)
-- Triggers: 2 (updated_at auto-update, quote_count sync)
-- Indexes: 5
-- =============================================================================
