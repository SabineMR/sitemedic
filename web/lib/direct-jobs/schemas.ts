/**
 * Direct Jobs (Self-Procured) Zod Validation Schemas
 * Phase 34.1: Self-Procured Jobs — Plan 01
 *
 * Schemas for the multi-step direct job wizard:
 *   Step 1: clientDetailsSchema — client name, contact, address
 *   Step 2: jobInfoSchema — job name, type, description (reuses event field shapes)
 *   Step 3: jobScheduleSchema — dates/times, location (NO quote_deadline)
 *   Step 4: jobStaffingSchema — staffing requirements, equipment (NO budget_min/max)
 *   Step 5: jobPricingSchema — agreed price, deposit percentage
 *
 * Also provides:
 *   - directJobFormSchema: Combined schema for server-side validation
 *
 * Follows the pattern from web/lib/marketplace/event-schemas.ts.
 */

import { z } from 'zod';

export const sourceProvenanceSchema = z.enum(['self_sourced', 'marketplace_sourced']);
export const feePolicySchema = z.enum(['subscription', 'marketplace_commission', 'co_share_blended']);

// UK postcode validation regex (same as event-schemas.ts)
const ukPostcodeRegex = /^[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}$/i;

// =============================================================================
// Step 1: Client Details
// =============================================================================

export const clientDetailsSchema = z.object({
  /** Select an existing client OR create new (mutually exclusive with client fields) */
  existing_client_id: z.string().uuid().optional().nullable(),

  /** Client/organisation name (required if creating new) */
  client_name: z.string().min(2, 'Client name must be at least 2 characters').max(200),

  /** Contact person name */
  contact_name: z.string().max(200).optional().nullable(),

  /** Contact email */
  contact_email: z.string().email('Enter a valid email address').optional().nullable()
    .or(z.literal('')),

  /** Contact phone */
  contact_phone: z.string().max(20).optional().nullable(),

  /** Address fields */
  address_line_1: z.string().max(500).optional().nullable(),
  address_line_2: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  postcode: z.string().regex(ukPostcodeRegex, 'Enter a valid UK postcode').optional().nullable()
    .or(z.literal('')),
});

// =============================================================================
// Step 2: Job Info (mirrors basicInfoSchema but named for direct jobs context)
// =============================================================================

export const jobInfoSchema = z.object({
  /** Job name/title */
  event_name: z.string().min(3, 'Job name must be at least 3 characters').max(200),

  /** Event type (reuses marketplace event types) */
  event_type: z.enum([
    'construction', 'tv_film', 'motorsport', 'festivals',
    'sporting_events', 'corporate', 'private_events', 'other',
  ]),

  /** Job description */
  event_description: z.string().max(5000).optional().nullable(),

  /** Special requirements */
  special_requirements: z.string().max(2000).optional().nullable(),

  /** Indoor/outdoor setting */
  indoor_outdoor: z.enum(['indoor', 'outdoor', 'mixed']),

  /** Expected attendance */
  expected_attendance: z.number().int().min(1).max(1000000).optional().nullable(),
});

// =============================================================================
// Step 3: Schedule & Location (NO quote_deadline — direct jobs don't need it)
// =============================================================================

export const jobScheduleSchema = z.object({
  /** Multi-day schedule */
  event_days: z.array(z.object({
    event_date: z.string().min(1, 'Date is required'),
    start_time: z.string().min(1, 'Start time is required'),
    end_time: z.string().min(1, 'End time is required'),
  })).min(1, 'At least one job day is required'),

  /** Location fields */
  location_postcode: z.string().regex(ukPostcodeRegex, 'Enter a valid UK postcode'),
  location_address: z.string().optional().nullable(),
  location_what3words: z.string().optional().nullable(),
  location_lat: z.number().optional().nullable(),
  location_lng: z.number().optional().nullable(),
  location_display: z.string().optional().nullable(),
});

// =============================================================================
// Step 4: Staffing & Equipment (NO budget_min/max — direct jobs use agreed_price)
// =============================================================================

export const jobStaffingSchema = z.object({
  /** Staffing requirements (at least one required) */
  staffing_requirements: z.array(z.object({
    event_day_id: z.string().optional().nullable(),
    role: z.enum(['paramedic', 'emt', 'first_aider', 'doctor', 'nurse', 'other']),
    quantity: z.number().int().min(1, 'At least 1 required'),
    additional_notes: z.string().max(500).optional().nullable(),
  })).min(1, 'At least one staffing requirement is required'),

  /** Equipment requirements (optional) */
  equipment_required: z.array(z.object({
    type: z.enum(['ambulance', 'defibrillator', 'first_aid_tent', 'stretcher', 'oxygen_supply', 'other']),
    notes: z.string().max(500).optional(),
  })).default([]),
});

// =============================================================================
// Step 5: Pricing (unique to direct jobs — agreed price instead of budget range)
// =============================================================================

export const jobPricingSchema = z.object({
  /** Agreed price for the job (required, must be at least 1.00) */
  agreed_price: z.number().min(1, 'Price must be at least 1.00'),

  /** Deposit percentage (0-100, default 25%) */
  deposit_percent: z.number().min(0).max(100).default(25),

  /** Additional notes about pricing/payment */
  notes: z.string().max(2000).optional().nullable(),
});

// =============================================================================
// Combined Schema (server-side validation for full direct job creation)
// =============================================================================

export const directJobFormSchema = clientDetailsSchema
  .merge(jobInfoSchema)
  .merge(jobScheduleSchema)
  .merge(jobStaffingSchema)
  .merge(jobPricingSchema);

/** Inferred type for the combined form data */
export type DirectJobFormData = z.infer<typeof directJobFormSchema>;

// =============================================================================
// Update Schema (for PUT /api/direct-jobs/[id])
// All fields optional for partial updates
// =============================================================================

export const directJobUpdateSchema = z.object({
  event_name: z.string().min(3).max(200).optional(),
  event_type: z.enum([
    'construction', 'tv_film', 'motorsport', 'festivals',
    'sporting_events', 'corporate', 'private_events', 'other',
  ]).optional(),
  event_description: z.string().max(5000).optional().nullable(),
  special_requirements: z.string().max(2000).optional().nullable(),
  indoor_outdoor: z.enum(['indoor', 'outdoor', 'mixed']).optional(),
  expected_attendance: z.number().int().min(1).max(1000000).optional().nullable(),
  agreed_price: z.number().min(1).optional(),
  location_postcode: z.string().regex(ukPostcodeRegex).optional(),
  location_address: z.string().optional().nullable(),
  location_what3words: z.string().optional().nullable(),
  location_lat: z.number().optional().nullable(),
  location_lng: z.number().optional().nullable(),
  location_display: z.string().optional().nullable(),
  status: z.enum(['draft', 'confirmed', 'in_progress', 'completed', 'cancelled']).optional(),
  event_days: z.array(z.object({
    event_date: z.string().min(1),
    start_time: z.string().min(1),
    end_time: z.string().min(1),
  })).min(1).optional(),
  staffing_requirements: z.array(z.object({
    event_day_id: z.string().optional().nullable(),
    role: z.enum(['paramedic', 'emt', 'first_aider', 'doctor', 'nurse', 'other']),
    quantity: z.number().int().min(1),
    additional_notes: z.string().max(500).optional().nullable(),
  })).min(1).optional(),
  equipment_required: z.array(z.object({
    type: z.enum(['ambulance', 'defibrillator', 'first_aid_tent', 'stretcher', 'oxygen_supply', 'other']),
    notes: z.string().max(500).optional(),
  })).optional(),
  notes: z.string().max(2000).optional().nullable(),
});
