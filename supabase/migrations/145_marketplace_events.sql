-- Migration 145: Marketplace Events
-- Phase 33: Event Posting & Discovery — Plan 01
-- Created: 2026-02-19
-- Purpose: Create marketplace_events, event_days, and event_staffing_requirements tables
--          with PostGIS for radius-based event discovery, RLS policies using auth.uid()
--          (NOT get_user_org_id() — marketplace is cross-org by design),
--          spatial GIST index on location coordinates, and status workflow with draft support.

-- =============================================================================
-- STEP 1: Enable PostGIS extension (required for GEOGRAPHY type and ST_DWithin)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS postgis;

-- =============================================================================
-- TABLE: marketplace_events
-- Purpose: Events posted by clients needing medical cover
-- Status workflow: draft → open → closed | cancelled | awarded
-- Edit restrictions: has_quotes = true → only description + special_requirements editable
-- =============================================================================

CREATE TABLE marketplace_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Event poster (the client user who created this event)
  posted_by UUID NOT NULL REFERENCES auth.users(id),

  -- Event details
  event_name TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'construction', 'tv_film', 'motorsport', 'festivals',
    'sporting_events', 'corporate', 'private_events', 'other'
  )),
  event_description TEXT,
  special_requirements TEXT,
  indoor_outdoor TEXT NOT NULL DEFAULT 'outdoor' CHECK (indoor_outdoor IN ('indoor', 'outdoor', 'mixed')),
  expected_attendance INT,

  -- Budget range (optional)
  budget_min DECIMAL(10,2),
  budget_max DECIMAL(10,2),

  -- Location fields
  location_postcode TEXT NOT NULL,
  location_address TEXT,
  location_what3words TEXT,
  location_coordinates GEOGRAPHY(POINT, 4326),
  location_display TEXT,

  -- Quote deadline
  quote_deadline TIMESTAMPTZ NOT NULL,

  -- Status workflow
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'closed', 'cancelled', 'awarded')),

  -- Quote tracking (denormalized for performance)
  has_quotes BOOLEAN NOT NULL DEFAULT FALSE,
  quote_count INT NOT NULL DEFAULT 0,

  -- Equipment requirements (JSONB array of { type, notes? })
  equipment_required JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE marketplace_events IS 'Events posted by clients needing medical cover on the MedBid marketplace';
COMMENT ON COLUMN marketplace_events.posted_by IS 'The client user who created this event; FK to auth.users';
COMMENT ON COLUMN marketplace_events.event_type IS 'Aligns with existing booking verticals: construction, tv_film, motorsport, festivals, sporting_events, corporate, private_events, other';
COMMENT ON COLUMN marketplace_events.location_coordinates IS 'PostGIS GEOGRAPHY(POINT, 4326) for ST_DWithin radius queries in event discovery';
COMMENT ON COLUMN marketplace_events.location_display IS 'Approximate area only (town/city + postcode area) shown to medics before quoting; exact location revealed after award';
COMMENT ON COLUMN marketplace_events.status IS 'Workflow: draft → open → closed | cancelled | awarded';
COMMENT ON COLUMN marketplace_events.has_quotes IS 'Flipped to TRUE when first quote arrives; controls edit restrictions (EVNT-05: post-quote only description + special_requirements editable)';
COMMENT ON COLUMN marketplace_events.quote_count IS 'Denormalized count of quotes for display on list/detail views; updated by quote insert triggers';
COMMENT ON COLUMN marketplace_events.equipment_required IS 'JSONB array of { type: ambulance|defibrillator|first_aid_tent|stretcher|oxygen_supply|other, notes?: string }';

-- =============================================================================
-- TABLE: event_days
-- Purpose: Multi-day event support — a 3-day festival has 3 rows
-- =============================================================================

CREATE TABLE event_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES marketplace_events(id) ON DELETE CASCADE,
  event_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,

  -- One row per day per event
  UNIQUE (event_id, event_date)
);

COMMENT ON TABLE event_days IS 'Individual days for multi-day marketplace events; a 3-day festival has 3 rows';

-- =============================================================================
-- TABLE: event_staffing_requirements
-- Purpose: Per-day or all-days staffing needs, queryable for qualification-based discovery
-- =============================================================================

CREATE TABLE event_staffing_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES marketplace_events(id) ON DELETE CASCADE,
  event_day_id UUID REFERENCES event_days(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('paramedic', 'emt', 'first_aider', 'doctor', 'nurse', 'other')),
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  additional_notes TEXT
);

