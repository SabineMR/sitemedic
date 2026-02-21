import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

type WindowParam = '7' | '30' | '90' | 'all';

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

function parseWindow(rawValue: string | null): WindowParam {
  if (rawValue === '7' || rawValue === '30' || rawValue === '90' || rawValue === 'all') {
    return rawValue;
  }
  return '30';
}

function windowToDays(windowValue: WindowParam): number | null {
  if (windowValue === 'all') return null;
  return Number(windowValue);
}

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const requestedWindow = parseWindow(searchParams.get('window'));
    const windowDays = windowToDays(requestedWindow);

    const serviceClient = getServiceClient();
    const { data, error } = await serviceClient.rpc('get_marketplace_admin_metrics', {
      window_days: windowDays,
    });

    if (error) {
      console.error('Platform marketplace metrics RPC failed:', error);
      return NextResponse.json({ error: 'Failed to fetch marketplace metrics' }, { status: 500 });
    }

    const row = Array.isArray(data) ? data[0] : data;

    return NextResponse.json(
      {
        window: requestedWindow,
        metrics: {
          totalEventsPosted: Number(row?.total_events_posted ?? 0),
          totalQuotesSubmitted: Number(row?.total_quotes_submitted ?? 0),
          awardedEventsCount: Number(row?.awarded_events_count ?? 0),
          conversionRatePercent: Number(row?.conversion_rate_percent ?? 0),
          marketplaceRevenueGbp: Number(row?.marketplace_revenue_gbp ?? 0),
          openDisputesCount: Number(row?.open_disputes_count ?? 0),
        },
      },
      {
        status: 200,
        headers: { 'Cache-Control': 'no-store' },
      }
    );
  } catch (error) {
    console.error('Platform marketplace metrics API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
