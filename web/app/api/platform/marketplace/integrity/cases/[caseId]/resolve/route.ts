import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const resolveSchema = z.object({
  outcome: z.enum(['resolved_dismissed', 'resolved_confirmed']),
  note: z.string().trim().min(8).max(1000),
  releaseHold: z.boolean().optional(),
});

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase service role env vars not configured');
  return createAdminClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { caseId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (user.app_metadata?.role !== 'platform_admin') {
      return NextResponse.json({ error: 'Forbidden - platform admin access required' }, { status: 403 });
    }

    const parsed = resolveSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid payload' },
        { status: 400 }
      );
    }

    const serviceClient = getServiceClient();

    const { data: integrityCase, error: caseError } = await serviceClient
      .from('marketplace_integrity_cases')
      .select('id, event_id, status, payout_hold_applied')
      .eq('id', caseId)
      .maybeSingle();

    if (caseError) throw caseError;
    if (!integrityCase) {
      return NextResponse.json({ error: 'Integrity case not found' }, { status: 404 });
    }

    if (integrityCase.status.startsWith('resolved_')) {
      return NextResponse.json({ error: 'Integrity case already resolved' }, { status: 400 });
    }

    const shouldReleaseHold =
      parsed.data.releaseHold === true || parsed.data.outcome === 'resolved_dismissed';

    const { error: updateCaseError } = await serviceClient
      .from('marketplace_integrity_cases')
      .update({
        status: parsed.data.outcome,
        resolution_notes: parsed.data.note,
        resolved_by: user.id,
        closed_at: new Date().toISOString(),
        payout_hold_applied: shouldReleaseHold ? false : integrityCase.payout_hold_applied,
      })
      .eq('id', caseId);

    if (updateCaseError) throw updateCaseError;

    if (shouldReleaseHold) {
      const { error: holdReleaseError } = await serviceClient
        .from('bookings')
        .update({
          remainder_hold: false,
          remainder_hold_reason: null,
        })
        .eq('marketplace_event_id', integrityCase.event_id);

      if (holdReleaseError) throw holdReleaseError;
    }

    const { error: caseEventError } = await serviceClient
      .from('marketplace_integrity_case_events')
      .insert({
        case_id: caseId,
        event_id: integrityCase.event_id,
        event_type: 'resolved',
        actor_user_id: user.id,
        details: {
          outcome: parsed.data.outcome,
          note: parsed.data.note,
          releaseHold: shouldReleaseHold,
        },
      });

    if (caseEventError) throw caseEventError;

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (apiError) {
    console.error('[Platform Integrity Case Resolve] Unexpected error:', apiError);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
