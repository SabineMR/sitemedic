/**
 * Map treatment record + vertical_extra_fields to SGSA Medical Incident Report data.
 * Phase 22: Football / Sports Vertical — FOOT-07
 */

import type { SGSASpectatorPDFData, FootballSpectatorFields } from './types.ts';

const REFERRAL_LABELS: Record<string, string> = {
  treated_on_site:      'Treated on Site — No Referral',
  referred_to_hospital: 'Referred to Hospital',
  ambulance_conveyed:   'Ambulance Conveyed',
  self_discharged:      'Self-Discharged',
};

export function mapTreatmentToSGSASpectator(
  treatment: Record<string, unknown>,
  extras: FootballSpectatorFields,
): SGSASpectatorPDFData {
  const org = treatment.organizations as Record<string, unknown> | null;
  const treatmentTypes = Array.isArray(treatment.treatment_types) ? treatment.treatment_types : [];

  return {
    referenceNumber: String(treatment.reference_number ?? ''),
    incidentDate: treatment.created_at
      ? new Date(String(treatment.created_at)).toLocaleDateString('en-GB')
      : '',
    venueName: String(org?.company_name ?? 'Unknown Venue'),
    standLocation: extras.stand_location,
    standRowSeat: extras.stand_row_seat ?? undefined,
    injuryType: String(treatment.injury_type ?? ''),
    treatmentGiven: treatmentTypes.join(', ') || String(treatment.treatment_notes ?? ''),
    referralOutcome: REFERRAL_LABELS[extras.referral_outcome] ?? extras.referral_outcome,
    safeguardingFlag: extras.safeguarding_flag,
    safeguardingNotes: extras.safeguarding_notes ?? undefined,
    alcoholInvolvement: extras.alcohol_involvement,
    medicName: String(treatment.medic_id ?? 'Medic'),
    generatedAt: new Date().toISOString(),
  };
}
