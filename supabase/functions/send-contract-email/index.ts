/**
 * Send Contract Email Edge Function
 * Phase 4.6: Customer Onboarding & Contract Management - Plan 05
 *
 * Handles:
 * - Sending professional HTML emails via Resend API
 * - Contract signing link delivery
 * - Graceful degradation if RESEND_API_KEY not configured
 * - Email tracking tags for webhook correlation
 */

import { createClient } from 'npm:@supabase/supabase-js@2';
import { fetchOrgBranding } from '../_shared/branding-helpers.ts';

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// Request Interface
// ============================================================================

interface SendContractEmailRequest {
  recipientEmail: string;
  ccEmail?: string;
  personalMessage?: string;
  contractId: string;
  contractNumber: string;
  signingUrl: string;
  clientName: string;
  companyName: string;
  totalAmount: number;
  paymentTerms: string;
  providerName?: string;
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ============================================================================
// Email Template Builder
// ============================================================================

function buildEmailHtml(params: SendContractEmailRequest): string {
  const {
    clientName,
    companyName,
    contractNumber,
    totalAmount,
    paymentTerms,
    signingUrl,
    personalMessage,
    providerName = 'SiteMedic',
  } = params;

  // Format amount as GBP
  const formattedTotal = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(totalAmount);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Service Agreement ${contractNumber}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <div style="background-color: #003366; padding: 32px 24px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">${providerName}</h1>
      <p style="margin: 8px 0 0 0; color: #93C5FD; font-size: 14px;">Service Agreement</p>
    </div>

    <!-- Content -->
    <div style="padding: 32px 24px;">
      <!-- Greeting -->
      <p style="margin: 0 0 16px 0; font-size: 16px; color: #111827;">Dear ${clientName},</p>

      ${
        personalMessage
          ? `
      <!-- Personal Message -->
      <div style="background-color: #f9fafb; border-left: 4px solid #2563EB; padding: 16px; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 15px; color: #374151; line-height: 1.5; white-space: pre-wrap;">${personalMessage}</p>
      </div>
      `
          : ''
      }

      <!-- Introduction -->
      <p style="margin: 0 0 24px 0; font-size: 16px; color: #374151; line-height: 1.5;">
        Please review and sign the attached service agreement for <strong>${companyName}</strong>.
        This agreement covers the medical services we'll be providing for your site.
      </p>

      <!-- Contract Summary Card -->
      <div style="background-color: #f9fafb; border-radius: 8px; padding: 24px; margin-bottom: 32px; border: 1px solid #e5e7eb;">
        <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #111827; font-weight: 600;">Agreement Summary</h2>

        <div style="margin-bottom: 12px;">
          <span style="color: #6b7280; font-size: 14px;">Contract Number:</span>
          <strong style="margin-left: 8px; color: #111827; font-size: 15px; font-family: monospace;">${contractNumber}</strong>
        </div>

        <div style="margin-bottom: 12px;">
          <span style="color: #6b7280; font-size: 14px;">Company:</span>
          <strong style="margin-left: 8px; color: #111827; font-size: 15px;">${companyName}</strong>
        </div>

        <div style="margin-bottom: 12px;">
          <span style="color: #6b7280; font-size: 14px;">Total Amount:</span>
          <strong style="margin-left: 8px; color: #111827; font-size: 15px;">${formattedTotal}</strong>
        </div>

        <div>
          <span style="color: #6b7280; font-size: 14px;">Payment Terms:</span>
          <strong style="margin-left: 8px; color: #111827; font-size: 15px;">${paymentTerms}</strong>
        </div>
      </div>

      <!-- Call to Action Button -->
      <div style="text-align: center; margin-bottom: 32px;">
        <a href="${signingUrl}"
           style="display: inline-block; background-color: #2563EB; color: #ffffff; padding: 16px 32px; border-radius: 6px; text-decoration: none; font-size: 16px; font-weight: 500; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.1);">
          View &amp; Sign Agreement
        </a>
      </div>

      <!-- Security Notice -->
      <div style="background-color: #fef3c7; border: 1px solid #fde047; border-radius: 6px; padding: 12px; margin-bottom: 24px;">
        <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.5;">
          <strong>🔒 Security Note:</strong> This link is unique to your agreement. Please do not share it with others.
        </p>
      </div>

      <!-- Footer Note -->
      <div style="border-top: 1px solid #e5e7eb; padding-top: 24px; margin-top: 32px;">
        <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.5;">
          If you have any questions about this agreement, please contact us. We're here to help make your site safer.
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0; color: #9ca3af; font-size: 12px;">
        © ${new Date().getFullYear()} ${providerName}. All rights reserved.
      </p>
      <p style="margin: 8px 0 0 0; color: #9ca3af; font-size: 12px;">
        Professional medical services for construction sites
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

// ============================================================================
// Main Handler
// ============================================================================

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse request body
    const body: SendContractEmailRequest = await req.json();
    const {
      recipientEmail,
      ccEmail,
      personalMessage,
      contractId,
      contractNumber,
      signingUrl,
      clientName,
      companyName,
      totalAmount,
      paymentTerms,
    } = body;

    console.log(`📧 Sending contract ${contractNumber} to ${recipientEmail}...`);

    // Fetch org branding from contract's booking
    let providerName = body.providerName;
    if (!providerName) {
      try {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );
        const { data: contract } = await supabase
          .from('contracts')
          .select('booking:bookings!booking_id(org_id)')
          .eq('id', contractId)
          .single();
        const orgId = (contract?.booking as any)?.org_id;
        if (orgId) {
          const branding = await fetchOrgBranding(supabase, orgId);
          providerName = branding.company_name;
        }
      } catch (e) {
        console.warn('Could not fetch org branding for contract email:', e);
      }
    }
    body.providerName = providerName;

    // Get Resend API key from environment
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

    // Graceful degradation if Resend not configured
    if (!RESEND_API_KEY) {
      console.warn(
        '⚠️  RESEND_API_KEY not configured. Contract created but email not sent.'
      );
      return new Response(
        JSON.stringify({
          success: false,
          error: 'RESEND_API_KEY not configured. Contract created but email not sent.',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Build email HTML
    const htmlContent = buildEmailHtml(body);

    // Prepare email recipients
    const recipients = [recipientEmail];
    const ccRecipients = ccEmail ? [ccEmail] : undefined;

    // Send email via Resend API
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${providerName || 'SiteMedic'} <contracts@sitemedic.co.uk>`,
        to: recipients,
        cc: ccRecipients,
        subject: `Service Agreement ${contractNumber} - ${providerName || 'SiteMedic'}`,
        html: htmlContent,
        tags: [{ name: 'contractId', value: contractId }],
      }),
    });

    // Handle Resend API errors
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`❌ Resend API error (${response.status}):`, errorBody);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Resend API error: ${response.status} ${errorBody}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse success response
    const result = await response.json();
    console.log(`✅ Email sent successfully: ${result.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        messageId: result.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('❌ Failed to send contract email:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
