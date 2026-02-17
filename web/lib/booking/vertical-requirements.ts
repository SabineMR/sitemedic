/**
 * Vertical Requirements
 *
 * Maps each industry vertical to the special-requirement checkboxes shown
 * on the booking form's ShiftConfig step. Requirements that map to existing
 * DB boolean columns are marked with `dbField` so the form can set the
 * appropriate BookingFormData field. All others are serialised into
 * specialNotes as a comma-separated list when the booking is submitted.
 */

export interface VerticalRequirement {
  /** Unique identifier used as checkbox value */
  id: string;
  /** Short human-readable label shown on the checkbox */
  label: string;
  /** Optional tooltip/description for the admin UI */
  description?: string;
  /**
   * If this requirement maps directly to an existing BookingFormData boolean,
   * name the field here so the ShiftConfig can set it automatically.
   */
  dbField?: 'confinedSpaceRequired' | 'traumaSpecialistRequired';
}

/** All known vertical IDs — must match org_settings.industry_verticals values */
export type BookingVerticalId =
  | 'construction'
  | 'tv_film'
  | 'motorsport'
  | 'festivals'
  | 'sporting_events'
  | 'fairs_shows'
  | 'corporate'
  | 'private_events'
  | 'education'
  | 'outdoor_adventure'
  | 'general';

/** Human-readable labels for each vertical (used in the event-type selector) */
export const VERTICAL_LABELS: Record<BookingVerticalId, string> = {
  construction:      'Construction / Industrial site',
  tv_film:           'TV / Film production',
  motorsport:        'Motorsport / Extreme sports event',
  festivals:         'Music festival / Concert',
  sporting_events:   'Sporting event',
  fairs_shows:       'Fair / Agricultural show',
  corporate:         'Corporate event / Conference',
  private_events:    'Private event (wedding, gala, party)',
  education:         'Education / Youth event',
  outdoor_adventure: 'Outdoor adventure / Endurance event',
  general:           'General / Other',
};

