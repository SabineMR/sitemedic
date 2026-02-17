# Build: Drug & Alcohol Test Database Schema

**ID:** TASK-038
**Story:** [STORY-008](../stories/008-da-post-incident.md)
**Priority:** high
**Branch:** `feat/038-da-database-schema`
**Labels:** database, compliance, health-data

## Description
Create a migration for the `da_tests` table to store all D&A test records with full chain-of-custody fields.

## Acceptance Criteria
- [ ] Migration creates `da_tests` table with columns:
  - `id` uuid PK
  - `org_id` uuid FK → organizations
  - `booking_id` uuid FK → bookings (nullable — test may happen outside a shift)
  - `riddor_incident_id` uuid FK → riddor_incidents (nullable)
  - `near_miss_id` uuid FK → near_miss_reports (nullable)
  - `tested_worker_name` text
  - `tested_worker_id` uuid FK → profiles (nullable — worker may not be in system)
  - `medic_id` uuid FK → profiles (who administered the test)
  - `witness_name` text
  - `test_type` text ('breathalyser' | 'urine_dipstick' | 'oral_fluid_swab')
  - `result` text ('negative' | 'positive' | 'refused' | 'inconclusive')
  - `alcohol_level` numeric nullable (BAC reading if breathalyser)
  - `substances_detected` text[] nullable
  - `sample_reference` text (unique ID on the physical test kit)
  - `consent_given` boolean
  - `consent_refused_reason` text nullable
  - `tested_at` timestamptz
  - `created_at` timestamptz default now()
  - `updated_at` timestamptz
- [ ] RLS: medic can insert their own tests; admin can read all within org; client cannot access
- [ ] RLS: tested_worker_id restricted — only medic/admin can read, NOT the client
- [ ] Trigger sets `updated_at` on update
- [ ] Index on: org_id, riddor_incident_id, near_miss_id, tested_at

## Notes
D&A results are sensitive health data under GDPR — must be treated like medical records.
File under existing GDPR data export/delete functions when those run.
Migration number: next available after 120 (check existing migrations).
