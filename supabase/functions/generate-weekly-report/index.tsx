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
    console.log('📄 Starting weekly report PDF generation...');

    // Parse request body
    const { week_ending, trigger = 'manual' }: GenerateReportRequest = await req.json();

    // Calculate week_ending if not provided
    const weekEnding = week_ending || getMostRecentFriday();
    console.log(`📅 Week ending: ${weekEnding} (trigger: ${trigger})`);

    // Create Supabase client with service role key for full data access
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Fetch all report data from Supabase
    console.log('🔍 Fetching report data...');
    const reportData = await fetchWeeklyReportData(supabase, weekEnding);

    // Generate PDF buffer using React-PDF
    console.log('📝 Rendering PDF...');
    const pdfBuffer = await renderToBuffer(<ReportDocument data={reportData} />);

    const duration = Date.now() - startTime;
    console.log(`✅ PDF generated successfully in ${duration}ms`);

    // Return PDF buffer as downloadable response
    // Storage upload will be added in Plan 02
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
