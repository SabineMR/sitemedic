/**
 * Contract Creation API Route
 * POST /api/contracts/create
 *
 * Creates a new contract record, generates PDF via Edge Function,
 * stores in Supabase Storage, and logs contract event.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { PaymentTerms } from '@/lib/contracts/types';
import crypto from 'crypto';
import { requireOrgId } from '@/lib/organizations/org-resolver';

// ============================================================================
// Request Body Interface
// ============================================================================

interface CreateContractRequest {
  bookingId: string;
  templateId: string;
  paymentTerms: PaymentTerms;
  upfrontAmount: number;
  completionAmount: number;
  net30Amount: number;
  customTermsDescription?: string;
}

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Multi-tenant: Get current user's org_id
    const orgId = await requireOrgId();

    // Parse request body
    const body: CreateContractRequest = await request.json();
    const {
      bookingId,
      templateId,
      paymentTerms,
      upfrontAmount,
      completionAmount,
      net30Amount,
      customTermsDescription,
    } = body;

    // Validate required fields
    if (!bookingId || !templateId || !paymentTerms) {
      return NextResponse.json(
        { error: 'Missing required fields: bookingId, templateId, paymentTerms' },
        { status: 400 }
      );
    }

    // Validate payment amounts are provided
    if (
      upfrontAmount === undefined ||
      completionAmount === undefined ||
      net30Amount === undefined
    ) {
      return NextResponse.json(
        { error: 'Missing payment amounts' },
        { status: 400 }
      );
    }

    // Fetch booking with client data to verify it exists
    // IMPORTANT: Filter by org_id to prevent cross-org contract creation
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(
        `
        *,
        client:clients!inner (*)
      `
      )
      .eq('id', bookingId)
      .eq('org_id', orgId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found or invalid' },
        { status: 404 }
      );
    }

    // Check if booking already has a contract (not terminated)
    // IMPORTANT: Filter by org_id for consistency
    const { data: existingContract } = await supabase
      .from('contracts')
      .select('id')
      .eq('booking_id', bookingId)
      .eq('org_id', orgId)
      .neq('status', 'terminated')
      .maybeSingle();

    if (existingContract) {
      return NextResponse.json(
        { error: 'Booking already has an active contract' },
        { status: 409 }
      );
    }

    // Validate payment amounts sum to booking total
    const totalPayments = upfrontAmount + completionAmount + net30Amount;
    const expectedTotal = parseFloat(booking.total.toString());

    if (Math.abs(totalPayments - expectedTotal) > 0.01) {
      // Allow 1 penny rounding difference
      return NextResponse.json(
        {
          error: `Payment amounts (£${totalPayments.toFixed(2)}) must sum to booking total (£${expectedTotal.toFixed(2)})`,
        },
        { status: 400 }
      );
    }

    // Generate shareable token for client signing link
    const shareableToken = crypto.randomUUID();

    // Insert contract record
    // CRITICAL: Set org_id to ensure contract belongs to current org
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .insert({
        org_id: orgId,
        booking_id: bookingId,
        client_id: booking.client_id,
        template_id: templateId,
        status: 'draft',
        payment_terms: paymentTerms,
        upfront_amount: upfrontAmount,
        completion_amount: completionAmount,
        net30_amount: net30Amount,
        custom_terms_description:
          paymentTerms === 'custom' ? customTermsDescription || null : null,
        requires_signature_before_booking: true,
        shareable_token: shareableToken,
        created_by: user.id,
      })
      .select()
      .single();

    if (contractError || !contract) {
      console.error('Error creating contract:', contractError);
      return NextResponse.json(
        { error: 'Failed to create contract record' },
        { status: 500 }
      );
    }

    // Insert initial contract version record
    // CRITICAL: Set org_id on contract version
    const { data: version, error: versionError } = await supabase
      .from('contract_versions')
      .insert({
        org_id: orgId,
        contract_id: contract.id,
        version: 1,
        storage_path: `contracts/${contract.id}/v1.pdf`,
        generated_by: user.id,
        changes: 'Initial contract version',
      })
      .select()
      .single();

    if (versionError || !version) {
      console.error('Error creating contract version:', versionError);
      // Rollback contract if version creation fails
      // IMPORTANT: Filter by org_id for safety
      await supabase.from('contracts').delete().eq('id', contract.id).eq('org_id', orgId);
      return NextResponse.json(
        { error: 'Failed to create contract version' },
        { status: 500 }
      );
    }

    // Update contract with current_version_id
    // IMPORTANT: Filter by org_id for safety
    const { error: updateError } = await supabase
      .from('contracts')
      .update({ current_version_id: version.id })
      .eq('id', contract.id)
      .eq('org_id', orgId);

    if (updateError) {
      console.error('Error updating contract version:', updateError);
    }

    // Call Edge Function to generate PDF
    // Note: This is async but we don't wait for it to complete
    // The PDF generation happens in the background
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && supabaseServiceKey) {
      fetch(`${supabaseUrl}/functions/v1/generate-contract-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          contractId: contract.id,
        }),
      }).catch((error) => {
        console.error('Error calling generate-contract-pdf Edge Function:', error);
        // Don't fail the request if PDF generation fails
        // Admin can regenerate PDF later
      });
    } else {
      console.warn('Supabase credentials missing - PDF generation skipped');
    }

    // Log contract event
    const { error: eventError } = await supabase.from('contract_events').insert({
      contract_id: contract.id,
      event_type: 'version_created',
      event_data: {
        version: 1,
        created_by: user.id,
      },
      actor_id: user.id,
      actor_ip: request.headers.get('x-forwarded-for') || 'unknown',
    });

    if (eventError) {
      console.error('Error logging contract event:', eventError);
      // Don't fail the request if event logging fails
    }

    // Return success response
    return NextResponse.json(
      {
        success: true,
        contract: {
          id: contract.id,
          shareable_token: contract.shareable_token,
          status: contract.status,
          created_at: contract.created_at,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Unexpected error in POST /api/contracts/create:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
