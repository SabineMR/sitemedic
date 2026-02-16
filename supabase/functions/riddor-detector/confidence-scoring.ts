/**
 * RIDDOR Confidence Level Calculation
 * Phase 6: RIDDOR Auto-Flagging - Plan 01
 *
 * Calculates confidence level based on detection signals.
 * Higher confidence = less likely to be false positive.
 */

import { RIDDORDetection, ConfidenceLevel } from './types.ts';

/**
 * Calculate confidence level for RIDDOR detection
 *
 * Confidence levels:
 * - HIGH: Multiple criteria matched OR unambiguous injury type (amputation, fracture)
 * - MEDIUM: Single specified_injury criterion
 * - LOW: Inferred from severity or outcome (needs medic review)
 *
 * @param detection - RIDDOR detection result
 * @returns ConfidenceLevel (HIGH, MEDIUM, or LOW)
 */
export function calculateConfidence(detection: RIDDORDetection): ConfidenceLevel {
  if (!detection.is_riddor) {
    throw new Error('Cannot calculate confidence for non-RIDDOR detection');
  }

  // HIGH confidence: Multiple criteria matched
  if (detection.criteria_matched.length > 1) {
    return 'HIGH';
  }

  // HIGH confidence: Unambiguous injury types with clear regulatory definition
  const highConfidenceInjuries = [
    'Amputation',
    'Fracture (not finger/thumb/toe)',
    'Loss of sight',
    'Scalping requiring hospital treatment',
    'Loss of consciousness',
    'Hypothermia/heat-induced illness/asphyxia',
  ];

  const matchedCriterion = detection.criteria_matched[0];
  if (highConfidenceInjuries.includes(matchedCriterion)) {
    return 'HIGH';
  }

  // MEDIUM confidence: Single specified_injury criterion (crush, serious burn)
  if (detection.category === 'specified_injury') {
    return 'MEDIUM';
  }

  // MEDIUM confidence: Over-7-day with explicit day count in outcome
  if (detection.category === 'over_7_day' && detection.reason.includes('days')) {
    return 'MEDIUM';
  }

  // LOW confidence: Inferred from severity, outcome, or other signals
  // (e.g., hospital referral without explicit day count)
  return 'LOW';
}
