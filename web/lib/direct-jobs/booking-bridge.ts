/**
 * Direct Job Booking Bridge
 * Phase 34.1: Self-Procured Jobs -- Plan 04
 *
 * Creates a booking record from a confirmed direct job with source='direct'
 * and 0% platform commission (platform_fee_percent=0, medic_payout_percent=100).
 *
 * The bridge maps direct job fields to the existing bookings table schema,
 * ensuring direct jobs integrate with the full booking lifecycle (timesheets,
 * invoices, payroll, etc.) without touching the database schema.
 *
 * Key invariants:
 * - source = 'direct' (not 'marketplace')
 * - platform_fee = 0 (company keeps 100%)
 * - medic_payout = total (medic gets 100% of what company pays them)
 * - No referral fields (direct jobs are self-sourced)
 */

import { SupabaseClient } from '@supabase/supabase-js';
import type { DirectJob } from './types';

// =============================================================================
// Types
// =============================================================================

export interface CreateDirectJobBookingParams {
  /** The direct job (marketplace_event with source='direct') */
  job: DirectJob;
  /** The org_id for the company creating this booking */
  orgId: string;
  /** Optional medic ID if pre-assigned */
  medicId?: string;
}

export interface CreateDirectJobBookingResult {
  success: boolean;
  bookingId?: string;
  error?: string;
}

// =============================================================================
// Booking Bridge Function
// =============================================================================

/**
 * Creates a booking record from a direct job with 0% platform commission.
 *
 * Maps direct job fields to the bookings table:
 * - event_name -> site_name
 * - location_address -> site_address
 * - location_postcode -> site_postcode
 * - First event_day -> shift_date, shift_start_time, shift_end_time
 * - agreed_price -> total (with VAT split calculated)
 * - 0% platform fee, 100% medic payout
 */
export async function createDirectJobBooking(
  supabase: SupabaseClient,
  params: CreateDirectJobBookingParams
): Promise<CreateDirectJobBookingResult> {
  const { job, orgId, medicId } = params;

  try {
    // Validate job has required data
    if (!job.agreed_price || job.agreed_price <= 0) {
      return { success: false, error: 'Job must have an agreed price' };
    }

    if (!job.event_days || job.event_days.length === 0) {
      return { success: false, error: 'Job must have at least one scheduled day' };
    }

    // Use the first event day for the booking shift details
    // Multi-day jobs create one booking per day (future enhancement)
    const firstDay = job.event_days.sort((a, b) =>
      a.event_date.localeCompare(b.event_date)
    )[0];

    // Calculate shift hours from start/end time
    const startParts = firstDay.start_time.split(':').map(Number);
    const endParts = firstDay.end_time.split(':').map(Number);
    const startMinutes = startParts[0] * 60 + (startParts[1] || 0);
    const endMinutes = endParts[0] * 60 + (endParts[1] || 0);
    const shiftMinutes = endMinutes > startMinutes
      ? endMinutes - startMinutes
      : (24 * 60 - startMinutes) + endMinutes; // Overnight shift
    const shiftHours = Math.max(shiftMinutes / 60, 1); // Minimum 1 hour

    // For direct jobs: agreed_price is the total including VAT
    // Split: subtotal = total / 1.20, vat = total - subtotal
    const total = job.agreed_price;
    const subtotal = parseFloat((total / 1.20).toFixed(2));
    const vat = parseFloat((total - subtotal).toFixed(2));
    const baseRate = parseFloat((subtotal / shiftHours).toFixed(2));

    // Direct job: 0% platform commission
    const platformFee = 0;
    const medicPayout = total; // Company pays medic from their own funds
    const platformNet = 0;

    // Get client contact info for site details
    const contactName = job.client?.contact_name || job.client?.client_name || 'N/A';
    const contactPhone = job.client?.contact_phone || '';

    // Insert the booking record
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
        .insert({
        org_id: orgId,
        client_id: null, // Direct jobs use direct_clients, not the bookings.client_id (which refs clients table)
        medic_id: medicId || null,
        status: 'confirmed',
          source: 'direct',
          source_provenance: 'self_sourced',
          fee_policy: 'subscription',
          source_origin_event_id: job.id,
          source_lock_reason: 'direct_job_booking_created',
          // Site details mapped from job
        site_name: job.event_name,
        site_address: job.location_address || job.location_postcode,
        site_postcode: job.location_postcode,
        site_contact_name: contactName,
        site_contact_phone: contactPhone,
        // Shift timing from first event day
        shift_date: firstDay.event_date,
        shift_start_time: firstDay.start_time,
        shift_end_time: firstDay.end_time,
        shift_hours: shiftHours,
        // Pricing: 0% platform commission
        base_rate: baseRate,
        urgency_premium_percent: 0,
        travel_surcharge: 0,
        subtotal,
        vat,
        total,
        platform_fee: platformFee,
        medic_payout: medicPayout,
        // Referral fields (none for direct jobs)
        is_referral: false,
        referral_payout_percent: 0,
        referral_payout_amount: 0,
        platform_net: platformNet,
        // Special requirements from job
        special_notes: [
          job.special_requirements,
          `Direct Job: ${job.event_name}`,
          job.client ? `Client: ${job.client.client_name}` : null,
        ]
          .filter(Boolean)
          .join('\n'),
        event_vertical: job.event_type,
      })
      .select('id')
      .single();

    if (bookingError) {
      console.error('[Booking Bridge] Failed to create booking:', bookingError);
      return { success: false, error: `Failed to create booking: ${bookingError.message}` };
    }

    return { success: true, bookingId: booking.id };
  } catch (error) {
    console.error('[Booking Bridge] Unexpected error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
