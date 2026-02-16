/**
 * F2508 Type Definitions
 * Phase 6: RIDDOR Auto-Flagging - Plan 03
 */

export interface F2508Data {
  // Section 1: About the organisation
  organisationName: string;
  organisationAddress: string;
  organisationPostcode: string;
  organisationPhone: string;

  // Section 2: About the incident
  incidentDate: string;
  incidentTime: string;
  incidentLocation: string;

  // Section 3: About the injured person
  injuredPersonName: string;
  injuredPersonJobTitle: string;
  injuredPersonEmployer: string;

  // Section 4: About the injury
  injuryType: string;
  injuryDetail: string;
  bodyPartAffected: string;

  // Section 5: About the kind of accident
  accidentType: string;

  // Section 6: Describing what happened
  incidentDescription: string;
}

export interface RIDDORIncidentData {
  id: string;
  category: string;
  deadline_date: string;
  confidence_level: string;
  detected_at: string;
  treatments: {
    id: string;
    injury_type: string;
    body_part: string;
    severity: string;
    mechanism_of_injury: string;
    treatment_types: string[];
    outcome: string;
    created_at: string;
    reference_number: string;
  };
  workers: {
    first_name: string;
    last_name: string;
    role: string;
    company: string;
  };
  organizations: {
    company_name: string;
    site_address: string;
    postcode: string;
    phone: string;
  };
}
