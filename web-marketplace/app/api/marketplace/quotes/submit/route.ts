/**
 * POST /api/marketplace/quotes/submit
 * Phase 34: Quote Submission & Comparison
 *
 * Endpoint for submitting a new quote on an event.
 * Validates company verification, pricing, staffing, minimum rates.
 * Returns 400 if quote violates minimum rate guidelines.
 * Creates quote with status='submitted' and sets submitted_at timestamp.
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
// POST Handler
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    // =========================================================================
    // 1. Parse and validate request body
    // =========================================================================

    const body = await request.json();

    const validation = quoteSubmissionSchema.safeParse(body);
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
    // 2. Authenticate user
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
    // 3. Verify user is admin of a verified company
    // =========================================================================

    const { data: company, error: companyError } = await supabase
      .from('marketplace_companies')
      .select('id')
      .eq('admin_user_id', user.id)
      .eq('verification_status', 'verified')
      .eq('can_submit_quotes', true)
      .single();

    if (companyError || !company) {
      return NextResponse.json(
        {
          success: false,
          message: 'You must be admin of a verified company to submit quotes',
        },
        { status: 403 }
      );
    }

    // =========================================================================
    // 4. Verify event exists and is open
    // =========================================================================

    const { data: event, error: eventError } = await supabase
      .from('marketplace_events')
      .select('id, status, quote_deadline')
      .eq('id', quoteData.event_id)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { success: false, message: 'Event not found' },
        { status: 404 }
      );
    }

    if (event.status !== 'open') {
      return NextResponse.json(
        { success: false, message: 'Event is not open for quotes' },
        { status: 400 }
      );
    }

    if (new Date(event.quote_deadline) < new Date()) {
      return NextResponse.json(
        { success: false, message: 'Quote deadline has passed' },
        { status: 400 }
      );
    }

    // =========================================================================
    // 5. Validate minimum rates
    // CONTEXT: "block quotes below minimum" — this is HARD enforcement
    // =========================================================================

    const eventDurationHours = await calculateEventDuration(supabase, quoteData.event_id);

    // Build staffing plan array for validation
    const staffingForValidation =
      quoteData.staffing_plan.type === 'headcount_and_quals'
        ? quoteData.staffing_plan.headcount_plans
        : quoteData.staffing_plan.named_medics.map((m) => ({
            role: m.qualification,
            quantity: 1,
          }));

    // Calculate total price
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
    // 6. Check for existing quote from this company on this event
    // Allow draft overwrite but prevent duplicate submitted quotes
    // =========================================================================

    const { data: existingQuote } = await supabase
      .from('marketplace_quotes')
      .select('id, status')
      .eq('event_id', quoteData.event_id)
      .eq('company_id', company.id)
      .single();

    if (existingQuote && existingQuote.status === 'submitted') {
      return NextResponse.json(
        {
          success: false,
          message: 'You already have a submitted quote for this event. Edit it instead.',
        },
        { status: 400 }
      );
    }

    // =========================================================================
    // 7. Insert or update quote
    // =========================================================================

    if (existingQuote && existingQuote.status === 'draft') {
      // Update existing draft
      const { data: updatedQuote, error: updateError } = await supabase
        .from('marketplace_quotes')
        .update({
          total_price: totalPrice,
          pricing_breakdown: quoteData.pricing_breakdown,
          staffing_plan: quoteData.staffing_plan,
          cover_letter: quoteData.cover_letter,
          availability_confirmed: quoteData.availability_confirmed,
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingQuote.id)
        .select()
        .single();

      if (updateError) {
        console.error('Quote update error:', updateError);
        return NextResponse.json(
          { success: false, message: 'Failed to submit quote' },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          success: true,
          message: 'Quote submitted successfully',
          quoteId: updatedQuote.id,
        },
        { status: 200 }
      );
    } else {
      // Create new quote
      const { data: newQuote, error: insertError } = await supabase
        .from('marketplace_quotes')
        .insert({
          event_id: quoteData.event_id,
          company_id: company.id,
          total_price: totalPrice,
          pricing_breakdown: quoteData.pricing_breakdown,
          staffing_plan: quoteData.staffing_plan,
          cover_letter: quoteData.cover_letter,
          availability_confirmed: quoteData.availability_confirmed,
          status: 'submitted',
          submitted_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        console.error('Quote insert error:', insertError);
        return NextResponse.json(
          { success: false, message: 'Failed to submit quote' },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          success: true,
          message: 'Quote submitted successfully',
          quoteId: newQuote.id,
        },
        { status: 201 }
      );
    }
  } catch (error) {
    console.error('POST /api/marketplace/quotes/submit error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
