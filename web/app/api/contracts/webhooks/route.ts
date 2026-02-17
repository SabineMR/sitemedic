/**
 * Resend Webhook Handler for Contract Emails
 * POST /api/contracts/webhooks
 *
 * Processes Resend webhook events for email tracking:
 * - email.sent - Email accepted by Resend
 * - email.delivered - Email delivered to recipient
 * - email.opened - Recipient opened the email (updates contract status to 'viewed')
 * - email.clicked - Recipient clicked a link
 * - email.bounced - Email bounced
 *
 * All events are logged in contract_events for audit trail.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ============================================================================
// Webhook Event Types
// ============================================================================

interface ResendWebhookPayload {
  type: string;
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    tags?: Array<{ name: string; value: string }>;
    [key: string]: unknown;
  };
}

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Parse webhook payload
    const payload: ResendWebhookPayload = await request.json();
    const { type, data } = payload;

    // Extract contractId from tags
    const contractIdTag = data.tags?.find((t) => t.name === 'contractId');
    if (!contractIdTag) {
      console.warn('⚠️  No contractId tag found in webhook payload');
      return NextResponse.json(
        { message: 'No contract tag found' },
        { status: 200 }
      );
    }

    const contractId = contractIdTag.value;

    // Create Supabase service role client for webhook handler
    // (webhooks don't have user auth, need service role)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Handle email.opened event - update contract status to 'viewed'
    if (type === 'email.opened') {
      // Only update to 'viewed' if currently 'sent'
      // Don't regress from 'signed' or other later statuses
      const { data: contract } = await supabase
        .from('contracts')
        .select('status')
        .eq('id', contractId)
        .single();

      if (contract && contract.status === 'sent') {
        const { error: updateError } = await supabase
          .from('contracts')
          .update({
            status: 'viewed',
            viewed_at: new Date().toISOString(),
          })
          .eq('id', contractId);

        if (updateError) {
          console.error('❌ Error updating contract status:', updateError);
        }
      }
    }

    // Log ALL events in contract_events audit trail
    // (even if status doesn't change - full tracking for compliance)
    const { error: eventError } = await supabase.from('contract_events').insert({
      contract_id: contractId,
      event_type: type, // email.sent, email.delivered, email.opened, etc.
      event_data: data,
      created_at: new Date().toISOString(),
    });

    if (eventError) {
      console.error('❌ Error logging contract event:', eventError);
      // Don't fail the webhook - Resend expects 200 OK
    }

    // Always return 200 OK to acknowledge receipt
    // (Resend will retry if we return error status)
    return NextResponse.json(
      { message: 'Webhook processed successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ Error processing webhook:', error);

    // Still return 200 to prevent Resend retries
    // Log error but don't fail webhook delivery
    return NextResponse.json(
      { message: 'Webhook received but processing failed' },
      { status: 200 }
    );
  }
}

// ============================================================================
// Webhook Signature Verification (Optional Enhancement)
// ============================================================================

/**
 * Future enhancement: Verify webhook signature from Resend
 * to ensure requests are authentic and not spoofed.
 *
 * Resend provides signature in 'svix-signature' header.
 * See: https://resend.com/docs/webhooks#verifying-webhook-signatures
 */
