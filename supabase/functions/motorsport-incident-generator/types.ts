export interface MotorsportIncidentData {
  incident_id: string;
  org_id: string;
  event_vertical: 'motorsport';
  incident_date: string;
  patient_name?: string;
  vehicle_type?: string;
  circuit_location?: string;
  description?: string;
  outcome?: string;
}
