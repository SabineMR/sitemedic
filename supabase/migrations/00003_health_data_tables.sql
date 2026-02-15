-- 00003_health_data_tables.sql
-- Create health data tables for treatments, workers, near-misses, and safety checks
-- All tables use UUID primary keys for offline record creation
-- All tables include org_id for multi-tenant RLS
-- All tables have soft-delete support via deleted_at for sync

-- Workers table: Construction site workers receiving medical treatment
CREATE TABLE workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  company TEXT,
  role TEXT,
  phone TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  health_notes TEXT,
  consent_given BOOLEAN DEFAULT FALSE,
  consent_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes for workers table
CREATE INDEX idx_workers_org_id ON workers(org_id);
CREATE INDEX idx_workers_deleted_at ON workers(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_workers_company ON workers(company);
CREATE INDEX idx_workers_name ON workers(last_name, first_name);

-- Attach updated_at trigger
CREATE TRIGGER set_workers_updated_at
  BEFORE UPDATE ON workers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE workers IS 'Construction site workers with health profiles, emergency contacts, and consent records. Soft-delete for sync.';

-- Treatments table: Medical treatment records logged by medics
CREATE TABLE treatments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  worker_id UUID REFERENCES workers(id),
  medic_id UUID REFERENCES profiles(id),
  injury_type TEXT NOT NULL,
  body_part TEXT,
  severity TEXT CHECK (severity IN ('minor', 'moderate', 'major', 'critical')),
  treatment_notes TEXT,
  outcome TEXT CHECK (outcome IN ('returned_to_work', 'sent_home', 'hospital_referral', 'ambulance_called')),
  is_riddor_reportable BOOLEAN DEFAULT FALSE,
  riddor_confidence TEXT,
  photo_uris JSONB DEFAULT '[]',
  signature_uri TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes for treatments table
CREATE INDEX idx_treatments_org_id ON treatments(org_id);
CREATE INDEX idx_treatments_worker_id ON treatments(worker_id);
CREATE INDEX idx_treatments_medic_id ON treatments(medic_id);
CREATE INDEX idx_treatments_created_at ON treatments(created_at);
CREATE INDEX idx_treatments_deleted_at ON treatments(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_treatments_severity ON treatments(severity);
CREATE INDEX idx_treatments_riddor ON treatments(is_riddor_reportable) WHERE is_riddor_reportable = TRUE;

-- Attach updated_at trigger
CREATE TRIGGER set_treatments_updated_at
  BEFORE UPDATE ON treatments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE treatments IS 'Medical treatment records with injury details, RIDDOR flagging, photos, and digital signatures. Soft-delete for sync.';

-- Near-misses table: Safety incident reports
CREATE TABLE near_misses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  reported_by UUID REFERENCES profiles(id),
  category TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description TEXT NOT NULL,
  location TEXT,
  photo_uris JSONB DEFAULT '[]',
  corrective_action TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes for near_misses table
CREATE INDEX idx_near_misses_org_id ON near_misses(org_id);
CREATE INDEX idx_near_misses_reported_by ON near_misses(reported_by);
CREATE INDEX idx_near_misses_created_at ON near_misses(created_at);
CREATE INDEX idx_near_misses_deleted_at ON near_misses(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_near_misses_severity ON near_misses(severity);
CREATE INDEX idx_near_misses_category ON near_misses(category);

-- Attach updated_at trigger
CREATE TRIGGER set_near_misses_updated_at
  BEFORE UPDATE ON near_misses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE near_misses IS 'Safety incident near-miss reports with categorization, severity, photos, and corrective actions. Soft-delete for sync.';

-- Safety checks table: Daily safety checklist completion records
CREATE TABLE safety_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  medic_id UUID REFERENCES profiles(id),
  check_date DATE NOT NULL,
  items JSONB NOT NULL, -- Array of {item: string, status: 'pass'|'fail'|'na', notes: string}
  overall_status TEXT CHECK (overall_status IN ('pass', 'fail', 'partial')),
  photo_uris JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes for safety_checks table
CREATE INDEX idx_safety_checks_org_id ON safety_checks(org_id);
CREATE INDEX idx_safety_checks_medic_id ON safety_checks(medic_id);
CREATE INDEX idx_safety_checks_check_date ON safety_checks(check_date);
CREATE INDEX idx_safety_checks_deleted_at ON safety_checks(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_safety_checks_overall_status ON safety_checks(overall_status);

-- Attach updated_at trigger
CREATE TRIGGER set_safety_checks_updated_at
  BEFORE UPDATE ON safety_checks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE safety_checks IS 'Daily safety checklist completion records with JSONB items, overall status, and photo evidence. Soft-delete for sync.';
