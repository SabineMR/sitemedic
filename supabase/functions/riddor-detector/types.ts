/**
 * RIDDOR Detection Type Definitions
 * Phase 6: RIDDOR Auto-Flagging - Plan 01
 */

export interface RIDDORDetection {
  is_riddor: boolean;
  category: 'specified_injury' | 'over_7_day' | 'occupational_disease' | 'dangerous_occurrence' | null;
  reason: string;
  criteria_matched: string[];
}

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface TreatmentInput {
  injury_type: string;
  body_part: string;
  severity: string;
  treatment_types: string[];
  outcome: string;
}
