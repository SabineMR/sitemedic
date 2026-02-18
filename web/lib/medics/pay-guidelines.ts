/**
 * Pay Guidelines
 *
 * Platform reference table of suggested hourly rates by UK medical
 * classification and experience band. These are guidance only — admin
 * sets the actual rate per medic manually.
 *
 * Bands:
 *   0-2 years  → "low"  (entry-level for the classification)
 *   3-5 years  → "mid"  (solid experience)
 *   6+ years   → "high" (senior / specialist)
 */

import { MedicClassification } from '@/lib/medics/experience';

interface RateBand {
  low: number;   // GBP/hr — 0-2 years experience
  mid: number;   // GBP/hr — 3-5 years experience
  high: number;  // GBP/hr — 6+ years experience
}

const PAY_GUIDELINES: Record<MedicClassification, RateBand> = {
  first_aider:             { low: 10, mid: 12, high: 14 },
  eca:                     { low: 11, mid: 13, high: 15 },
  efr:                     { low: 12, mid: 14, high: 16 },
  emt:                     { low: 13, mid: 15, high: 18 },
  aap:                     { low: 14, mid: 17, high: 20 },
  paramedic:               { low: 16, mid: 20, high: 24 },
  specialist_paramedic:    { low: 20, mid: 25, high: 30 },
  critical_care_paramedic: { low: 25, mid: 30, high: 38 },
  registered_nurse:        { low: 18, mid: 22, high: 28 },
  doctor:                  { low: 35, mid: 50, high: 75 },
};

interface SuggestedRate {
  range: string;  // e.g. "£16-20/hr"
  band: string;   // e.g. "3-5 years"
}

/**
 * Get the suggested hourly rate range for a classification and years of experience.
 *
 * @param classification - UK medical classification
 * @param yearsExperience - Number of years in role
 * @returns Suggested range string and band label, or null if classification not found
 */
export function getSuggestedRate(
  classification: MedicClassification,
  yearsExperience: number
): SuggestedRate | null {
  const rates = PAY_GUIDELINES[classification];
  if (!rates) return null;

  if (yearsExperience <= 2) {
    return {
      range: `\u00A3${rates.low}\u2013${rates.mid}/hr`,
      band: '0-2 years',
    };
  } else if (yearsExperience <= 5) {
    return {
      range: `\u00A3${rates.mid}\u2013${rates.high}/hr`,
      band: '3-5 years',
    };
  } else {
    return {
      range: `\u00A3${rates.high}+/hr`,
      band: '6+ years',
    };
  }
}
