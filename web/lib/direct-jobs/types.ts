/**
 * Direct Jobs (Self-Procured) TypeScript Types
 * Phase 34.1: Self-Procured Jobs — Plan 01
 *
 * Mirrors the SQL schema from:
 *   - 147_direct_jobs.sql (direct_clients table, marketplace_events extensions)
 *
 * Direct jobs are marketplace_events with source='direct' and 0% platform commission.
 * These types are the single source of truth for TypeScript consumers.
 */

import type {
  EventType,
  StaffingRole,
  IndoorOutdoor,
  EquipmentItem,
  EventDay,
  EventStaffingRequirement,
} from '@/lib/marketplace/event-types';

// =============================================================================
// Enums / Union Types
// =============================================================================

/** Direct job status workflow: draft -> confirmed -> in_progress -> completed | cancelled */
export type DirectJobStatus = 'draft' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

/** Source discriminator for marketplace_events */
export type EventSource = 'marketplace' | 'direct';

// =============================================================================
// Database Row Interfaces
// =============================================================================

/** Mirrors direct_clients table (147_direct_jobs.sql) */
export interface DirectClient {
  id: string;
  company_id: string;
  created_by: string;
  client_name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  postcode: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * A direct job is a marketplace_event with source='direct'.
 * Extends the base marketplace_events schema with direct-job-specific fields.
 */
export interface DirectJob {
  id: string;
  posted_by: string;
  source: 'direct';
  client_id: string | null;
  event_name: string;
  event_type: EventType;
  event_description: string | null;
  special_requirements: string | null;
  indoor_outdoor: IndoorOutdoor;
  expected_attendance: number | null;
  agreed_price: number;
  location_postcode: string;
  location_address: string | null;
  location_what3words: string | null;
  location_display: string | null;
  status: DirectJobStatus;
  equipment_required: EquipmentItem[];
  created_at: string;
  updated_at: string;
  // Related data (joined)
  client: DirectClient | null;
  event_days: EventDay[];
  event_staffing_requirements: EventStaffingRequirement[];
}

// =============================================================================
// Human-Readable Label Maps
// =============================================================================

/** Source badge labels for UI rendering */
export const SOURCE_LABELS: Record<EventSource, string> = {
  marketplace: 'Marketplace',
  direct: 'Direct',
};

/** Direct job status labels for UI rendering */
export const DIRECT_JOB_STATUS_LABELS: Record<DirectJobStatus, string> = {
  draft: 'Draft',
  confirmed: 'Confirmed',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};
