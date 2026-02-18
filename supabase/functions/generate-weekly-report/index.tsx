/**
 * Weekly Safety Report PDF Generation Edge Function
 * Phase 5: PDF Generation - Plan 01
 *
 * Purpose: Generate weekly safety report PDF from treatment logs, near-misses,
 * safety checks, and compliance data. Accepts optional week_ending date.
 *
 * Authentication:
 * - Cron trigger: Service role key from Supabase Vault
 * - Manual trigger: User JWT from dashboard
 */

import { createClient } from 'npm:@supabase/supabase-js@2';
import { renderToBuffer } from 'npm:@react-pdf/renderer@4.3.2';
import { ReportDocument } from './components/ReportDocument.tsx';
import { fetchWeeklyReportData } from './queries.ts';
import { uploadReportPDF, saveReportMetadata } from './storage.ts';
import { sendReportEmail } from './email.ts';
import { fetchOrgBranding, fetchLogoAsDataUri } from '../_shared/branding-helpers.ts';

// CORS headers for dashboard access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Calculate the most recent Friday (or today if Friday)
 */
function getMostRecentFriday(): string {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 5 = Friday
  const daysToSubtract = dayOfWeek >= 5 ? dayOfWeek - 5 : dayOfWeek + 2; // Days since last Friday

  const friday = new Date(today);
  friday.setDate(today.getDate() - daysToSubtract);
  friday.setHours(23, 59, 59, 999); // End of Friday
  return friday.toISOString();
}

interface GenerateReportRequest {
  week_ending?: string; // ISO date string, defaults to current week's Friday
  trigger?: 'cron' | 'manual'; // Source of the request
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // Create Supabase client with service role key for full data access
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Handle GET request: Download existing report
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const weekEnding = url.searchParams.get('week_ending');

