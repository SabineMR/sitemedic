/**
 * Auth callback route for magic link authentication
 *
 * When users click the magic link in their email, Supabase redirects here.
 * This route exchanges the token for a session, ensures a profile exists
 * for new users, then redirects to the appropriate dashboard by role.
 */

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next');

  if (!code) {
    return NextResponse.redirect(
      new URL('/login?error=' + encodeURIComponent('Invalid login link. Please request a new one.'), requestUrl.origin)
    );
  }

  const supabase = await createClient();

  // Exchange the code for a session
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    console.error('Auth callback error:', exchangeError);
    return NextResponse.redirect(
      new URL('/login?error=' + encodeURIComponent('Authentication failed. Please try again.'), requestUrl.origin)
    );
  }

  // Get the authenticated user
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      new URL('/login?error=' + encodeURIComponent('Authentication failed. Please try again.'), requestUrl.origin)
    );
  }

  // Check if profile exists (new user on first sign-in via magic link)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, org_id')
    .eq('id', user.id)
    .single();

  if (!profile) {
    // New user — profile will be created by the handle_new_user() database trigger.
    // Update the user's display name from metadata if provided during signup.
    const fullName = user.user_metadata?.full_name;
    if (fullName) {
      await supabase
        .from('profiles')
        .update({ full_name: fullName })
        .eq('id', user.id);
    }
  }

  // Determine redirect destination based on user role
  const role = profile?.role || user.app_metadata?.role;

  let redirectPath = next || '/';

  if (!next) {
    switch (role) {
      case 'platform_admin':
        redirectPath = '/platform';
        break;
      case 'org_admin':
        redirectPath = '/admin';
        break;
      case 'site_manager':
        redirectPath = '/dashboard';
        break;
      case 'medic':
        redirectPath = '/medic';
        break;
      default:
        redirectPath = '/dashboard';
    }
  }

  return NextResponse.redirect(new URL(redirectPath, requestUrl.origin));
}
