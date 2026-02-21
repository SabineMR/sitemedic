import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getMarketplaceAdminSettings } from '@/lib/marketplace/admin-settings';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const settings = await getMarketplaceAdminSettings();

    return NextResponse.json(
      {
        defaults: {
          defaultCommissionPercent: settings.defaultCommissionPercent,
          defaultDepositPercent: settings.defaultDepositPercent,
          defaultQuoteDeadlineHours: settings.defaultQuoteDeadlineHours,
        },
      },
      {
        status: 200,
        headers: { 'Cache-Control': 'no-store' },
      }
    );
  } catch (apiError) {
    console.error('Marketplace settings defaults API error:', apiError);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