/** Requirements shown per vertical */
export const VERTICAL_REQUIREMENTS: Record<BookingVerticalId, VerticalRequirement[]> = {
  construction: [
    { id: 'confined_space',       label: 'Confined space certification required',          dbField: 'confinedSpaceRequired' },
    { id: 'trauma_specialist',    label: 'Trauma specialist required',                     dbField: 'traumaSpecialistRequired' },
    { id: 'working_at_height',    label: 'Working at height — fall arrest experience',     description: 'Medic must have experience treating falls from height.' },
    { id: 'cscs_required',        label: 'CSCS card required for site access' },
    { id: 'respiratory_hazards',  label: 'Respiratory / chemical hazard on site',          description: 'Site has dust, fume, or chemical exposure risks.' },
    { id: 'plant_machinery',      label: 'Heavy plant / machinery operations on site' },
  ],

  tv_film: [
    { id: 'trauma_specialist',    label: 'Trauma specialist required',                     dbField: 'traumaSpecialistRequired' },
    { id: 'stunt_cover',          label: 'Stunt sequence cover',                           description: 'Medic must be present for all stunt action.' },
    { id: 'pyrotechnic',          label: 'Pyrotechnic / special effects on set' },
    { id: 'water_access',         label: 'Water / marina / aquatic access' },
    { id: 'remote_location',      label: 'Remote or difficult-access location' },
    { id: 'night_shoot',          label: 'Night shoot / extended overnight hours' },
  ],

  motorsport: [
    { id: 'trauma_specialist',    label: 'Trauma specialist required',                     dbField: 'traumaSpecialistRequired' },
    { id: 'fia_grade',            label: 'FIA Medical Grade 1 or 2 required',              description: 'Circuit events under FIA jurisdiction require a graded CMO.' },
    { id: 'trackside_extraction', label: 'Trackside extraction team',                      description: 'Marshals + extraction equipment must be on circuit.' },
    { id: 'helicopter_lz',        label: 'Helicopter LZ coordination required' },
    { id: 'race_control_liaison', label: 'Race control radio liaison',                     description: 'Medic to be on circuit radio net.' },
    { id: 'off_road_access',      label: 'Off-road / ATV vehicle access required' },
  ],

  festivals: [
    { id: 'trauma_specialist',    label: 'Trauma specialist required',                     dbField: 'traumaSpecialistRequired' },
    { id: 'crowd_medicine',       label: 'Crowd medicine trained (DIM MIM)',               description: 'Medic must have crowd medicine qualification.' },
    { id: 'major_incident_plan',  label: 'Major Incident Plan familiarity required',       description: 'Medic to have read and acknowledged the event MIP.' },
    { id: 'under_18s',            label: 'Under-18s on site — safeguarding awareness' },
    { id: 'drug_alcohol',         label: 'Drug & alcohol support protocol required' },
    { id: 'welfare_tent',         label: 'Welfare tent / safe space management' },
  ],

  sporting_events: [
    { id: 'trauma_specialist',    label: 'Trauma specialist required',                     dbField: 'traumaSpecialistRequired' },
    { id: 'crowd_medicine',       label: 'Crowd medicine / spectator cover' },
    { id: 'pitchside',            label: 'Pitchside / track-side positioning required' },
    { id: 'fa_governance',        label: 'FA / governing body medical plan compliance' },
    { id: 'doping_control',       label: 'Doping control officer coordination' },
    { id: 'helicopter_lz',        label: 'Helicopter LZ coordination required' },
  ],

  fairs_shows: [
    { id: 'trauma_specialist',    label: 'Trauma specialist required',                     dbField: 'traumaSpecialistRequired' },
    { id: 'livestock_handling',   label: 'Livestock / agricultural machinery on site' },
    { id: 'crowd_medicine',       label: 'Public crowd cover' },
    { id: 'under_18s',            label: 'Significant under-18 attendance' },
    { id: 'remote_access',        label: 'Remote or field-based access required' },
  ],

  corporate: [
    { id: 'trauma_specialist',    label: 'Trauma specialist required',                     dbField: 'traumaSpecialistRequired' },
    { id: 'dbs_check',            label: 'DBS Enhanced check required' },
    { id: 'executive_presence',   label: 'Executive / VIP attendee — discreet cover required' },
    { id: 'drug_alcohol',         label: 'Drug & alcohol testing required on site' },
  ],

  private_events: [
    { id: 'trauma_specialist',    label: 'Trauma specialist required',                     dbField: 'traumaSpecialistRequired' },
    { id: 'dbs_check',            label: 'DBS Enhanced check required' },
    { id: 'under_18s',            label: 'Under-18s on site — safeguarding awareness' },
    { id: 'alcohol_heavy',        label: 'Heavy alcohol / licensed event' },
    { id: 'remote_location',      label: 'Remote or unusual venue location' },
  ],

  education: [
    { id: 'dbs_check',            label: 'DBS Enhanced check (Children) — mandatory' },
    { id: 'sen_awareness',        label: 'Special Educational Needs (SEN) awareness' },
    { id: 'paediatric_first_aid', label: 'Paediatric First Aid qualification required' },
    { id: 'safeguarding',         label: 'Safeguarding Level 2 certificate required' },
    { id: 'under_18s',            label: 'All attendees under 18' },
  ],

  outdoor_adventure: [
    { id: 'trauma_specialist',    label: 'Trauma specialist required',                     dbField: 'traumaSpecialistRequired' },
    { id: 'wilderness_fr',        label: 'Wilderness / Remote First Responder experience' },
    { id: 'remote_access',        label: 'Remote or difficult-access terrain' },
    { id: 'helicopter_lz',        label: 'Helicopter LZ coordination required' },
    { id: 'water_access',         label: 'Water / swift water / open water access' },
    { id: 'night_operations',     label: 'Overnight / night-time operations' },
  ],

  general: [
    { id: 'confined_space',       label: 'Confined space certification required',          dbField: 'confinedSpaceRequired' },
    { id: 'trauma_specialist',    label: 'Trauma specialist required',                     dbField: 'traumaSpecialistRequired' },
    { id: 'dbs_check',            label: 'DBS Enhanced check required' },
    { id: 'remote_location',      label: 'Remote or difficult-access location' },
    { id: 'under_18s',            label: 'Under-18s on site — safeguarding awareness' },
  ],
};

/**
 * Given an array of selected requirement IDs, return updates to apply
 * to BookingFormData for any requirements that map to DB boolean columns.
 */
export function requirementsToBooleans(
  selectedIds: string[],
  requirements: VerticalRequirement[]
): { confinedSpaceRequired?: boolean; traumaSpecialistRequired?: boolean } {
  const updates: { confinedSpaceRequired?: boolean; traumaSpecialistRequired?: boolean } = {};

  for (const req of requirements) {
    if (req.dbField) {
      updates[req.dbField] = selectedIds.includes(req.id);
    }
  }

  return updates;
}

/**
 * Given selected requirement IDs, return the non-boolean ones as a
 * human-readable comma-separated string for `specialNotes`.
 */
export function requirementsToNotes(
  selectedIds: string[],
  requirements: VerticalRequirement[]
): string {
  return requirements
    .filter((r) => !r.dbField && selectedIds.includes(r.id))
    .map((r) => r.label)
    .join(', ');
}