      if (!weekEnding) {
        return new Response(
          JSON.stringify({ error: 'Missing week_ending query parameter' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`📥 Fetching existing report for week ending: ${weekEnding}`);

      // Look up existing report
      const { data: report, error: lookupError } = await supabase
        .from('weekly_reports')
        .select('*')
        .eq('week_ending', weekEnding.split('T')[0])
        .limit(1)
        .maybeSingle();

      if (lookupError) {
        throw new Error(`Failed to lookup report: ${lookupError.message}`);
      }

      if (!report) {
        return new Response(
          JSON.stringify({ error: 'Report not found for specified week' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if signed URL is expired
      const now = new Date();
      const expiresAt = new Date(report.signed_url_expires_at);

      if (now >= expiresAt) {
        console.log('🔄 Signed URL expired, regenerating...');

        // Regenerate signed URL
        const { data: newSignedUrlData, error: signedUrlError } = await supabase.storage
          .from('safety-reports')
          .createSignedUrl(report.storage_path, 604800); // 7 days

        if (signedUrlError || !newSignedUrlData?.signedUrl) {
          throw new Error('Failed to regenerate signed URL');
        }

        // Update record
        const newExpiresAt = new Date(Date.now() + 604800 * 1000);
        await supabase
          .from('weekly_reports')
          .update({
            signed_url: newSignedUrlData.signedUrl,
            signed_url_expires_at: newExpiresAt.toISOString(),
          })
          .eq('id', report.id);

        return new Response(
          JSON.stringify({
            signedUrl: newSignedUrlData.signedUrl,
            expiresAt: newExpiresAt.toISOString(),
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Return existing signed URL
      return new Response(
        JSON.stringify({
          signedUrl: report.signed_url,
          expiresAt: report.signed_url_expires_at,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle POST request: Generate new report
    console.log('📄 Starting weekly report PDF generation...');

    // Parse request body
    const { week_ending, trigger = 'manual', org_id }: GenerateReportRequest & { org_id?: string } = await req.json();

    // Calculate week_ending if not provided
    const weekEnding = week_ending || getMostRecentFriday();
    console.log(`📅 Week ending: ${weekEnding} (trigger: ${trigger})`);

    // For MVP: Get first organization (single org per instance)
    // In production, this would loop through all orgs for cron trigger
    let orgId = org_id;
    if (!orgId) {
      const { data: org } = await supabase.from('organizations').select('id').limit(1).single();
      if (!org?.id) {
        throw new Error('No organization found');
      }
      orgId = org.id;
    }

    // Fetch org branding for PDF header/footer
    const branding = await fetchOrgBranding(supabase, orgId);
    let logoSrc = branding.logo_url;
    if (logoSrc) {
      const dataUri = await fetchLogoAsDataUri(logoSrc);
      if (dataUri) logoSrc = dataUri;
    }

    // Fetch all report data from Supabase
    console.log('🔍 Fetching report data...');
    const reportData = await fetchWeeklyReportData(supabase, weekEnding);

    // Persist compliance score to compliance_score_history (non-blocking)
    // Formula v1: 100 - penalty for each compliance failure
    const complianceNumericScore = 100
      - (reportData.complianceScore.dailyCheckDone ? 0 : 40)
      - (reportData.complianceScore.riddorDeadlines > 0 ? 30 : 0)
      - (reportData.complianceScore.overdueFollowups > 0 ? 20 : 0)
      - (reportData.complianceScore.expiredCerts > 0 ? 10 : 0);

    const periodEnd = weekEnding.split('T')[0];
    const periodStartDate = new Date(weekEnding);
    periodStartDate.setDate(periodStartDate.getDate() - 7);
    const periodStart = periodStartDate.toISOString().split('T')[0];

    const { error: complianceUpsertError } = await supabase
      .from('compliance_score_history')
      .upsert(
        {
          org_id: orgId,
          vertical: 'general',
          score: complianceNumericScore,
          period_start: periodStart,
          period_end: periodEnd,
          details: {
            formula_version: 'v1',
            daily_check_done: reportData.complianceScore.dailyCheckDone,
            riddor_deadlines: reportData.complianceScore.riddorDeadlines,
            overdue_followups: reportData.complianceScore.overdueFollowups,
            expired_certs: reportData.complianceScore.expiredCerts,
          },
        },
        { onConflict: 'org_id,vertical,period_start' }
      );

    if (complianceUpsertError) {
      console.error('Failed to upsert compliance score:', complianceUpsertError.message);
    } else {
      console.log(`Compliance score ${complianceNumericScore}/100 persisted for period ${periodStart} to ${periodEnd}`);
    }

    // Generate PDF buffer using React-PDF
    console.log('📝 Rendering PDF...');
    const pdfBuffer = await renderToBuffer(<ReportDocument data={reportData} branding={branding} logoSrc={logoSrc} />);

    console.log(`✅ PDF generated successfully (${pdfBuffer.length} bytes)`);

    // Upload to storage and get signed URL
    const { storagePath, signedUrl, expiresAt } = await uploadReportPDF(
      supabase,
      pdfBuffer,
      orgId,
      weekEnding
    );

    // Save report metadata
    const reportId = await saveReportMetadata(supabase, {
      orgId,
      weekEnding,
      storagePath,
      signedUrl,
      signedUrlExpiresAt: expiresAt,
      fileSizeBytes: pdfBuffer.length,
      generationTimeMs: Date.now() - startTime,
      triggerType: trigger,
    });

    // Send email notification if RESEND_API_KEY is configured
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    let emailResult = null;

    if (resendApiKey) {
      // Get site manager email
      const { data: manager } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('role', 'manager')
        .limit(1)
        .maybeSingle();

      if (manager?.email) {
        console.log(`📧 Sending email to ${manager.email}...`);

        emailResult = await sendReportEmail({
          resendApiKey,
          to: manager.email,
          recipientName: manager.full_name || 'Site Manager',
          weekEnding,
          signedUrl,
          pdfBuffer,
          complianceStatus: reportData.complianceScore.status,
          treatmentCount: reportData.weeklyStats.treatmentCount,
          nearMissCount: reportData.weeklyStats.nearMissCount,
          projectName: reportData.projectName,
        });

        // Update email_sent status
        if (emailResult.success) {
          await supabase
            .from('weekly_reports')
            .update({
              email_sent: true,
              email_sent_to: manager.email,
            })
            .eq('id', reportId);
        }
      } else {
        console.log('⚠️  No manager found, skipping email notification');
      }
    } else {
      console.log('⚠️  RESEND_API_KEY not configured, skipping email notification');
    }

    const duration = Date.now() - startTime;
    console.log(`✅ Report pipeline completed in ${duration}ms`);

    // Return response based on trigger type
    if (trigger === 'cron') {
      // Cron: return JSON metadata
      return new Response(
        JSON.stringify({
          success: true,
          reportId,
          weekEnding,
          signedUrl,
          generationTimeMs: duration,
          emailSent: emailResult?.success || false,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } else {
      // Manual: return PDF buffer for direct download
      const fileName = `weekly-report-${weekEnding.split('T')[0]}.pdf`;
      return new Response(pdfBuffer, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${fileName}"`,
          'X-Generation-Time': `${duration}ms`,
        },
      });
    }
  } catch (error) {
    console.error('❌ Error generating weekly report:', error);

    return new Response(
      JSON.stringify({
        error: 'Failed to generate weekly report',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
