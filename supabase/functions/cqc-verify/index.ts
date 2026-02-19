/**
 * CQC Daily Verification Edge Function
 * Phase 32-03: Marketplace Verification
 *
 * Scheduled daily job that performs two compliance checks:
 *
 * PART 1: CQC Status Checks
 * - Fetches all active marketplace companies (verified or cqc_verified)
 * - Queries the CQC public API for each company's registration status
 * - Auto-suspends any company whose CQC status is no longer "Registered"
 * - Sends suspension email and flags active marketplace bookings for admin review
 *
 * PART 2: Document Expiry Checks
 * - Finds approved compliance documents that have expired
 * - Marks expired documents and suspends companies with expired required documents
 * - Sends 30-day warning emails for documents expiring soon
 *
 * Designed to be invoked by pg_cron or manually by admin.
 * Pattern follows: supabase/functions/cert-expiry-checker/index.ts
 *                  supabase/functions/riddor-deadline-checker/index.ts
 */

import { createClient } from 'npm:@supabase/supabase-js@2';

// CORS headers for admin dashboard access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CQC_BASE_URL = 'https://api.cqc.org.uk/public/v1';
const CQC_PARTNER_CODE = Deno.env.get('CQC_PARTNER_CODE') || 'SiteMedic';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'noreply@sitemedic.co.uk';

// Required document types that trigger suspension when expired
const REQUIRED_DOCUMENT_TYPES = [
  'public_liability_insurance',
  'employers_liability_insurance',
  'professional_indemnity_insurance',
  'dbs_certificate',
];

