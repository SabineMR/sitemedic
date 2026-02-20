/**
 * POST /api/direct-jobs/[id]/confirm
 * Phase 34.1: Self-Procured Jobs -- Plan 04
 *
 * Confirms a direct job and creates a booking record via the booking bridge.
 *
 * Flow:
 * 1. Verify job ownership and draft status
 * 2. Transition job status from 'draft' to 'confirmed'
 * 3. Create a booking record with source='direct' and 0% commission
 *    via createDirectJobBooking
 * 4. Return the confirmed job and booking ID
 *
 * The booking bridge maps direct job data to the bookings table, enabling
 * the full booking lifecycle (timesheets, invoices, payroll) for direct jobs.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createDirectJobBooking } from '@/lib/direct-jobs/booking-bridge';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(
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

    // Fetch the direct job with all related data
    const { data: job, error: jobError } = await supabase
      .from('marketplace_events')
      .select('*, direct_clients(*), event_days(*), event_staffing_requirements(*)')
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

    // Only draft jobs can be confirmed via this endpoint
    // Already-confirmed jobs should return a helpful message
    if (job.status === 'confirmed' || job.status === 'in_progress') {
      return NextResponse.json({
        success: true,
        message: 'Job is already confirmed',
        jobId: job.id,
      });
    }

    if (job.status === 'completed' || job.status === 'cancelled') {
      return NextResponse.json(
        { error: `Cannot confirm a ${job.status} job` },
        { status: 400 }
      );
    }

    // Validate required data for confirmation
    if (!job.agreed_price || job.agreed_price <= 0) {
      return NextResponse.json(
        { error: 'Job must have an agreed price before confirmation' },
        { status: 400 }
      );
    }

    // Resolve the company's org_id for the booking
    const { data: company, error: companyError } = await supabase
      .from('marketplace_companies')
      .select('id, org_id')
      .eq('admin_user_id', user.id)
      .single();

    if (companyError || !company) {
      return NextResponse.json(
        { error: 'Marketplace company not found for this user' },
        { status: 403 }
      );
    }

    // Transition job status to 'confirmed'
    const { error: updateError } = await supabase
      .from('marketplace_events')
      .update({ status: 'confirmed' })
      .eq('id', id);

    if (updateError) {
      console.error('[Direct Job Confirm] Status update failed:', updateError);
      return NextResponse.json({ error: 'Failed to confirm job' }, { status: 500 });
    }

    // Create booking record via the bridge
    // Map the raw Supabase row to our DirectJob type
    const mappedJob = {
      ...job,
      client: job.direct_clients || null,
      event_days: job.event_days || [],
      event_staffing_requirements: job.event_staffing_requirements || [],
    };

    // Use the company's org_id if available, otherwise use a placeholder
    // Direct jobs need an org_id to work within the multi-tenant bookings table
    const orgId = company.org_id;

    if (!orgId) {
      // Company exists but has no linked org -- booking creation skipped
      // The job is still confirmed; booking can be created later when org is linked
      console.warn('[Direct Job Confirm] Company has no org_id; booking not created');
      return NextResponse.json({
        success: true,
        jobId: job.id,
        status: 'confirmed',
        bookingCreated: false,
        message: 'Job confirmed but booking not created (company has no linked organisation)',
      });
    }

    const bookingResult = await createDirectJobBooking(supabase, {
      job: mappedJob,
      orgId,
    });

    if (!bookingResult.success) {
      // Job is confirmed but booking failed -- log and continue
      // The job status is already updated; booking can be retried
      console.error('[Direct Job Confirm] Booking creation failed:', bookingResult.error);
      return NextResponse.json({
        success: true,
        jobId: job.id,
        status: 'confirmed',
        bookingCreated: false,
        bookingError: bookingResult.error,
      });
    }

    return NextResponse.json({
      success: true,
      jobId: job.id,
      bookingId: bookingResult.bookingId,
      status: 'confirmed',
      bookingCreated: true,
    });
  } catch (error) {
    console.error('[Direct Job Confirm] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
