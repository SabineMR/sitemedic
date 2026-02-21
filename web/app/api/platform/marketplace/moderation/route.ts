import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const moderationSchema = z.object({
  targetUserId: z.string().uuid(),
  action: z.enum(['suspend', 'ban', 'reinstate']),
  reason: z.string().trim().min(12, 'Reason must be at least 12 characters').max(1000),
  context: z.record(z.string(), z.unknown()).optional(),
});

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase service role env vars not configured');
  return createAdminClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (user.app_metadata?.role !== 'platform_admin') {
      return NextResponse.json({ error: 'Forbidden - platform admin access required' }, { status: 403 });
    }

    const parsed = moderationSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.issues[0]?.message || 'Invalid payload',
        },
        { status: 400 }
      );
    }

    const { targetUserId, action, reason, context } = parsed.data;
    const serviceClient = getServiceClient();

    const { data: targetProfile, error: targetProfileError } = await serviceClient
      .from('profiles')
      .select('id, role, is_active, email, full_name')
      .eq('id', targetUserId)
      .single();

    if (targetProfileError || !targetProfile) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
    }

    const shouldActivate = action === 'reinstate';

    const { error: profileUpdateError } = await serviceClient
      .from('profiles')
      .update({ is_active: shouldActivate })
      .eq('id', targetUserId);

    if (profileUpdateError) {
      console.error('Failed to update profile active state:', profileUpdateError);
      return NextResponse.json({ error: 'Failed to update user moderation status' }, { status: 500 });
    }

    const { data: linkedCompanies, error: linkedCompaniesError } = await serviceClient
      .from('marketplace_companies')
      .select('id, company_name, can_submit_quotes')
      .eq('admin_user_id', targetUserId);

    if (linkedCompaniesError) {
      console.error('Failed to fetch linked marketplace companies:', linkedCompaniesError);
      return NextResponse.json({ error: 'Failed to apply moderation side effects' }, { status: 500 });
    }

    if ((linkedCompanies || []).length > 0) {
      const { error: companyUpdateError } = await serviceClient
        .from('marketplace_companies')
        .update({ can_submit_quotes: shouldActivate })
        .eq('admin_user_id', targetUserId);

      if (companyUpdateError) {
        console.error('Failed to update marketplace company quote permissions:', companyUpdateError);
        return NextResponse.json({ error: 'Failed to apply moderation side effects' }, { status: 500 });
      }
    }

    const auditMetadata = {
      context: context || null,
      previousIsActive: targetProfile.is_active !== false,
      linkedCompanyIds: (linkedCompanies || []).map((company) => company.id),
      linkedCompanyCount: (linkedCompanies || []).length,
      companyQuotePermission: shouldActivate,
      targetEmail: targetProfile.email,
    };

    const { error: auditInsertError } = await serviceClient
      .from('marketplace_user_moderation_audit')
      .insert({
        target_user_id: targetUserId,
        target_role: targetProfile.role,
        action,
        reason,
        metadata: auditMetadata,
        performed_by: user.id,
      });

    if (auditInsertError) {
      console.error('Failed to insert moderation audit row:', auditInsertError);
      return NextResponse.json({ error: 'Failed to persist moderation audit row' }, { status: 500 });
    }

    return NextResponse.json(
      {
        success: true,
        targetUserId,
        action,
        reason,
        target: {
          id: targetProfile.id,
          role: targetProfile.role,
          fullName: targetProfile.full_name,
          isActive: shouldActivate,
        },
        linkedCompaniesUpdated: (linkedCompanies || []).length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Platform marketplace moderation API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
