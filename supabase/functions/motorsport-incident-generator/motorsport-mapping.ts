/**
 * Map treatment data to Motorsport UK Accident Form fields
 * Phase 19: Motorsport Vertical — Plan 03
 *
 * Follows the f2508-mapping.ts pattern exactly.
 *
 * IMPORTANT: Field mappings are based on inferred MOTO-01 requirements.
 * Once the physical Motorsport UK Accident Form (Incident Pack V8.0) is obtained,
 * verify and update field names to match the form's actual structure.
 */

import type { MotorsportFormData } from './types.ts';

/**
 * Raw shape of vertical_extra_fields JSONB for motorsport treatments.
 * These fields are set by the mobile app's motorsport form section (Phase 19-01).
 * All fields are optional — defensive access required.
 */
interface MotorsportExtraFields {
  event_name?: string;
  event_date?: string;
  venue?: string;
  car_number?: string;
  circuit_section?: string;
  vehicle_type?: string;
  extrication_required?: boolean;
  helmet_removed?: boolean;
  helmet_condition?: string;
  concussion_suspected?: boolean;
  clerk_of_course_notified?: boolean;
  competitor_cleared_to_return?: boolean;
  hia_conducted?: boolean;
  competitor_stood_down?: boolean;
  cmo_notified?: boolean;
  gcs_score?: number | null;
  treatment_notes?: string;
}

/**
 * Worker data shape from treatments join.
 */
interface WorkerData {
  first_name?: string | null;
  last_name?: string | null;
  role?: string | null;
  company?: string | null;
}

/**
 * Organisation data shape from treatments join.
 */
interface OrgData {
  company_name?: string | null;
  site_address?: string | null;
}

/**
 * Core treatment row shape relevant to motorsport mapping.
 */
interface TreatmentRow {
  id?: string;
  injury_type?: string | null;
  body_part?: string | null;
  severity?: string | null;
  mechanism_of_injury?: string | null;
  treatment_types?: string[] | null;
  outcome?: string | null;
  created_at?: string | null;
  reference_number?: string | null;
}

/**
 * Map a treatment record (with joined worker and org) plus parsed
 * vertical_extra_fields to a MotorsportFormData object for PDF rendering.
 *
 * All field accesses are null-safe with sensible defaults so the PDF
 * always renders even when vertical_extra_fields is null or incomplete.
 *
 * @param treatment - Core treatment row
 * @param worker    - Joined worker (attending medic / patient — see note below)
 * @param org       - Joined organisation (Event Organiser — satisfies MOTO-05)
 * @param extraFields - Parsed vertical_extra_fields JSONB, or null/undefined
 */
export function mapTreatmentToMotorsportForm(
  treatment: TreatmentRow,
  worker: WorkerData | null | undefined,
  org: OrgData | null | undefined,
  extraFields: MotorsportExtraFields | null | undefined,
): MotorsportFormData {
  // Safely extract extra fields with null fallback
  const ex: MotorsportExtraFields = extraFields ?? {};

  // Medic name from the worker who recorded the treatment
  const medicName = worker
    ? [worker.first_name, worker.last_name].filter(Boolean).join(' ') || 'Unknown'
    : 'Unknown';

  // Event organiser from org — MOTO-05
  const orgName = org?.company_name || 'Not provided';

  // Generated timestamp
  const generatedAt = new Date().toISOString();

  return {
    // --- Event Details ---
    event_name: ex.event_name || 'Not provided',
    event_date: ex.event_date
      ? formatDate(ex.event_date)
      : treatment.created_at
      ? formatDate(treatment.created_at)
      : 'Not provided',
    venue: ex.venue || org?.site_address || 'Not provided',
    org_name: orgName,

    // --- Competitor / Patient Details ---
    // In motorsport, the "worker" in the treatments table IS the competitor/patient.
    // The medic_name is sourced separately from a staff lookup or falls back to the
    // recorder's name. For now, competitor_name uses the same worker field.
    competitor_name: medicName,
    competitor_car_number: ex.car_number || 'Not recorded',
    vehicle_type: ex.vehicle_type || 'Not recorded',
    circuit_section: ex.circuit_section || 'Not recorded',

    // --- Clinical Assessment ---
    injury_type: treatment.injury_type || 'Not recorded',
    body_part: treatment.body_part || 'Not recorded',
    severity: treatment.severity || 'Not recorded',
    mechanism_of_injury: treatment.mechanism_of_injury || 'Not recorded',
    treatment_types: treatment.treatment_types ?? [],
    treatment_notes: ex.treatment_notes || '',
    outcome: treatment.outcome || 'Not recorded',
    gcs_score: ex.gcs_score ?? null,

    // --- Motorsport Specifics ---
    extrication_required: ex.extrication_required ?? false,
    helmet_removed: ex.helmet_removed ?? false,
    helmet_condition: ex.helmet_condition || 'Not assessed',
    concussion_suspected: ex.concussion_suspected ?? false,
    clerk_of_course_notified: ex.clerk_of_course_notified ?? false,
    competitor_cleared_to_return: ex.competitor_cleared_to_return ?? false,

    // --- Concussion Clearance Protocol ---
    hia_conducted: ex.hia_conducted ?? false,
    competitor_stood_down: ex.competitor_stood_down ?? false,
    cmo_notified: ex.cmo_notified ?? false,

    // --- Metadata ---
    reference_number: treatment.reference_number || treatment.id || 'N/A',
    medic_name: medicName,
    created_at: treatment.created_at
      ? formatDate(treatment.created_at)
      : 'Not recorded',
    generated_at: generatedAt,
  };
}

/**
 * Format an ISO date or date string to a human-readable GB date.
 * Returns the original string on parse failure.
 */
function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}