COMMENT ON TABLE event_staffing_requirements IS 'Staffing requirements per event; event_day_id NULL means applies to all days';
COMMENT ON COLUMN event_staffing_requirements.event_day_id IS 'NULL = applies to all days of the event; set = applies to specific day only';
COMMENT ON COLUMN event_staffing_requirements.role IS 'Staffing role: paramedic, emt, first_aider, doctor, nurse, other — used for qualification-based event discovery filtering';

-- =============================================================================
-- RLS: Enable on all three tables
-- =============================================================================

ALTER TABLE marketplace_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_staffing_requirements ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- RLS: marketplace_events — uses auth.uid(), NOT get_user_org_id()
-- =============================================================================

-- Event poster can CRUD their own events (including drafts)
CREATE POLICY "event_poster_manage_own"
  ON marketplace_events FOR ALL
  USING (posted_by = auth.uid());

-- Verified companies can browse open events only (not drafts, closed, cancelled)
CREATE POLICY "verified_companies_browse_open"
  ON marketplace_events FOR SELECT
  USING (
    status = 'open'
    AND EXISTS (
      SELECT 1 FROM marketplace_companies
      WHERE admin_user_id = auth.uid()
        AND verification_status = 'verified'
        AND can_browse_events = true
    )
  );

-- Platform admin has full access
CREATE POLICY "platform_admin_all_events"
  ON marketplace_events FOR ALL
  USING (is_platform_admin());

-- =============================================================================
-- RLS: event_days — access via parent event
-- =============================================================================

-- Event poster can manage days of their own events
CREATE POLICY "event_day_via_event_poster"
  ON event_days FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM marketplace_events
      WHERE id = event_days.event_id
        AND posted_by = auth.uid()
    )
  );

-- Verified companies can view days of open events
CREATE POLICY "event_day_via_verified_browse"
  ON event_days FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM marketplace_events
      WHERE id = event_days.event_id
        AND status = 'open'
    )
    AND EXISTS (
      SELECT 1 FROM marketplace_companies
      WHERE admin_user_id = auth.uid()
        AND verification_status = 'verified'
        AND can_browse_events = true
    )
  );

-- Platform admin has full access
CREATE POLICY "platform_admin_all_event_days"
  ON event_days FOR ALL
  USING (is_platform_admin());

-- =============================================================================
-- RLS: event_staffing_requirements — access via parent event
-- =============================================================================

-- Event poster can manage staffing requirements of their own events
CREATE POLICY "staffing_via_event_poster"
  ON event_staffing_requirements FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM marketplace_events
      WHERE id = event_staffing_requirements.event_id
        AND posted_by = auth.uid()
    )
  );

-- Verified companies can view staffing requirements of open events
CREATE POLICY "staffing_via_verified_browse"
  ON event_staffing_requirements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM marketplace_events
      WHERE id = event_staffing_requirements.event_id
        AND status = 'open'
    )
    AND EXISTS (
      SELECT 1 FROM marketplace_companies
      WHERE admin_user_id = auth.uid()
        AND verification_status = 'verified'
        AND can_browse_events = true
    )
  );

-- Platform admin has full access
CREATE POLICY "platform_admin_all_staffing"
  ON event_staffing_requirements FOR ALL
  USING (is_platform_admin());

-- =============================================================================
-- TRIGGER: Auto-update updated_at on marketplace_events
-- Reuses the existing update_updated_at_column() function
-- =============================================================================

CREATE TRIGGER update_marketplace_events_updated_at
  BEFORE UPDATE ON marketplace_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- INDEXES
-- =============================================================================

-- marketplace_events indexes
CREATE INDEX idx_events_posted_by ON marketplace_events(posted_by);
CREATE INDEX idx_events_status ON marketplace_events(status);
CREATE INDEX idx_events_event_type ON marketplace_events(event_type);
CREATE INDEX idx_events_quote_deadline ON marketplace_events(quote_deadline);
CREATE INDEX idx_events_location_coordinates ON marketplace_events USING GIST (location_coordinates);
CREATE INDEX idx_events_status_type_deadline ON marketplace_events(status, event_type, quote_deadline);

-- event_days indexes
CREATE INDEX idx_event_days_event_id ON event_days(event_id);
CREATE INDEX idx_event_days_event_date ON event_days(event_date);

-- event_staffing_requirements indexes
CREATE INDEX idx_staffing_event_id ON event_staffing_requirements(event_id);
CREATE INDEX idx_staffing_role ON event_staffing_requirements(role);

-- =============================================================================
-- SUMMARY
-- Tables created: marketplace_events, event_days, event_staffing_requirements
-- Extensions: postgis
-- RLS policies: 9 (3 per table)
-- Indexes: 10
-- Trigger: 1 (updated_at on marketplace_events)
-- =============================================================================
