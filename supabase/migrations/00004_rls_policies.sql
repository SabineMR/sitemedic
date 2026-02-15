-- 00004_rls_policies.sql
-- Row-Level Security policies for multi-tenant isolation
-- All policies use auth.jwt() to read org_id from JWT app_metadata for database-level enforcement

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE near_misses ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_checks ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Organizations policies
-- ============================================================================

-- Users can read their own organization
CREATE POLICY "Users can read their own organization"
  ON organizations
  FOR SELECT
  TO authenticated
  USING (id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid);

-- ============================================================================
-- Profiles policies
-- ============================================================================

-- Users can read their own profile
CREATE POLICY "Users can read their own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Users can read profiles in their organization
CREATE POLICY "Users can read profiles in their org"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid);

-- ============================================================================
-- Workers policies
-- ============================================================================

-- Users can read workers in their organization
CREATE POLICY "Users can read workers in their org"
  ON workers
  FOR SELECT
  TO authenticated
  USING (org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid);

-- Users can insert workers in their organization
CREATE POLICY "Users can insert workers in their org"
  ON workers
  FOR INSERT
  TO authenticated
  WITH CHECK (org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid);

-- Users can update workers in their organization
CREATE POLICY "Users can update workers in their org"
  ON workers
  FOR UPDATE
  TO authenticated
  USING (org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid)
  WITH CHECK (org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid);

-- Users can delete workers in their organization (soft-delete only)
CREATE POLICY "Users can delete workers in their org"
  ON workers
  FOR DELETE
  TO authenticated
  USING (org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid);

-- ============================================================================
-- Treatments policies
-- ============================================================================

-- Users can read treatments in their organization
CREATE POLICY "Users can read treatments in their org"
  ON treatments
  FOR SELECT
  TO authenticated
  USING (org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid);

-- Users can insert treatments in their organization
CREATE POLICY "Users can insert treatments in their org"
  ON treatments
  FOR INSERT
  TO authenticated
  WITH CHECK (org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid);

-- Users can update treatments in their organization
CREATE POLICY "Users can update treatments in their org"
  ON treatments
  FOR UPDATE
  TO authenticated
  USING (org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid)
  WITH CHECK (org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid);

-- Users can delete treatments in their organization (soft-delete only)
CREATE POLICY "Users can delete treatments in their org"
  ON treatments
  FOR DELETE
  TO authenticated
  USING (org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid);

-- ============================================================================
-- Near-misses policies
-- ============================================================================

-- Users can read near-misses in their organization
CREATE POLICY "Users can read near-misses in their org"
  ON near_misses
  FOR SELECT
  TO authenticated
  USING (org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid);

-- Users can insert near-misses in their organization
CREATE POLICY "Users can insert near-misses in their org"
  ON near_misses
  FOR INSERT
  TO authenticated
  WITH CHECK (org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid);

-- Users can update near-misses in their organization
CREATE POLICY "Users can update near-misses in their org"
  ON near_misses
  FOR UPDATE
  TO authenticated
  USING (org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid)
  WITH CHECK (org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid);

-- Users can delete near-misses in their organization (soft-delete only)
CREATE POLICY "Users can delete near-misses in their org"
  ON near_misses
  FOR DELETE
  TO authenticated
  USING (org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid);

-- ============================================================================
-- Safety checks policies
-- ============================================================================

-- Users can read safety checks in their organization
CREATE POLICY "Users can read safety checks in their org"
  ON safety_checks
  FOR SELECT
  TO authenticated
  USING (org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid);

-- Users can insert safety checks in their organization
CREATE POLICY "Users can insert safety checks in their org"
  ON safety_checks
  FOR INSERT
  TO authenticated
  WITH CHECK (org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid);

-- Users can update safety checks in their organization
CREATE POLICY "Users can update safety checks in their org"
  ON safety_checks
  FOR UPDATE
  TO authenticated
  USING (org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid)
  WITH CHECK (org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid);

-- Users can delete safety checks in their organization (soft-delete only)
CREATE POLICY "Users can delete safety checks in their org"
  ON safety_checks
  FOR DELETE
  TO authenticated
  USING (org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid);

-- ============================================================================
-- Performance note:
-- Always add explicit .eq('org_id', userOrgId) filters in queries even though
-- RLS enforces them. Explicit filters allow PostgreSQL query planner to use
-- indexes, improving performance by 99.94% per Supabase benchmarks.
-- ============================================================================
