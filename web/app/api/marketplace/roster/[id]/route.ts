/**
 * PATCH /api/marketplace/roster/[id] — Update roster medic
 * DELETE /api/marketplace/roster/[id] — Soft-remove medic from roster
 * Phase 37: Company Accounts — Plan 01
 *
 * PATCH: Update title, qualifications, availability, hourly rate.
 *   Auth: company admin
 *
 * DELETE: Soft-remove by setting status='inactive' and left_at=now().
 *   Does NOT delete the row (preserves audit trail + historical quote references).
 *   Auth: company admin
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rosterUpdateSchema } from '@/lib/marketplace/roster-schemas';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// =============================================================================
// PATCH: Update roster medic
// =============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rosterId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = rosterUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: parsed.error.issues },
        { status: 400 }
      );
    }

    // Fetch roster entry to verify ownership
    const { data: rosterEntry } = await supabase
      .from('company_roster_medics')
      .select('id, company_id')
      .eq('id', rosterId)
      .single();

    if (!rosterEntry) {
      return NextResponse.json({ error: 'Roster entry not found' }, { status: 404 });
    }

    // Verify caller is company admin
    const { data: company } = await supabase
      .from('marketplace_companies')
      .select('id, admin_user_id')
      .eq('id', rosterEntry.company_id)
      .single();

    if (!company || company.admin_user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden: not company admin' }, { status: 403 });
    }

    // Build update object from validated data
    const {
      title,
      hourlyRate,
      qualifications,
      available,
      unavailableFrom,
      unavailableUntil,
      unavailableReason,
    } = parsed.data;

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (hourlyRate !== undefined) updateData.hourly_rate = hourlyRate;
    if (qualifications !== undefined) updateData.qualifications = qualifications;
    if (available !== undefined) updateData.available = available;
    if (unavailableFrom !== undefined) updateData.unavailable_from = unavailableFrom;
    if (unavailableUntil !== undefined) updateData.unavailable_until = unavailableUntil;
    if (unavailableReason !== undefined) updateData.unavailable_reason = unavailableReason;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { data: updated, error: updateError } = await supabase
      .from('company_roster_medics')
      .update(updateData)
      .eq('id', rosterId)
      .select()
      .single();

    if (updateError) {
      console.error('[Roster PATCH] Update error:', updateError);
      return NextResponse.json({ error: 'Failed to update roster entry' }, { status: 500 });
    }

    return NextResponse.json({ rosterEntry: updated });
  } catch (error) {
    console.error('[Roster PATCH] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// =============================================================================
// DELETE: Soft-remove medic from roster
// =============================================================================

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rosterId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch roster entry to verify ownership
    const { data: rosterEntry } = await supabase
      .from('company_roster_medics')
      .select('id, company_id, status')
      .eq('id', rosterId)
      .single();

    if (!rosterEntry) {
      return NextResponse.json({ error: 'Roster entry not found' }, { status: 404 });
    }

    // Verify caller is company admin
    const { data: company } = await supabase
      .from('marketplace_companies')
      .select('id, admin_user_id')
      .eq('id', rosterEntry.company_id)
      .single();

    if (!company || company.admin_user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden: not company admin' }, { status: 403 });
    }

    if (rosterEntry.status === 'inactive') {
      return NextResponse.json({ error: 'Medic is already inactive' }, { status: 400 });
    }

    // Soft-remove: set status='inactive' and left_at=now()
    const { data: updated, error: updateError } = await supabase
      .from('company_roster_medics')
      .update({
        status: 'inactive',
        left_at: new Date().toISOString(),
        available: false,
      })
      .eq('id', rosterId)
      .select()
      .single();

    if (updateError) {
      console.error('[Roster DELETE] Update error:', updateError);
      return NextResponse.json({ error: 'Failed to remove medic from roster' }, { status: 500 });
    }

    return NextResponse.json({ rosterEntry: updated });
  } catch (error) {
    console.error('[Roster DELETE] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
