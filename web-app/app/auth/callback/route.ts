/**
 * Auth callback route for magic link authentication
 *
 * When users click the magic link in their email, Supabase redirects here.
 * This route exchanges the token for a session, then redirects to the
 * main provider app (web/) dashboard since that's where the full app lives.
 */

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(
      new URL('/login?error=' + encodeURIComponent('Invalid login link. Please request a new one.'), requestUrl.origin)
    );
  }

  const supabase = await createClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    console.error('Auth callback error:', exchangeError);
    return NextResponse.redirect(
      new URL('/login?error=' + encodeURIComponent('Authentication failed. Please try again.'), requestUrl.origin)
    );
  }

  // Get the authenticated user to determine their role-based redirect
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      new URL('/login?error=' + encodeURIComponent('Authentication failed. Please try again.'), requestUrl.origin)
    );
  }

  // Redirect to the provider app dashboard (web/ on port 30500 in dev, sitemedic.co.uk in prod)
  const providerAppUrl = process.env.NEXT_PUBLIC_PROVIDER_APP_URL || 'http://localhost:30500';

  const role = user.app_metadata?.role;
  let redirectPath = '/dashboard';

  switch (role) {
    case 'platform_admin':
      redirectPath = '/platform';
      break;
    case 'org_admin':
      redirectPath = '/admin';
      break;
    case 'medic':
      redirectPath = '/medic';
      break;
    default:
      redirectPath = '/dashboard';
  }

  return NextResponse.redirect(new URL(redirectPath, providerAppUrl));
}
