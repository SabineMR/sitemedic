/**
 * Google Calendar OAuth — Callback Handler
 *
 * Handles the redirect from Google after the medic grants consent.
 * Exchanges the authorization code for tokens and stores them
 * in the medic_preferences table.
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state'); // user ID
  const error = searchParams.get('error');

  // Base redirect URL for the medic profile page
  const origin = request.nextUrl.origin;
  const profileUrl = `${origin}/medic/profile`;

  // Handle user denying consent
  if (error) {
    return NextResponse.redirect(`${profileUrl}?gcal=denied`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${profileUrl}?gcal=error`);
  }

  // Verify the logged-in user matches the state parameter
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.id !== state) {
    return NextResponse.redirect(`${profileUrl}?gcal=error`);
  }

  // Exchange authorization code for tokens
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.redirect(`${profileUrl}?gcal=error`);
  }

  try {
    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      console.error('[GoogleCalendar] Token exchange failed:', tokenResponse.status);
      return NextResponse.redirect(`${profileUrl}?gcal=error`);
    }

    const tokens = await tokenResponse.json();
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    // Look up the medic record for this user
    const { data: medic } = await supabase
      .from('medics')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!medic) {
      return NextResponse.redirect(`${profileUrl}?gcal=error`);
    }

    // Upsert medic_preferences with Google Calendar tokens
    const { error: upsertError } = await supabase
      .from('medic_preferences')
      .upsert(
        {
          medic_id: medic.id,
          google_calendar_enabled: true,
          google_calendar_access_token: tokens.access_token,
          google_calendar_refresh_token: tokens.refresh_token,
          google_calendar_token_expires_at: expiresAt,
          google_calendar_sync_enabled: true,
        },
        { onConflict: 'medic_id' }
      );

    if (upsertError) {
      console.error('[GoogleCalendar] Failed to store tokens:', upsertError);
      return NextResponse.redirect(`${profileUrl}?gcal=error`);
    }

    return NextResponse.redirect(`${profileUrl}?gcal=connected`);
  } catch (err) {
    console.error('[GoogleCalendar] Callback error:', err);
    return NextResponse.redirect(`${profileUrl}?gcal=error`);
  }
}
