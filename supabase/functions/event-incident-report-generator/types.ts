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
