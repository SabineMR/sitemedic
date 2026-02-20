/**
 * Auth callback route for magic link authentication (Marketplace app)
 *
 * Simplified version — always redirects to marketplace root after auth.
 * No role-based routing needed since this is the marketplace app.
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
    const fullName = user.user_metadata?.full_name;
    if (fullName) {
      await supabase
        .from('profiles')
        .update({ full_name: fullName })
        .eq('id', user.id);
    }
  }

  // Redirect to the requested page or marketplace root
  const redirectPath = next || '/';
  return NextResponse.redirect(new URL(redirectPath, requestUrl.origin));
}
