-- Fix handle_new_user() trigger to use default organization when org_id not provided
-- This allows users to sign up without specifying an organization

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_org_id UUID;
BEGIN
  -- Get the first organization as default (Apex Safety Group)
  SELECT id INTO default_org_id FROM organizations LIMIT 1;

  -- If no organization exists, create a default one
  IF default_org_id IS NULL THEN
    INSERT INTO organizations (name) VALUES ('Default Organization')
    RETURNING id INTO default_org_id;
  END IF;

  -- Insert profile with org_id from metadata or use default
  INSERT INTO profiles (id, org_id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(
      (NEW.raw_user_meta_data->>'org_id')::UUID,
      default_org_id
    ),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'Unknown User'),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'site_manager'::user_role)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION handle_new_user() IS 'Automatically creates a profile when a new user signs up. Uses default organization if org_id not provided in metadata.';
