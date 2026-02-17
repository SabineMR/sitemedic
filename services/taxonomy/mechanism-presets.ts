/**
 * Mechanism of Injury Presets — per vertical
 *
 * Quick-tap chips shown in the treatment form's "How did the injury occur?" field.
 * Each vertical provides 6–8 relevant presets so the medic can populate the field
 * with a single tap rather than free-typing common mechanisms.
 *
 * The medic can still type freely — these are supplementary shortcuts only.
 * Multiple presets may be selected and are joined with "; ".
 */

export type TreatmentVerticalId =
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

export const MECHANISM_PRESETS_BY_VERTICAL: Record<TreatmentVerticalId, string[]> = {
  construction: [
    'Struck by object',
    'Fall from height',
    'Manual handling',
    'Contact with sharp edge',
    'Slip/trip',
    'Caught in machinery',
    'Repetitive strain',
    'Chemical exposure',
  ],

  tv_film: [
    'Fall from height / set structure',
    'Struck by equipment or prop',
    'Stunt incident',
    'Pyrotechnic / SFX injury',
    'Manual handling on set',
    'Electrical contact',
    'Laceration (prop or equipment)',
    'Vehicle / stunt vehicle incident',
  ],

  motorsport: [
    'Vehicle collision',
    'Motorcycle / bicycle off',
    'Rollover / barrel roll',
    'Driver extraction required',
    'Circuit / track slip or fall',
    'Thrown from vehicle',
    'Burns (fuel, exhaust, friction)',
    'Head impact / helmet contact',
  ],

  festivals: [
    'Crowd crush / compression',
    'Fall in crowd or mosh pit',
    'Intoxication (alcohol)',
    'Substance-related collapse',
    'Heat exhaustion / hyperthermia',
    'Stage barrier crush',
    'Assault / altercation',
    'Hypothermia / cold exposure',
  ],

  sporting_events: [
    'Contact / collision (sport)',
    'Overexertion / muscle strain',
    'Head impact / concussion',
    'Fall during play or warm-up',
    'Impact from equipment (ball, implement)',
    'Sudden cardiac event',
    'Heat exhaustion',
    'Ligament / joint injury',
  ],

  fairs_shows: [
    'Slip / trip / fall (ground surface)',
    'Struck by object (equipment, ride)',
    'Livestock-related incident',
    'Agricultural machinery contact',
    'Overexertion / heat',
    'Allergic reaction',
    'Crowd-related fall',
    'Vehicle / tractor incident on site',
  ],

  corporate: [
    'Slip / trip / fall',
    'Overexertion / strain',
    'Sudden cardiac / medical event',
    'Allergic reaction',
    'Alcohol-related collapse',
    'Fall from stage or platform',
    'Struck by equipment',
    'Stress / anxiety episode',
  ],

  private_events: [
    'Slip / trip / fall',
    'Alcohol-related collapse',
    'Overexertion / dancing',
    'Allergic reaction',
    'Sudden cardiac / medical event',
    'Fall from stage or furniture',
    'Assault / altercation',
    'Heat / outdoor exposure',
  ],

  education: [
    'Fall / trip during activity',
    'Struck by object (sport / play)',
    'Allergic reaction',
    'Seizure',
    'Overexertion / collapse',
    'Behavioural incident / restraint',
    'Head impact',
    'Burn (cookery / science)',
  ],

  outdoor_adventure: [
    'Fall on uneven / technical terrain',
    'Environmental exposure (heat / cold / wet)',
    'Water incident / near drowning',
    'Overexertion / collapse',
    'Technical equipment failure',
    'Animal encounter',
    'Lightning strike / electrical storm',
    'Rock fall / debris strike',
  ],

  general: [
    'Slip / trip / fall',
    'Struck by object',
    'Overexertion / strain',
    'Fall from height',
    'Sudden medical event',
    'Cut / laceration',
    'Allergic reaction',
    'Burns',
  ],
};

/**
 * Returns the appropriate mechanism presets for the given vertical.
 * Falls back to general if the vertical ID is not recognised.
 */
export function getMechanismPresets(verticalId: string | null | undefined): string[] {
  if (!verticalId) return MECHANISM_PRESETS_BY_VERTICAL.general;
  return (
    MECHANISM_PRESETS_BY_VERTICAL[verticalId as TreatmentVerticalId] ??
    MECHANISM_PRESETS_BY_VERTICAL.general
  );
}
