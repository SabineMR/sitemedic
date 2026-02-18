/**
 * sendWelcomeEmail
 *
 * Sends a welcome email to the org admin when platform admin activates
 * their organisation. Fetches org branding from database before rendering.
 *
 * Fire-and-forget pattern — logs errors but does not throw.
 *
 * Phase 29: Org Onboarding Flow
 */

import { createClient } from '@supabase/supabase-js';
import { resend } from '@/lib/email/resend';
import WelcomeEmail from '@/lib/email/templates/welcome-email';
import { render } from '@react-email/components';

export async function sendWelcomeEmail(params: {
  orgId: string;
  orgAdminEmail: string;
  orgAdminName: string;
  slug?: string;
  planName: string;
}): Promise<void> {
  try {
    const { orgId, orgAdminEmail, orgAdminName, slug, planName } = params;

    // Service-role client — this is called from API routes, not request context
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      console.error('⚠️  Supabase service role env vars not configured — cannot send welcome email');
      return;
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Fetch org branding
    const { data: orgBranding } = await supabase
      .from('org_branding')
      .select('company_name, primary_colour_hex, logo_path')
      .eq('org_id', orgId)
      .single();

    // Build login URL — subdomain for Growth/Enterprise, default otherwise
    const loginUrl = slug
      ? `https://${slug}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'sitemedic.co.uk'}/login`
      : `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:30500'}/login`;

    // Build logo URL if logo_path exists
    const logoUrl = orgBranding?.logo_path
      ? `${supabaseUrl}/storage/v1/object/public/org-logos/${orgBranding.logo_path}`
      : undefined;

    const companyName = orgBranding?.company_name || 'Your Organisation';

    const emailHtml = await render(
      WelcomeEmail({
        orgAdmin: { name: orgAdminName },
        org: {
          companyName,
          planName,
          loginUrl,
        },
        branding: {
          primaryColour: orgBranding?.primary_colour_hex || undefined,
          logoUrl,
        },
      })
    );

    const result = await resend.emails.send({
      from: 'SiteMedic <welcome@sitemedic.co.uk>',
      to: orgAdminEmail,
      subject: 'Welcome to SiteMedic — Your Account is Active',
      html: emailHtml,
    });

    if (result.error) {
      console.error('⚠️  Failed to send welcome email:', result.error);
    }
  } catch (err) {
    console.error('⚠️  Error sending welcome email:', err);
  }
}
