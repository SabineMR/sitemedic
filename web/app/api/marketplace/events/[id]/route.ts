/**
 * GET  /api/marketplace/events/[id] — Fetch single event with details
 * PUT  /api/marketplace/events/[id] — Update event (with EVNT-05 edit restrictions)
 *
 * Phase 33: Event Posting & Discovery — Plan 01
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  eventUpdatePreQuotesSchema,
  eventUpdatePostQuotesSchema,
} from '@/lib/marketplace/event-schemas';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { data: event, error } = await supabase
      .from('marketplace_events')
      .select('*, event_days(*), event_staffing_requirements(*)')
      .eq('id', id)
      .single();

    if (error || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json({ event });
  } catch (error) {
    console.error('[Event GET] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Fetch existing event to check ownership and has_quotes
    const { data: existingEvent, error: fetchError } = await supabase
      .from('marketplace_events')
      .select('id, posted_by, has_quotes, status')
      .eq('id', id)
      .single();

    if (fetchError || !existingEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (existingEvent.posted_by !== user.id) {
      return NextResponse.json({ error: 'Not authorised to edit this event' }, { status: 403 });
    }

    if (existingEvent.status === 'awarded' || existingEvent.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Cannot edit an awarded or cancelled event' },
        { status: 400 }
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    // EVNT-05: Apply edit restrictions based on has_quotes flag
    if (existingEvent.has_quotes) {
      // Post-quotes: only description + special_requirements editable
      const parsed = eventUpdatePostQuotesSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const { data: updated, error: updateError } = await supabase
        .from('marketplace_events')
        .update({
          event_description: parsed.data.event_description,
          special_requirements: parsed.data.special_requirements,
        })
        .eq('id', id)
        .select('*, event_days(*), event_staffing_requirements(*)')
        .single();

      if (updateError) {
        console.error('[Event PUT] Update error:', updateError);
        return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
      }

      return NextResponse.json({ event: updated });
    }

    // Pre-quotes: full update allowed
    const parsed = eventUpdatePreQuotesSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Update the event row
    const updateRow: Record<string, unknown> = {
      event_name: data.event_name,
      event_type: data.event_type,
      event_description: data.event_description || null,
      special_requirements: data.special_requirements || null,
      indoor_outdoor: data.indoor_outdoor,
      expected_attendance: data.expected_attendance || null,
      budget_min: data.budget_min || null,
      budget_max: data.budget_max || null,
      location_postcode: data.location_postcode,
      location_address: data.location_address || null,
      location_what3words: data.location_what3words || null,
      location_display: data.location_display || null,
      quote_deadline: data.quote_deadline,
      equipment_required: data.equipment_required,
    };

    const { error: updateError } = await supabase
      .from('marketplace_events')
      .update(updateRow)
      .eq('id', id);

    if (updateError) {
      console.error('[Event PUT] Update error:', updateError);
      return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
    }

    // Update coordinates if lat/lng provided
    if (data.location_lat != null && data.location_lng != null) {
      await supabase
        .from('marketplace_events')
        .update({
          location_coordinates: `SRID=4326;POINT(${data.location_lng} ${data.location_lat})`,
        } as Record<string, unknown>)
        .eq('id', id);
    }

    // Replace event_days: delete old, insert new
    await supabase.from('event_days').delete().eq('event_id', id);

    if (data.event_days.length > 0) {
      const dayRows = data.event_days.map((day, index) => ({
        event_id: id,
        event_date: day.event_date,
        start_time: day.start_time,
        end_time: day.end_time,
        sort_order: index,
      }));

      await supabase.from('event_days').insert(dayRows);
    }

    // Replace staffing requirements: delete old, insert new
    await supabase.from('event_staffing_requirements').delete().eq('event_id', id);

    if (data.staffing_requirements.length > 0) {
      const staffingRows = data.staffing_requirements.map((req) => ({
        event_id: id,
        event_day_id: req.event_day_id || null,
        role: req.role,
        quantity: req.quantity,
        additional_notes: req.additional_notes || null,
      }));

      await supabase.from('event_staffing_requirements').insert(staffingRows);
    }

    // Fetch and return updated event with related data
    const { data: updated, error: refetchError } = await supabase
      .from('marketplace_events')
      .select('*, event_days(*), event_staffing_requirements(*)')
      .eq('id', id)
      .single();

    if (refetchError) {
      return NextResponse.json({ error: 'Event updated but failed to refetch' }, { status: 200 });
    }

    return NextResponse.json({ event: updated });
  } catch (error) {
    console.error('[Event PUT] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
