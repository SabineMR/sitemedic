/**
 * GET /api/direct-jobs/clients — List clients for the current user's company
 *
 * Phase 34.1: Self-Procured Jobs — Plan 02
 *
 * Returns a list of direct_clients belonging to the user's marketplace company.
 * Used by the ClientDetailsStep dropdown to select existing clients.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get user's marketplace company
    const { data: company, error: companyError } = await supabase
      .from('marketplace_companies')
      .select('id')
      .eq('admin_user_id', user.id)
      .single();

    if (companyError || !company) {
      return NextResponse.json({ clients: [] });
    }

    // Fetch all clients for this company
    const { data: clients, error: clientsError } = await supabase
      .from('direct_clients')
      .select('id, client_name, contact_name, contact_email, contact_phone, address_line_1, address_line_2, city, postcode')
      .eq('company_id', company.id)
      .order('client_name', { ascending: true });

    if (clientsError) {
      console.error('[Direct Jobs Clients GET] Query error:', clientsError);
      return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
    }

    return NextResponse.json({ clients: clients || [] });
  } catch (error) {
    console.error('[Direct Jobs Clients GET] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
