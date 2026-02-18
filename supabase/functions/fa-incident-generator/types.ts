export interface FAIncidentData {
  incident_id: string;
  org_id: string;
  event_vertical: 'sporting_events';
  incident_date: string;
  patient_name?: string;
  sport_type?: string;
  description?: string;
  outcome?: string;
}
