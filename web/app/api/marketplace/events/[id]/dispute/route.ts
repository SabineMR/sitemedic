/**
 * GET  /api/marketplace/events/[id]/dispute -- Fetch disputes for a marketplace event
 * POST /api/marketplace/events/[id]/dispute -- File a new dispute
 *
 * Phase 36: Ratings, Messaging & Disputes -- Plan 03
 *
 * Disputes immediately place a remainder_hold on related bookings to freeze
 * any pending remainder charges until an admin resolves the dispute.
 *
 * Access:
 *   - GET: event poster, awarded company admin, or platform admin
 *   - POST: event poster (client) or awarded company admin (company)
 *
 * Constraints:
 *   - Events must be in completed, in_progress, or confirmed status to file
 *   - Dispute categories: no_show, late_cancellation, quality_issue,
 *     billing_dispute, safety_concern
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// =============================================================================
// Validation
// =============================================================================

const disputeSchema = z.object({
  category: z.enum([
    'no_show',
    'late_cancellation',
    'quality_issue',
    'billing_dispute',
    'safety_concern',
  ]),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(5000, 'Description must be under 5000 characters'),
});

// =============================================================================
// GET -- Fetch disputes for a marketplace event
// =============================================================================

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Verify the event exists
    const { data: event, error: eventError } = await supabase
      .from('marketplace_events')
      .select('id, posted_by')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: 'Marketplace event not found' }, { status: 404 });
    }

    // Check access: event poster, awarded company admin, or platform admin
    let hasAccess = false;

    if (event.posted_by === user.id) {
      hasAccess = true;
    }

    if (!hasAccess) {
      // Check if user is the admin of the awarded company
      const { data: awardedQuote } = await supabase
        .from('marketplace_quotes')
        .select('company_id, marketplace_companies!inner(admin_user_id)')
        .eq('event_id', eventId)
        .eq('status', 'awarded')
        .single();

      if (awardedQuote) {
        const companies = awardedQuote.marketplace_companies as unknown as { admin_user_id: string };
        if (companies.admin_user_id === user.id) {
          hasAccess = true;
        }
      }
    }

    if (!hasAccess) {
      // Check platform admin
      const { data: isAdmin } = await supabase.rpc('is_platform_admin');
      if (isAdmin === true) {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Only the event poster, awarded company admin, or platform admin can view disputes' },
        { status: 403 }
      );
    }

    // Fetch disputes for this event
    const { data: disputes, error: disputesError } = await supabase
      .from('marketplace_disputes')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (disputesError) {
      console.error('[Marketplace Disputes GET] Fetch error:', disputesError);
      return NextResponse.json({ error: 'Failed to fetch disputes' }, { status: 500 });
    }

    return NextResponse.json({ disputes: disputes || [] });
  } catch (error) {
    console.error('[Marketplace Disputes GET] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// =============================================================================
// POST -- File a new dispute
// =============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Validate request body
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = disputeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { category, description } = parsed.data;

    // Verify event exists and check its status
    const { data: event, error: eventError } = await supabase
      .from('marketplace_events')
      .select('id, posted_by, status')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: 'Marketplace event not found' }, { status: 404 });
    }

    // Event must be in an active/completed state to file a dispute
    const allowedStatuses = ['completed', 'in_progress', 'confirmed'];
    if (!allowedStatuses.includes(event.status)) {
      return NextResponse.json(
        { error: `Disputes can only be filed for events with status: ${allowedStatuses.join(', ')}. Current status: ${event.status}` },
        { status: 400 }
      );
    }

    // Determine filed_by_type based on user role in the event
    let filedByType: 'client' | 'company';

    if (event.posted_by === user.id) {
      filedByType = 'client';
    } else {
      // Check if user is the admin of the awarded company
      const { data: awardedQuote, error: quoteError } = await supabase
        .from('marketplace_quotes')
        .select('company_id, marketplace_companies!inner(admin_user_id)')
        .eq('event_id', eventId)
        .eq('status', 'awarded')
        .single();

      if (quoteError || !awardedQuote) {
        return NextResponse.json(
          { error: 'No awarded quote found for this event' },
          { status: 403 }
        );
      }

      const companies = awardedQuote.marketplace_companies as unknown as { admin_user_id: string };
      if (companies.admin_user_id === user.id) {
        filedByType = 'company';
      } else {
        return NextResponse.json(
          { error: 'Only the event poster or awarded company admin can file a dispute' },
          { status: 403 }
        );
      }
    }

    // Find related bookings for this marketplace event
    const { data: relatedBookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id')
      .eq('marketplace_event_id', eventId);

    if (bookingsError) {
      console.error('[Marketplace Disputes POST] Bookings fetch error:', bookingsError);
      return NextResponse.json({ error: 'Failed to find related bookings' }, { status: 500 });
    }

    // Insert the dispute
    const { data: dispute, error: insertError } = await supabase
      .from('marketplace_disputes')
      .insert({
        event_id: eventId,
        filed_by: user.id,
        filed_by_type: filedByType,
        category,
        description,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[Marketplace Disputes POST] Insert error:', insertError);
      return NextResponse.json({ error: 'Failed to file dispute' }, { status: 500 });
    }

    // Immediately set remainder_hold on related bookings
    if (relatedBookings && relatedBookings.length > 0) {
      const bookingIds = relatedBookings.map((b) => b.id);
      const { error: holdError } = await supabase
        .from('bookings')
        .update({
          remainder_hold: true,
          remainder_hold_reason: `dispute:${dispute.id}`,
        })
        .in('id', bookingIds);

      if (holdError) {
        console.error('[Marketplace Disputes POST] Remainder hold error:', holdError);
        // Non-fatal: dispute was created, hold failed
      }
    }

    // Fire-and-forget: send dispute filed notification
    try {
      const { sendDisputeFiledNotification } = await import('@/lib/marketplace/notifications');
      sendDisputeFiledNotification({
        recipientEmail: '', // Will be populated by notification service
        recipientName: '',
        eventName: '',
        eventId,
        disputeCategory: category,
        filedByName: filedByType === 'client' ? 'the client' : 'the company',
      }).catch((err: unknown) => {
        console.warn('[Marketplace Disputes POST] Notification failed (non-fatal):', err);
      });
    } catch {
      console.log('[Marketplace Disputes POST] Notification module not available yet');
    }

    return NextResponse.json({ success: true, dispute });
  } catch (error) {
    console.error('[Marketplace Disputes POST] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
