/**
 * POST /api/marketplace/disputes/[id]/resolve -- Admin resolves a dispute
 *
 * Phase 36: Ratings, Messaging & Disputes -- Plan 03
 *
 * Platform admin resolves an open dispute with one of four resolution types:
 *   - full_refund: Full deposit refund to client via Stripe
 *   - partial_refund: Percentage-based refund (admin sets resolution_percent)
 *   - dismissed: No refund, company keeps payment
 *   - suspend_party: Log resolution only (account action taken separately)
 *
 * After resolution, remainder_hold is released on all related bookings.
 *
 * Access: Platform admin only (checked via is_platform_admin RPC).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createBulkNotifications } from '@/lib/marketplace/create-notification';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// =============================================================================
// Validation
// =============================================================================

const resolveSchema = z.object({
  resolution_type: z.enum([
    'full_refund',
    'partial_refund',
    'dismissed',
    'suspend_party',
  ]),
  resolution_percent: z
    .number()
    .min(0, 'Resolution percent must be at least 0')
    .max(100, 'Resolution percent cannot exceed 100')
    .optional(),
  resolution_notes: z
    .string()
    .max(5000, 'Resolution notes must be under 5000 characters'),
});

// =============================================================================
// POST -- Resolve a dispute (platform admin only)
// =============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: disputeId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Platform admin check
    const { data: isAdmin } = await supabase.rpc('is_platform_admin');
    if (isAdmin !== true) {
      return NextResponse.json(
        { error: 'Only platform administrators can resolve disputes' },
        { status: 403 }
      );
    }

    // Validate request body
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = resolveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { resolution_type, resolution_percent, resolution_notes } = parsed.data;

    // Fetch the dispute
    const { data: dispute, error: disputeError } = await supabase
      .from('marketplace_disputes')
      .select('*')
      .eq('id', disputeId)
      .single();

    if (disputeError || !dispute) {
      return NextResponse.json({ error: 'Dispute not found' }, { status: 404 });
    }

    if (dispute.status === 'resolved') {
      return NextResponse.json(
        { error: 'This dispute has already been resolved' },
        { status: 400 }
      );
    }

    // Update dispute with resolution
    const { data: updatedDispute, error: updateError } = await supabase
      .from('marketplace_disputes')
      .update({
        status: 'resolved',
        resolution_type,
        resolution_percent: resolution_percent ?? null,
        resolution_notes,
        resolved_by: user.id,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', disputeId)
      .select()
      .single();

    if (updateError) {
      console.error('[Dispute Resolve] Update error:', updateError);
      return NextResponse.json({ error: 'Failed to resolve dispute' }, { status: 500 });
    }

    // Find booking via dispute's event_id
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, deposit_amount, deposit_payment_intent_id, status')
      .eq('marketplace_event_id', dispute.event_id)
      .limit(1)
      .single();

    if (bookingError) {
      console.error('[Dispute Resolve] Booking fetch error:', bookingError);
      // Non-fatal: dispute was resolved, refund processing may fail
    }

    // Process resolution based on type
    if (booking && booking.deposit_payment_intent_id) {
      try {
        const { stripe } = await import('@/lib/stripe/server');

        if (resolution_type === 'full_refund') {
          // Full deposit refund
          await stripe.refunds.create({
            payment_intent: booking.deposit_payment_intent_id,
          });

          // Update booking status to cancelled
          await supabase
            .from('bookings')
            .update({ status: 'cancelled' })
            .eq('id', booking.id);
        } else if (resolution_type === 'partial_refund' && resolution_percent) {
          // Partial refund based on admin-set percentage
          const depositAmount = Number(booking.deposit_amount) || 0;
          const refundAmount = parseFloat(
            ((depositAmount * resolution_percent) / 100).toFixed(2)
          );

          if (refundAmount > 0) {
            await stripe.refunds.create({
              payment_intent: booking.deposit_payment_intent_id,
              amount: Math.round(refundAmount * 100), // Stripe uses pence
            });
          }
        }
        // 'dismissed' and 'suspend_party': no refund action needed
      } catch (stripeErr) {
        console.error('[Dispute Resolve] Stripe refund error:', stripeErr);
        // Non-fatal: dispute resolution recorded, refund can be processed manually
      }
    }

    // Release remainder hold on all bookings for this event
    const { error: releaseError } = await supabase
      .from('bookings')
      .update({
        remainder_hold: false,
      })
      .eq('marketplace_event_id', dispute.event_id);

    if (releaseError) {
      console.error('[Dispute Resolve] Remainder hold release error:', releaseError);
      // Non-fatal: dispute resolved, hold release failed
    }

    // Fire-and-forget: notify BOTH parties of dispute resolution
    try {
      // Fetch event info and both parties
      const { data: resolvedEvent } = await supabase
        .from('marketplace_events')
        .select('id, posted_by, event_name')
        .eq('id', dispute.event_id)
        .single();

      const { data: awardedQuote } = await supabase
        .from('marketplace_quotes')
        .select('marketplace_companies!inner(admin_user_id, company_name, company_email)')
        .eq('event_id', dispute.event_id)
        .eq('status', 'awarded')
        .single();

      const disputeNotifBody = `Dispute resolved: ${resolution_type.replace('_', ' ')} for event "${resolvedEvent?.event_name ?? dispute.event_id}"`;
      const disputeLink = `/marketplace/events/${dispute.event_id}`;

      const resolveNotifs = [];

      // Client (event poster)
      if (resolvedEvent?.posted_by) {
        resolveNotifs.push({
          userId: resolvedEvent.posted_by,
          type: 'dispute_resolved' as const,
          title: 'Dispute resolved',
          body: disputeNotifBody,
          link: disputeLink,
          metadata: {
            event_id: dispute.event_id,
            dispute_id: disputeId,
            resolution_type,
          },
        });
      }

      // Company admin
      if (awardedQuote) {
        const co = awardedQuote.marketplace_companies as unknown as {
          admin_user_id: string;
          company_name: string;
          company_email: string;
        };
        if (co.admin_user_id) {
          resolveNotifs.push({
            userId: co.admin_user_id,
            type: 'dispute_resolved' as const,
            title: 'Dispute resolved',
            body: disputeNotifBody,
            link: disputeLink,
            metadata: {
              event_id: dispute.event_id,
              dispute_id: disputeId,
              resolution_type,
            },
          });
        }

        // Send email to company
        try {
          const { sendDisputeResolvedNotification } = await import('@/lib/marketplace/notifications');
          sendDisputeResolvedNotification({
            recipientEmail: co.company_email,
            recipientName: co.company_name,
            eventName: resolvedEvent?.event_name ?? dispute.event_id,
            resolutionType: resolution_type,
            resolutionNotes: resolution_notes,
          }).catch((err: unknown) => {
            console.warn('[Dispute Resolve] Company email notification failed (non-fatal):', err);
          });
        } catch {
          // Non-fatal
        }
      }

      // Send email to client
      if (resolvedEvent?.posted_by) {
        try {
          const { data: clientProf } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', resolvedEvent.posted_by)
            .single();

          if (clientProf?.email) {
            const { sendDisputeResolvedNotification } = await import('@/lib/marketplace/notifications');
            sendDisputeResolvedNotification({
              recipientEmail: clientProf.email,
              recipientName: clientProf.full_name ?? 'Client',
              eventName: resolvedEvent.event_name,
              resolutionType: resolution_type,
              resolutionNotes: resolution_notes,
            }).catch((err: unknown) => {
              console.warn('[Dispute Resolve] Client email notification failed (non-fatal):', err);
            });
          }
        } catch {
          // Non-fatal
        }
      }

      if (resolveNotifs.length > 0) {
        await createBulkNotifications(resolveNotifs);
      }
    } catch (notifErr) {
      console.warn('[Dispute Resolve] Notification setup failed (non-fatal):', notifErr);
    }

    return NextResponse.json({ success: true, dispute: updatedDispute });
  } catch (error) {
    console.error('[Dispute Resolve] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
