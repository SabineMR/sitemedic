/**
 * Marketplace Admin Actions
 * Phase 32-03: Verification Workflow
 *
 * Server-side admin action functions for the marketplace verification workflow.
 * All functions use a Supabase service-role client because platform admin has
 * org_id=NULL, which means RLS would block direct writes to marketplace tables.
 *
 * Pattern follows: web/app/api/platform/organizations/activate/route.ts
 */

import { createClient } from '@supabase/supabase-js';
import { resend } from '@/lib/email/resend';

// =============================================================================
// Service-Role Client
// =============================================================================

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase service role env vars not configured');
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// =============================================================================
// Result Type
// =============================================================================

interface ActionResult {
  success: boolean;
  error?: string;
}

// =============================================================================
// Email Helpers
// =============================================================================

const FROM_EMAIL = 'SiteMedic Marketplace <marketplace@sitemedic.co.uk>';

async function sendVerificationEmail(
  to: string,
  subject: string,
  html: string
): Promise<void> {
  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });
    if (result.error) {
      console.error('Failed to send verification email:', result.error);
    }
  } catch (err) {
    console.error('Error sending verification email:', err);
  }
}

function emailWrapper(title: string, body: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); padding: 32px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">${title}</h1>
      </div>
      <div style="background: white; padding: 32px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        ${body}
        <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">
          Sent by SiteMedic Marketplace
        </p>
      </div>
    </div>
  `;
}

// =============================================================================
// Admin Actions
// =============================================================================

/**
 * Approve a marketplace company registration.
 * Sets verification_status='verified', can_submit_quotes=true,
 * and approves all pending compliance documents.
 */
export async function approveCompany(
  companyId: string,
  adminUserId: string
): Promise<ActionResult> {
  try {
    const supabase = getServiceClient();
    const now = new Date().toISOString();

    // Update company status
    const { error: companyError } = await supabase
      .from('marketplace_companies')
      .update({
        verification_status: 'verified',
        can_submit_quotes: true,
        verified_at: now,
        verified_by: adminUserId,
      })
      .eq('id', companyId);

    if (companyError) {
      console.error('Failed to approve company:', companyError);
      return { success: false, error: 'Failed to update company status' };
    }

    // Approve all pending compliance documents for this company
    const { error: docsError } = await supabase
      .from('compliance_documents')
      .update({
        review_status: 'approved',
        reviewed_at: now,
        reviewed_by: adminUserId,
      })
      .eq('company_id', companyId)
      .eq('review_status', 'pending');

    if (docsError) {
      console.error('Failed to approve compliance documents:', docsError);
      // Non-fatal: company is approved, docs status update failed
    }

    // Send approval email
    const { data: company } = await supabase
      .from('marketplace_companies')
      .select('company_name, company_email')
      .eq('id', companyId)
      .single();

    if (company?.company_email) {
      await sendVerificationEmail(
        company.company_email,
        `${company.company_name}: Marketplace Registration Approved`,
        emailWrapper(
          'Registration Approved',
          `
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Congratulations! Your marketplace registration for <strong>${company.company_name}</strong> has been approved.
          </p>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            You can now submit quotes on marketplace events. Browse available events in your dashboard.
          </p>
          <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 16px; margin: 24px 0; border-radius: 4px;">
            <p style="margin: 0; color: #065f46; font-weight: 600;">What's next?</p>
            <ul style="margin: 8px 0 0 0; padding-left: 24px; color: #047857; font-size: 14px;">
              <li>Browse available events in the marketplace</li>
              <li>Submit competitive quotes for events matching your expertise</li>
              <li>Keep your compliance documents up to date</li>
            </ul>
          </div>
          `
        )
      );
    }

    return { success: true };
  } catch (err) {
    console.error('approveCompany error:', err);
    return { success: false, error: 'Internal error during approval' };
  }
}

/**
 * Reject a marketplace company registration.
 * Sets verification_status='rejected' and stores the rejection reason.
 */
export async function rejectCompany(
  companyId: string,
  adminUserId: string,
  reason: string
): Promise<ActionResult> {
  try {
    const supabase = getServiceClient();

    const { error: companyError } = await supabase
      .from('marketplace_companies')
      .update({
        verification_status: 'rejected',
        rejection_reason: reason,
        can_submit_quotes: false,
      })
      .eq('id', companyId);

    if (companyError) {
      console.error('Failed to reject company:', companyError);
      return { success: false, error: 'Failed to update company status' };
    }

    // Send rejection email
    const { data: company } = await supabase
      .from('marketplace_companies')
      .select('company_name, company_email')
      .eq('id', companyId)
      .single();

    if (company?.company_email) {
      await sendVerificationEmail(
        company.company_email,
        `${company.company_name}: Marketplace Registration Update`,
        emailWrapper(
          'Registration Not Approved',
          `
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            We've reviewed your marketplace registration for <strong>${company.company_name}</strong> and are unable to approve it at this time.
          </p>
          <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 24px 0; border-radius: 4px;">
            <p style="margin: 0; color: #991b1b; font-weight: 600;">Reason:</p>
            <p style="margin: 8px 0 0 0; color: #7f1d1d; font-size: 14px;">
              ${reason}
            </p>
          </div>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            If you believe this is an error, or if you can address the issues above, please contact our support team.
          </p>
          `
        )
      );
    }

    return { success: true };
  } catch (err) {
    console.error('rejectCompany error:', err);
    return { success: false, error: 'Internal error during rejection' };
  }
}

/**
 * Request more information from a marketplace company.
 * Sets verification_status='info_requested' and sends notes to the company.
 */
export async function requestMoreInfo(
  companyId: string,
  adminUserId: string,
  notes: string
): Promise<ActionResult> {
  try {
    const supabase = getServiceClient();

    const { error: companyError } = await supabase
      .from('marketplace_companies')
      .update({
        verification_status: 'info_requested',
      })
      .eq('id', companyId);

    if (companyError) {
      console.error('Failed to update company status:', companyError);
      return { success: false, error: 'Failed to update company status' };
    }

    // Send info-request email
    const { data: company } = await supabase
      .from('marketplace_companies')
      .select('company_name, company_email')
      .eq('id', companyId)
      .single();

    if (company?.company_email) {
      await sendVerificationEmail(
        company.company_email,
        `${company.company_name}: Additional Information Required`,
        emailWrapper(
          'Additional Information Required',
          `
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            We're reviewing your marketplace registration for <strong>${company.company_name}</strong> and need some additional information before we can proceed.
          </p>
          <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 4px;">
            <p style="margin: 0; color: #78350f; font-weight: 600;">What we need:</p>
            <p style="margin: 8px 0 0 0; color: #92400e; font-size: 14px;">
              ${notes}
            </p>
          </div>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Please log in to your account and update your registration with the requested information.
          </p>
          `
        )
      );
    }

    return { success: true };
  } catch (err) {
    console.error('requestMoreInfo error:', err);
    return { success: false, error: 'Internal error during info request' };
  }
}

/**
 * Suspend a marketplace company.
 * Sets verification_status='suspended', can_submit_quotes=false,
 * and returns any active marketplace bookings for admin review.
 */
export async function suspendCompany(
  companyId: string,
  reason: string
): Promise<ActionResult & { activeBookings?: { id: string }[] }> {
  try {
    const supabase = getServiceClient();
    const now = new Date().toISOString();

    const { error: companyError } = await supabase
      .from('marketplace_companies')
      .update({
        verification_status: 'suspended',
        can_submit_quotes: false,
        suspension_reason: reason,
        suspended_at: now,
      })
      .eq('id', companyId);

    if (companyError) {
      console.error('Failed to suspend company:', companyError);
      return { success: false, error: 'Failed to update company status' };
    }

    // Send suspension email
    const { data: company } = await supabase
      .from('marketplace_companies')
      .select('company_name, company_email')
      .eq('id', companyId)
      .single();

    if (company?.company_email) {
      await sendVerificationEmail(
        company.company_email,
        `${company.company_name}: Marketplace Registration Suspended`,
        emailWrapper(
          'Registration Suspended',
          `
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Your marketplace registration for <strong>${company.company_name}</strong> has been suspended.
          </p>
          <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 24px 0; border-radius: 4px;">
            <p style="margin: 0; color: #991b1b; font-weight: 600;">Reason:</p>
            <p style="margin: 8px 0 0 0; color: #7f1d1d; font-size: 14px;">
              ${reason}
            </p>
          </div>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            You cannot submit quotes until this issue is resolved. Please contact SiteMedic support for assistance.
          </p>
          `
        )
      );
    }

    // Return active marketplace bookings for admin review
    const { data: activeBookings } = await supabase
      .from('bookings')
      .select('id')
      .eq('source', 'marketplace')
      .in('status', ['confirmed', 'pending'])
      .eq('company_id', companyId);

    return {
      success: true,
      activeBookings: activeBookings || [],
    };
  } catch (err) {
    console.error('suspendCompany error:', err);
    return { success: false, error: 'Internal error during suspension' };
  }
}
