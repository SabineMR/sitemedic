/**
 * PATCH /api/marketplace/quotes/[id]/update
 * Phase 34: Quote Submission & Comparison — Plan 03
 *
 * Endpoint for editing a submitted quote in place.
 * Updates all pricing/staffing/cover_letter fields, sets status='revised'
 * and last_revised_at=NOW().
 *
 * Guards:
 * - Must be authenticated and the company admin who owns the quote
 * - Quote must be 'submitted' or 'revised' (not draft or withdrawn)
 * - Event must not be 'awarded' or 'cancelled'
 * - Full validation with quoteSubmissionSchema
 * - Minimum rate enforcement (same as initial submission)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { quoteSubmissionSchema } from '@/lib/marketplace/quote-schemas';
import { validateAgainstMinimumRates } from '@/lib/marketplace/minimum-rates';

// =============================================================================
// Helpers
// =============================================================================

/**
 * Calculate total event duration from event_days
 * Sums the duration of each day in the event
 */
async function calculateEventDuration(
  supabase: any,
  eventId: string
): Promise<number> {
  const { data: eventDays } = await supabase
    .from('event_days')
    .select('start_time, end_time')
    .eq('event_id', eventId);

  if (!eventDays || eventDays.length === 0) return 8; // Default 8 hours

  let totalHours = 0;
  for (const day of eventDays) {
    const [startHour, startMin] = day.start_time.split(':').map(Number);
    const [endHour, endMin] = day.end_time.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    const durationMinutes = endMinutes - startMinutes;
    totalHours += durationMinutes / 60;
  }

  return totalHours;
}

// =============================================================================
// PATCH Handler
// =============================================================================

export async function PATCH(
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
        { success: false, message: 'Not authorised to edit this quote' },
        { status: 403 }
      );
    }

    // =========================================================================
    // 3. Verify quote status allows editing
    // =========================================================================

    if (quote.status !== 'submitted' && quote.status !== 'revised') {
      return NextResponse.json(
        {
          success: false,
          message: `Cannot edit a quote with status '${quote.status}'. Only submitted or revised quotes can be edited.`,
        },
        { status: 400 }
      );
    }

    // =========================================================================
    // 4. Verify event status allows editing
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

    if (event.status === 'awarded' || event.status === 'cancelled') {
      return NextResponse.json(
        {
          success: false,
          message: `Cannot edit a quote on an event with status '${event.status}'`,
        },
        { status: 400 }
      );
    }

    // =========================================================================
    // 5. Parse and validate request body
    // =========================================================================

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    // Override event_id with the quote's event_id (cannot change event)
    const validationPayload = { ...body, event_id: quote.event_id };

    const validation = quoteSubmissionSchema.safeParse(validationPayload);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Validation failed',
          errors: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const quoteData = validation.data;

    // =========================================================================
    // 6. Validate minimum rates (HARD enforcement, same as submit)
    // =========================================================================

    const eventDurationHours = await calculateEventDuration(supabase, quote.event_id);

    const staffingForValidation =
      quoteData.staffing_plan.type === 'headcount_and_quals'
        ? quoteData.staffing_plan.headcount_plans
        : quoteData.staffing_plan.named_medics.map((m) => ({
            role: m.qualification,
            quantity: 1,
          }));

    const fixedTotal =
      quoteData.pricing_breakdown.staffCost +
      quoteData.pricing_breakdown.equipmentCost +
      quoteData.pricing_breakdown.transportCost +
      quoteData.pricing_breakdown.consumablesCost;

    const customTotal = quoteData.pricing_breakdown.customLineItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );

    const totalPrice = fixedTotal + customTotal;

    const rateValidation = validateAgainstMinimumRates(
      totalPrice,
      staffingForValidation,
      eventDurationHours
    );

    if (!rateValidation.isValid) {
      return NextResponse.json(
        {
          success: false,
          message: 'Quote is below minimum rate guidelines',
          violations: rateValidation.violations,
        },
        { status: 400 }
      );
    }

    // =========================================================================
    // 7. Update quote with revised status
    // =========================================================================

    const { data: updatedQuote, error: updateError } = await supabase
      .from('marketplace_quotes')
      .update({
        total_price: totalPrice,
        pricing_breakdown: quoteData.pricing_breakdown,
        staffing_plan: quoteData.staffing_plan,
        cover_letter: quoteData.cover_letter,
        availability_confirmed: quoteData.availability_confirmed,
        status: 'revised',
        last_revised_at: new Date().toISOString(),
      })
      .eq('id', quoteId)
      .select()
      .single();

    if (updateError) {
      console.error('[Quote Update] Error:', updateError);
      return NextResponse.json(
        { success: false, message: 'Failed to update quote' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Quote updated successfully',
        quoteId: updatedQuote.id,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('PATCH /api/marketplace/quotes/[id]/update error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
