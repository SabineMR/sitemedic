/**
 * F2508 Field Mapping
 * Phase 6: RIDDOR Auto-Flagging - Plan 03
 *
 * Maps RIDDOR incident data to F2508 form fields
 */

import { F2508Data, RIDDORIncidentData } from './types.ts';

/**
 * Map RIDDOR incident data to F2508 form structure
 *
 * @param incident - RIDDOR incident with joined treatment, worker, and org data
 * @returns F2508Data with all sections populated
 */
export function mapTreatmentToF2508(incident: RIDDORIncidentData): F2508Data {
  const { treatments, workers, organizations } = incident;

  return {
    // Section 1: About the organisation
    organisationName: organizations.company_name,
    organisationAddress: organizations.site_address,
    organisationPostcode: organizations.postcode,
    organisationPhone: organizations.phone || 'Not provided',

    // Section 2: About the incident
    incidentDate: new Date(treatments.created_at).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }),
    incidentTime: new Date(treatments.created_at).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    incidentLocation: organizations.site_address,

    // Section 3: About the injured person
    injuredPersonName: `${workers.first_name} ${workers.last_name}`,
    injuredPersonJobTitle: workers.role || 'Not specified',
    injuredPersonEmployer: workers.company || 'Not specified',

    // Section 4: About the injury
    injuryType:
      incident.category === 'specified_injury'
        ? 'Specified Injury'
        : incident.category === 'over_7_day'
        ? 'Over-7-day injury'
        : incident.category,
    injuryDetail: treatments.injury_type.replace(/-/g, ' '),
    bodyPartAffected: treatments.body_part?.replace(/_/g, ' ') || 'Not specified',

    // Section 5: About the kind of accident
    accidentType: treatments.mechanism_of_injury || 'Not specified',

    // Section 6: Describing what happened
    incidentDescription: buildIncidentDescription(treatments),
  };
}

/**
 * Build detailed incident description from treatment data
 */
function buildIncidentDescription(treatment: RIDDORIncidentData['treatments']): string {
  const parts: string[] = [];

  // Mechanism of injury
  if (treatment.mechanism_of_injury) {
    parts.push(`Mechanism: ${treatment.mechanism_of_injury}`);
  }

  // Treatment provided
  if (treatment.treatment_types && treatment.treatment_types.length > 0) {
    const treatments = treatment.treatment_types
      .map((t) => t.replace(/_/g, ' '))
      .join(', ');
    parts.push(`Treatment provided: ${treatments}`);
  }

  // Outcome
  if (treatment.outcome) {
    parts.push(`Outcome: ${treatment.outcome.replace(/_/g, ' ')}`);
  }

  // Severity
  parts.push(`Severity: ${treatment.severity}`);

  // Reference number
  if (treatment.reference_number) {
    parts.push(`Reference: ${treatment.reference_number}`);
  }

  return parts.join('\n\n');
}
