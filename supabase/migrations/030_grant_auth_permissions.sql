-- Grant auth admin access to organizations and profiles tables
-- This is needed for the handle_new_user() trigger to work

-- Grant SELECT on organizations to auth admin
GRANT SELECT ON public.organizations TO supabase_auth_admin;

-- Grant INSERT on profiles to auth admin
GRANT INSERT ON public.profiles TO supabase_auth_admin;

-- Grant USAGE on the user_role enum
GRANT USAGE ON TYPE public.user_role TO supabase_auth_admin;

COMMENT ON TABLE public.organizations IS 'Organizations table - auth admin needs SELECT access for user signup';
