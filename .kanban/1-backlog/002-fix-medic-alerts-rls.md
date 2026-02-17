# Fix: Add RLS Policies to medic_alerts Table

**ID:** TASK-002
**Story:** [STORY-001](../stories/001-security-and-data-integrity.md)
**Priority:** critical
**Branch:** `fix/002-medic-alerts-rls`
**Labels:** security, database

## Description
Migration `008_medic_alerts.sql:232` has:
`-- TODO: Add RLS policies in migration 012_security`
The medic_alerts table has no row-level security — any user can read/write all alerts.

## Acceptance Criteria
- [ ] New migration file adds RLS policies on `medic_alerts`
- [ ] Medics can only read their own alerts
- [ ] Admins can read all alerts within their org
- [ ] Platform admins have full access
- [ ] RLS enabled on table

## Notes
Follow the pattern of existing RLS policies in migrations 011 and 100-113.
