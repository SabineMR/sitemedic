/**
 * GET /api/admin/subscription
 * Returns the org's subscription tier and status from the organizations table.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireOrgId } from '@/lib/organizations/org-resolver';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const orgId = await requireOrgId();

    const { data, error } = await supabase
      .from('organizations')
      .select('subscription_tier, subscription_status, stripe_customer_id, stripe_subscription_id')
      .eq('id', orgId)
      .single();

    if (error || !data) {
      return NextResponse.json({
        subscription_tier: 'starter',
        subscription_status: 'active',
        stripe_customer_id: null,
        stripe_subscription_id: null,
      });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
