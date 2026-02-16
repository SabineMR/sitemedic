/**
 * Supabase Edge Function: gdpr-export-data
 *
 * GDPR Right to Access - Export all personal data for a medic.
 *
 * WHY: GDPR Article 15 requires organizations to provide individuals with
 * a copy of all personal data held about them in a structured, machine-readable format.
 *
 * FEATURES:
 * - Exports location pings (last 30 days)
 * - Exports shift events (all time)
 * - Exports audit trail (who viewed your data)
 * - Exports consent records
 * - Exports alerts
 * - Returns JSON format (can be converted to CSV/PDF by client)
 * - Logs export request in audit trail
 * - Medics can only export their own data
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`[GDPR Export] User ${user.id} requesting data export...`);

    // Call database function to export all data
    const { data: exportData, error: exportError } = await supabaseClient.rpc(
      'export_medic_data',
      {
        p_medic_id: user.id,
      }
    );

    if (exportError) {
      console.error('[GDPR Export] Error:', exportError);
      return new Response(
        JSON.stringify({
          error: 'Failed to export data',
          details: exportError.message,
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`[GDPR Export] Successfully exported data for user ${user.id}`);

    // Return exported data
    return new Response(
      JSON.stringify({
        success: true,
        data: exportData,
        export_info: {
          exported_by: user.email,
          export_timestamp: new Date().toISOString(),
          format: 'JSON',
          gdpr_notice:
            'This export includes all personal data we hold about you. Location pings are retained for 30 days, audit logs for 6 years per UK tax law.',
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="sitemedic-data-export-${user.id}-${Date.now()}.json"`,
        },
      }
    );
  } catch (error) {
    console.error('[GDPR Export] Unexpected error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
