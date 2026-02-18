/**
 * FA Incident Generator — Types
 * Phase 22: Football / Sports Vertical — FOOT-07
 *
 * Replaces the Phase 18 stub types (FAIncidentData) with full player/spectator interfaces.
 */

/** Request body for fa-incident-generator invocations */
export interface FAIncidentRequest {
  /** Treatment ID (from treatments table) — used as primary lookup key */
  incident_id: string;
  /** Must be 'sporting_events'; validated before fetch */
  event_vertical: 'sporting_events';
}

/** Player-specific fields from vertical_extra_fields JSONB */
export interface FootballPlayerFields {
  patient_type: 'player';
  squad_number?: string | null;
  phase_of_play: string;
  contact_type: 'contact' | 'non_contact';
  hia_performed: boolean;
  hia_outcome?: string | null;
  fa_severity: string;
}

/** Spectator-specific fields from vertical_extra_fields JSONB */
export interface FootballSpectatorFields {
  patient_type: 'spectator';
  stand_location: string;
  stand_row_seat?: string | null;
  referral_outcome: string;
  safeguarding_flag: boolean;
  safeguarding_notes?: string | null;
  alcohol_involvement: boolean;
}

export type FootballExtraFields = FootballPlayerFields | FootballSpectatorFields;

/** Normalised data passed to FA Player PDF Document */
export interface FAPlayerPDFData {
  referenceNumber: string;
  incidentDate: string;
  clubName: string;
  playerName: string;
  squadNumber?: string;
  injuryType: string;
  bodyPart: string;
  phaseOfPlay: string;
  contactType: string;
  hiaPerformed: boolean;
  hiaOutcome?: string;
  faSeverity: string;
  treatmentGiven: string;
  outcome: string;
  medicName: string;
  generatedAt: string;
}

/** Normalised data passed to SGSA Spectator PDF Document */
export interface SGSASpectatorPDFData {
  referenceNumber: string;
  incidentDate: string;
  venueName: string;
  standLocation: string;
  standRowSeat?: string;
  injuryType: string;
  treatmentGiven: string;
  referralOutcome: string;
  safeguardingFlag: boolean;
  safeguardingNotes?: string;
  alcoholInvolvement: boolean;
  medicName: string;
  generatedAt: string;
}
