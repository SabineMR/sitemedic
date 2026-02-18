/**
 * Google Calendar API Client Utilities
 *
 * Shared helper functions for:
 * - Token refresh (auto-refresh expired access tokens)
 * - Fetching busy times via FreeBusy API
 * - Creating/deleting calendar events
 *
 * Used by OAuth routes, busy-blocks API, and push-event API.
 */

import { createClient } from '@/lib/supabase/server';
import type { GoogleFreeBusyResponse, GoogleCalendarEvent, GoogleTokenResponse } from './types';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

/**
 * Get a valid access token for a medic, refreshing if expired.
 * Returns null if the medic has no Google Calendar connected.
 */
export async function getValidAccessToken(medicId: string): Promise<string | null> {
  const supabase = await createClient();

  const { data: prefs, error } = await supabase
    .from('medic_preferences')
    .select('google_calendar_enabled, google_calendar_access_token, google_calendar_refresh_token, google_calendar_token_expires_at')
    .eq('medic_id', medicId)
    .single();

  if (error || !prefs || !prefs.google_calendar_enabled || !prefs.google_calendar_refresh_token) {
    return null;
  }

  // Check if current access token is still valid (with 5-minute buffer)
  const expiresAt = prefs.google_calendar_token_expires_at
    ? new Date(prefs.google_calendar_token_expires_at)
    : new Date(0);
  const now = new Date();
  const bufferMs = 5 * 60 * 1000; // 5 minutes

  if (prefs.google_calendar_access_token && expiresAt.getTime() - bufferMs > now.getTime()) {
    return prefs.google_calendar_access_token;
  }

  // Token expired — refresh it
  const refreshed = await refreshAccessToken(prefs.google_calendar_refresh_token);
  if (!refreshed) {
    return null;
  }

  // Store the new access token
  const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
  await supabase
    .from('medic_preferences')
    .update({
      google_calendar_access_token: refreshed.access_token,
      google_calendar_token_expires_at: newExpiresAt,
    })
    .eq('medic_id', medicId);

  return refreshed.access_token;
}

/**
 * Refresh an access token using a refresh token.
 */
async function refreshAccessToken(refreshToken: string): Promise<GoogleTokenResponse | null> {
  try {
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      console.error('[GoogleCalendar] Token refresh failed:', response.status);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('[GoogleCalendar] Token refresh error:', error);
    return null;
  }
}

/**
 * Fetch busy times from Google Calendar FreeBusy API.
 * Returns array of { start, end } ISO strings.
 */
export async function fetchFreeBusy(
  accessToken: string,
  timeMin: string,
  timeMax: string
): Promise<Array<{ start: string; end: string }>> {
  try {
    const response = await fetch(`${GOOGLE_CALENDAR_API}/freeBusy`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        timeMin,
        timeMax,
        timeZone: 'Europe/London',
        items: [{ id: 'primary' }],
      }),
    });

    if (!response.ok) {
      console.error('[GoogleCalendar] FreeBusy API error:', response.status);
      return [];
    }

    const data: GoogleFreeBusyResponse = await response.json();
    return data.calendars?.primary?.busy || [];
  } catch (error) {
    console.error('[GoogleCalendar] FreeBusy fetch error:', error);
    return [];
  }
}

/**
 * Create an event on the medic's primary Google Calendar.
 * Returns the created event ID, or null on failure.
 */
export async function createCalendarEvent(
  accessToken: string,
  event: GoogleCalendarEvent
): Promise<string | null> {
  try {
    const response = await fetch(`${GOOGLE_CALENDAR_API}/calendars/primary/events`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      console.error('[GoogleCalendar] Create event error:', response.status);
      return null;
    }

    const data = await response.json();
    return data.id || null;
  } catch (error) {
    console.error('[GoogleCalendar] Create event error:', error);
    return null;
  }
}

/**
 * Delete an event from the medic's primary Google Calendar.
 */
export async function deleteCalendarEvent(
  accessToken: string,
  eventId: string
): Promise<boolean> {
  try {
    const response = await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/primary/events/${encodeURIComponent(eventId)}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return response.ok || response.status === 404; // 404 = already deleted
  } catch (error) {
    console.error('[GoogleCalendar] Delete event error:', error);
    return false;
  }
}
