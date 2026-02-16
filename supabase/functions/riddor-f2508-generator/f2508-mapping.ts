/**
 * Map RIDDOR incident data to F2508 form fields
 * Phase 6: RIDDOR Auto-Flagging - Plan 03
 */

import { F2508Data, RIDDORIncidentData } from './types.ts';

/**
 * Map RIDDOR incident data to F2508 form fields
 *
 * IMPORTANT: Field names in the returned F2508Data object are PLACEHOLDERS.
 * After obtaining the actual F2508 PDF template, inspect its form fields and update
 * the field names in index.ts to match the PDF's actual field names.
 *
 * To inspect PDF fields, uncomment in index.ts:
 *   const fields = form.getFields();
 *   console.log('Available F2508 fields:', fields.map(f => f.getName()));
 *
 * @param incident - RIDDOR incident with joined treatment, worker, and org data
 * @returns F2508Data object with all form fields populated
 */
export function mapTreatmentToF2508(incident: RIDDORIncidentData): F2508Data {
  const { treatments, workers, orgs } = incident;

  return {
    // Section 1: About the organisation
    organisationName: orgs.company_name,
    organisationAddress: orgs.site_address,
    organisationPostcode: orgs.postcode,
    organisationPhone: orgs.phone || 'Not provided',

    // Section 2: About the incident
    incidentDate: new Date(treatments.created_at).toLocaleDateString('en-GB'),
    incidentTime: new Date(treatments.created_at).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
    incidentLocation: orgs.site_address,

    // Section 3: About the injured person
    injuredPersonName: `${workers.first_name} ${workers.last_name}`,
    injuredPersonJobTitle: workers.role,
    injuredPersonEmployer: workers.company,

    // Section 4: About the injury
    injuryType:
      incident.category === 'specified_injury'
        ? 'Specified Injury'
        : incident.category === 'over_7_day'
        ? 'Over-7-day injury'
        : incident.category === 'occupational_disease'
        ? 'Occupational disease'
        : 'Dangerous occurrence',
    injuryDetail: treatments.injury_type,
    bodyPartAffected: treatments.body_part || 'Not specified',

    // Section 5: About the kind of accident
    accidentType: treatments.mechanism_of_injury || 'Not specified',

    // Section 6: Describing what happened
    incidentDescription: formatIncidentDescription(incident),
  };
}

/**
 * Format detailed incident description for F2508 Section 6
 * Combines mechanism, treatment, outcome, and severity information
 */
function formatIncidentDescription(incident: RIDDORIncidentData): string {
  const { treatments } = incident;

  const sections: string[] = [];

  // Mechanism of injury
  if (treatments.mechanism_of_injury) {
    sections.push(`Mechanism: ${treatments.mechanism_of_injury}`);
  } else {
    sections.push('Mechanism: Not recorded');
  }

  // Treatment provided
  if (treatments.treatment_types && treatments.treatment_types.length > 0) {
    sections.push(`Treatment provided: ${treatments.treatment_types.join(', ')}`);
  } else {
    sections.push('Treatment provided: None recorded');
  }

  // Outcome
  if (treatments.outcome) {
    sections.push(`Outcome: ${treatments.outcome}`);
  } else {
    sections.push('Outcome: Not specified');
  }

  // Severity
  sections.push(`Severity: ${treatments.severity}`);

  // RIDDOR category
  sections.push(`RIDDOR Category: ${formatRIDDORCategory(incident.category)}`);

  return sections.join('\n\n');
}

/**
 * Format RIDDOR category for human-readable display
 */
function formatRIDDORCategory(category: string): string {
  switch (category) {
    case 'specified_injury':
      return 'Specified Injury';
    case 'over_7_day':
      return 'Over-7-day Injury';
    case 'occupational_disease':
      return 'Occupational Disease';
    case 'dangerous_occurrence':
      return 'Dangerous Occurrence';
    default:
      return category;
  }
}
