/**
 * GET /api/marketplace/companies/[id]/profile — Company profile with aggregations
 * Phase 37: Company Accounts — Plan 01
 *
 * Returns company profile data with denormalized aggregations (roster_size,
 * average_rating, review_count, insurance_status) and a team preview of up to
 * 5 active roster medics (limited public info: name, qualification, title, available).
 *
 * Auth: any authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { CompanyProfileDisplay, TeamMemberPreview } from '@/lib/marketplace/roster-types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch company with denormalized aggregations
    const { data: company, error: companyError } = await supabase
      .from('marketplace_companies')
      .select(`
        id,
        company_name,
        company_description,
        coverage_areas,
        roster_size,
        average_rating,
        review_count,
        insurance_status,
        verification_status,
        created_at
      `)
      .eq('id', companyId)
      .single();

    if (companyError || !company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Count total events completed (awarded events with status 'completed')
    const { count: totalEventsCompleted } = await supabase
      .from('marketplace_events')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'completed')
      .in('id',
        // Events where this company won the award
        (await supabase
          .from('marketplace_quotes')
          .select('event_id')
          .eq('company_id', companyId)
          .eq('status', 'awarded')
        ).data?.map((q: any) => q.event_id) || []
      );

    // Fetch up to 5 active roster medics for team preview
    // Limited public info: name, qualification, title, available (no email/phone/private details)
    const { data: rosterMedics } = await supabase
      .from('company_roster_medics')
      .select(`
        medic_id,
        title,
        qualifications,
        available,
        medics:medic_id (
          first_name,
          last_name
        )
      `)
      .eq('company_id', companyId)
      .eq('status', 'active')
      .limit(5)
      .order('joined_at', { ascending: true });

    const teamPreview: TeamMemberPreview[] = (rosterMedics || []).map((entry: any) => {
      const medic = entry.medics;
      const name = medic
        ? `${medic.first_name || ''} ${medic.last_name || ''}`.trim()
        : 'Team Member';

      return {
        medic_id: entry.medic_id,
        name,
        qualification: entry.qualifications?.[0] || null,
        title: entry.title,
        available: entry.available,
      };
    });

    const profile: CompanyProfileDisplay = {
      id: company.id,
      company_name: company.company_name,
      company_description: company.company_description,
      coverage_areas: company.coverage_areas,
      roster_size: company.roster_size || 0,
      average_rating: company.average_rating || 0,
      review_count: company.review_count || 0,
      total_events_completed: totalEventsCompleted || 0,
      insurance_status: company.insurance_status || 'unverified',
      verification_status: company.verification_status,
      created_at: company.created_at,
      team_preview: teamPreview,
    };

    return NextResponse.json({ profile });
  } catch (error) {
    console.error('[Company Profile] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
