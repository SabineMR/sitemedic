/**
 * POST /api/marketplace/client-register
 * Phase 32: Marketplace Client Registration
 *
 * Lightweight endpoint that toggles marketplace_enabled=true on the
 * authenticated user's client record. No body needed.
 *
 * Per CONTEXT decision: "keep it lightweight for low friction; collect
 * billing/company details later when they actually award a job and need to pay."
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase service role env vars not configured');
  return createAdminClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST() {
  try {
    // 1. Authenticate the user
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const serviceClient = getServiceClient();
    const orgId = user.app_metadata?.org_id;

    // 2. Look up the user's client record
    // Clients can be linked by org_id (company clients) or by a direct user relationship
    let clientQuery = serviceClient
      .from('clients')
      .select('id, marketplace_enabled');

    if (orgId) {
      clientQuery = clientQuery.eq('org_id', orgId);
    }

    const { data: clients, error: clientError } = await clientQuery;

    if (clientError) {
      console.error('[Client Register] Error querying clients:', clientError);
      return NextResponse.json(
        { error: 'Failed to look up client record' },
        { status: 500 }
      );
    }

    if (!clients || clients.length === 0) {
      return NextResponse.json(
        { error: 'No client account found. Please sign up first.' },
        { status: 404 }
      );
    }

    const client = clients[0];

    // 3. Check if already enabled
    if (client.marketplace_enabled) {
      return NextResponse.json({
        success: true,
        message: 'Marketplace access already enabled',
        alreadyEnabled: true,
      });
    }

    // 4. Toggle marketplace_enabled
    const { error: updateError } = await serviceClient
      .from('clients')
      .update({ marketplace_enabled: true })
      .eq('id', client.id);

    if (updateError) {
      console.error('[Client Register] Error updating client:', updateError);
      return NextResponse.json(
        { error: 'Failed to enable marketplace access' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Marketplace access enabled',
    });
  } catch (error) {
    console.error('[Client Register] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
