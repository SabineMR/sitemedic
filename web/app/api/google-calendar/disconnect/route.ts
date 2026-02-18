/**
 * Google Calendar OAuth — Disconnect
 *
 * Revokes the Google OAuth token and clears all Google Calendar
 * columns from medic_preferences. Called when a medic clicks
 * "Disconnect" on their profile page.
 */

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke';

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get the medic record
  const { data: medic } = await supabase
    .from('medics')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!medic) {
    return NextResponse.json({ error: 'Medic not found' }, { status: 404 });
  }

  // Get current tokens for revocation
  const { data: prefs } = await supabase
    .from('medic_preferences')
    .select('google_calendar_access_token, google_calendar_refresh_token')
    .eq('medic_id', medic.id)
    .single();

  // Revoke the token with Google (best-effort — don't block on failure)
  if (prefs?.google_calendar_access_token) {
    try {
      await fetch(`${GOOGLE_REVOKE_URL}?token=${prefs.google_calendar_access_token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
    } catch {
      // Token revocation is best-effort
    }
  }

  // Clear all Google Calendar columns
  const { error } = await supabase
    .from('medic_preferences')
    .update({
      google_calendar_enabled: false,
      google_calendar_access_token: null,
      google_calendar_refresh_token: null,
      google_calendar_token_expires_at: null,
      google_calendar_sync_enabled: false,
    })
    .eq('medic_id', medic.id);

  if (error) {
    return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
