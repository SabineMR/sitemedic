/**
 * Marketplace Event Zod Validation Schemas
 * Phase 33: Event Posting & Discovery
 *
 * Schemas for the multi-step event posting wizard:
 *   Step 1: basicInfoSchema — event name, type, description
 *   Step 2: schedulingSchema — dates, location, quote deadline
 *   Step 3: staffingSchema — staffing requirements, equipment, budget
 *
 * Also provides:
 *   - eventFormSchema: Combined schema for server-side validation
 *   - eventUpdatePreQuotesSchema: Full update (before quotes arrive)
 *   - eventUpdatePostQuotesSchema: Restricted update (EVNT-05: only description + special_requirements after quotes)
 */

import { z } from 'zod';

// UK postcode validation regex
const ukPostcodeRegex = /^[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}$/i;

// =============================================================================
// Step 1: Basic Info
// =============================================================================

export const basicInfoSchema = z.object({
  event_name: z.string().min(3, 'Event name must be at least 3 characters').max(200),
  event_type: z.enum([
    'construction', 'tv_film', 'motorsport', 'festivals',
    'sporting_events', 'corporate', 'private_events', 'other',
  ]),
  event_description: z.string().max(5000).optional().nullable(),
  special_requirements: z.string().max(2000).optional().nullable(),
  indoor_outdoor: z.enum(['indoor', 'outdoor', 'mixed']),
  expected_attendance: z.number().int().min(1).max(1000000).optional().nullable(),
});

// =============================================================================
// Step 2: Schedule & Location
// =============================================================================

export const schedulingSchema = z.object({
  event_days: z.array(z.object({
    event_date: z.string().min(1, 'Date is required'),
    start_time: z.string().min(1, 'Start time is required'),
    end_time: z.string().min(1, 'End time is required'),
  })).min(1, 'At least one event day is required'),
  location_postcode: z.string().regex(ukPostcodeRegex, 'Enter a valid UK postcode'),
  location_address: z.string().optional().nullable(),
  location_what3words: z.string().optional().nullable(),
  location_lat: z.number().optional().nullable(),
  location_lng: z.number().optional().nullable(),
  location_display: z.string().optional().nullable(),
  quote_deadline: z.string().min(1, 'Quote deadline is required'),
});

// =============================================================================
// Step 3: Staffing & Equipment
// =============================================================================

export const staffingSchema = z.object({
  staffing_requirements: z.array(z.object({
    event_day_id: z.string().optional().nullable(),
    role: z.enum(['paramedic', 'emt', 'first_aider', 'doctor', 'nurse', 'other']),
    quantity: z.number().int().min(1, 'At least 1 required'),
    additional_notes: z.string().max(500).optional().nullable(),
  })).min(1, 'At least one staffing requirement is required'),
  equipment_required: z.array(z.object({
    type: z.enum(['ambulance', 'defibrillator', 'first_aid_tent', 'stretcher', 'oxygen_supply', 'other']),
    notes: z.string().max(500).optional(),
  })).default([]),
  budget_min: z.number().min(0).optional().nullable(),
  budget_max: z.number().min(0).optional().nullable(),
});

// =============================================================================
// Combined Schema (server-side validation for full event creation)
// =============================================================================

export const eventFormSchema = basicInfoSchema
  .merge(schedulingSchema)
  .merge(staffingSchema)
  .refine(
    (data) => !data.budget_min || !data.budget_max || data.budget_min <= data.budget_max,
    { message: 'Minimum budget cannot exceed maximum', path: ['budget_min'] }
  );

// =============================================================================
// Update Schemas (EVNT-05: edit restrictions based on has_quotes flag)
// =============================================================================

/** Full update — all fields editable (before any quotes arrive) */
export const eventUpdatePreQuotesSchema = basicInfoSchema
  .merge(schedulingSchema)
  .merge(staffingSchema);

/** Restricted update — only description + special_requirements (after quotes exist) */
export const eventUpdatePostQuotesSchema = z.object({
  event_description: z.string().max(5000).optional().nullable(),
  special_requirements: z.string().max(2000).optional().nullable(),
});
