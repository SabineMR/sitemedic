/**
 * Vertical-Aware Outcome Labels
 *
 * The outcome DB IDs (e.g. "returned-to-work-same-duties") never change —
 * they are stored in Supabase and used in reporting. Only the display labels
 * shown to the medic adapt based on the event/site vertical.
 *
 * Outcomes that are already vertical-agnostic (Sent home, Referred to GP/A&E,
 * Ambulance called, Hospitalized) are not overridden here.
 */

import type { TreatmentVerticalId } from './mechanism-presets';

/** Subset of outcome IDs that have vertical-specific display variants */
type VerticalOutcomeId =
  | 'returned-to-work-same-duties'
  | 'returned-to-work-light-duties';

type OutcomeLabelOverrides = Partial<Record<VerticalOutcomeId, string>>;

const OUTCOME_LABEL_OVERRIDES: Record<TreatmentVerticalId, OutcomeLabelOverrides> = {
  construction: {
    'returned-to-work-same-duties':  'Returned to work — same duties',
    'returned-to-work-light-duties': 'Returned to work — light duties',
  },

  tv_film: {
    'returned-to-work-same-duties':  'Returned to set',
    'returned-to-work-light-duties': 'Returned to set — restricted duties',
  },

  motorsport: {
    'returned-to-work-same-duties':  'Returned to race / event',
    'returned-to-work-light-duties': 'Stood down from racing — restricted',
  },

  festivals: {
    'returned-to-work-same-duties':  'Returned to event / crowd',
    'returned-to-work-light-duties': 'Attended welfare area — monitoring',
  },

  sporting_events: {
    'returned-to-work-same-duties':  'Returned to play',
    'returned-to-work-light-duties': 'Substituted / stood down from play',
  },

  fairs_shows: {
    'returned-to-work-same-duties':  'Returned to show',
    'returned-to-work-light-duties': 'Returned to show — resting',
  },

  corporate: {
    'returned-to-work-same-duties':  'Returned to event',
    'returned-to-work-light-duties': 'Returned to event — resting',
  },

  private_events: {
    'returned-to-work-same-duties':  'Returned to event',
    'returned-to-work-light-duties': 'Remained at event — seated / resting',
  },

  education: {
    'returned-to-work-same-duties':  'Returned to class / activity',
    'returned-to-work-light-duties': 'Returned to supervised rest area',
  },

  outdoor_adventure: {
    'returned-to-work-same-duties':  'Returned to activity / course',
    'returned-to-work-light-duties': 'Stood down — restricted activity',
  },

  general: {
    'returned-to-work-same-duties':  'Returned to activity',
    'returned-to-work-light-duties': 'Returned to activity — light duties',
  },
};

/**
 * Returns the display label for an outcome ID, applying a vertical-specific
 * override if one exists. Falls back to the raw label if no override is defined.
 *
 * @param outcomeId   The stored outcome ID (e.g. "returned-to-work-same-duties")
 * @param rawLabel    The default label from OUTCOME_CATEGORIES
 * @param verticalId  The current org/booking vertical
 */
export function getOutcomeLabel(
  outcomeId: string,
  rawLabel: string,
  verticalId: string | null | undefined
): string {
  if (!verticalId) return rawLabel;

  const overrides = OUTCOME_LABEL_OVERRIDES[verticalId as TreatmentVerticalId];
  if (!overrides) return rawLabel;

  return overrides[outcomeId as VerticalOutcomeId] ?? rawLabel;
}

/**
 * Applies vertical-aware label overrides to the full OUTCOME_CATEGORIES array,
 * returning a new array safe to pass directly to a BottomSheetPicker.
 *
 * @param categories  The base OUTCOME_CATEGORIES array
 * @param verticalId  The current org/booking vertical
 */
export function getVerticalOutcomeCategories(
  categories: { id: string; label: string; severity: string }[],
  verticalId: string | null | undefined
): { id: string; label: string; severity: string }[] {
  return categories.map((cat) => ({
    ...cat,
    label: getOutcomeLabel(cat.id, cat.label, verticalId),
  }));
}

/**
 * Returns the singular noun used for the person being treated —
 * shown in section headings like "1. Worker Information".
 */
export function getPatientLabel(verticalId: string | null | undefined): string {
  const labels: Partial<Record<TreatmentVerticalId, string>> = {
    construction:      'Worker',
    tv_film:           'Crew member',
    motorsport:        'Driver / Competitor',
    festivals:         'Attendee',
    sporting_events:   'Player',
    fairs_shows:       'Visitor',
    corporate:         'Delegate',
    private_events:    'Guest',
    education:         'Student',
    outdoor_adventure: 'Participant',
    general:           'Patient',
  };

  return labels[verticalId as TreatmentVerticalId] ?? 'Patient';
}

/**
 * Returns the location noun for the vertical — e.g. "Set" for Film/TV, "Site" for construction.
 */
export function getLocationLabel(verticalId: string | null | undefined): string {
  const labels: Partial<Record<TreatmentVerticalId, string>> = {
    construction:      'Site',
    tv_film:           'Set',
    motorsport:        'Circuit',
    festivals:         'Venue',
    sporting_events:   'Pitch / Ground',
    fairs_shows:       'Showground',
    corporate:         'Venue',
    private_events:    'Venue',
    education:         'School / Campus',
    outdoor_adventure: 'Location',
    general:           'Site',
  };
  return labels[verticalId as TreatmentVerticalId] ?? 'Site';
}

/**
 * Returns the event/booking noun for the vertical — e.g. "Production" for Film/TV, "Client" for construction.
 */
export function getEventLabel(verticalId: string | null | undefined): string {
  const labels: Partial<Record<TreatmentVerticalId, string>> = {
    construction:      'Client',
    tv_film:           'Production',
    motorsport:        'Event',
    festivals:         'Festival',
    sporting_events:   'Club',
    fairs_shows:       'Show',
    corporate:         'Client',
    private_events:    'Event',
    education:         'School',
    outdoor_adventure: 'Activity',
    general:           'Client',
  };
  return labels[verticalId as TreatmentVerticalId] ?? 'Client';
}
