/**
 * Auth callback route for magic link authentication
 *
 * When users click the magic link in their email, Supabase redirects here.
 * This route exchanges the token for a session, then redirects to the
 * homepage (user is now signed in).
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

  // Stay on this site after successful login
  return NextResponse.redirect(new URL('/', requestUrl.origin));
}
