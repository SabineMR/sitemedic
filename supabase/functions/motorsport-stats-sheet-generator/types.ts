/**
 * Types for Motorsport Stats Sheet Generator Edge Function
 * Phase 19: Motorsport Vertical — Plan 04
 *
 * Purpose: Aggregate all motorsport treatments for a booking into a
 * Medical Statistics Sheet PDF (MOTO-02 requirement).
 */

/**
 * Request body for the motorsport-stats-sheet-generator Edge Function.
 */
export interface MotorsportStatsRequest {
  booking_id: string;
}

/**
 * Aggregated statistics data for the Medical Statistics Sheet PDF.
 * Covers event-level summary across all motorsport treatments for a booking.
 */
export interface MotorsportStatsData {
  // Event details
  event_name: string;
  event_date: string;
  event_end_date: string | null;
  venue: string;
  org_name: string;
  /** CMO / medic who generated the sheet (from first treatment's worker) */
  cmo_name: string;

  // Aggregate counts
  total_patients: number;
  /** Treatments where vertical_extra_fields.competitor_car_number is truthy */
  total_competitors: number;
  /** Treatments without competitor_car_number (spectators, marshals, staff) */
  total_spectators_staff: number;

  // By severity (minor, moderate, major, critical)
  severity_counts: Record<string, number>;

  // By outcome (returned_to_work, sent_home, hospital_referral, ambulance_called, etc.)
  outcome_counts: Record<string, number>;

  // Motorsport-specific aggregates
  concussion_count: number;
  extrication_count: number;
  gcs_min: number | null;
  gcs_max: number | null;
  hospital_referrals: number;

  // Individual incidents (tabular — one row per treatment)
  incidents: Array<{
    time: string;
    competitor_number: string;
    circuit_section: string;
    injury_type: string;
    severity: string;
    gcs: number | null;
    outcome: string;
    concussion: boolean;
  }>;

  // Metadata
  generated_at: string;
  booking_id: string;
}
