import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { initiatePassOn } from '@/lib/marketplace/attribution/service';

export const dynamic = 'force-dynamic';

const passOnSchema = z.object({
  eventId: z.string().uuid(),
  targetCompanyId: z.string().uuid(),
  reason: z.string().trim().min(8).max(500),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const parsed = passOnSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid payload' },
        { status: 400 }
      );
    }

    const handoff = await initiatePassOn({
      supabase,
      eventId: parsed.data.eventId,
      initiatedByUserId: user.id,
      targetCompanyId: parsed.data.targetCompanyId,
      reason: parsed.data.reason,
    });

    return NextResponse.json({ success: true, handoff }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to initiate pass-on';
    if (
      message.includes('Only the currently responsible company') ||
      message.includes('Only marketplace company admins') ||
      message.includes('Only the target company')
    ) {
      return NextResponse.json({ error: message }, { status: 403 });
    }

    if (message.includes('not found') || message.includes('invalid') || message.includes('must')) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    console.error('[Attribution Pass-On POST] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
