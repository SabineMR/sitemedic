-- Migration 115: Lead Capture Tables
-- Created: 2026-02-17
-- Purpose: Create contact_submissions and quote_submissions tables for
--          persisting lead data from the public marketing site.
--          API routes use service role to bypass RLS on INSERT;
--          org users get SELECT + UPDATE; platform admins get full CRUD.
--
-- Note: No moddatetime triggers added. Project convention is manual updated_at
--       in update calls (see existing migrations for this pattern).

-- =============================================================================
-- TABLE: contact_submissions
-- Persists enquiries submitted via the public /contact page.
-- =============================================================================

CREATE TABLE contact_submissions (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id           UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  first_name       TEXT        NOT NULL,
  last_name        TEXT        NOT NULL,
  company          TEXT        NOT NULL,
  email            TEXT        NOT NULL,
  phone            TEXT,
  site_size        TEXT,
  enquiry_type     TEXT        NOT NULL,
  message          TEXT,
  status           TEXT        NOT NULL DEFAULT 'new'
                               CHECK (status IN ('new', 'contacted', 'converted', 'closed')),
  follow_up_notes  TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE contact_submissions IS 'Contact form submissions from public /contact page';

-- Indexes for contact_submissions
CREATE INDEX idx_contact_submissions_org     ON contact_submissions (org_id);
CREATE INDEX idx_contact_submissions_status  ON contact_submissions (status);
CREATE INDEX idx_contact_submissions_created ON contact_submissions (created_at DESC);

-- =============================================================================
-- TABLE: quote_submissions
-- Persists quote builder submissions from the public marketing site.
-- =============================================================================

CREATE TABLE quote_submissions (
  id                    UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id                UUID          NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  quote_ref             TEXT          NOT NULL,
  name                  TEXT          NOT NULL,
  email                 TEXT          NOT NULL,
  phone                 TEXT          NOT NULL,
  company               TEXT,
  worker_count          TEXT,
  project_type          TEXT,
  medic_count           TEXT,
  duration_known        TEXT,
  estimated_duration    TEXT,
  site_address          TEXT,
  coordinates           TEXT,
  what3words_address    TEXT,
  start_date            DATE,
  end_date              DATE,
  project_phase         TEXT,
  special_requirements  TEXT[],
  calculated_price      NUMERIC(10,2),
  status                TEXT          NOT NULL DEFAULT 'new'
                                      CHECK (status IN ('new', 'contacted', 'converted', 'closed')),
  follow_up_notes       TEXT,
  converted_booking_id  UUID          REFERENCES bookings(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ   DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   DEFAULT NOW()
);

COMMENT ON TABLE quote_submissions IS 'Quote builder submissions from public marketing site';

-- Indexes for quote_submissions
CREATE INDEX idx_quote_submissions_org     ON quote_submissions (org_id);
CREATE INDEX idx_quote_submissions_status  ON quote_submissions (status);
CREATE INDEX idx_quote_submissions_created ON quote_submissions (created_at DESC);
CREATE INDEX idx_quote_submissions_ref     ON quote_submissions (quote_ref);

-- =============================================================================
-- RLS: contact_submissions
-- Org-scoped SELECT + UPDATE only.
-- No INSERT policy — public routes use service role which bypasses RLS.
-- No DELETE policy — leads should not be deletable by org users.
-- Platform admins get full CRUD via separate policies below.
-- =============================================================================

ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org users can view their org's contact submissions"
  ON contact_submissions FOR SELECT
  USING (org_id = get_user_org_id());

CREATE POLICY "Org users can update their org's contact submissions"
  ON contact_submissions FOR UPDATE
  USING (org_id = get_user_org_id())
  WITH CHECK (org_id = get_user_org_id());

-- Platform admin policies for contact_submissions
CREATE POLICY "Platform admins can view all contact submissions"
  ON contact_submissions FOR SELECT
  USING (is_platform_admin());

CREATE POLICY "Platform admins can insert contact submissions"
  ON contact_submissions FOR INSERT
  WITH CHECK (is_platform_admin());

CREATE POLICY "Platform admins can update all contact submissions"
  ON contact_submissions FOR UPDATE
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

CREATE POLICY "Platform admins can delete contact submissions"
  ON contact_submissions FOR DELETE
  USING (is_platform_admin());

-- =============================================================================
-- RLS: quote_submissions
-- Org-scoped SELECT + UPDATE only.
-- No INSERT policy — public routes use service role which bypasses RLS.
-- No DELETE policy — leads should not be deletable by org users.
-- Platform admins get full CRUD via separate policies below.
-- =============================================================================

ALTER TABLE quote_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org users can view their org's quote submissions"
  ON quote_submissions FOR SELECT
  USING (org_id = get_user_org_id());

CREATE POLICY "Org users can update their org's quote submissions"
  ON quote_submissions FOR UPDATE
  USING (org_id = get_user_org_id())
  WITH CHECK (org_id = get_user_org_id());

-- Platform admin policies for quote_submissions
CREATE POLICY "Platform admins can view all quote submissions"
  ON quote_submissions FOR SELECT
  USING (is_platform_admin());

CREATE POLICY "Platform admins can insert quote submissions"
  ON quote_submissions FOR INSERT
  WITH CHECK (is_platform_admin());

CREATE POLICY "Platform admins can update all quote submissions"
  ON quote_submissions FOR UPDATE
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

CREATE POLICY "Platform admins can delete quote submissions"
  ON quote_submissions FOR DELETE
  USING (is_platform_admin());

-- =============================================================================
-- SUMMARY
-- =============================================================================
-- Migration complete: Lead capture persistence layer established.
--
-- Tables created:
--   - contact_submissions (3 indexes, 2 org-scoped + 4 platform admin = 6 RLS policies)
--   - quote_submissions   (4 indexes, 2 org-scoped + 4 platform admin = 6 RLS policies)
--
-- Total: 2 tables, 7 indexes, 12 RLS policies
--
-- Downstream plans:
--   - 08-02: /api/contact/submit and /api/quotes/submit write via service role
--   - 08-03: Admin leads inbox reads via org-scoped SELECT
