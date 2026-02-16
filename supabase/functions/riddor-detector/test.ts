/**
 * RIDDOR Detection Test Script
 * Validates detection rules against sample treatments
 */

import { detectRIDDOR } from './detection-rules.ts';
import { calculateConfidence } from './confidence-scoring.ts';

// Test cases based on HSE RIDDOR criteria
const testCases = [
  {
    name: 'Fracture to leg (RIDDOR - specified injury)',
    treatment: {
      injury_type: 'fracture',
      body_part: 'leg_lower',
      severity: 'major',
      treatment_types: ['immobilization', 'hospital_referral'],
      outcome: 'hospital_referral',
    },
    expectedDetection: true,
    expectedCategory: 'specified_injury',
    expectedConfidence: 'HIGH',
  },
  {
    name: 'Fracture to finger (NOT RIDDOR - HSE exception)',
    treatment: {
      injury_type: 'fracture',
      body_part: 'hand_finger',
      severity: 'moderate',
      treatment_types: ['immobilization'],
      outcome: 'returned_to_work',
    },
    expectedDetection: false,
    expectedCategory: null,
  },
  {
    name: 'Amputation of finger (RIDDOR - all amputations reportable)',
    treatment: {
      injury_type: 'amputation',
      body_part: 'hand_finger',
      severity: 'critical',
      treatment_types: ['bleeding_control', 'hospital_referral'],
      outcome: 'ambulance_called',
    },
    expectedDetection: true,
    expectedCategory: 'specified_injury',
    expectedConfidence: 'HIGH',
  },
  {
    name: 'Crush injury to chest (RIDDOR - specified injury)',
    treatment: {
      injury_type: 'crush-injury',
      body_part: 'torso_chest',
      severity: 'critical',
      treatment_types: ['oxygen_administration', 'hospital_referral'],
      outcome: 'ambulance_called',
    },
    expectedDetection: true,
    expectedCategory: 'specified_injury',
    expectedConfidence: 'MEDIUM',
  },
  {
    name: 'Minor cut to hand (NOT RIDDOR)',
    treatment: {
      injury_type: 'laceration',
      body_part: 'hand',
      severity: 'minor',
      treatment_types: ['cleaning', 'dressing'],
      outcome: 'returned_to_work',
    },
    expectedDetection: false,
    expectedCategory: null,
  },
  {
    name: 'Over-7-day injury (RIDDOR - off work 10 days)',
    treatment: {
      injury_type: 'sprain-strain',
      body_part: 'ankle',
      severity: 'moderate',
      treatment_types: ['ice', 'rest'],
      outcome: 'sent_home, off work 10 days',
    },
    expectedDetection: true,
    expectedCategory: 'over_7_day',
    expectedConfidence: 'MEDIUM',
  },
  {
    name: 'Serious burn (RIDDOR - specified injury)',
    treatment: {
      injury_type: 'serious-burn',
      body_part: 'arm',
      severity: 'major',
      treatment_types: ['burn_dressing', 'hospital_referral'],
      outcome: 'ambulance_called',
    },
    expectedDetection: true,
    expectedCategory: 'specified_injury',
    expectedConfidence: 'HIGH',
  },
  {
    name: 'Minor burn (NOT RIDDOR - <10% body)',
    treatment: {
      injury_type: 'minor-burn',
      body_part: 'hand',
      severity: 'minor',
      treatment_types: ['burn_gel', 'dressing'],
      outcome: 'returned_to_work',
    },
    expectedDetection: false,
    expectedCategory: null,
  },
];

// Run tests
console.log('='.repeat(80));
console.log('RIDDOR Detection Test Results');
console.log('='.repeat(80));
console.log('');

let passed = 0;
let failed = 0;

testCases.forEach((test, index) => {
  console.log(`Test ${index + 1}: ${test.name}`);
  console.log('-'.repeat(80));

  const detection = detectRIDDOR(test.treatment);

  // Check detection result
  const detectionMatch = detection.is_riddor === test.expectedDetection;
  const categoryMatch = !test.expectedDetection || detection.category === test.expectedCategory;

  let confidenceMatch = true;
  if (test.expectedDetection && test.expectedConfidence) {
    const confidence = calculateConfidence(detection);
    confidenceMatch = confidence === test.expectedConfidence;
  }

  const testPassed = detectionMatch && categoryMatch && confidenceMatch;

  if (testPassed) {
    passed++;
    console.log('✅ PASS');
  } else {
    failed++;
    console.log('❌ FAIL');
  }

  console.log(`  Expected: is_riddor=${test.expectedDetection}, category=${test.expectedCategory}`);
  console.log(`  Actual:   is_riddor=${detection.is_riddor}, category=${detection.category}`);
  console.log(`  Reason:   ${detection.reason}`);

  if (detection.is_riddor) {
    const confidence = calculateConfidence(detection);
    console.log(`  Confidence: ${confidence}${test.expectedConfidence ? ` (expected: ${test.expectedConfidence})` : ''}`);
  }

  console.log('');
});

console.log('='.repeat(80));
console.log(`Test Summary: ${passed} passed, ${failed} failed out of ${testCases.length} tests`);
console.log('='.repeat(80));

// Exit with error code if any tests failed
if (failed > 0) {
  Deno.exit(1);
}
