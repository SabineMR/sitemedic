/**
 * Auth callback route for magic link authentication
 *
 * When users click the magic link in their email, Supabase redirects here.
 * This route exchanges the token for a session, then redirects to the
 * provider app dashboard where the full application lives.
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

  // Get the authenticated user to determine role-based redirect
  const { data: { user } } = await supabase.auth.getUser();
  const providerAppUrl = process.env.NEXT_PUBLIC_PROVIDER_APP_URL || 'http://localhost:30500';

  if (!user) {
    return NextResponse.redirect(new URL('/dashboard', providerAppUrl));
  }

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
  }

  return NextResponse.redirect(new URL(redirectPath, providerAppUrl));
}
