/**
 * Types for Motorsport Incident Generator Edge Function
 * Phase 18: Initial stub types
 * Phase 19: Full MotorsportFormData interface (inferred MOTO-01 fields)
 *
 * NOTE: MotorsportFormData fields are inferred from Motorsport UK regulatory
 * requirements and incident reporting guidance. The physical Motorsport UK
 * Accident Form (Incident Pack V8.0) was not obtained; fields represent best
 * effort from published MOTO-01 requirements. A DRAFT watermark is applied.
 */

/**
 * Request body for the motorsport-incident-generator Edge Function.
 * Replaces the old MotorsportIncidentData stub.
 */
export interface MotorsportIncidentRequest {
  incident_id: string;
  event_vertical: 'motorsport';
}

/**
 * Full form data for the Motorsport UK Accident Form PDF.
 * All fields are inferred from MOTO-01 requirements and Motorsport UK
 * incident reporting guidance.
 *
 * Fields grouped by section to match PDF layout:
 *   - Event Details (MOTO-05 Event Organiser)
 *   - Competitor Details
 *   - Clinical Assessment
 *   - Motorsport Specifics
 *   - Concussion Clearance
 *   - Metadata / Signature
 */
export interface MotorsportFormData {
  // Event Details
  /** Name of the motorsport event (e.g., "Round 4 — BRSCC Silverstone") */
  event_name: string;
  /** ISO date string of the event */
  event_date: string;
  /** Circuit or venue name */
  venue: string;
  /** Event Organiser name — satisfies MOTO-05 */
  org_name: string;

  // Competitor / Patient Details
  competitor_name: string;
  /** Race/car number as displayed on vehicle */
  competitor_car_number: string;
  /** Vehicle category (e.g., "Single Seater", "Saloon", "Kart") */
  vehicle_type: string;
  /** Where on circuit the incident occurred (e.g., "Turn 3", "Main Straight") */
  circuit_section: string;

  // Clinical Assessment
  injury_type: string;
  body_part: string;
  severity: string;
  mechanism_of_injury: string;
  /** List of treatment types provided */
  treatment_types: string[];
  /** Free-text clinical notes */
  treatment_notes: string;
  /** Clinical outcome */
  outcome: string;
  /** Glasgow Coma Scale score (3–15), null if not assessed */
  gcs_score: number | null;

  // Motorsport Specifics
  extrication_required: boolean;
  helmet_removed: boolean;
  /** Condition of helmet post-incident (e.g., "Intact", "Cracked", "Penetrated") */
  helmet_condition: string;
  concussion_suspected: boolean;
  clerk_of_course_notified: boolean;
  competitor_cleared_to_return: boolean;

  // Concussion Clearance Protocol (always rendered, even if not applicable)
  hia_conducted: boolean;
  competitor_stood_down: boolean;
  cmo_notified: boolean;

  // Metadata / Signature
  /** SiteMedic treatment reference number */
  reference_number: string;
  /** Full name of attending medic */
  medic_name: string;
  /** ISO timestamp treatment was created */
  created_at: string;
  /** ISO timestamp PDF was generated */
  generated_at: string;
}

/**
 * @deprecated Use MotorsportIncidentRequest.
 * Retained for backwards-compatibility with Phase 18 stub references.
 */
export type MotorsportIncidentData = MotorsportIncidentRequest;