// =============================================================================
// Email Helper
// =============================================================================

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not configured - email not sent to:', to);
    return;
  }

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `SiteMedic Marketplace <${RESEND_FROM_EMAIL}>`,
        to,
        subject,
        html,
      }),
    });
  } catch (err) {
    console.error(`Failed to send email to ${to}:`, err);
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
// Main Handler
// =============================================================================

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('CQC daily verification check starting...');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const results = {
      cqc_checked: 0,
      cqc_suspended: 0,
      docs_expired: 0,
      docs_expiring_soon: 0,
      errors: [] as string[],
    };

    // =========================================================================
    // PART 1: CQC Status Checks
    // =========================================================================
    console.log('PART 1: Checking CQC registration status...');

    const { data: companies, error: companiesError } = await supabase
      .from('marketplace_companies')
      .select('id, cqc_provider_id, company_name, company_email, verification_status')
      .in('verification_status', ['verified', 'cqc_verified']);

    if (companiesError) {
      console.error('Failed to fetch companies:', companiesError);
      results.errors.push(`Company fetch error: ${companiesError.message}`);
    }

    if (companies?.length) {
      for (const company of companies) {
        // Rate limit: 50ms between requests to respect CQC API
        await new Promise((r) => setTimeout(r, 50));

        try {
          const res = await fetch(
            `${CQC_BASE_URL}/providers/${company.cqc_provider_id}?partnerCode=${CQC_PARTNER_CODE}`
          );

          if (!res.ok) {
            console.warn(
              `CQC API error for ${company.cqc_provider_id}: ${res.status}`
            );
            continue; // Don't suspend on API errors
          }

          const provider = await res.json();
          results.cqc_checked++;

          if (provider.registrationStatus !== 'Registered') {
            // Suspend the company
            const suspensionReason = `CQC status changed to: ${provider.registrationStatus}`;

            await supabase
              .from('marketplace_companies')
              .update({
                verification_status: 'suspended',
                can_submit_quotes: false,
                suspension_reason: suspensionReason,
                suspended_at: new Date().toISOString(),
                cqc_registration_status: provider.registrationStatus,
                cqc_last_checked_at: new Date().toISOString(),
              })
              .eq('id', company.id);

            // Send suspension email
            if (company.company_email) {
              await sendEmail(
                company.company_email,
                `${company.company_name}: Marketplace registration suspended - CQC status change`,
                emailWrapper(
                  'Registration Suspended',
                  `
                  <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                    Your marketplace registration for <strong>${company.company_name}</strong> has been suspended because your CQC registration status changed to <strong>${provider.registrationStatus}</strong>.
                  </p>
                  <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 24px 0; border-radius: 4px;">
                    <p style="margin: 0; color: #991b1b; font-weight: 600;">Action Required</p>
                    <p style="margin: 8px 0 0 0; color: #7f1d1d; font-size: 14px;">
                      You cannot submit quotes until this is resolved. Please contact CQC to reinstate your registration, then contact SiteMedic support.
                    </p>
                  </div>
                  `
                )
              );
            }

            // Flag active marketplace bookings for admin review
            const { data: activeBookings } = await supabase
              .from('bookings')
              .select('id')
              .eq('source', 'marketplace')
              .in('status', ['confirmed', 'pending'])
              .eq('company_id', company.id);

            if (activeBookings?.length) {
              console.warn(
                `ADMIN ALERT: Company ${company.company_name} (${company.id}) suspended - ${activeBookings.length} active marketplace bookings need review`
              );
            }

            results.cqc_suspended++;
          } else {
            // Update last checked timestamp
            await supabase
              .from('marketplace_companies')
              .update({
                cqc_last_checked_at: new Date().toISOString(),
                cqc_registration_status: 'Registered',
              })
              .eq('id', company.id);
          }
        } catch (err) {
          console.error(`CQC check failed for ${company.cqc_provider_id}:`, err);
          // Don't suspend on network errors
        }
      }
    }

    console.log(
      `PART 1 complete: ${results.cqc_checked} checked, ${results.cqc_suspended} suspended`
    );

    // =========================================================================
    // PART 2: Document Expiry Checks
    // =========================================================================
    console.log('PART 2: Checking document expiry...');

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Find expired documents (expiry_date <= today AND review_status = 'approved')
    const { data: expiredDocs, error: expiredError } = await supabase
      .from('compliance_documents')
      .select('id, company_id, document_type, expiry_date')
      .eq('review_status', 'approved')
      .lte('expiry_date', today);

    if (expiredError) {
      console.error('Failed to fetch expired docs:', expiredError);
      results.errors.push(`Expired docs fetch error: ${expiredError.message}`);
    }

    if (expiredDocs?.length) {
      // Mark expired documents
      for (const doc of expiredDocs) {
        await supabase
          .from('compliance_documents')
          .update({ review_status: 'expired' })
          .eq('id', doc.id);
      }

      // Group by company and suspend companies with expired required documents
      const companyIds = [...new Set(expiredDocs.map((d) => d.company_id))];

      for (const companyId of companyIds) {
        const companyExpiredTypes = expiredDocs
          .filter((d) => d.company_id === companyId)
          .map((d) => d.document_type);

        // Check if any expired doc is a required type
        const hasExpiredRequired = companyExpiredTypes.some((t) =>
          REQUIRED_DOCUMENT_TYPES.includes(t)
        );

        if (hasExpiredRequired) {
          const suspensionReason = `Document expired: ${companyExpiredTypes.join(', ')}`;

          await supabase
            .from('marketplace_companies')
            .update({
              verification_status: 'suspended',
              can_submit_quotes: false,
              suspension_reason: suspensionReason,
              suspended_at: new Date().toISOString(),
            })
            .eq('id', companyId)
            .in('verification_status', ['verified', 'cqc_verified']); // Only suspend currently active

          // Send expiry suspension email
          const { data: suspendedCompany } = await supabase
            .from('marketplace_companies')
            .select('company_email, company_name')
            .eq('id', companyId)
            .single();

          if (suspendedCompany?.company_email) {
            await sendEmail(
              suspendedCompany.company_email,
              `${suspendedCompany.company_name}: Marketplace registration suspended - expired documents`,
              emailWrapper(
                'Registration Suspended',
                `
                <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                  Your marketplace registration for <strong>${suspendedCompany.company_name}</strong> has been suspended because the following compliance documents have expired:
                </p>
                <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 24px 0; border-radius: 4px;">
                  <p style="margin: 0; color: #991b1b; font-weight: 600;">Expired Documents:</p>
                  <p style="margin: 8px 0 0 0; color: #7f1d1d; font-size: 14px;">
                    ${companyExpiredTypes.join(', ')}
                  </p>
                </div>
                <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                  Please upload updated documents to restore your quoting ability.
                </p>
                `
              )
            );
          }

          // Flag active marketplace bookings for admin review
          const { data: affectedBookings } = await supabase
            .from('bookings')
            .select('id')
            .eq('source', 'marketplace')
            .in('status', ['confirmed', 'pending'])
            .eq('company_id', companyId);

          if (affectedBookings?.length) {
            console.warn(
              `ADMIN ALERT: Company ${suspendedCompany?.company_name} (${companyId}) suspended due to expired docs - ${affectedBookings.length} active marketplace bookings need review`
            );
          }

          results.docs_expired++;
        }
      }
    }

    // Find documents expiring within 30 days (for warning emails)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const cutoffDate = thirtyDaysFromNow.toISOString().split('T')[0];

    const { data: expiringDocs, error: expiringError } = await supabase
      .from('compliance_documents')
      .select('id, company_id, document_type, expiry_date')
      .eq('review_status', 'approved')
      .gt('expiry_date', today)
      .lte('expiry_date', cutoffDate);

    if (expiringError) {
      console.error('Failed to fetch expiring docs:', expiringError);
      results.errors.push(`Expiring docs fetch error: ${expiringError.message}`);
    }

    results.docs_expiring_soon = expiringDocs?.length || 0;

    // Send warning emails for documents expiring within 30 days
    if (expiringDocs?.length) {
      // Group by company to send one email per company
      const expiringByCompany = new Map<
        string,
        { document_type: string; expiry_date: string }[]
      >();

      for (const doc of expiringDocs) {
        const existing = expiringByCompany.get(doc.company_id) || [];
        existing.push({ document_type: doc.document_type, expiry_date: doc.expiry_date });
        expiringByCompany.set(doc.company_id, existing);
      }

      for (const [companyId, docs] of expiringByCompany) {
        const { data: comp } = await supabase
          .from('marketplace_companies')
          .select('company_email, company_name')
          .eq('id', companyId)
          .single();

        if (comp?.company_email) {
          const docList = docs
            .map((d) => `${d.document_type} (expires ${d.expiry_date})`)
            .join(', ');

          await sendEmail(
            comp.company_email,
            `${comp.company_name}: Compliance documents expiring soon`,
            emailWrapper(
              'Documents Expiring Soon',
              `
              <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                The following compliance documents for <strong>${comp.company_name}</strong> will expire within 30 days:
              </p>
              <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 4px;">
                <p style="margin: 0; color: #78350f; font-weight: 600;">Expiring Documents:</p>
                <p style="margin: 8px 0 0 0; color: #92400e; font-size: 14px;">
                  ${docList}
                </p>
              </div>
              <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                Please upload updated documents before they expire to avoid suspension from quoting.
              </p>
              `
            )
          );
        }
      }
    }

    console.log(
      `PART 2 complete: ${results.docs_expired} companies suspended for expired docs, ${results.docs_expiring_soon} docs expiring soon`
    );

    console.log('CQC daily verification check complete:', JSON.stringify(results));

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('CQC daily verification check error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
