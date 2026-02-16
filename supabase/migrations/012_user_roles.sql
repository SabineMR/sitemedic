-- Migration 012: User Roles for Permission Management
-- Created: 2026-02-15

-- =============================================================================
-- TABLE: user_roles
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'medic', 'site_manager', 'support')),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  granted_by UUID REFERENCES auth.users(id),
  notes TEXT,

  -- Ensure user can't have duplicate roles
  UNIQUE(user_id, role)
);

CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role);

COMMENT ON TABLE user_roles IS 'User roles for permission management';
COMMENT ON COLUMN user_roles.role IS 'User role: admin, medic, site_manager, support';

-- Enable RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own roles
CREATE POLICY "Users can view own roles"
  ON user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policy: Admins can view all roles
CREATE POLICY "Admins can view all roles"
  ON user_roles
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- Policy: Admins can insert/update/delete roles
CREATE POLICY "Admins can manage roles"
  ON user_roles
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON user_roles TO authenticated;

-- =============================================================================
-- FUNCTION: Assign role to user
-- =============================================================================

CREATE OR REPLACE FUNCTION assign_user_role(
  p_user_id UUID,
  p_role TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_role_id UUID;
BEGIN
  -- Check if caller is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  -- Validate role
  IF p_role NOT IN ('admin', 'medic', 'site_manager', 'support') THEN
    RAISE EXCEPTION 'Invalid role: %', p_role;
  END IF;

  -- Insert role (ON CONFLICT do nothing if already exists)
  INSERT INTO user_roles (user_id, role, granted_by, notes)
  VALUES (p_user_id, p_role, auth.uid(), p_notes)
  ON CONFLICT (user_id, role) DO NOTHING
  RETURNING id INTO v_role_id;

  -- Log role assignment
  INSERT INTO medic_location_audit (
    action_type,
    action_timestamp,
    actor_type,
    actor_user_id,
    description,
    metadata
  ) VALUES (
    'role_assigned',
    NOW(),
    'admin',
    auth.uid(),
    format('Assigned %s role to user %s', p_role, p_user_id),
    jsonb_build_object(
      'target_user_id', p_user_id,
      'role', p_role,
      'notes', p_notes
    )
  );

  RETURN v_role_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION assign_user_role TO authenticated;

COMMENT ON FUNCTION assign_user_role IS 'Assign role to user (admin only)';

-- =============================================================================
-- FUNCTION: Revoke role from user
-- =============================================================================

CREATE OR REPLACE FUNCTION revoke_user_role(
  p_user_id UUID,
  p_role TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_deleted BOOLEAN;
BEGIN
  -- Check if caller is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  -- Delete role
  DELETE FROM user_roles
  WHERE user_id = p_user_id
    AND role = p_role;

  GET DIAGNOSTICS v_deleted = FOUND;

  IF v_deleted THEN
    -- Log role revocation
    INSERT INTO medic_location_audit (
      action_type,
      action_timestamp,
      actor_type,
      actor_user_id,
      description,
      metadata
    ) VALUES (
      'role_revoked',
      NOW(),
      'admin',
      auth.uid(),
      format('Revoked %s role from user %s', p_role, p_user_id),
      jsonb_build_object(
        'target_user_id', p_user_id,
        'role', p_role
      )
    );
  END IF;

  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION revoke_user_role TO authenticated;

COMMENT ON FUNCTION revoke_user_role IS 'Revoke role from user (admin only)';

-- =============================================================================
-- FUNCTION: Get user roles
-- =============================================================================

CREATE OR REPLACE FUNCTION get_user_roles(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  role TEXT,
  granted_at TIMESTAMPTZ,
  granted_by UUID,
  notes TEXT
) AS $$
BEGIN
  -- If no user_id provided, use current user
  IF p_user_id IS NULL THEN
    p_user_id := auth.uid();
  END IF;

  -- Check permission: User can view own roles, admin can view all
  IF p_user_id != auth.uid() AND NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: Can only view own roles';
  END IF;

  RETURN QUERY
  SELECT ur.role, ur.granted_at, ur.granted_by, ur.notes
  FROM user_roles ur
  WHERE ur.user_id = p_user_id
  ORDER BY ur.granted_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_user_roles TO authenticated;

COMMENT ON FUNCTION get_user_roles IS 'Get roles for user (own roles or admin only)';

-- =============================================================================
-- SEED DATA: Create initial admin user (adjust as needed)
-- =============================================================================

-- IMPORTANT: Replace with actual admin user ID after first user signs up
-- This is a placeholder - you'll need to update this after creating your first user

-- Example:
-- INSERT INTO user_roles (user_id, role, notes)
-- VALUES (
--   'YOUR_ADMIN_USER_ID',
--   'admin',
--   'Initial admin user'
-- );

-- For now, add a comment to remember to create admin user
COMMENT ON TABLE user_roles IS 'Remember to assign admin role to first user after signup';
