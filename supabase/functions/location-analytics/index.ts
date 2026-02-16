/**
 * Supabase Edge Function: location-analytics
 *
 * Serves location tracking analytics for admin dashboard.
 *
 * WHY: Admins need visibility into system performance, medic reliability,
 * geofence accuracy, and data quality to optimize operations.
 *
 * FEATURES:
 * - System-wide metrics (pings, events, alerts)
 * - Per-medic analytics with reliability scores
 * - Daily trends (last 30 days)
 * - Geofence performance ratings
 * - Alert type summaries
 * - Comprehensive report generation
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

interface AnalyticsRequest {
  view?: 'metrics' | 'medics' | 'trends' | 'geofences' | 'alerts' | 'report';
  start_date?: string; // ISO date for report
  end_date?: string;   // ISO date for report
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
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

    // TODO: Check if user is admin (implement based on your auth schema)
    // For now, assume all authenticated users can view analytics

    // Parse request
    let params: AnalyticsRequest = {};
    if (req.method === 'POST') {
      params = await req.json();
    } else if (req.method === 'GET') {
      const url = new URL(req.url);
      params.view = url.searchParams.get('view') as any || 'metrics';
    }

    const view = params.view || 'metrics';

    console.log(`[Analytics] Fetching ${view} for user ${user.id}`);

    let data, error;

    switch (view) {
      case 'metrics':
        // System-wide metrics
        ({ data, error } = await supabaseClient
          .from('location_tracking_metrics')
          .select('*')
          .single());
        break;

      case 'medics':
        // Per-medic analytics
        ({ data, error } = await supabaseClient
          .from('medic_location_analytics')
          .select('*')
          .order('reliability_score', { ascending: false }));
        break;

      case 'trends':
        // Daily trends
        ({ data, error } = await supabaseClient
          .from('daily_location_trends')
          .select('*')
          .order('date', { ascending: false }));
        break;

      case 'geofences':
        // Geofence performance
        ({ data, error } = await supabaseClient
          .from('geofence_performance')
          .select('*')
          .order('auto_detection_rate', { ascending: false }));
        break;

      case 'alerts':
        // Alert type summary
        ({ data, error } = await supabaseClient
          .from('alert_type_summary')
          .select('*')
          .order('total_count', { ascending: false }));
        break;

      case 'report':
        // Comprehensive report
        ({ data, error } = await supabaseClient.rpc('generate_location_report', {
          p_start_date: params.start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          p_end_date: params.end_date || new Date().toISOString(),
        }));
        break;

      default:
        return new Response(
          JSON.stringify({
            error: 'Invalid view',
            valid_views: ['metrics', 'medics', 'trends', 'geofences', 'alerts', 'report'],
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        );
    }

    if (error) {
      console.error(`[Analytics] Error fetching ${view}:`, error);
      return new Response(
        JSON.stringify({
          error: 'Failed to fetch analytics',
          details: error.message,
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        view,
        data,
        generated_at: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[Analytics] Unexpected error:', error);
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
