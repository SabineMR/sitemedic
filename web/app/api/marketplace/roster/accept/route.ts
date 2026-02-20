/**
 * POST /api/marketplace/roster/accept — Accept a roster invitation
 * Phase 37: Company Accounts — Plan 01
 *
 * Verifies the JWT invitation token, finds the matching pending roster entry,
 * links the current user's medic record, and activates the membership.
 *
 * Body: { token }
 * Auth: any authenticated user (must have a medic record)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { jwtVerify } from 'jose';
import { rosterAcceptSchema } from '@/lib/marketplace/roster-schemas';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// =============================================================================
// JWT secret for invitation tokens (must match invite route)
// =============================================================================

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET || process.env.ROSTER_INVITE_SECRET || 'dev-roster-invite-secret-not-for-production';
  return new TextEncoder().encode(secret);
}

// =============================================================================
// POST: Accept invitation
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = rosterAcceptSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { token } = parsed.data;

    // Verify JWT token
    let payload: { company_id?: string; email?: string; type?: string };
    try {
      const result = await jwtVerify(token, getJwtSecret());
      payload = result.payload as typeof payload;
    } catch (jwtError) {
      console.error('[Roster Accept] JWT verification failed:', jwtError);
      return NextResponse.json(
        { error: 'Invalid or expired invitation token' },
        { status: 400 }
      );
    }

    // Validate token payload
    if (payload.type !== 'roster_invite' || !payload.company_id || !payload.email) {
      return NextResponse.json({ error: 'Invalid invitation token' }, { status: 400 });
    }

    // Find the user's medic record
    const { data: medic } = await supabase
      .from('medics')
      .select('id, email')
      .eq('user_id', user.id)
      .single();

    if (!medic) {
      return NextResponse.json(
        { error: 'No medic record found. You must have a medic profile to join a roster.' },
        { status: 400 }
      );
    }

    // Find matching pending roster entry
    const { data: rosterEntry } = await supabase
      .from('company_roster_medics')
      .select('*')
      .eq('company_id', payload.company_id)
      .eq('invitation_email', payload.email)
      .eq('status', 'pending')
      .single();

    if (!rosterEntry) {
      return NextResponse.json(
        { error: 'Invitation not found or already accepted' },
        { status: 404 }
      );
    }

    // Check if medic is already active on this roster (via a different invitation or direct add)
    const { data: existingActive } = await supabase
      .from('company_roster_medics')
      .select('id')
      .eq('company_id', payload.company_id)
      .eq('medic_id', medic.id)
      .eq('status', 'active')
      .single();

    if (existingActive) {
      return NextResponse.json(
        { error: 'You are already an active member of this roster' },
        { status: 409 }
      );
    }

    // Accept: update roster entry with medic_id, set status active
    const { data: updated, error: updateError } = await supabase
      .from('company_roster_medics')
      .update({
        medic_id: medic.id,
        status: 'active',
        invitation_accepted_at: new Date().toISOString(),
        joined_at: new Date().toISOString(),
      })
      .eq('id', rosterEntry.id)
      .select()
      .single();

    if (updateError) {
      // Handle unique constraint violation if medic_id already linked to this company
      if (updateError.code === '23505') {
        return NextResponse.json(
          { error: 'You are already a member of this roster' },
          { status: 409 }
        );
      }
      console.error('[Roster Accept] Update error:', updateError);
      return NextResponse.json({ error: 'Failed to accept invitation' }, { status: 500 });
    }

    // Fetch company name for response
    const { data: company } = await supabase
      .from('marketplace_companies')
      .select('company_name')
      .eq('id', payload.company_id)
      .single();

    return NextResponse.json({
      message: `Successfully joined ${company?.company_name || 'company'} roster`,
      rosterEntry: updated,
    });
  } catch (error) {
    console.error('[Roster Accept] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
