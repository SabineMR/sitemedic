/**
 * POST /api/marketplace/quotes/save-draft
 * Phase 34: Quote Submission & Comparison
 *
 * Endpoint for saving a partial/draft quote.
 * Allows incomplete data (loose validation) since draft is not yet submitted.
 * Creates or updates quote with status='draft'.
 * Does NOT set submitted_at timestamp.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// =============================================================================
// POST Handler
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    // =========================================================================
    // 1. Parse request body (loose validation)
    // =========================================================================

    const body = await request.json();

    const { event_id, draft_id, ...draftData } = body;

    if (!event_id) {
      return NextResponse.json(
        { success: false, message: 'event_id is required' },
        { status: 400 }
      );
    }

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
      .eq('id', event_id)
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

    // =========================================================================
    // 5. Calculate total price (if pricing provided)
    // =========================================================================

    let totalPrice = 0;
    if (draftData.pricing_breakdown) {
      const pb = draftData.pricing_breakdown;
      const fixedTotal = (pb.staffCost || 0) + (pb.equipmentCost || 0) + (pb.transportCost || 0) + (pb.consumablesCost || 0);
      const customTotal = (pb.customLineItems || []).reduce(
        (sum: number, item: any) => sum + (item.quantity * item.unitPrice),
        0
      );
      totalPrice = fixedTotal + customTotal;
    }

    // =========================================================================
    // 6. Insert or update draft quote
    // =========================================================================

    if (draft_id) {
      // Verify this draft belongs to this company
      const { data: existingDraft } = await supabase
        .from('marketplace_quotes')
        .select('id, company_id')
        .eq('id', draft_id)
        .eq('company_id', company.id)
        .single();

      if (!existingDraft) {
        return NextResponse.json(
          { success: false, message: 'Draft not found' },
          { status: 404 }
        );
      }

      // Update existing draft
      const { data: updatedQuote, error: updateError } = await supabase
        .from('marketplace_quotes')
        .update({
          total_price: totalPrice,
          pricing_breakdown: draftData.pricing_breakdown,
          staffing_plan: draftData.staffing_plan,
          cover_letter: draftData.cover_letter,
          availability_confirmed: draftData.availability_confirmed || false,
          status: 'draft',
          updated_at: new Date().toISOString(),
        })
        .eq('id', draft_id)
        .select()
        .single();

      if (updateError) {
        console.error('Draft update error:', updateError);
        return NextResponse.json(
          { success: false, message: 'Failed to save draft' },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          success: true,
          message: 'Draft saved',
          draftId: updatedQuote.id,
        },
        { status: 200 }
      );
    } else {
      // Create new draft quote
      const { data: newQuote, error: insertError } = await supabase
        .from('marketplace_quotes')
        .insert({
          event_id,
          company_id: company.id,
          total_price: totalPrice,
          pricing_breakdown: draftData.pricing_breakdown || null,
          staffing_plan: draftData.staffing_plan || null,
          cover_letter: draftData.cover_letter || null,
          availability_confirmed: draftData.availability_confirmed || false,
          status: 'draft',
        })
        .select()
        .single();

      if (insertError) {
        console.error('Draft insert error:', insertError);
        return NextResponse.json(
          { success: false, message: 'Failed to save draft' },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          success: true,
          message: 'Draft saved',
          draftId: newQuote.id,
        },
        { status: 201 }
      );
    }
  } catch (error) {
    console.error('POST /api/marketplace/quotes/save-draft error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
