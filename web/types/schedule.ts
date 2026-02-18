/**
 * Schedule Board TypeScript Interfaces
 *
 * These types match the data structures returned by:
 * - schedule-board-api edge function
 * - conflict-detector edge function
 */

/**
 * Medic with weekly statistics for schedule board display
 */
export interface MedicWithStats {
  id: string;
  first_name: string;
  last_name: string;
  star_rating: number;
  has_confined_space_cert: boolean;
  has_trauma_cert: boolean;
  weekly_hours: number;
  utilization_percent: number;
  shifts_this_week: number;
}

/**
 * Booking with shift details and requirements
 */
export interface Booking {
  id: string;
  medic_id: string | null;
  shift_date: string;
  shift_start_time: string;
  shift_end_time: string;
  shift_hours: number;
  status: 'pending' | 'confirmed' | 'urgent_broadcast';
  site_name: string;
  confined_space_required: boolean;
  trauma_specialist_required: boolean;
  urgency_premium_percent: number;
  clients?: {
    company_name: string;
  };
}

/**
 * Result from conflict-detector API
 */
export interface ConflictCheckResult {
  can_assign: boolean;
  total_conflicts: number;
  critical_conflicts: number;
  conflicts: Conflict[];
  recommendation: string;
}

/**
 * Individual conflict detail
 */
export interface Conflict {
  type: string;
  severity: 'critical' | 'warning';
  message: string;
  can_override: boolean;
}

/**
 * Parameters for conflict check API call
 */
export interface ConflictCheckParams {
  booking_id: string;
  medic_id: string;
  shift_date: string;
  shift_start_time: string;
  shift_end_time: string;
  confined_space_required: boolean;
  trauma_specialist_required: boolean;
}

/**
 * A busy block from Google Calendar, manual entry, or approved time-off.
 * Displayed as colored chips on the schedule board.
 */
export interface BusyBlock {
  id: string;
  medicId: string;
  source: 'google_calendar' | 'manual' | 'time_off';
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  reason?: string;
}

/**
 * Response from schedule-board-api
 */
export interface ScheduleBoardData {
  medics: MedicWithStats[];
  bookings_by_date: Record<string, Booking[]>;
  dates: string[];
}
