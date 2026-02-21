import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import {
  getMarketplaceAdminSettings,
  getCommissionSplitFromSettings,
} from '@/lib/marketplace/admin-settings';

export const dynamic = 'force-dynamic';

const updateSettingsSchema = z.object({
  defaultCommissionPercent: z.number().min(0).max(100),
  defaultDepositPercent: z.number().int().min(1).max(100),
  defaultQuoteDeadlineHours: z.number().int().min(1).max(720),
  reason: z.string().trim().min(8, 'Reason must be at least 8 characters').max(500),
});

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Supabase service role env vars not configured');
  }

  return createAdminClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function requirePlatformAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { error: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) };
  }

  if (user.app_metadata?.role !== 'platform_admin') {
    return {
      error: NextResponse.json({ error: 'Forbidden - platform admin access required' }, { status: 403 }),
    };
  }

  return { user };
}

export async function GET() {
  try {
    const auth = await requirePlatformAdmin();
    if (auth.error) return auth.error;

    const serviceClient = getServiceClient();
    const settings = await getMarketplaceAdminSettings();

    let auditRows: Array<Record<string, unknown>> = [];
    if (settings.id) {
      const { data, error } = await serviceClient
        .from('marketplace_admin_settings_audit')
        .select('id, before_values, after_values, reason, changed_by, changed_at')
        .eq('settings_id', settings.id)
        .order('changed_at', { ascending: false })
        .limit(20);

      if (error) {
        throw error;
      }

      auditRows = (data as Array<Record<string, unknown>>) || [];
    }

    const changedByIds = Array.from(
      new Set(auditRows.map((row) => row.changed_by as string).filter(Boolean))
    );

    const profileMap = new Map<string, { full_name: string | null; email: string | null }>();
    if (changedByIds.length > 0) {
      const { data: profiles, error: profilesError } = await serviceClient
        .from('profiles')
        .select('id, full_name, email')
        .in('id', changedByIds);

      if (profilesError) {
        throw profilesError;
      }

      for (const profile of profiles || []) {
        profileMap.set(profile.id, {
          full_name: profile.full_name,
          email: profile.email,
        });
      }
    }

    const commissionSplit = getCommissionSplitFromSettings(settings.defaultCommissionPercent);

    return NextResponse.json(
      {
        settings: {
          ...settings,
          commissionSplit,
        },
        audit: auditRows.map((row) => {
          const changedBy = row.changed_by as string;
          return {
            id: row.id,
            reason: row.reason,
            changedAt: row.changed_at,
            changedBy,
            actor: {
              id: changedBy,
              fullName: profileMap.get(changedBy)?.full_name || null,
              email: profileMap.get(changedBy)?.email || null,
            },
            beforeValues: row.before_values,
            afterValues: row.after_values,
          };
        }),
      },
      {
        status: 200,
        headers: { 'Cache-Control': 'no-store' },
      }
    );
  } catch (error) {
    console.error('Platform marketplace settings GET API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await requirePlatformAdmin();
    if (auth.error) return auth.error;

    const parsed = updateSettingsSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.issues[0]?.message || 'Invalid payload',
        },
        { status: 400 }
      );
    }

    const serviceClient = getServiceClient();
    const current = await getMarketplaceAdminSettings();
    const currentSettingsId = current.id;

    const beforeValues = {
      defaultCommissionPercent: current.defaultCommissionPercent,
      defaultDepositPercent: current.defaultDepositPercent,
      defaultQuoteDeadlineHours: current.defaultQuoteDeadlineHours,
    };

    const afterValues = {
      defaultCommissionPercent: parsed.data.defaultCommissionPercent,
      defaultDepositPercent: parsed.data.defaultDepositPercent,
      defaultQuoteDeadlineHours: parsed.data.defaultQuoteDeadlineHours,
    };

    const hasChanges =
      beforeValues.defaultCommissionPercent !== afterValues.defaultCommissionPercent ||
      beforeValues.defaultDepositPercent !== afterValues.defaultDepositPercent ||
      beforeValues.defaultQuoteDeadlineHours !== afterValues.defaultQuoteDeadlineHours;

    if (!hasChanges) {
      return NextResponse.json({ error: 'No settings changed' }, { status: 400 });
    }

    const updatedAt = new Date().toISOString();

    let settingsId = currentSettingsId;

    if (settingsId) {
      const { error: updateError } = await serviceClient
        .from('marketplace_admin_settings')
        .update({
          default_commission_percent: parsed.data.defaultCommissionPercent,
          default_deposit_percent: parsed.data.defaultDepositPercent,
          default_quote_deadline_hours: parsed.data.defaultQuoteDeadlineHours,
          updated_by: auth.user.id,
          updated_at: updatedAt,
        })
        .eq('id', settingsId);

      if (updateError) {
        throw updateError;
      }
    } else {
      const { data: insertedSettings, error: insertError } = await serviceClient
        .from('marketplace_admin_settings')
        .insert({
          singleton_key: 'marketplace',
          default_commission_percent: parsed.data.defaultCommissionPercent,
          default_deposit_percent: parsed.data.defaultDepositPercent,
          default_quote_deadline_hours: parsed.data.defaultQuoteDeadlineHours,
          updated_by: auth.user.id,
          updated_at: updatedAt,
        })
        .select('id')
        .single();

      if (insertError || !insertedSettings) {
        throw insertError || new Error('Failed to create marketplace settings row');
      }

      settingsId = insertedSettings.id;
    }

    const { error: auditError } = await serviceClient.from('marketplace_admin_settings_audit').insert({
      settings_id: settingsId,
      before_values: currentSettingsId
        ? beforeValues
        : {
            defaultCommissionPercent: beforeValues.defaultCommissionPercent,
            defaultDepositPercent: beforeValues.defaultDepositPercent,
            defaultQuoteDeadlineHours: beforeValues.defaultQuoteDeadlineHours,
          },
      after_values: afterValues,
      reason: parsed.data.reason,
      changed_by: auth.user.id,
    });

    if (auditError) {
      throw auditError;
    }

    const latest = await getMarketplaceAdminSettings();

    return NextResponse.json(
      {
        success: true,
        settings: {
          ...latest,
          commissionSplit: getCommissionSplitFromSettings(latest.defaultCommissionPercent),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Platform marketplace settings PUT API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
