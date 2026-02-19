/**
 * POST /api/marketplace/quotes/[id]/withdraw
 * Phase 34: Quote Submission & Comparison — Plan 03
 *
 * Endpoint for withdrawing a submitted quote.
 * Sets status='withdrawn' and withdrawn_at=NOW().
 * The update_event_quote_count trigger from migration 146 auto-decrements
 * the event's quote_count when status changes away from 'submitted'/'revised'.
 *
 * Guards:
 * - Must be authenticated and the company admin who owns the quote
 * - Quote must be 'submitted' or 'revised' (not draft or already withdrawn)
 * - Event must not be 'awarded' (cannot withdraw after award per CONTEXT)
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
    const { id: quoteId } = await params;

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
    // 2. Fetch quote and verify ownership
    // =========================================================================

    const { data: quote, error: quoteError } = await supabase
      .from('marketplace_quotes')
      .select('id, event_id, company_id, status')
      .eq('id', quoteId)
      .single();

    if (quoteError || !quote) {
      return NextResponse.json(
        { success: false, message: 'Quote not found' },
        { status: 404 }
      );
    }

    // Verify current user is admin of the quote's company
    const { data: company, error: companyError } = await supabase
      .from('marketplace_companies')
      .select('id')
      .eq('id', quote.company_id)
      .eq('admin_user_id', user.id)
      .single();

    if (companyError || !company) {
      return NextResponse.json(
        { success: false, message: 'Not authorised to withdraw this quote' },
        { status: 403 }
      );
    }

    // =========================================================================
    // 3. Verify quote status allows withdrawal
    // =========================================================================

    if (quote.status !== 'submitted' && quote.status !== 'revised') {
      return NextResponse.json(
        {
          success: false,
          message: `Cannot withdraw a quote with status '${quote.status}'. Only submitted or revised quotes can be withdrawn.`,
        },
        { status: 400 }
      );
    }

    // =========================================================================
    // 4. Verify event status allows withdrawal
    // =========================================================================

    const { data: event, error: eventError } = await supabase
      .from('marketplace_events')
      .select('id, status')
      .eq('id', quote.event_id)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { success: false, message: 'Event not found' },
        { status: 404 }
      );
    }

    if (event.status === 'awarded') {
      return NextResponse.json(
        {
          success: false,
          message: 'Cannot withdraw a quote after the event has been awarded',
        },
        { status: 400 }
      );
    }

    // =========================================================================
    // 5. Update quote status to withdrawn
    // The update_event_quote_count trigger will auto-decrement event.quote_count
    // =========================================================================

    const { error: updateError } = await supabase
      .from('marketplace_quotes')
      .update({
        status: 'withdrawn',
        withdrawn_at: new Date().toISOString(),
      })
      .eq('id', quoteId);

    if (updateError) {
      console.error('[Quote Withdraw] Error:', updateError);
      return NextResponse.json(
        { success: false, message: 'Failed to withdraw quote' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Quote withdrawn successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('POST /api/marketplace/quotes/[id]/withdraw error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
