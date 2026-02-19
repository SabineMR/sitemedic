/**
 * POST /api/marketplace/events — Create a new marketplace event
 * GET  /api/marketplace/events — List events with filters and location-based discovery
 *
 * Phase 33: Event Posting & Discovery — Plan 01
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { eventFormSchema } from '@/lib/marketplace/event-schemas';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    // Validate with Zod
    const parsed = eventFormSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const saveAsDraft = (body.save_as_draft as boolean) === true;

    // Build event row
    const eventRow: Record<string, unknown> = {
      posted_by: user.id,
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
      status: saveAsDraft ? 'draft' : 'open',
      equipment_required: data.equipment_required,
    };

    // Insert event
    const { data: event, error: eventError } = await supabase
      .from('marketplace_events')
      .insert(eventRow)
      .select('id')
      .single();

    if (eventError || !event) {
      console.error('[Events POST] Failed to create event:', eventError);
      return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
    }

    // Set location_coordinates via RPC if lat/lng provided
    if (data.location_lat != null && data.location_lng != null) {
      await supabase.rpc('set_event_coordinates' as never, {
        event_id: event.id,
        lng: data.location_lng,
        lat: data.location_lat,
      } as never).then(({ error }) => {
        if (error) {
          // Non-blocking — coordinates can be set later
          console.error('[Events POST] Failed to set coordinates:', error);
        }
      });

      // Fallback: use raw SQL if RPC not available
      if (data.location_lat != null && data.location_lng != null) {
        const { error: coordError } = await supabase
          .from('marketplace_events')
          .update({
            location_coordinates: `SRID=4326;POINT(${data.location_lng} ${data.location_lat})`,
          } as Record<string, unknown>)
          .eq('id', event.id);

        if (coordError) {
          console.error('[Events POST] Coordinate update fallback failed:', coordError);
        }
      }
    }

    // Insert event days
    if (data.event_days.length > 0) {
      const dayRows = data.event_days.map((day, index) => ({
        event_id: event.id,
        event_date: day.event_date,
        start_time: day.start_time,
        end_time: day.end_time,
        sort_order: index,
      }));

      const { error: daysError } = await supabase
        .from('event_days')
        .insert(dayRows);

      if (daysError) {
        console.error('[Events POST] Failed to insert event days:', daysError);
      }
    }

    // Insert staffing requirements
    if (data.staffing_requirements.length > 0) {
      const staffingRows = data.staffing_requirements.map((req) => ({
        event_id: event.id,
        event_day_id: req.event_day_id || null,
        role: req.role,
        quantity: req.quantity,
        additional_notes: req.additional_notes || null,
      }));

      const { error: staffingError } = await supabase
        .from('event_staffing_requirements')
        .insert(staffingRows);

      if (staffingError) {
        console.error('[Events POST] Failed to insert staffing requirements:', staffingError);
      }
    }

    return NextResponse.json({ success: true, eventId: event.id }, { status: 201 });
  } catch (error) {
    console.error('[Events POST] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const eventType = searchParams.get('event_type');
    const postedBy = searchParams.get('posted_by');
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const radiusMiles = searchParams.get('radius_miles');
    const role = searchParams.get('role');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const offset = (page - 1) * limit;

    // Location-based query using PostGIS
    if (lat && lng) {
      const radiusMeters = (parseFloat(radiusMiles || '50') * 1609.34).toFixed(0);
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);

      if (isNaN(latitude) || isNaN(longitude)) {
        return NextResponse.json({ error: 'Invalid lat/lng values' }, { status: 400 });
      }

      // Use raw SQL for PostGIS spatial queries
      const { data: events, error } = await supabase.rpc('search_events_by_location' as never, {
        search_lat: latitude,
        search_lng: longitude,
        radius_meters: parseInt(radiusMeters),
        filter_status: status || 'open',
        filter_event_type: eventType || null,
        filter_role: role || null,
        result_limit: limit,
        result_offset: offset,
      } as never);

      if (error) {
        // Fallback to non-spatial query if RPC not available
        console.error('[Events GET] Spatial query failed, falling back:', error);
      } else {
        return NextResponse.json({ events: events || [], page, limit });
      }
    }

    // Standard query (non-spatial)
    let query = supabase
      .from('marketplace_events')
      .select('*, event_days(*), event_staffing_requirements(*)', { count: 'exact' });

    if (status) {
      query = query.eq('status', status);
    } else if (!postedBy) {
      // Default: show open events for browsing
      query = query.eq('status', 'open');
    }

    if (eventType) {
      query = query.eq('event_type', eventType);
    }

    if (postedBy === 'me') {
      query = query.eq('posted_by', user.id);
    } else if (postedBy) {
      query = query.eq('posted_by', postedBy);
    }

    // Filter by staffing role if specified
    if (role) {
      query = query.filter(
        'event_staffing_requirements.role',
        'eq',
        role
      );
    }

    query = query
      .order('quote_deadline', { ascending: true })
      .range(offset, offset + limit - 1);

    const { data: events, error, count } = await query;

    if (error) {
      console.error('[Events GET] Query error:', error);
      return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
    }

    return NextResponse.json({
      events: events || [],
      total: count || 0,
      page,
      limit,
    });
  } catch (error) {
    console.error('[Events GET] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
