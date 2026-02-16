/**
 * Database TypeScript types
 *
 * Manual type definitions matching the Supabase schema from 00003_health_data_tables.sql
 */

export interface Treatment {
  id: string;
  org_id: string;
  worker_id: string;
  medic_id: string;
  injury_type: string;
  body_part: string;
  severity: 'minor' | 'moderate' | 'severe';
  treatment_notes: string | null;
  outcome: string | null;
  is_riddor_reportable: boolean;
  riddor_confidence: number | null;
  photo_uris: string[] | null;
  signature_uri: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Worker {
  id: string;
  org_id: string;
  first_name: string;
  last_name: string;
  company: string | null;
  role: string | null;
  phone: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  health_notes: string | null;
  consent_given: boolean;
  consent_date: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface NearMiss {
  id: string;
  org_id: string;
  reported_by: string;
  category: string;
  severity: 'low' | 'medium' | 'high';
  description: string | null;
  location: string | null;
  photo_uris: string[] | null;
  corrective_action: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface SafetyCheck {
  id: string;
  org_id: string;
  medic_id: string;
  check_date: string;
  items: Record<string, any> | null;
  overall_status: 'pass' | 'amber' | 'fail';
  photo_uris: string[] | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface TreatmentWithWorker extends Treatment {
  worker: Worker | null;
}
