-- 018_riddor_incidents.sql
-- RIDDOR incident tracking with auto-detection, medic override, and deadline management
-- Phase 6: RIDDOR Auto-Flagging - Plan 01

-- RIDDOR Incidents table: Auto-flagged and manually created RIDDOR-reportable incidents
CREATE TABLE riddor_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  treatment_id UUID NOT NULL REFERENCES treatments(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id),
  org_id UUID NOT NULL REFERENCES organizations(id),

  -- RIDDOR categorization
  category TEXT NOT NULL CHECK (category IN ('specified_injury', 'over_7_day', 'occupational_disease', 'dangerous_occurrence')),
  confidence_level TEXT NOT NULL CHECK (confidence_level IN ('HIGH', 'MEDIUM', 'LOW')),

  -- Auto-detection and override tracking
  auto_flagged BOOLEAN DEFAULT TRUE,
  medic_confirmed BOOLEAN DEFAULT NULL, -- NULL = awaiting review, TRUE = confirmed, FALSE = dismissed
  override_reason TEXT, -- Mandatory when medic confirms or dismisses
  overridden_by UUID REFERENCES profiles(id),
  overridden_at TIMESTAMPTZ,

  -- Deadline management (DATE type for calendar day deadlines)
  deadline_date DATE NOT NULL, -- 10 days for specified_injury, 15 days for over_7_day

  -- Report status and submission tracking
  status TEXT NOT NULL CHECK (status IN ('draft', 'submitted', 'confirmed')) DEFAULT 'draft',
  f2508_pdf_path TEXT, -- Supabase Storage path to generated F2508 PDF
  submitted_at TIMESTAMPTZ,
  submitted_by UUID REFERENCES profiles(id),

  -- Timestamps
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_riddor_incidents_org_id ON riddor_incidents(org_id);
CREATE UNIQUE INDEX idx_riddor_incidents_treatment_id ON riddor_incidents(treatment_id); -- Prevent duplicate detection
CREATE INDEX idx_riddor_incidents_deadline ON riddor_incidents(deadline_date) WHERE status = 'draft'; -- Deadline cron queries
CREATE INDEX idx_riddor_incidents_medic_confirmed ON riddor_incidents(medic_confirmed) WHERE medic_confirmed IS NULL; -- Pending review queries

-- Updated_at trigger
CREATE TRIGGER set_riddor_incidents_updated_at
  BEFORE UPDATE ON riddor_incidents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Table comment for documentation
COMMENT ON TABLE riddor_incidents IS 'RIDDOR-reportable incidents with auto-detection confidence, medic override tracking, and deadline management. Unique constraint on treatment_id prevents duplicate flagging.';

-- RLS Policies

-- Enable RLS
ALTER TABLE riddor_incidents ENABLE ROW LEVEL SECURITY;

-- Medics can view and update incidents for their organization
CREATE POLICY "Medics can view their org's RIDDOR incidents"
  ON riddor_incidents
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Medics can update their org's RIDDOR incidents"
  ON riddor_incidents
  FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Site managers can view incidents for their organization
CREATE POLICY "Site managers can view their org's RIDDOR incidents"
  ON riddor_incidents
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Service role can insert (Edge Function detection)
CREATE POLICY "Service role can insert RIDDOR incidents"
  ON riddor_incidents
  FOR INSERT
  WITH CHECK (true); -- Service role bypass, actual auth via service_role_key
