/**
 * Sign out API route
 *
 * Handles user sign out and redirects to login page.
 */

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:30500'));
}
