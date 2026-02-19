-- Migration 138: Add company_name to profiles for site managers
-- Site managers are external users from client companies.
-- This column stores their employer/company name for display on the Team screen.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_name TEXT;

COMMENT ON COLUMN profiles.company_name IS 'Employer/company name for site managers';
