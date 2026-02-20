/**
 * GET /api/marketplace/roster — List roster medics for a company
 * POST /api/marketplace/roster — Direct add medic to roster
 * Phase 37: Company Accounts — Plan 01
 *
 * GET: Returns roster medics with joined medic name/email.
 *   Query params: companyId (required), status (default: 'active')
 *   Auth: company admin or platform admin
 *
 * POST: Directly adds a medic to the company roster.
 *   Body: { companyId, medicId, title?, qualifications?, hourlyRate? }
 *   Auth: company admin
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rosterAddSchema } from '@/lib/marketplace/roster-schemas';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// =============================================================================
// GET: List roster medics
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get('companyId');
    const statusFilter = searchParams.get('status') || 'active';

    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 });
    }

    // Verify caller is company admin or platform admin
    const { data: company } = await supabase
      .from('marketplace_companies')
      .select('id, admin_user_id')
      .eq('id', companyId)
      .single();

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Check if platform admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isPlatformAdmin = profile?.role === 'platform_admin';

    if (company.admin_user_id !== user.id && !isPlatformAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch roster medics with joined medic details
    const { data: rosterMedics, error: rosterError } = await supabase
      .from('company_roster_medics')
      .select(`
        *,
        medics:medic_id (
          first_name,
          last_name,
          email
        )
      `)
      .eq('company_id', companyId)
      .eq('status', statusFilter)
      .order('joined_at', { ascending: false });

    if (rosterError) {
      console.error('[Roster GET] Fetch error:', rosterError);
      return NextResponse.json({ error: 'Failed to fetch roster' }, { status: 500 });
    }

    // Transform to include medic_name and medic_email at top level
    const rosterWithDetails = (rosterMedics || []).map((entry: any) => {
      const medic = entry.medics;
      return {
        ...entry,
        medics: undefined,
        medic_name: medic
          ? `${medic.first_name || ''} ${medic.last_name || ''}`.trim()
          : entry.invitation_email || null,
        medic_email: medic?.email || entry.invitation_email || null,
      };
    });

    return NextResponse.json({ roster: rosterWithDetails });
  } catch (error) {
    console.error('[Roster GET] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// =============================================================================
// POST: Direct add medic to roster
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
    const parsed = rosterAddSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { companyId, medicId, title, qualifications, hourlyRate } = parsed.data;

    // Verify caller is company admin
    const { data: company } = await supabase
      .from('marketplace_companies')
      .select('id, admin_user_id')
      .eq('id', companyId)
      .single();

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    if (company.admin_user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden: not company admin' }, { status: 403 });
    }

    // Verify medic exists
    const { data: medic } = await supabase
      .from('medics')
      .select('id')
      .eq('id', medicId)
      .single();

    if (!medic) {
      return NextResponse.json({ error: 'Medic not found' }, { status: 404 });
    }

    // Insert roster entry
    const { data: rosterEntry, error: insertError } = await supabase
      .from('company_roster_medics')
      .insert({
        company_id: companyId,
        medic_id: medicId,
        status: 'active',
        title: title || null,
        qualifications: qualifications || null,
        hourly_rate: hourlyRate || null,
        added_by: user.id,
        joined_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      // Handle unique constraint violation (medic already in roster)
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'Medic is already on this company roster' },
          { status: 409 }
        );
      }
      console.error('[Roster POST] Insert error:', insertError);
      return NextResponse.json({ error: 'Failed to add medic to roster' }, { status: 500 });
    }

    return NextResponse.json({ rosterEntry }, { status: 201 });
  } catch (error) {
    console.error('[Roster POST] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
