/**
 * Canonical Vertical Configuration
 *
 * Single source of truth for per-vertical metadata used across the multi-vertical system.
 * Each entry defines the display label, RIDDOR applicability, terminology (patient/location/client),
 * construction-domain cert priority order, and the PDF generator Edge Function name.
 *
 * This file is additive — existing taxonomy files (vertical-compliance.ts,
 * certification-types.ts, vertical-outcome-labels.ts, etc.) are NOT changed.
 * They remain the functional source for their respective concerns.
 *
 * Phase 18.5: construction entry (reference implementation)
 * Phase 19:   motorsport entry
 * Phase 20:   festivals entry
 * Phase 21:   film_tv entry
 * Phase 22:   football entry
 */

export interface VerticalConfig {
  /** Display label shown in admin UI and booking form */
  label: string;
  /** Whether HSE RIDDOR (2013) applies to the typical patient in this vertical */
  riddorApplies: boolean;
  /** Singular noun for the person being treated (e.g. "Worker", "Attendee") */
  patientTerm: string;
  /** Noun for the work location (e.g. "Site", "Venue", "Circuit / Paddock") */
  locationTerm: string;
  /** Noun for the client / employer / event organiser (e.g. "Client", "Organiser") */
  clientTerm: string;
  /**
   * Ordered list of cert type IDs, most relevant first.
   * IDs must match keys in CERT_TYPES (services/taxonomy/certification-types.ts).
   * This ordering is used in the canonical config for reference by Phases 19–22.
   * The existing getRecommendedCertTypes() in certification-types.ts is the runtime function.
   */
  certOrdering: string[];
  /** Edge Function name that generates the incident report PDF for this vertical */
  pdfGenerator: string;
}

/**
 * Canonical vertical configuration record.
 * Key is the vertical ID string stored in org_settings.industry_verticals and
 * treatments.event_vertical.
 */
export const VERTICAL_CONFIG: Record<string, VerticalConfig> = {
  construction: {
    label: 'Construction & Infrastructure',
    riddorApplies: true,
    patientTerm: 'Worker',
    locationTerm: 'Site',
    clientTerm: 'Client',
    certOrdering: [
      'CSCS',
      'CPCS',
      'IPAF',
      'Gas Safe',
      'FREC 3',
      'FREC 4',
      'PHEC',
      'HCPC Paramedic',
      'ALS Provider',
      'PHTLS',
      'PASMA',
    ],
    pdfGenerator: 'riddor-f2508-generator',
  },
  // Phase 19: motorsport entry — GCS form, Motorsport UK PDF, riddorApplies: false
  // Phase 20: festivals entry — Purple Guide PDF, riddorApplies: false
  // Phase 21: film_tv entry — F2508 reused, riddorApplies: true
  // Phase 22: football entry — FA / SGSA PDF, riddorApplies: false
};

/**
 * Get the canonical config for a vertical ID.
 * Returns undefined if the vertical is not yet registered in VERTICAL_CONFIG.
 * (Use getVerticalCompliance() from vertical-compliance.ts for RIDDOR/framework details.)
 */
export function getVerticalConfig(verticalId: string): VerticalConfig | undefined {
  return VERTICAL_CONFIG[verticalId];
}
