'use client';

/**
 * useOrgLabels — context-aware UI terminology
 *
 * Returns label strings that adapt to the org's selected industry verticals.
 * Import and call this hook in any client component that displays
 * worker/attendee/crew terminology.
 *
 * Priority order (first matching vertical wins):
 *  motorsport        → Competitor / Circuit / Race day
 *  tv_film           → Crew / Set / Production day
 *  festivals         → Attendee / Venue / Event day
 *  sporting_events   → Player / Pitch / Ground / Match day
 *  education         → Student / Campus / Session
 *  outdoor_adventure → Participant / Course / Event day
 *  construction      → Worker / Site / Shift
 *  (default)         → Attendee / Venue / Day
 */

import { useOrg } from '@/contexts/org-context';
import type { VerticalId } from '@/contexts/org-context';

export interface OrgLabels {
  /** Singular noun for the people on site (e.g. "Worker", "Attendee", "Crew member") */
  personSingular: string;
  /** Plural noun for people on site (e.g. "Workers", "Attendees", "Crew") */
  personPlural: string;
  /** Noun for the place (e.g. "Site", "Venue", "Circuit") */
  locationTerm: string;
  /** What a booking period is called (e.g. "Shift", "Event day", "Race day") */
  periodTerm: string;
  /** Label for the booking/event itself (e.g. "Booking", "Production", "Event") */
  eventTerm: string;
  /** Primary vertical ID being used for label resolution */
  primaryVertical: VerticalId | null;
}

const LABEL_MAP: Record<VerticalId, OrgLabels> = {
  motorsport: {
    personSingular: 'Competitor',
    personPlural:   'Competitors',
    locationTerm:   'Circuit',
    periodTerm:     'Race day',
    eventTerm:      'Event',
    primaryVertical: 'motorsport',
  },
  tv_film: {
    personSingular: 'Crew member',
    personPlural:   'Crew',
    locationTerm:   'Set',
    periodTerm:     'Production day',
    eventTerm:      'Production',
    primaryVertical: 'tv_film',
  },
  festivals: {
    personSingular: 'Attendee',
    personPlural:   'Attendees',
    locationTerm:   'Venue',
    periodTerm:     'Festival day',
    eventTerm:      'Festival',
    primaryVertical: 'festivals',
  },
  sporting_events: {
    personSingular:  'Player',
    personPlural:    'Players',
    locationTerm:    'Pitch / Ground',
    periodTerm:      'Match day',
    eventTerm:       'Club',
    primaryVertical: 'sporting_events',
  },
  education: {
    personSingular: 'Student',
    personPlural:   'Students',
    locationTerm:   'Campus',
    periodTerm:     'Session',
    eventTerm:      'Event',
    primaryVertical: 'education',
  },
  outdoor_adventure: {
    personSingular: 'Participant',
    personPlural:   'Participants',
    locationTerm:   'Course',
    periodTerm:     'Event day',
    eventTerm:      'Event',
    primaryVertical: 'outdoor_adventure',
  },
  fairs_shows: {
    personSingular: 'Visitor',
    personPlural:   'Visitors',
    locationTerm:   'Showground',
    periodTerm:     'Show day',
    eventTerm:      'Show',
    primaryVertical: 'fairs_shows',
  },
  corporate: {
    personSingular: 'Delegate',
    personPlural:   'Delegates',
    locationTerm:   'Venue',
    periodTerm:     'Event day',
    eventTerm:      'Event',
    primaryVertical: 'corporate',
  },
  private_events: {
    personSingular: 'Guest',
    personPlural:   'Guests',
    locationTerm:   'Venue',
    periodTerm:     'Event day',
    eventTerm:      'Event',
    primaryVertical: 'private_events',
  },
  construction: {
    personSingular: 'Worker',
    personPlural:   'Workers',
    locationTerm:   'Site',
    periodTerm:     'Shift',
    eventTerm:      'Booking',
    primaryVertical: 'construction',
  },
  general: {
    personSingular: 'Attendee',
    personPlural:   'Attendees',
    locationTerm:   'Venue',
    periodTerm:     'Day',
    eventTerm:      'Event',
    primaryVertical: 'general',
  },
};

/** Priority order when an org has multiple verticals */
const PRIORITY: VerticalId[] = [
  'motorsport', 'tv_film', 'festivals', 'sporting_events',
  'outdoor_adventure', 'fairs_shows', 'corporate', 'private_events',
  'education', 'construction',
];

const DEFAULT_LABELS: OrgLabels = {
  personSingular: 'Attendee',
  personPlural:   'Attendees',
  locationTerm:   'Venue',
  periodTerm:     'Day',
  eventTerm:      'Event',
  primaryVertical: null,
};

/**
 * Returns context-aware terminology for the current org's industry vertical(s).
 *
 * @example
 * ```tsx
 * 'use client';
 * import { useOrgLabels } from '@/lib/org-labels';
 *
 * export function WorkerCountField() {
 *   const { personPlural, locationTerm } = useOrgLabels();
 *   return <label>Max {personPlural} at {locationTerm}</label>;
 * }
 * ```
 */
export function useOrgLabels(): OrgLabels {
  const { industryVerticals } = useOrg();

  if (!industryVerticals || industryVerticals.length === 0) {
    return DEFAULT_LABELS;
  }

  // If only one vertical, use it directly
  if (industryVerticals.length === 1) {
    return LABEL_MAP[industryVerticals[0]] ?? DEFAULT_LABELS;
  }

  // Multiple verticals: pick by priority order
  for (const id of PRIORITY) {
    if (industryVerticals.includes(id)) {
      return LABEL_MAP[id];
    }
  }

  return DEFAULT_LABELS;
}

/**
 * Returns the label map for a specific vertical ID (useful for platform admin
 * views where you want to display all orgs' terminology).
 */
export function getLabelsForVertical(id: VerticalId): OrgLabels {
  return LABEL_MAP[id] ?? DEFAULT_LABELS;
}
