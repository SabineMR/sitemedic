/**
 * POST   /api/direct-jobs/[id]/assign-medic — Assign a medic to a direct job
 * DELETE /api/direct-jobs/[id]/assign-medic — Remove a medic assignment
 *
 * Phase 34.1: Self-Procured Jobs -- Plan 04
 *
 * Uses the medic_commitments table with PostgreSQL EXCLUSION constraint
 * to prevent double-booking. If a medic is already committed during the
 * job's time range, the INSERT fails with error code 23P01 (exclusion
 * violation), which is caught and returned as a user-friendly conflict message.
 *
 * POST body: { medic_id: string }
 * DELETE body: { medic_id: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// =============================================================================
// POST: Assign medic to direct job
// =============================================================================

export async function POST(
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

    let body: { medic_id?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    if (!body.medic_id) {
      return NextResponse.json({ error: 'medic_id is required' }, { status: 400 });
    }

    // Fetch the direct job with event days
    const { data: job, error: jobError } = await supabase
      .from('marketplace_events')
      .select('id, posted_by, source, status, event_name, event_days(*)')
      .eq('id', id)
      .eq('source', 'direct')
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Direct job not found' }, { status: 404 });
    }

    // Verify ownership
    if (job.posted_by !== user.id) {
      return NextResponse.json({ error: 'Not authorised' }, { status: 403 });
    }

    // Cannot assign medics to completed/cancelled jobs
    if (job.status === 'completed' || job.status === 'cancelled') {
      return NextResponse.json(
        { error: `Cannot assign medics to a ${job.status} job` },
        { status: 400 }
      );
    }

    // Verify the medic exists
    const { data: medic, error: medicError } = await supabase
      .from('medics')
      .select('id, first_name, last_name')
      .eq('id', body.medic_id)
      .single();

    if (medicError || !medic) {
      return NextResponse.json({ error: 'Medic not found' }, { status: 404 });
    }

    // Get the company for this user
    const { data: company, error: companyError } = await supabase
      .from('marketplace_companies')
      .select('id')
      .eq('admin_user_id', user.id)
      .single();

    if (companyError || !company) {
      return NextResponse.json(
        { error: 'Marketplace company not found for this user' },
        { status: 403 }
      );
    }

    // Validate event days exist
    const eventDays = (job as Record<string, unknown>).event_days as Array<{
      id: string;
      event_date: string;
      start_time: string;
      end_time: string;
    }>;

    if (!eventDays || eventDays.length === 0) {
      return NextResponse.json(
        { error: 'Job has no scheduled days. Add schedule before assigning medics.' },
        { status: 400 }
      );
    }

    // Create medic_commitments for each event day
    // The EXCLUSION constraint will catch any time overlaps
    const commitmentRows = eventDays.map((day) => {
      // Build TSRANGE from event_date + start/end times
      // Format: [2026-02-20 08:00, 2026-02-20 18:00)
      const startTs = `${day.event_date} ${day.start_time}`;
      const endTs = `${day.event_date} ${day.end_time}`;

      return {
        medic_id: body.medic_id!,
        marketplace_company_id: company.id,
        event_date: day.event_date,
        time_range: `[${startTs},${endTs})`,
      };
    });

    const { data: commitments, error: commitError } = await supabase
      .from('medic_commitments')
      .insert(commitmentRows)
      .select('id, event_date, time_range');

    if (commitError) {
      // 23P01 = exclusion_violation (medic already booked during this time)
      if (commitError.code === '23P01') {
        return NextResponse.json(
          {
            error: 'Scheduling conflict',
            message: `${medic.first_name} ${medic.last_name} is already committed during one or more of these time slots.`,
            code: 'SCHEDULE_CONFLICT',
          },
          { status: 409 }
        );
      }

      console.error('[Assign Medic] Insert failed:', commitError);
      return NextResponse.json(
        { error: 'Failed to assign medic', details: commitError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      medic: {
        id: medic.id,
        name: `${medic.first_name} ${medic.last_name}`,
      },
      commitments: commitments || [],
      message: `${medic.first_name} ${medic.last_name} assigned to ${job.event_name}`,
    });
  } catch (error) {
    console.error('[Assign Medic POST] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// =============================================================================
// DELETE: Remove medic assignment from direct job
// =============================================================================

export async function DELETE(
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

    let body: { medic_id?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    if (!body.medic_id) {
      return NextResponse.json({ error: 'medic_id is required' }, { status: 400 });
    }

    // Fetch the direct job
    const { data: job, error: jobError } = await supabase
      .from('marketplace_events')
      .select('id, posted_by, source, status, event_name, event_days(*)')
      .eq('id', id)
      .eq('source', 'direct')
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Direct job not found' }, { status: 404 });
    }

    // Verify ownership
    if (job.posted_by !== user.id) {
      return NextResponse.json({ error: 'Not authorised' }, { status: 403 });
    }

    // Cannot unassign medics from completed jobs
    if (job.status === 'completed') {
      return NextResponse.json(
        { error: 'Cannot remove medics from a completed job' },
        { status: 400 }
      );
    }

    // Get the company for this user
    const { data: company, error: companyError } = await supabase
      .from('marketplace_companies')
      .select('id')
      .eq('admin_user_id', user.id)
      .single();

    if (companyError || !company) {
      return NextResponse.json(
        { error: 'Marketplace company not found for this user' },
        { status: 403 }
      );
    }

    // Get the event days for this job to match commitments
    const eventDays = (job as Record<string, unknown>).event_days as Array<{
      event_date: string;
    }>;
    const eventDates = eventDays.map((d) => d.event_date);

    // Remove all commitments for this medic on these dates from this company
    const { error: deleteError, count } = await supabase
      .from('medic_commitments')
      .delete({ count: 'exact' })
      .eq('medic_id', body.medic_id)
      .eq('marketplace_company_id', company.id)
      .in('event_date', eventDates);

    if (deleteError) {
      console.error('[Assign Medic DELETE] Delete failed:', deleteError);
      return NextResponse.json(
        { error: 'Failed to remove medic assignment' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      removedCount: count || 0,
      message: `Medic unassigned from ${job.event_name}`,
    });
  } catch (error) {
    console.error('[Assign Medic DELETE] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
