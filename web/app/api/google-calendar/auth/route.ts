/**
 * Google Calendar OAuth — Initiate Authorization
 *
 * Generates the Google OAuth consent URL and redirects the medic
 * to Google's consent screen. After approval, Google redirects
 * to /api/google-calendar/callback with an authorization code.
 *
 * Scopes requested:
 * - calendar.readonly — read events for busy block display
 * - calendar.events — create/delete events for booking push
 */

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
].join(' ');

export async function GET() {
  // Verify the medic is authenticated
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: 'Google Calendar integration is not configured' },
      { status: 500 }
    );
  }

  // Build Google OAuth URL with state = user ID for callback verification
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline', // Gets refresh_token
    prompt: 'consent', // Always show consent to ensure refresh_token
    state: user.id, // Used in callback to identify the medic
  });

  const authUrl = `${GOOGLE_AUTH_URL}?${params.toString()}`;

  return NextResponse.redirect(authUrl);
}
