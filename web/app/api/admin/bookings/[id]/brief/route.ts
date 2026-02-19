/**
 * GET/PUT /api/admin/bookings/[id]/brief
 *
 * GET  — Fetch the pre-event medical brief for a booking.
 *        Creates an empty brief record if one doesn't exist yet.
 * PUT  — Upsert brief fields (common + extra_fields).
 *        Updates status automatically based on content.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireOrgId } from '@/lib/organizations/org-resolver';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params;
    const supabase = await createClient();
    const orgId = await requireOrgId();

    // Verify the booking belongs to this org
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, event_vertical')
      .eq('id', bookingId)
      .eq('org_id', orgId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Fetch existing brief
    const { data: brief } = await supabase
      .from('booking_briefs')
      .select('*')
      .eq('booking_id', bookingId)
      .single();

    if (brief) {
      return NextResponse.json({ brief, event_vertical: booking.event_vertical });
    }

    // Return an empty brief shape (not persisted yet — saved on first PUT)
    return NextResponse.json({
      brief: {
        id: null,
        booking_id: bookingId,
        nearest_ae_name: null,
        nearest_ae_address: null,
        ae_travel_minutes: null,
        helicopter_lz: null,
        emergency_rendezvous: null,
        on_site_contact_name: null,
        on_site_contact_phone: null,
        known_hazards: null,
        extra_fields: {},
        status: 'not_started',
        completed_at: null,
      },
      event_vertical: booking.event_vertical,
    });
  } catch (err) {
    console.error('GET /api/admin/bookings/[id]/brief error:', err);
    const message = err instanceof Error ? err.message : '';
    const isAuthError = message.includes('org') || message.includes('auth') || message.includes('Unauthorized');
    return NextResponse.json(
      { error: isAuthError ? 'Unauthorized' : 'Internal server error' },
      { status: isAuthError ? 401 : 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params;
    const supabase = await createClient();
    const orgId = await requireOrgId();

    // Verify the booking belongs to this org
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id')
      .eq('id', bookingId)
      .eq('org_id', orgId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    let body: {
      nearest_ae_name?: unknown;
      nearest_ae_address?: unknown;
      ae_travel_minutes?: unknown;
      helicopter_lz?: unknown;
      emergency_rendezvous?: unknown;
      on_site_contact_name?: unknown;
      on_site_contact_phone?: unknown;
      known_hazards?: unknown;
      extra_fields?: unknown;
      status?: unknown;
      event_vertical?: unknown;
    };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    // Validate ae_travel_minutes
    if (body.ae_travel_minutes !== undefined && body.ae_travel_minutes !== null) {
      const mins = Number(body.ae_travel_minutes);
      if (isNaN(mins) || mins <= 0) {
        return NextResponse.json(
          { error: 'ae_travel_minutes must be a positive number' },
          { status: 400 }
        );
      }
    }

    // Validate status
    const validStatuses = ['not_started', 'in_progress', 'complete'];
    if (body.status !== undefined && !validStatuses.includes(body.status as string)) {
      return NextResponse.json(
        { error: `status must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // Build upsert payload
    const upsertPayload: Record<string, unknown> = {
      booking_id: bookingId,
      org_id: orgId,
      updated_at: new Date().toISOString(),
    };

    if (body.nearest_ae_name !== undefined) upsertPayload.nearest_ae_name = body.nearest_ae_name || null;
    if (body.nearest_ae_address !== undefined) upsertPayload.nearest_ae_address = body.nearest_ae_address || null;
    if (body.ae_travel_minutes !== undefined) upsertPayload.ae_travel_minutes = body.ae_travel_minutes ? Number(body.ae_travel_minutes) : null;
    if (body.helicopter_lz !== undefined) upsertPayload.helicopter_lz = body.helicopter_lz || null;
    if (body.emergency_rendezvous !== undefined) upsertPayload.emergency_rendezvous = body.emergency_rendezvous || null;
    if (body.on_site_contact_name !== undefined) upsertPayload.on_site_contact_name = body.on_site_contact_name || null;
    if (body.on_site_contact_phone !== undefined) upsertPayload.on_site_contact_phone = body.on_site_contact_phone || null;
    if (body.known_hazards !== undefined) upsertPayload.known_hazards = body.known_hazards || null;
    if (body.extra_fields !== undefined) upsertPayload.extra_fields = body.extra_fields ?? {};
    if (body.status !== undefined) {
      upsertPayload.status = body.status;
      if (body.status === 'complete') {
        upsertPayload.completed_at = new Date().toISOString();
      }
    }

    // If event_vertical is provided, update the booking row too
    if (body.event_vertical !== undefined && body.event_vertical) {
      await supabase
        .from('bookings')
        .update({ event_vertical: body.event_vertical, updated_at: new Date().toISOString() })
        .eq('id', bookingId)
        .eq('org_id', orgId);
    }

    const { data, error } = await supabase
      .from('booking_briefs')
      .upsert(upsertPayload, { onConflict: 'booking_id' })
      .select()
      .single();

    if (error) {
      console.error('Error upserting booking brief:', error);
      return NextResponse.json({ error: 'Failed to save brief' }, { status: 500 });
    }

    return NextResponse.json({ brief: data });
  } catch (err) {
    console.error('PUT /api/admin/bookings/[id]/brief error:', err);
    const message = err instanceof Error ? err.message : '';
    const isAuthError = message.includes('org') || message.includes('auth') || message.includes('Unauthorized');
    return NextResponse.json(
      { error: isAuthError ? 'Unauthorized' : 'Internal server error' },
      { status: isAuthError ? 401 : 500 }
    );
  }
}
