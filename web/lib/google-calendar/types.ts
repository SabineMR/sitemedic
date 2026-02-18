/**
 * Google Calendar Integration Types
 *
 * TypeScript interfaces for Google Calendar API responses,
 * busy blocks, and calendar event payloads.
 */

/** Google Calendar FreeBusy API response */
export interface GoogleFreeBusyResponse {
  kind: string;
  timeMin: string;
  timeMax: string;
  calendars: Record<string, {
    busy: Array<{ start: string; end: string }>;
    errors?: Array<{ domain: string; reason: string }>;
  }>;
}

/** Google Calendar Event resource (subset of fields we use) */
export interface GoogleCalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  status?: string;
}

/** Google OAuth token response */
export interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string; // Only on initial authorization
  scope: string;
  token_type: string;
}

/** A busy block from any source (Google Calendar or manual) */
export interface BusyBlock {
  id: string;
  medicId: string;
  source: 'google_calendar' | 'manual' | 'time_off';
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  reason?: string;
}

/** Response from the busy-blocks API endpoint */
export interface BusyBlocksResponse {
  busyBlocks: Record<string, BusyBlock[]>; // keyed by medicId
}
