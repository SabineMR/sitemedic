import { createClient as createAdminClient } from '@supabase/supabase-js';
import { MARKETPLACE_DEFAULTS } from './admin-settings-defaults';

export interface MarketplaceAdminSettings {
  defaultCommissionPercent: number;
  defaultDepositPercent: number;
  defaultQuoteDeadlineHours: number;
}

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

export async function getMarketplaceAdminSettings(): Promise<MarketplaceAdminSettings> {
  try {
    const serviceClient = getServiceClient();
    const { data, error } = await serviceClient
      .from('marketplace_admin_settings')
      .select('default_commission_percent, default_deposit_percent, default_quote_deadline_hours')
      .eq('singleton_key', 'marketplace')
      .maybeSingle();

    if (error || !data) {
      throw error || new Error('No marketplace settings row found');
    }

    return {
      defaultCommissionPercent: Number(
        data.default_commission_percent ?? MARKETPLACE_DEFAULTS.defaultCommissionPercent
      ),
      defaultDepositPercent: Number(
        data.default_deposit_percent ?? MARKETPLACE_DEFAULTS.defaultDepositPercent
      ),
      defaultQuoteDeadlineHours: Number(
        data.default_quote_deadline_hours ?? MARKETPLACE_DEFAULTS.defaultQuoteDeadlineHours
      ),
    };
  } catch (error) {
    console.warn('Falling back to marketplace defaults in web-marketplace:', error);
    return {
      defaultCommissionPercent: MARKETPLACE_DEFAULTS.defaultCommissionPercent,
      defaultDepositPercent: MARKETPLACE_DEFAULTS.defaultDepositPercent,
      defaultQuoteDeadlineHours: MARKETPLACE_DEFAULTS.defaultQuoteDeadlineHours,
    };
  }
}

export function getCommissionSplitFromSettings(defaultCommissionPercent: number) {
  const platformFeePercent = Math.max(0, Math.min(100, Number(defaultCommissionPercent || 0)));
  return {
    platformFeePercent,
    medicPayoutPercent: 100 - platformFeePercent,
  };
}
