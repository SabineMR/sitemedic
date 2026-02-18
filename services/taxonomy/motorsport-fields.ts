/**
 * Motorsport Extra Fields — Taxonomy and Defaults
 *
 * Defines the MotorsportExtraFields interface that captures Motorsport UK-required
 * data for competitor and marshal incidents at motorsport events. All fields are
 * stored as a JSON string in the WatermelonDB `vertical_extra_fields` TEXT column
 * and as a JSONB value in `treatments.vertical_extra_fields` on Supabase.
 *
 * Requirements satisfied:
 *   MOTO-01 — Mobile form captures GCS, extrication, helmet, circuit section,
 *              Clerk of Course notification, and competitor car number.
 *   MOTO-02 — Concussion clearance gate: three mandatory checkboxes that must
 *              all be confirmed before the treatment record can be completed.
 *   MOTO-03 — When concussion is suspected, a 'motorsport_concussion' alert is
 *              inserted into medic_alerts for admin visibility (handled in new.tsx).
 *
 * Phase 19: Motorsport Vertical
 */

// ─────────────────────────────────────────────────────────────────────────────
// Core interface
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Shape of the vertical_extra_fields JSON for the motorsport vertical.
 *
 * All boolean fields default to false; string fields default to ''.
 * gcs_score is null when not assessed (e.g. patient was not unconscious).
 */
export interface MotorsportExtraFields {
  // ── Competitor identification ───────────────────────────────────────────────
  /** Car or kart number displayed on the competitor's vehicle */
  competitor_car_number: string;

  // ── Scene data ──────────────────────────────────────────────────────────────
  /** Location on circuit where the incident occurred (e.g. "Turn 3", "Pit Lane") */
  circuit_section: string;
  /** Type of motorsport vehicle involved */
  vehicle_type: string;
  /** Classification of the incident */
  incident_type: string;

  // ── Clinical assessment ─────────────────────────────────────────────────────
  /**
   * Glasgow Coma Scale total score (3–15).
   * null if not assessed (e.g. patient was conscious and alert throughout).
   */
  gcs_score: number | null;
  /** Whether a head-injury assessment (HIA) protocol was performed */
  concussion_suspected: boolean;
  /** Condition of the helmet post-incident */
  helmet_condition: string;

  // ── Scene management ─────────────────────────────────────────────────────────
  /** Whether mechanical or manual extrication from the vehicle was required */
  extrication_required: boolean;
  /** Whether the helmet was removed at the scene by medical personnel */
  helmet_removed: boolean;
  /** Whether the Clerk of the Course was notified of this incident */
  clerk_of_course_notified: boolean;
  /** Whether the competitor has been cleared to return to the event */
  competitor_cleared_to_return: boolean;
  /** Whether competitor licence and incident details were reported to Motorsport UK */
  licences_to_msuk: boolean;

  // ── Concussion clearance gate (MOTO-02) ─────────────────────────────────────
  /**
   * All three must be true before a concussion-suspected treatment can be submitted.
   * These fields are only meaningful when concussion_suspected === true.
   */
  /** Head Injury Assessment (HIA) protocol was conducted */
  hia_conducted: boolean;
  /** Competitor has been stood down from further participation in the event */
  competitor_stood_down: boolean;
  /** Chief Medical Officer (CMO) has been formally notified */
  cmo_notified: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Default initial state
// ─────────────────────────────────────────────────────────────────────────────

/**
 * All-false/empty initial state for the motorsport extra fields.
 * Use this as the useState initial value in the treatment form.
 */
export const INITIAL_MOTORSPORT_FIELDS: MotorsportExtraFields = {
  competitor_car_number: '',
  circuit_section: '',
  vehicle_type: '',
  incident_type: '',
  gcs_score: null,
  concussion_suspected: false,
  helmet_condition: '',
  extrication_required: false,
  helmet_removed: false,
  clerk_of_course_notified: false,
  competitor_cleared_to_return: false,
  licences_to_msuk: false,
  hia_conducted: false,
  competitor_stood_down: false,
  cmo_notified: false,
};

// ─────────────────────────────────────────────────────────────────────────────
// Enum arrays
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Recognised incident classification types for Motorsport UK incident reports.
 * Used to populate the incident_type field in the treatment form.
 */
export const MOTORSPORT_INCIDENT_TYPES = [
  'collision',
  'single_vehicle',
  'track_incident',
  'pit_lane',
  'paddock',
  'spectator_area',
  'other',
] as const;

export type MotorsportIncidentType = (typeof MOTORSPORT_INCIDENT_TYPES)[number];

/**
 * Vehicle / machine types present at motorsport events.
 * Used to populate the vehicle_type field in the treatment form.
 */
export const VEHICLE_TYPES = [
  'car',
  'kart',
  'bike',
  'rally_car',
  'other',
] as const;

export type VehicleType = (typeof VEHICLE_TYPES)[number];
