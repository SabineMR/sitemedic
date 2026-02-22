import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { resolvePassOn } from '@/lib/marketplace/attribution/service';

export const dynamic = 'force-dynamic';

const acceptSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ handoffId: string }> }
) {
  try {
    const { handoffId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = acceptSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid payload' },
        { status: 400 }
      );
    }

    const handoff = await resolvePassOn({
      supabase,
      handoffId,
      actorUserId: user.id,
      action: 'accept',
      reason: parsed.data.reason,
    });

    return NextResponse.json({ success: true, handoff }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to accept pass-on';

    if (message.includes('Only the target company') || message.includes('Only marketplace company admins')) {
      return NextResponse.json({ error: message }, { status: 403 });
    }

    if (message.includes('not found') || message.includes('not pending')) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    console.error('[Attribution Pass-On Accept] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
