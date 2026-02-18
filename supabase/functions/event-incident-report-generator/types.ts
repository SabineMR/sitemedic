export interface EventIncidentData {
  incident_id: string;
  org_id: string;
  event_name?: string;
  event_vertical: string;
  incident_date: string;
  patient_name?: string;
  description?: string;
  outcome?: string;
}

export interface PurpleGuideData {
  organisationName: string;
  eventName: string;
  eventDate: string;
  reportGeneratedAt: string;
  patientIdentifier: string;
  timeOfPresentation: string;
  triageCategory: 'P1' | 'P2' | 'P3' | 'P4';
  triageLabel: string;
  presentingComplaint: string;
  mechanismOfInjury: string;
  treatmentGiven: string[];
  treatmentNotes: string;
  alcoholSubstanceInvolvement: boolean;
  safeguardingConcern: boolean;
  disposition: 'discharged_on_site' | 'transferred_to_hospital' | 'refused_treatment';
  dispositionLabel: string;
  medicName: string;
  referenceNumber: string;
}
