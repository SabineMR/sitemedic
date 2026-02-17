/**
 * Auto-Match API Route
 * Phase 4.5: Trigger auto-assignment and email notifications
 *
 * EXPLICIT 3-STEP SEQUENCE:
 * 1. Call auto-assign Edge Function (gets matched medic_id)
 * 2. UPDATE booking SET medic_id (persist assignment)
 * 3. Call email endpoint (sends confirmation with calendar invite)
 */

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

interface AutoMatchRequest {
  bookingId: string;
}

interface MatchCandidate {
  medic_id: string;
  medic_name: string;
  star_rating: number;
  distance_miles?: number;
  travel_time_minutes?: number;
  availability: string;
  match_score: number;
  match_reasons: string[];
}

export async function POST(request: Request) {
  try {
    const { bookingId }: AutoMatchRequest = await request.json();

    if (!bookingId) {
      return NextResponse.json(
        { error: 'bookingId is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // **STEP 1: Call auto-assign Edge Function**
    const { data: edgeFunctionResult, error: edgeFunctionError } = await supabase.functions.invoke(
      'auto-assign-medic-v2',
      {
        body: { booking_id: bookingId },
      }
    );

    if (edgeFunctionError) {
      console.error('❌ Edge Function error:', edgeFunctionError);
      return NextResponse.json(
        { error: 'Failed to auto-assign medic', details: edgeFunctionError.message },
        { status: 500 }
      );
    }

    // Check if manual approval required (no match or low confidence)
    if (edgeFunctionResult.requires_manual_approval) {
      return NextResponse.json({
        matches: [],
        requiresManualApproval: true,
        reason: edgeFunctionResult.reason || 'No available medics found',
      });
    }

    const assignedMedicId = edgeFunctionResult.assigned_medic_id;

    if (!assignedMedicId) {
      return NextResponse.json({
        matches: [],
        requiresManualApproval: true,
        reason: 'No medic was assigned by the auto-assignment algorithm',
      });
    }

    // **STEP 2: UPDATE booking with assigned medic_id**
    // The Edge Function already updates the booking, but we verify here
    const { error: updateError } = await supabase
      .from('bookings')
      .update({ medic_id: assignedMedicId })
      .eq('id', bookingId);

    if (updateError) {
      console.error('❌ Failed to update booking with medic_id:', updateError);
      return NextResponse.json(
        { error: 'Failed to update booking', details: updateError.message },
        { status: 500 }
      );
    }

    // **STEP 3: Trigger email sending (ONLY after medic_id is persisted)**
    // Call the email endpoint internally
    const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:30500'}/api/email/booking-confirmation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId }),
    });

    if (!emailResponse.ok) {
      console.error('⚠️  Email sending failed, but booking is confirmed');
      // Don't fail the entire request - booking is still confirmed
    }

    // Format match reasons from Edge Function response
    const matchReasons: string[] = [];

    if (edgeFunctionResult.score_breakdown) {
      const breakdown = edgeFunctionResult.score_breakdown;
      if (breakdown.distance_score > 0) {
        matchReasons.push(`Distance score: ${breakdown.distance_score.toFixed(1)}/25`);
      }
      if (breakdown.qualification_score > 0) {
        matchReasons.push(`Qualifications: ${breakdown.qualification_score.toFixed(1)}/20`);
      }
      if (breakdown.availability_score > 0) {
        matchReasons.push(`Availability: ${breakdown.availability_score.toFixed(1)}/15`);
      }
      if (breakdown.rating_score > 0) {
        matchReasons.push(`Rating score: ${breakdown.rating_score.toFixed(1)}/10`);
      }
    }

    // Fetch real star_rating from medics table
    const { data: medicRecord } = await supabase
      .from('medics')
      .select('star_rating')
      .eq('id', assignedMedicId)
      .single();

    // Return ranked matches (top candidate who was assigned)
    const topMatch: MatchCandidate = {
      medic_id: assignedMedicId,
      medic_name: edgeFunctionResult.medic_name || 'Assigned Medic',
      star_rating: medicRecord?.star_rating ?? 0,
      availability: 'Available',
      match_score: edgeFunctionResult.confidence_score || 0,
      match_reasons: matchReasons.length > 0 ? matchReasons : ['Auto-assigned by algorithm'],
    };

    return NextResponse.json({
      matches: [topMatch],
      requiresManualApproval: false,
    });

  } catch (error) {
    console.error('❌ Auto-match error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
