/**
 * Marketplace Event TypeScript Types
 * Phase 33: Event Posting & Discovery
 *
 * Mirrors the SQL schema from:
 *   - 145_marketplace_events.sql (marketplace_events, event_days, event_staffing_requirements)
 *
 * These types are the single source of truth for TypeScript consumers.
 */

// =============================================================================
// Enums / Union Types
// =============================================================================

/** Event status workflow: draft → open → closed | cancelled | awarded */
export type EventStatus = 'draft' | 'open' | 'closed' | 'cancelled' | 'awarded';

/** Event types (align with existing booking verticals) */
export type EventType =
  | 'construction'
  | 'tv_film'
  | 'motorsport'
  | 'festivals'
  | 'sporting_events'
  | 'corporate'
  | 'private_events'
  | 'other';

/** Staffing roles for event requirements */
export type StaffingRole = 'paramedic' | 'emt' | 'first_aider' | 'doctor' | 'nurse' | 'other';

/** Indoor/outdoor setting */
export type IndoorOutdoor = 'indoor' | 'outdoor' | 'mixed';

// =============================================================================
// Database Row Interfaces
// =============================================================================

/** Equipment item stored as JSONB in marketplace_events.equipment_required */
export interface EquipmentItem {
  type: 'ambulance' | 'defibrillator' | 'first_aid_tent' | 'stretcher' | 'oxygen_supply' | 'other';
  notes?: string;
}

/** Mirrors marketplace_events table (145_marketplace_events.sql) */
export interface MarketplaceEvent {
  id: string;
  posted_by: string;
  event_name: string;
  event_type: EventType;
  event_description: string | null;
  special_requirements: string | null;
  indoor_outdoor: IndoorOutdoor;
  expected_attendance: number | null;
  budget_min: number | null;
  budget_max: number | null;
  location_postcode: string;
  location_address: string | null;
  location_what3words: string | null;
  location_coordinates: unknown; // PostGIS geography type — handled by API
  location_display: string | null;
  quote_deadline: string;
  status: EventStatus;
  has_quotes: boolean;
  quote_count: number;
  deadline_extended: boolean;
  equipment_required: EquipmentItem[];
  created_at: string;
  updated_at: string;
}

/** Mirrors event_days table (145_marketplace_events.sql) */
export interface EventDay {
  id: string;
  event_id: string;
  event_date: string;
  start_time: string;
  end_time: string;
  sort_order: number;
}

/** Mirrors event_staffing_requirements table (145_marketplace_events.sql) */
export interface EventStaffingRequirement {
  id: string;
  event_id: string;
  event_day_id: string | null;
  role: StaffingRole;
  quantity: number;
  additional_notes: string | null;
}

/** Event with related data (for detail views and API responses) */
export interface MarketplaceEventWithDetails extends MarketplaceEvent {
  event_days: EventDay[];
  event_staffing_requirements: EventStaffingRequirement[];
}

// =============================================================================
// Human-Readable Label Maps
// =============================================================================

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  construction: 'Construction',
  tv_film: 'Film & TV',
  motorsport: 'Motorsport',
  festivals: 'Festival',
  sporting_events: 'Sporting Event',
  corporate: 'Corporate',
  private_events: 'Private Event',
  other: 'Other',
};

export const STAFFING_ROLE_LABELS: Record<StaffingRole, string> = {
  paramedic: 'Paramedic',
  emt: 'EMT',
  first_aider: 'First Aider',
  doctor: 'Doctor',
  nurse: 'Nurse',
  other: 'Other',
};

export const EQUIPMENT_TYPE_LABELS: Record<EquipmentItem['type'], string> = {
  ambulance: 'Ambulance',
  defibrillator: 'Defibrillator / AED',
  first_aid_tent: 'First Aid Tent',
  stretcher: 'Stretcher',
  oxygen_supply: 'Oxygen Supply',
  other: 'Other',
};

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  draft: 'Draft',
  open: 'Open',
  closed: 'Closed',
  cancelled: 'Cancelled',
  awarded: 'Awarded',
};

export const INDOOR_OUTDOOR_LABELS: Record<IndoorOutdoor, string> = {
  indoor: 'Indoor',
  outdoor: 'Outdoor',
  mixed: 'Mixed',
};
