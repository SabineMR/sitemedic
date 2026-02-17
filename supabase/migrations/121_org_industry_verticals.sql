-- Migration 121: Add industry_verticals to org_settings
-- Allows each organisation to declare which event/site verticals they serve.
-- This drives context-aware UI labels and compliance checklists across the app.

ALTER TABLE org_settings
  ADD COLUMN IF NOT EXISTS industry_verticals JSONB NOT NULL DEFAULT '["construction"]'::jsonb;

-- Index for filtering orgs by vertical in platform admin views
CREATE INDEX IF NOT EXISTS idx_org_settings_industry_verticals
  ON org_settings USING GIN (industry_verticals);

COMMENT ON COLUMN org_settings.industry_verticals IS
  'Array of vertical IDs this org serves (e.g. ["construction","tv_film","motorsport"]). '
  'Valid values: construction, tv_film, motorsport, festivals, sporting_events, fairs_shows, '
  'corporate, private_events, education, outdoor_adventure.';
