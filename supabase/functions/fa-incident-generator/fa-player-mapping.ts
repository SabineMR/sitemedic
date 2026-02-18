/**
 * Map treatment record + vertical_extra_fields to FA Match Day Injury Form data.
 * Phase 22: Football / Sports Vertical — FOOT-07
 */

import type { FAPlayerPDFData, FootballPlayerFields } from './types.ts';

const PHASE_OF_PLAY_LABELS: Record<string, string> = {
  in_play:    'In Play',
  set_piece:  'Set Piece',
  warm_up:    'Warm-up',
  half_time:  'Half-time',
  training:   'Training',
  post_match: 'Post-match',
};

const CONTACT_LABELS: Record<string, string> = {
  contact:     'Contact',
  non_contact: 'Non-contact',
};

const HIA_OUTCOME_LABELS: Record<string, string> = {
  hia_assessed_returned:    'Assessed — Cleared to Return',
  hia_concussion_confirmed: 'Concussion Confirmed — Permanently Removed',
  hia_hospital_referred:    'Referred to Hospital',
};

const FA_SEVERITY_LABELS: Record<string, string> = {
  medical_attention: 'Medical Attention Only (returned same day)',
  minor:    'Minor (1–7 days absence)',
  moderate: 'Moderate (8–28 days absence)',
  severe:   'Severe (29–89 days absence)',
  major:    'Major (90+ days absence)',
};

export function mapTreatmentToFAPlayer(
  treatment: Record<string, unknown>,
  extras: FootballPlayerFields,
): FAPlayerPDFData {
  const worker = treatment.workers as Record<string, unknown> | null;
  const org = treatment.organizations as Record<string, unknown> | null;
  const treatmentTypes = Array.isArray(treatment.treatment_types) ? treatment.treatment_types : [];

  return {
    referenceNumber: String(treatment.reference_number ?? ''),
    incidentDate: treatment.created_at
      ? new Date(String(treatment.created_at)).toLocaleDateString('en-GB')
      : '',
    clubName: String(org?.company_name ?? 'Unknown Club'),
    playerName: worker
      ? `${worker.first_name ?? ''} ${worker.last_name ?? ''}`.trim()
      : 'Unknown',
    squadNumber: extras.squad_number ?? undefined,
    injuryType: String(treatment.injury_type ?? ''),
    bodyPart: String(treatment.body_part ?? ''),
    phaseOfPlay: PHASE_OF_PLAY_LABELS[extras.phase_of_play] ?? extras.phase_of_play,
    contactType: CONTACT_LABELS[extras.contact_type] ?? extras.contact_type,
    hiaPerformed: extras.hia_performed,
    hiaOutcome: extras.hia_outcome
      ? HIA_OUTCOME_LABELS[extras.hia_outcome] ?? extras.hia_outcome
      : undefined,
    faSeverity: FA_SEVERITY_LABELS[extras.fa_severity] ?? extras.fa_severity,
    treatmentGiven: treatmentTypes.join(', ') || String(treatment.treatment_notes ?? ''),
    outcome: String(treatment.outcome ?? ''),
    medicName: String(treatment.medic_id ?? 'Medic'),
    generatedAt: new Date().toISOString(),
  };
}
