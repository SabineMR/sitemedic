/**
 * Supabase Edge Function: gdpr-delete-data
 *
 * GDPR Right to be Forgotten - Delete all personal data for a medic.
 *
 * WHY: GDPR Article 17 requires organizations to delete personal data upon request.
 *
 * IMPORTANT NOTES:
 * - Deletes location pings (all)
 * - Deletes shift events (all)
 * - Deletes alerts (all)
 * - Withdraws consent (marks as withdrawn, doesn't delete record)
 * - KEEPS audit trail (required for UK tax law - 6 years)
 * - This is PERMANENT and CANNOT BE UNDONE
 *
 * SAFETY:
 * - Requires user confirmation (pass confirmation: true in body)
 * - Medics can only delete their own data
 * - Creates final audit entry before deletion
 * - Returns summary of what was deleted
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

interface DeleteRequest {
  confirmation: boolean; // Must be true to proceed
  reason?: string; // Optional reason for deletion
}

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

    // Parse request body
    const body: DeleteRequest = await req.json();

    // Safety check: Must explicitly confirm deletion
    if (body.confirmation !== true) {
      return new Response(
        JSON.stringify({
          error: 'Confirmation required',
          message:
            'Data deletion is permanent. Set confirmation: true in request body to proceed.',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    console.warn(
      `[GDPR Delete] User ${user.id} requesting PERMANENT data deletion...`
    );

    // Call database function to delete all data
    const { data: deleteResult, error: deleteError } = await supabaseClient.rpc(
      'delete_medic_data',
      {
        p_medic_id: user.id,
        p_requesting_user_id: user.id,
        p_reason: body.reason || 'GDPR Right to be Forgotten',
      }
    );

    if (deleteError) {
      console.error('[GDPR Delete] Error:', deleteError);
      return new Response(
        JSON.stringify({
          error: 'Failed to delete data',
          details: deleteError.message,
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(
      `[GDPR Delete] Successfully deleted data for user ${user.id}:`,
      deleteResult
    );

    // Return deletion summary
    return new Response(
      JSON.stringify({
        success: true,
        deleted_at: new Date().toISOString(),
        summary: {
          location_pings_deleted: deleteResult[0].pings_deleted,
          shift_events_deleted: deleteResult[0].events_deleted,
          alerts_deleted: deleteResult[0].alerts_deleted,
        },
        important_notice: [
          'Your location tracking data has been permanently deleted.',
          'Audit logs are retained for 6 years per UK tax law (legal requirement).',
          'Your consent has been withdrawn - location tracking is now disabled.',
          'This action cannot be undone.',
        ],
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[GDPR Delete] Unexpected error:', error);
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
