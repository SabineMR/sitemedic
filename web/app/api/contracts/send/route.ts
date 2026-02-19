/**
 * Contract Send API Route
 * POST /api/contracts/send
 *
 * Sends contract to client via email using Resend Edge Function.
 * Updates contract status to 'sent' and logs event.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireOrgId } from '@/lib/organizations/org-resolver';
import { canTransition } from '@/lib/contracts/workflow';

// ============================================================================
// Request Body Interface
// ============================================================================

interface SendContractRequest {
  contractId: string;
  recipientEmail: string;
  ccEmail?: string;
  personalMessage?: string;
}

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Multi-tenant: Get current user's org_id
    const orgId = await requireOrgId();

    // Parse request body
    const body: SendContractRequest = await request.json();
    const { contractId, recipientEmail, ccEmail, personalMessage } = body;

    // Validate required fields
    if (!contractId || !recipientEmail) {
      return NextResponse.json(
        { error: 'Missing required fields: contractId, recipientEmail' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      return NextResponse.json(
        { error: 'Invalid recipient email format' },
        { status: 400 }
      );
    }

    if (ccEmail && !emailRegex.test(ccEmail)) {
      return NextResponse.json(
        { error: 'Invalid CC email format' },
        { status: 400 }
      );
    }

    // Fetch contract with client and booking data
    // IMPORTANT: Filter by org_id to prevent cross-org access
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select(
        `
        *,
        client:clients!inner (
          id,
          company_name,
          contact_name,
          contact_email
        ),
        booking:bookings!inner (
          id,
          total
        )
      `
      )
      .eq('id', contractId)
      .eq('org_id', orgId)
      .single();

    if (contractError || !contract) {
      return NextResponse.json(
        { error: 'Contract not found' },
        { status: 404 }
      );
    }

    // Validate contract status
    if (!canTransition(contract.status, 'sent')) {
      return NextResponse.json(
        {
          error: `Cannot send contract in status '${contract.status}'. Only draft or amended contracts can be sent.`,
        },
        { status: 400 }
      );
    }

    // Mark internal review complete if not already
    const now = new Date().toISOString();
    if (!contract.internal_review_completed_at) {
      await supabase
        .from('contracts')
        .update({ internal_review_completed_at: now })
        .eq('id', contractId)
        .eq('org_id', orgId);
    }

    // Build shareable signing URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:30500';
    const signingUrl = `${appUrl}/contracts/${contract.shareable_token}/sign`;

    // Calculate contract details for email
    const totalAmount =
      contract.upfront_amount + contract.completion_amount + contract.net30_amount;

    const paymentTermsLabels: Record<string, string> = {
      full_prepay: '100% Prepayment',
      split_50_50: '50% Upfront / 50% on Completion',
      split_50_net30: '50% Upfront / 50% Net 30',
      full_net30: '100% Net 30',
      custom: contract.custom_terms_description || 'Custom Terms',
    };

    // Handle client relation as array (Supabase returns array for foreign key relations)
    const clientData = Array.isArray(contract.client)
      ? contract.client[0]
      : contract.client;
    const bookingData = Array.isArray(contract.booking)
      ? contract.booking[0]
      : contract.booking;

    // Call send-contract-email Edge Function
    const { data: emailResult, error: emailError } = await supabase.functions.invoke(
      'send-contract-email',
      {
        body: {
          recipientEmail,
          ccEmail,
          personalMessage,
          contractId: contract.id,
          contractNumber: contract.id.slice(0, 8).toUpperCase(),
          signingUrl,
          clientName: clientData.contact_name,
          companyName: clientData.company_name,
          totalAmount,
          paymentTerms: paymentTermsLabels[contract.payment_terms],
        },
      }
    );

    // Check for email service configuration error (graceful degradation)
    if (emailResult && emailResult.success === false) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Email service not configured. Contract created but email could not be sent.',
          shareableLink: signingUrl,
        },
        { status: 502 }
      );
    }

    if (emailError) {
      console.error('Edge Function error:', emailError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to send email. Please try again.',
          shareableLink: signingUrl,
        },
        { status: 500 }
      );
    }

    // Update contract status to 'sent'
    // IMPORTANT: Filter by org_id for safety
    const { error: updateError } = await supabase
      .from('contracts')
      .update({
        status: 'sent',
        sent_at: now,
      })
      .eq('id', contractId)
      .eq('org_id', orgId);

    if (updateError) {
      console.error('Error updating contract status:', updateError);
      return NextResponse.json(
        { error: 'Failed to update contract status' },
        { status: 500 }
      );
    }

    // Extract actor IP from headers
    const actorIp =
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      null;

    // Log contract event
    await supabase.from('contract_events').insert({
      org_id: orgId,
      contract_id: contractId,
      event_type: 'email_sent',
      event_data: {
        recipientEmail,
        ccEmail,
        sentBy: user.id,
        messageId: emailResult?.messageId,
      },
      actor_id: user.id,
      actor_ip: actorIp,
    });

    // Return success with shareable link
    return NextResponse.json({
      success: true,
      shareableLink: signingUrl,
    });
  } catch (error) {
    console.error('Error in send contract route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
