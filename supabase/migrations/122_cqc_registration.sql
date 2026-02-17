-- Migration 122: CQC Registration fields
-- Adds Care Quality Commission registration data at two levels:
--   1. medics.cqc_registration_number  — individual medic's CQC number (if they are the regulated provider)
--   2. org_settings: cqc_registered, cqc_registration_number, cqc_registration_date
--      — org-level CQC registration (if SiteMedic / the org is the regulated provider)

-- ──────────────────────────────────────────────────────────
-- Medics: individual CQC registration number
-- ──────────────────────────────────────────────────────────
ALTER TABLE medics
  ADD COLUMN IF NOT EXISTS cqc_registration_number TEXT;

COMMENT ON COLUMN medics.cqc_registration_number IS
  'CQC (Care Quality Commission) registration number for this medic, '
  'if they operate as an individually regulated healthcare provider.';

-- ──────────────────────────────────────────────────────────
-- Org Settings: organisation-level CQC compliance
-- ──────────────────────────────────────────────────────────
ALTER TABLE org_settings
  ADD COLUMN IF NOT EXISTS cqc_registered          BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS cqc_registration_number TEXT,
  ADD COLUMN IF NOT EXISTS cqc_registration_date   DATE;

COMMENT ON COLUMN org_settings.cqc_registered IS
  'Whether this organisation is registered with the CQC as a regulated health/social care provider.';

COMMENT ON COLUMN org_settings.cqc_registration_number IS
  'CQC provider registration number for the organisation.';

COMMENT ON COLUMN org_settings.cqc_registration_date IS
  'Date on which the organisation''s CQC registration was granted.';
