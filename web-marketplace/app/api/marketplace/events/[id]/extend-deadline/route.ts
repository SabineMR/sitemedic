/**
 * POST /api/marketplace/events/[id]/extend-deadline
 * Phase 34: Quote Submission & Comparison — Plan 03
 *
 * Endpoint for extending the quote deadline on an event.
 * Only the event poster can extend, and only once (deadline_extended boolean).
 *
 * Guards:
 * - Must be authenticated and the event poster (posted_by)
 * - Event must have status 'open'
 * - deadline_extended must be false (one-time extension only)
 * - New deadline must be in the future and after current deadline
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// =============================================================================
// POST Handler
// =============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;

    // =========================================================================
    // 1. Authenticate user
    // =========================================================================

    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // =========================================================================
    // 2. Fetch event and verify ownership
    // =========================================================================

    const { data: event, error: eventError } = await supabase
      .from('marketplace_events')
      .select('id, posted_by, status, quote_deadline, deadline_extended')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { success: false, message: 'Event not found' },
        { status: 404 }
      );
    }

    // Only the event poster can extend the deadline
    if (event.posted_by !== user.id) {
      return NextResponse.json(
        { success: false, message: 'Only the event poster can extend the deadline' },
        { status: 403 }
      );
    }

    // =========================================================================
    // 3. Verify event status is 'open'
    // =========================================================================

    if (event.status !== 'open') {
      return NextResponse.json(
        {
          success: false,
          message: `Cannot extend deadline on an event with status '${event.status}'. Event must be open.`,
        },
        { status: 400 }
      );
    }

    // =========================================================================
    // 4. Check if deadline has already been extended
    // =========================================================================

    if (event.deadline_extended === true) {
      return NextResponse.json(
        {
          success: false,
          message: 'Deadline has already been extended once. Further extensions are not allowed.',
        },
        { status: 400 }
      );
    }

    // =========================================================================
    // 5. Parse and validate new deadline
    // =========================================================================

    let body: { new_deadline?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    if (!body.new_deadline) {
      return NextResponse.json(
        { success: false, message: 'new_deadline is required (ISO date string)' },
        { status: 400 }
      );
    }

    const newDeadline = new Date(body.new_deadline);
    if (isNaN(newDeadline.getTime())) {
      return NextResponse.json(
        { success: false, message: 'new_deadline must be a valid date' },
        { status: 400 }
      );
    }

    // Must be in the future
    if (newDeadline <= new Date()) {
      return NextResponse.json(
        { success: false, message: 'New deadline must be in the future' },
        { status: 400 }
      );
    }

    // Must be after current deadline
    const currentDeadline = new Date(event.quote_deadline);
    if (newDeadline <= currentDeadline) {
      return NextResponse.json(
        { success: false, message: 'New deadline must be after the current deadline' },
        { status: 400 }
      );
    }

    // =========================================================================
    // 6. Update event with new deadline
    // =========================================================================

    const { error: updateError } = await supabase
      .from('marketplace_events')
      .update({
        quote_deadline: newDeadline.toISOString(),
        deadline_extended: true,
      })
      .eq('id', eventId);

    if (updateError) {
      console.error('[Extend Deadline] Error:', updateError);
      return NextResponse.json(
        { success: false, message: 'Failed to extend deadline' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Deadline extended successfully',
        new_deadline: newDeadline.toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('POST /api/marketplace/events/[id]/extend-deadline error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
