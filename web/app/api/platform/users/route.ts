/**
 * GET /api/platform/users
 * Platform admin endpoint to fetch all users across all organisations.
 * Uses service-role client to bypass RLS (platform admin has no org_id).
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase service role env vars not configured');
  return createAdminClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function GET() {
  try {
    // Auth check — must be platform admin
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (user.app_metadata?.role !== 'platform_admin') {
      return NextResponse.json({ error: 'Forbidden — platform admin access required' }, { status: 403 });
    }

    const serviceClient = getServiceClient();

    // Fetch all profiles
    const { data: profiles, error: profilesError } = await serviceClient
      .from('profiles')
      .select('id, email, full_name, role, org_id, created_at')
      .order('created_at', { ascending: false });

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    // Fetch all orgs for name lookup
    const { data: orgs } = await serviceClient
      .from('organizations')
      .select('id, name');

    const orgMap = new Map((orgs || []).map((o: any) => [o.id, o.name]));

    // Fetch last_sign_in_at from auth.users
    const { data: authData } = await serviceClient.auth.admin.listUsers();
    const signInMap = new Map(
      (authData?.users || []).map((u: any) => [u.id, u.last_sign_in_at])
    );

    const users = (profiles || []).map((p: any) => ({
      id: p.id,
      email: p.email ?? '',
      full_name: p.full_name ?? null,
      role: p.role ?? 'unknown',
      is_active: true,
      org_name: p.org_id ? (orgMap.get(p.org_id) ?? null) : null,
      last_sign_in_at: signInMap.get(p.id) ?? null,
      created_at: p.created_at ?? '',
    }));

    return NextResponse.json({ users });
  } catch (e: unknown) {
    console.error('Platform users API error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
