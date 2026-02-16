/**
 * Auto-Assign All - Bulk Auto-Scheduling
 * Phase 1.6: "Auto-Schedule All Unassigned" button functionality
 *
 * Purpose: Process all pending bookings in batch, auto-assigning medics with confidence scoring
 *
 * Features:
 * - Query all bookings WHERE medic_id IS NULL AND status = 'pending'
 * - For each booking: Call auto-assign-medic-v2 function
 * - Categorize results: Auto-assigned (score >80%), Flagged for review (50-80%), Requires manual (< 50%)
 * - Return summary: "✅ 8 auto-assigned, ⚠️ 2 flagged for review, ❌ 2 require manual assignment"
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface AutoAssignAllRequest {
  limit?: number; // Optional: limit number of bookings to process (default: all)
  skip_overtime_check?: boolean; // For testing only
}

interface AssignmentResult {
  booking_id: string;
  assigned_medic_id: string | null;
  medic_name: string | null;
  confidence_score: number;
  category: 'auto_assigned' | 'flagged_for_review' | 'requires_manual';
  reason?: string;
}

serve(async (req: Request) => {
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    const { limit, skip_overtime_check = false }: AutoAssignAllRequest = await req.json();

    console.log(`🎯 Bulk auto-assigning: processing unassigned bookings`);

    // Step 1: Fetch all unassigned bookings
    let query = supabase
      .from('bookings')
      .select('id, site_name, shift_date')
      .is('medic_id', null)
      .eq('status', 'pending')
      .order('shift_date', { ascending: true });

    if (limit) {
      query = query.limit(limit);
    }

    const { data: bookings, error: fetchError } = await query;

    if (fetchError) {
      throw new Error(`Failed to fetch bookings: ${fetchError.message}`);
    }

    if (!bookings || bookings.length === 0) {
      console.log('✅ No unassigned bookings found');
      return new Response(
        JSON.stringify({
          total_processed: 0,
          auto_assigned: 0,
          flagged_for_review: 0,
          requires_manual: 0,
          results: [],
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 Found ${bookings.length} unassigned bookings to process`);

    // Step 2: Process each booking sequentially
    const results: AssignmentResult[] = [];
    let autoAssignedCount = 0;
    let flaggedForReviewCount = 0;
    let requiresManualCount = 0;

    for (const booking of bookings) {
      console.log(`\n🔄 Processing booking ${booking.id} (${booking.site_name}, ${booking.shift_date})`);

      try {
        // Call auto-assign-medic-v2 edge function
        const assignResponse = await fetch(`${SUPABASE_URL}/functions/v1/auto-assign-medic-v2`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          },
          body: JSON.stringify({
            booking_id: booking.id,
            skip_overtime_check,
          }),
        });

        if (!assignResponse.ok) {
          throw new Error(`Auto-assign API error: ${assignResponse.status}`);
        }

        const assignData = await assignResponse.json();

        // Categorize result based on confidence score
        let category: 'auto_assigned' | 'flagged_for_review' | 'requires_manual';

        if (assignData.confidence_score >= 80) {
          category = 'auto_assigned';
          autoAssignedCount++;
          console.log(`✅ Auto-assigned (confidence ${assignData.confidence_score.toFixed(2)})`);
        } else if (assignData.confidence_score >= 50) {
          category = 'flagged_for_review';
          flaggedForReviewCount++;
          console.log(`⚠️  Flagged for review (confidence ${assignData.confidence_score.toFixed(2)})`);
        } else {
          category = 'requires_manual';
          requiresManualCount++;
          console.log(`❌ Requires manual assignment (confidence ${assignData.confidence_score.toFixed(2)})`);
        }

        results.push({
          booking_id: booking.id,
          assigned_medic_id: assignData.assigned_medic_id,
          medic_name: assignData.medic_name,
          confidence_score: assignData.confidence_score,
          category,
          reason: assignData.reason,
        });

      } catch (error) {
        console.error(`❌ Failed to process booking ${booking.id}:`, error.message);

        // Log failed booking
        results.push({
          booking_id: booking.id,
          assigned_medic_id: null,
          medic_name: null,
          confidence_score: 0,
          category: 'requires_manual',
          reason: `Processing error: ${error.message}`,
        });

        requiresManualCount++;
      }
    }

    // Step 3: Return summary
    const summary = {
      total_processed: bookings.length,
      auto_assigned: autoAssignedCount,
      flagged_for_review: flaggedForReviewCount,
      requires_manual: requiresManualCount,
      results,
    };

    console.log(`\n📊 Summary: ✅ ${autoAssignedCount} auto-assigned, ⚠️ ${flaggedForReviewCount} flagged for review, ❌ ${requiresManualCount} require manual assignment`);

    return new Response(
      JSON.stringify(summary),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in bulk auto-assign:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
