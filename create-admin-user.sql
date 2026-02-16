-- Create admin user for Sabine Resoagli
-- Run this in Supabase Dashboard > SQL Editor

-- Step 1: Create the auth user
-- Go to: Authentication > Users > Add User (via email)
-- Email: sabineresoagli@gmail.com
-- Password: sabineresoagli@gmail.com
-- Auto Confirm User: YES (enable this!)

-- Step 2: After creating the auth user above, run this SQL to create the profile:
-- (Replace 'USER_ID_HERE' with the actual UUID from the auth user you just created)

INSERT INTO profiles (id, email, full_name, role, created_at, updated_at)
VALUES (
  'USER_ID_HERE'::uuid,
  'sabineresoagli@gmail.com',
  'Sabine Resoagli',
  'admin',
  now(),
  now()
)
ON CONFLICT (id) DO UPDATE
SET
  full_name = 'Sabine Resoagli',
  role = 'admin',
  updated_at = now();

-- OR if you want to use the service role key in SQL:
-- This requires the auth.uid() extension

-- Alternative: If your Supabase has the required extensions, you can create both at once:
/*
DO $$
DECLARE
  new_user_id uuid;
BEGIN
  -- This won't work in SQL Editor - you need to use Supabase Auth API
  -- Use the Dashboard method above instead
END $$;
*/
