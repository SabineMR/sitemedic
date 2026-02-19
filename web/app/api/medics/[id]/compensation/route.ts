/**
 * PATCH /api/medics/[id]/compensation
 *
 * Update a medic's experience tier.
 * The DB trigger (trg_payout_from_experience_level) automatically
 * updates medic_payout_percent and platform_fee_percent.
 *
 * Access: org_admin only
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { requireOrgId } from '@/lib/organizations/org-resolver';
import { EXPERIENCE_TIERS, ExperienceLevel } from '@/lib/medics/experience';

const VALID_LEVELS: ExperienceLevel[] = ['junior', 'senior', 'lead'];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: medicId } = await params;
  const supabase = await createClient();

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Multi-tenant: Get current user's org_id
  const orgId = await requireOrgId();

  // Parse body
  let body: { experience_level?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const level = body.experience_level as ExperienceLevel;
  if (!VALID_LEVELS.includes(level)) {
    return NextResponse.json(
      { error: `experience_level must be one of: ${VALID_LEVELS.join(', ')}` },
      { status: 400 }
    );
  }

  // Update — trigger sets medic_payout_percent + platform_fee_percent automatically
  // IMPORTANT: Filter by org_id to prevent cross-org access
  const { data, error } = await supabase
    .from('medics')
    .update({ experience_level: level })
    .eq('id', medicId)
    .eq('org_id', orgId)
    .select('id, experience_level, medic_payout_percent, platform_fee_percent')
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to update compensation' }, { status: 500 });
  }

  const tier = EXPERIENCE_TIERS[level];

  return NextResponse.json({
    medic_id: data.id,
    experience_level: data.experience_level,
    medic_payout_percent: data.medic_payout_percent,
    platform_fee_percent: data.platform_fee_percent,
    tier_label: tier.label,
  });
}
