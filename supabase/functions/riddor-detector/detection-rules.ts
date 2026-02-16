/**
 * RIDDOR Detection Rules
 * Phase 6: RIDDOR Auto-Flagging - Plan 01
 *
 * Rule-based algorithm matching HSE RIDDOR criteria.
 * Based on RIDDOR Regulations 2013 - Specified Injuries and Over-7-Day injuries.
 *
 * References:
 * - https://www.hse.gov.uk/riddor/specified-injuries.htm
 * - https://www.hse.gov.uk/riddor/reportable-incidents.htm
 */

import { RIDDORDetection, TreatmentInput } from './types.ts';

/**
 * Detect if a treatment meets RIDDOR reportable criteria
 *
 * @param treatment - Treatment data from treatments table
 * @returns RIDDORDetection with is_riddor flag, category, reason, and matched criteria
 */
export function detectRIDDOR(treatment: TreatmentInput): RIDDORDetection {
  const matched: string[] = [];

  // ========================================
  // RIDDOR Specified Injuries (Regulation 4)
  // ========================================

  // 1. Fractures (excluding fingers, thumbs, toes)
  // HSE exception: Fractures to fingers, thumbs, and toes are NOT reportable
  if (treatment.injury_type === 'fracture') {
    const excludedBodyParts = ['hand_finger', 'hand_thumb', 'foot_toe', 'finger', 'thumb', 'toe'];
    const isExcluded = excludedBodyParts.some(part =>
      treatment.body_part?.toLowerCase().includes(part.toLowerCase())
    );

    if (!isExcluded) {
      matched.push('Fracture (not finger/thumb/toe)');
      return {
        is_riddor: true,
        category: 'specified_injury',
        reason: `Fracture to ${treatment.body_part} is RIDDOR-reportable`,
        criteria_matched: matched,
      };
    }
  }

  // 2. Amputation (all reportable)
  if (treatment.injury_type === 'amputation') {
    matched.push('Amputation');
    return {
      is_riddor: true,
      category: 'specified_injury',
      reason: 'All amputations are RIDDOR-reportable',
      criteria_matched: matched,
    };
  }

  // 3. Loss of sight (permanent or temporary)
  if (treatment.injury_type === 'loss-of-sight') {
    matched.push('Loss of sight');
    return {
      is_riddor: true,
      category: 'specified_injury',
      reason: 'Loss of sight (temporary or permanent) is RIDDOR-reportable',
      criteria_matched: matched,
    };
  }

  // 4. Crush injury to head or torso causing internal damage
  if (treatment.injury_type === 'crush-injury') {
    const headTorsoBodyParts = ['head', 'torso_chest', 'torso_abdomen', 'chest', 'abdomen', 'torso'];
    const isHeadOrTorso = headTorsoBodyParts.some(part =>
      treatment.body_part?.toLowerCase().includes(part.toLowerCase())
    );

    if (isHeadOrTorso) {
      matched.push('Crush injury to head/torso');
      return {
        is_riddor: true,
        category: 'specified_injury',
        reason: 'Crush injury to head/torso causing internal damage is RIDDOR-reportable',
        criteria_matched: matched,
      };
    }
  }

  // 5. Serious burns (>10% body surface area or damaging eyes/respiratory system)
  if (treatment.injury_type === 'serious-burn') {
    matched.push('Serious burn');
    return {
      is_riddor: true,
      category: 'specified_injury',
      reason: 'Serious burn (>10% body or damaging eyes/respiratory system) is RIDDOR-reportable',
      criteria_matched: matched,
    };
  }

  // 6. Loss of consciousness caused by head injury or asphyxia
  if (treatment.injury_type === 'loss-of-consciousness') {
    matched.push('Loss of consciousness');
    return {
      is_riddor: true,
      category: 'specified_injury',
      reason: 'Loss of consciousness caused by head injury/asphyxia is RIDDOR-reportable',
      criteria_matched: matched,
    };
  }

  // 7. Scalping requiring hospital treatment
  if (treatment.injury_type === 'scalping') {
    matched.push('Scalping requiring hospital treatment');
    return {
      is_riddor: true,
      category: 'specified_injury',
      reason: 'Scalping requiring hospital treatment is RIDDOR-reportable',
      criteria_matched: matched,
    };
  }

  // 8. Hypothermia, heat-induced illness, asphyxia requiring resuscitation
  if (treatment.injury_type === 'hypothermia-asphyxia') {
    matched.push('Hypothermia/heat-induced illness/asphyxia');
    return {
      is_riddor: true,
      category: 'specified_injury',
      reason: 'Hypothermia/heat-induced illness/asphyxia requiring resuscitation is RIDDOR-reportable',
      criteria_matched: matched,
    };
  }

  // ========================================
  // Over-7-Day Injuries (Regulation 4(1)(b))
  // ========================================
  // RIDDOR requires reporting if worker is incapacitated for more than 7 consecutive days
  // (excluding the day of accident, including weekends)

  if (treatment.outcome) {
    const outcome = treatment.outcome.toLowerCase();

    // Check for explicit "off work" mentions with day count
    const daysMatch = outcome.match(/off\s*work.*?(\d+)\s*days?/i) ||
                      outcome.match(/(\d+)\s*days?\s*off/i);

    if (daysMatch) {
      const daysOff = parseInt(daysMatch[1]);
      if (daysOff > 7) {
        matched.push('Over-7-day incapacitation');
        return {
          is_riddor: true,
          category: 'over_7_day',
          reason: `Worker off work for ${daysOff} days (>7 days threshold)`,
          criteria_matched: matched,
        };
      }
    }

    // Check for hospital admission outcomes (often indicative of serious injury)
    if (outcome.includes('hospital') || outcome.includes('ambulance')) {
      // Don't auto-flag as RIDDOR immediately, but note as potential
      // Site manager will need to confirm if it results in >7 days off
      matched.push('Hospital referral (potential over-7-day)');
    }
  }

  // ========================================
  // No RIDDOR Criteria Matched
  // ========================================
  return {
    is_riddor: false,
    category: null,
    reason: 'No RIDDOR criteria matched',
    criteria_matched: matched,
  };
}
