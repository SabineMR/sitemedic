-- supabase/seed.sql
-- Seed file for local development and testing

-- Create test organization
INSERT INTO organizations (id, name, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Kai''s Medic Services', NOW(), NOW());

-- Note: To create test users, use the Supabase Dashboard Auth tab:
-- 1. Go to: Authentication > Users > Add User
-- 2. Email: test@example.com
-- 3. Password: (set a test password)
-- 4. User Metadata (JSON):
--    {
--      "org_id": "00000000-0000-0000-0000-000000000001",
--      "full_name": "Test Medic",
--      "role": "medic"
--    }
--
-- The handle_new_user() trigger will automatically create a profile entry
-- The set_user_org_metadata() trigger will set org_id and role in JWT claims

-- Alternatively, use Supabase SQL Editor to manually insert into auth.users:
-- INSERT INTO auth.users (
--   id,
--   email,
--   encrypted_password,
--   email_confirmed_at,
--   raw_user_meta_data,
--   created_at,
--   updated_at
-- ) VALUES (
--   gen_random_uuid(),
--   'test@example.com',
--   crypt('test123', gen_salt('bf')), -- Requires pgcrypto extension
--   NOW(),
--   '{"org_id": "00000000-0000-0000-0000-000000000001", "full_name": "Test Medic", "role": "medic"}'::jsonb,
--   NOW(),
--   NOW()
-- );
