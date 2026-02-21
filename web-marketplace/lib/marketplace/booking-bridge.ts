/**
 * Marketplace Booking Bridge
 * Phase 35: Award Flow & Payment — Plan 02
 *
 * Creates booking record(s) from an awarded marketplace quote.
 * One booking per event day (multi-day events create multiple bookings).
 *
 * Key differences from direct-jobs booking-bridge:
 * - source = 'marketplace' (not 'direct')
 * - Platform commission applied (not 0%)
 * - Marketplace payment columns populated (deposit, remainder, Stripe refs)
 * - medic_id left null (company assigns from roster later)
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
  calculateMarketplaceCommission,
  calculateRemainderDueDate,
  getConfiguredCommissionSplit,
} from './award-calculations';

// =============================================================================
// Types
// =============================================================================

export interface CreateMarketplaceBookingParams {
  eventId: string;
  quoteId: string;
  quote: {
    total_price: number;
    company_id: string;
  };
  event: {
    event_name: string;
    location_address: string | null;
    location_postcode: string | null;
    event_type: string;
    posted_by: string;
  };
  eventDays: Array<{
    event_date: string;
    start_time: string;
    end_time: string;
  }>;
  depositAmount: number;
  depositPercent: number;
  remainderAmount: number;
  stripeCustomerId: string;
  stripePaymentMethodId: string;
  depositPaymentIntentId: string;
  platformFeePercent?: number;
  medicPayoutPercent?: number;
}

export interface CreateMarketplaceBookingResult {
  success: boolean;
  bookingIds: string[];
  error?: string;
}

// =============================================================================
// Booking Bridge Function
// =============================================================================

export async function createMarketplaceBooking(
  supabase: SupabaseClient,
  params: CreateMarketplaceBookingParams
): Promise<CreateMarketplaceBookingResult> {
  const {
    eventId,
    quoteId,
    quote,
    event,
    eventDays,
    depositAmount,
    depositPercent,
    remainderAmount,
    stripeCustomerId,
    stripePaymentMethodId,
    depositPaymentIntentId,
    platformFeePercent,
    medicPayoutPercent,
  } = params;

  try {
    if (!eventDays || eventDays.length === 0) {
      return { success: false, bookingIds: [], error: 'Event must have at least one day' };
    }

    // Resolve org_id from the company
    const { data: company } = await supabase
      .from('marketplace_companies')
      .select('org_id')
      .eq('id', quote.company_id)
      .single();

    const orgId = company?.org_id || null;

    const configuredSplit = await getConfiguredCommissionSplit();
    const effectivePlatformFeePercent = platformFeePercent ?? configuredSplit.platformFeePercent;
    const effectiveMedicPayoutPercent = medicPayoutPercent ?? configuredSplit.medicPayoutPercent;

    // Calculate commission
    const commission = calculateMarketplaceCommission(
      quote.total_price,
      effectivePlatformFeePercent,
      effectiveMedicPayoutPercent
    );

    // Find latest event day for remainder due date
    const sortedDays = [...eventDays].sort((a, b) =>
      b.event_date.localeCompare(a.event_date)
    );
    const lastDay = sortedDays[0];
    const eventEndDate = new Date(`${lastDay.event_date}T${lastDay.end_time}`);
    const remainderDueAt = calculateRemainderDueDate(eventEndDate);

    // Per-day price split (divide total evenly across days)
    const dayCount = eventDays.length;
    const perDayTotal = parseFloat((quote.total_price / dayCount).toFixed(2));
    const perDaySubtotal = parseFloat((perDayTotal / 1.20).toFixed(2));
    const perDayVat = parseFloat((perDayTotal - perDaySubtotal).toFixed(2));
    const perDayPlatformFee = parseFloat(
      (perDaySubtotal * (effectivePlatformFeePercent / 100)).toFixed(2)
    );
    const perDayMedicPayout = parseFloat(
      (perDaySubtotal * (effectiveMedicPayoutPercent / 100)).toFixed(2)
    );
    const perDayDeposit = parseFloat((depositAmount / dayCount).toFixed(2));
    const perDayRemainder = parseFloat((remainderAmount / dayCount).toFixed(2));

    const bookingIds: string[] = [];

    for (const day of eventDays) {
      // Calculate shift hours
      const startParts = day.start_time.split(':').map(Number);
      const endParts = day.end_time.split(':').map(Number);
      const startMinutes = startParts[0] * 60 + (startParts[1] || 0);
      const endMinutes = endParts[0] * 60 + (endParts[1] || 0);
      const shiftMinutes = endMinutes > startMinutes
        ? endMinutes - startMinutes
        : (24 * 60 - startMinutes) + endMinutes;
      const shiftHours = Math.max(shiftMinutes / 60, 1);
      const baseRate = parseFloat((perDaySubtotal / shiftHours).toFixed(2));

      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          org_id: orgId,
          client_id: null, // Marketplace clients use auth.users, not clients table
          medic_id: null, // Assigned later by company
          status: 'confirmed',
          source: 'marketplace',
          // Event reference
          marketplace_event_id: eventId,
          marketplace_quote_id: quoteId,
          // Site details
          site_name: event.event_name,
          site_address: event.location_address || event.location_postcode || '',
          site_postcode: event.location_postcode || '',
          // Shift timing
          shift_date: day.event_date,
          shift_start_time: day.start_time,
          shift_end_time: day.end_time,
          shift_hours: shiftHours,
          // Pricing with commission
          base_rate: baseRate,
          urgency_premium_percent: 0,
          travel_surcharge: 0,
          subtotal: perDaySubtotal,
          vat: perDayVat,
          total: perDayTotal,
          platform_fee: perDayPlatformFee,
          medic_payout: perDayMedicPayout,
          platform_net: perDayPlatformFee,
          // No referral for marketplace
          is_referral: false,
          referral_payout_percent: 0,
          referral_payout_amount: 0,
          // Marketplace payment tracking
          deposit_amount: perDayDeposit,
          deposit_percent: depositPercent,
          remainder_amount: perDayRemainder,
          remainder_due_at: remainderDueAt.toISOString(),
          stripe_customer_id: stripeCustomerId,
          stripe_payment_method_id: stripePaymentMethodId,
          deposit_payment_intent_id: depositPaymentIntentId,
          // Vertical
          event_vertical: event.event_type,
        })
        .select('id')
        .single();

      if (bookingError) {
        console.error('[Marketplace Booking Bridge] Failed to create booking:', bookingError);
        return {
          success: false,
          bookingIds,
          error: `Failed to create booking for ${day.event_date}: ${bookingError.message}`,
        };
      }

      bookingIds.push(booking.id);
    }

    console.log(
      `[Marketplace Booking Bridge] Created ${bookingIds.length} booking(s) for event ${eventId}`,
      { bookingIds, commission }
    );

    return { success: true, bookingIds };
  } catch (error) {
    console.error('[Marketplace Booking Bridge] Unexpected error:', error);
    return {
      success: false,
      bookingIds: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
