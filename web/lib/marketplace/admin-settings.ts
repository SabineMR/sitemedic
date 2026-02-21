import { createClient as createAdminClient } from '@supabase/supabase-js';
import { MARKETPLACE_DEFAULTS } from './admin-settings-defaults';

export interface MarketplaceAdminSettings {
  id: string | null;
  defaultCommissionPercent: number;
  defaultDepositPercent: number;
  defaultQuoteDeadlineHours: number;
  updatedAt: string | null;
  updatedBy: string | null;
}

export const MARKETPLACE_ADMIN_SETTINGS_DEFAULTS: MarketplaceAdminSettings = {
  id: null,
  defaultCommissionPercent: MARKETPLACE_DEFAULTS.defaultCommissionPercent,
  defaultDepositPercent: MARKETPLACE_DEFAULTS.defaultDepositPercent,
  defaultQuoteDeadlineHours: MARKETPLACE_DEFAULTS.defaultQuoteDeadlineHours,
  updatedAt: null,
  updatedBy: null,
};

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

function normalizeSettingsRow(row: Record<string, unknown> | null): MarketplaceAdminSettings {
  if (!row) {
    return MARKETPLACE_ADMIN_SETTINGS_DEFAULTS;
  }

  return {
    id: (row.id as string | null) ?? null,
    defaultCommissionPercent: Number(
      row.default_commission_percent ?? MARKETPLACE_ADMIN_SETTINGS_DEFAULTS.defaultCommissionPercent
    ),
    defaultDepositPercent: Number(
      row.default_deposit_percent ?? MARKETPLACE_ADMIN_SETTINGS_DEFAULTS.defaultDepositPercent
    ),
    defaultQuoteDeadlineHours: Number(
      row.default_quote_deadline_hours ?? MARKETPLACE_ADMIN_SETTINGS_DEFAULTS.defaultQuoteDeadlineHours
    ),
    updatedAt: (row.updated_at as string | null) ?? null,
    updatedBy: (row.updated_by as string | null) ?? null,
  };
}

export async function getMarketplaceAdminSettings(): Promise<MarketplaceAdminSettings> {
  try {
    const serviceClient = getServiceClient();
    const { data, error } = await serviceClient
      .from('marketplace_admin_settings')
      .select(
        'id, default_commission_percent, default_deposit_percent, default_quote_deadline_hours, updated_at, updated_by'
      )
      .eq('singleton_key', 'marketplace')
      .maybeSingle();

    if (error) {
      throw error;
    }

    return normalizeSettingsRow(data as Record<string, unknown> | null);
  } catch (error) {
    console.warn('Falling back to marketplace admin default settings:', error);
    return MARKETPLACE_ADMIN_SETTINGS_DEFAULTS;
  }
}

export function getCommissionSplitFromSettings(defaultCommissionPercent: number) {
  const platformFeePercent = Math.max(0, Math.min(100, Number(defaultCommissionPercent || 0)));
  return {
    platformFeePercent,
    medicPayoutPercent: 100 - platformFeePercent,
  };
}
