/**
 * GET    /api/direct-jobs/[id] — Fetch single direct job with details
 * PUT    /api/direct-jobs/[id] — Update a direct job
 * DELETE /api/direct-jobs/[id] — Delete a draft direct job
 *
 * Phase 34.1: Self-Procured Jobs — Plan 01
 *
 * Follows the same patterns as web/app/api/marketplace/events/[id]/route.ts.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { directJobUpdateSchema } from '@/lib/direct-jobs/schemas';

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

    const { data: job, error } = await supabase
      .from('marketplace_events')
      .select('*, direct_clients(*), event_days(*), event_staffing_requirements(*)')
      .eq('id', id)
      .eq('source', 'direct')
      .single();

    if (error || !job) {
      return NextResponse.json({ error: 'Direct job not found' }, { status: 404 });
    }

    // Map joined client data
    const mappedJob = {
      ...job,
      client: job.direct_clients || null,
    };

    return NextResponse.json({ job: mappedJob });
  } catch (error) {
    console.error('[Direct Job GET] Unexpected error:', error);
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

    // Fetch existing job to check ownership and source
    const { data: existingJob, error: fetchError } = await supabase
      .from('marketplace_events')
      .select('id, posted_by, source, status')
      .eq('id', id)
      .eq('source', 'direct')
      .single();

    if (fetchError || !existingJob) {
      return NextResponse.json({ error: 'Direct job not found' }, { status: 404 });
    }

    if (existingJob.posted_by !== user.id) {
      return NextResponse.json({ error: 'Not authorised to edit this job' }, { status: 403 });
    }

    // Cannot edit completed or cancelled jobs
    if (existingJob.status === 'completed' || existingJob.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Cannot edit a completed or cancelled job' },
        { status: 400 }
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    // Validate with update schema (all fields optional)
    const parsed = directJobUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Build update row (only include fields that were provided)
    const updateRow: Record<string, unknown> = {};

    if (data.event_name !== undefined) updateRow.event_name = data.event_name;
    if (data.event_type !== undefined) updateRow.event_type = data.event_type;
    if (data.event_description !== undefined) updateRow.event_description = data.event_description || null;
    if (data.special_requirements !== undefined) updateRow.special_requirements = data.special_requirements || null;
    if (data.indoor_outdoor !== undefined) updateRow.indoor_outdoor = data.indoor_outdoor;
    if (data.expected_attendance !== undefined) updateRow.expected_attendance = data.expected_attendance || null;
    if (data.agreed_price !== undefined) updateRow.agreed_price = data.agreed_price;
    if (data.location_postcode !== undefined) updateRow.location_postcode = data.location_postcode;
    if (data.location_address !== undefined) updateRow.location_address = data.location_address || null;
    if (data.location_what3words !== undefined) updateRow.location_what3words = data.location_what3words || null;
    if (data.location_display !== undefined) updateRow.location_display = data.location_display || null;
    if (data.status !== undefined) updateRow.status = data.status;
    if (data.equipment_required !== undefined) updateRow.equipment_required = data.equipment_required;

    // Update the event row if there are changes
    if (Object.keys(updateRow).length > 0) {
      const { error: updateError } = await supabase
        .from('marketplace_events')
        .update(updateRow)
        .eq('id', id);

      if (updateError) {
        console.error('[Direct Job PUT] Update error:', updateError);
        return NextResponse.json({ error: 'Failed to update job' }, { status: 500 });
      }
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

    // Replace event_days if provided
    if (data.event_days) {
      await supabase.from('event_days').delete().eq('event_id', id);

      const dayRows = data.event_days.map((day, index) => ({
        event_id: id,
        event_date: day.event_date,
        start_time: day.start_time,
        end_time: day.end_time,
        sort_order: index,
      }));

      const { error: daysError } = await supabase
        .from('event_days')
        .insert(dayRows);

      if (daysError) {
        console.error('[Direct Job PUT] Failed to update event days:', daysError);
      }
    }

    // Replace staffing requirements if provided
    if (data.staffing_requirements) {
      await supabase.from('event_staffing_requirements').delete().eq('event_id', id);

      const staffingRows = data.staffing_requirements.map((req) => ({
        event_id: id,
        event_day_id: req.event_day_id || null,
        role: req.role,
        quantity: req.quantity,
        additional_notes: req.additional_notes || null,
      }));

      const { error: staffingError } = await supabase
        .from('event_staffing_requirements')
        .insert(staffingRows);

      if (staffingError) {
        console.error('[Direct Job PUT] Failed to update staffing requirements:', staffingError);
      }
    }

    // Fetch and return updated job with related data
    const { data: updated, error: refetchError } = await supabase
      .from('marketplace_events')
      .select('*, direct_clients(*), event_days(*), event_staffing_requirements(*)')
      .eq('id', id)
      .single();

    if (refetchError) {
      return NextResponse.json({ error: 'Job updated but failed to refetch' }, { status: 200 });
    }

    const mappedJob = {
      ...updated,
      client: updated.direct_clients || null,
    };

    return NextResponse.json({ job: mappedJob });
  } catch (error) {
    console.error('[Direct Job PUT] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
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

    // Fetch existing job to check ownership, source, and status
    const { data: existingJob, error: fetchError } = await supabase
      .from('marketplace_events')
      .select('id, posted_by, source, status')
      .eq('id', id)
      .eq('source', 'direct')
      .single();

    if (fetchError || !existingJob) {
      return NextResponse.json({ error: 'Direct job not found' }, { status: 404 });
    }

    if (existingJob.posted_by !== user.id) {
      return NextResponse.json({ error: 'Not authorised to delete this job' }, { status: 403 });
    }

    // Only allow deletion of draft jobs
    if (existingJob.status !== 'draft') {
      return NextResponse.json(
        { error: 'Only draft jobs can be deleted. Cancel the job instead.' },
        { status: 400 }
      );
    }

    // Delete the event (CASCADE handles event_days + event_staffing_requirements)
    const { error: deleteError } = await supabase
      .from('marketplace_events')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('[Direct Job DELETE] Delete error:', deleteError);
      return NextResponse.json({ error: 'Failed to delete job' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Direct Job DELETE] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
