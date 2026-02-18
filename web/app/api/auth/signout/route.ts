/**
 * Sign out API route
 *
 * Handles user sign out and redirects to login page.
 */

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  // Redirect to login on the SAME origin (preserves subdomain context)
  // Without this, signing out at apex.sitemedic.co.uk would redirect to sitemedic.co.uk
  const origin = request.headers.get('origin')
    || request.headers.get('referer')?.split('/').slice(0, 3).join('/')
    || process.env.NEXT_PUBLIC_SITE_URL
    || 'http://localhost:30500';
  return NextResponse.redirect(new URL('/login', origin));
}
