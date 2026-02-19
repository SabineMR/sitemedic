/**
 * Booking Detail API
 * Phase 4.5: Fetch a booking by ID with joined client and medic data
 */

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { requireOrgId } from '@/lib/organizations/org-resolver';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params;

    if (!bookingId) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Multi-tenant: Get current user's org_id
    const orgId = await requireOrgId();

    // Query bookings table with joins (same pattern as booking-confirmation email route)
    // IMPORTANT: Filter by org_id to prevent cross-org access
    const { data: booking, error } = await supabase
      .from('bookings')
      .select(`
        *,
        clients (
          id,
          company_name,
          contact_name,
          contact_email
        ),
        medics (
          id,
          first_name,
          last_name,
          email,
          star_rating
        )
      `)
      .eq('id', bookingId)
      .eq('org_id', orgId)
      .single();

    if (error || !booking) {
      console.error('❌ Failed to fetch booking:', error);
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Normalize the joined relations (handle array vs object like email route does)
    const client = Array.isArray(booking.clients) ? booking.clients[0] : booking.clients;
    const medic = booking.medics ? (Array.isArray(booking.medics) ? booking.medics[0] : booking.medics) : null;

    return NextResponse.json({
      booking: {
        id: booking.id,
        client_id: booking.client_id,
        medic_id: booking.medic_id,
        site_name: booking.site_name,
        site_address: booking.site_address,
        site_postcode: booking.site_postcode,
        what3words_address: booking.what3words_address,
        site_contact_name: booking.site_contact_name,
        site_contact_phone: booking.site_contact_phone,
        shift_date: booking.shift_date,
        shift_start_time: booking.shift_start_time,
        shift_end_time: booking.shift_end_time,
        shift_hours: booking.shift_hours,
        base_rate: booking.base_rate,
        urgency_premium_percent: booking.urgency_premium_percent,
        travel_surcharge: booking.travel_surcharge,
        subtotal: booking.subtotal,
        vat: booking.vat,
        total: booking.total,
        status: booking.status,
        is_recurring: booking.is_recurring,
        recurrence_pattern: booking.recurrence_pattern,
        recurring_until: booking.recurring_until,
        special_notes: booking.special_notes,
      },
      client: client ? {
        company_name: client.company_name,
        contact_name: client.contact_name,
        contact_email: client.contact_email,
      } : null,
      medic: medic ? {
        first_name: medic.first_name,
        last_name: medic.last_name,
        star_rating: medic.star_rating,
      } : null,
    });

  } catch (error) {
    console.error('❌ Booking detail error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
