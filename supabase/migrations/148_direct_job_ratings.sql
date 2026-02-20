-- Migration 148: Direct Job Ratings
-- Phase 34.1: Self-Procured Jobs -- Plan 05
-- Created: 2026-02-19
-- Purpose: Create job_ratings table for bidirectional ratings on self-procured jobs.
--          Company admin can rate the client, and clients can rate the company.
--          Phase 36 (Ratings, Messaging & Disputes) will extend this for marketplace jobs.
--
-- Key invariant: One rating per rater per job (UNIQUE on job_id + rater_user_id).

-- =============================================================================
-- TABLE: job_ratings
-- Purpose: Star ratings (1-5) with optional review text for completed jobs
-- =============================================================================

CREATE TABLE job_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The job being rated (marketplace_events with source='direct' initially)
  job_id UUID NOT NULL REFERENCES marketplace_events(id) ON DELETE CASCADE,

  -- Optional booking reference (may be NULL for direct jobs without a booking)
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,

  -- Who submitted the rating
  rater_user_id UUID NOT NULL REFERENCES auth.users(id),

  -- Rater type: 'company' (admin rating the client) or 'client' (client rating the company)
  rater_type TEXT NOT NULL CHECK (rater_type IN ('company', 'client')),

  -- Star rating 1-5
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),

  -- Optional written review
  review TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One rating per rater per job
  UNIQUE(job_id, rater_user_id)
);

COMMENT ON TABLE job_ratings IS 'Bidirectional ratings for completed jobs; company rates client and client rates company';
COMMENT ON COLUMN job_ratings.rater_type IS 'company = admin rating the client; client = client rating the company';
COMMENT ON COLUMN job_ratings.rating IS 'Star rating from 1 (poor) to 5 (excellent)';
COMMENT ON COLUMN job_ratings.review IS 'Optional free-text review accompanying the star rating';

-- =============================================================================
-- RLS: Enable on job_ratings
-- =============================================================================

ALTER TABLE job_ratings ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view ratings (ratings are public within the platform)
CREATE POLICY "job_ratings_view"
  ON job_ratings FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Rater can insert their own rating
CREATE POLICY "job_ratings_insert_own"
  ON job_ratings FOR INSERT
  WITH CHECK (rater_user_id = auth.uid());

-- Rater can update their own rating
CREATE POLICY "job_ratings_update_own"
  ON job_ratings FOR UPDATE
  USING (rater_user_id = auth.uid());

-- Rater can delete their own rating
CREATE POLICY "job_ratings_delete_own"
  ON job_ratings FOR DELETE
  USING (rater_user_id = auth.uid());

-- Platform admin has full access
CREATE POLICY "job_ratings_platform_admin"
  ON job_ratings FOR ALL
  USING (is_platform_admin());

-- =============================================================================
-- TRIGGER: Auto-update updated_at
-- =============================================================================

CREATE TRIGGER update_job_ratings_updated_at
  BEFORE UPDATE ON job_ratings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX idx_job_ratings_job_id ON job_ratings(job_id);
CREATE INDEX idx_job_ratings_rater_user_id ON job_ratings(rater_user_id);

-- =============================================================================
-- SUMMARY
-- Tables created: job_ratings (1)
-- RLS policies: 5 (view, insert_own, update_own, delete_own, platform_admin)
-- Triggers: 1 (updated_at)
-- Indexes: 2 (job_id, rater_user_id)
-- Constraints: UNIQUE(job_id, rater_user_id), CHECK(rating 1-5), CHECK(rater_type)
-- =============================================================================
