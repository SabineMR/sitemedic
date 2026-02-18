/**
 * GET /api/admin/google-calendar-status
 *
 * Returns Google Calendar integration health for the admin settings page:
 * - Whether OAuth credentials (env vars) are configured
 * - The configured redirect URI (for admin reference)
 * - All medics in the org with their GCal connection status
 *
 * No secrets are exposed — only booleans and the redirect URI.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireOrgId } from '@/lib/organizations/org-resolver';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const orgId = await requireOrgId();

    // Check whether Google OAuth env vars are configured (boolean only — no secrets)
    const credentialsConfigured =
      !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI ?? '';

    // Fetch all medics in this org
    const { data: medics, error: medicsError } = await supabase
      .from('medics')
      .select('id, first_name, last_name')
      .eq('org_id', orgId)
      .order('last_name', { ascending: true });

    if (medicsError) {
      return NextResponse.json({ error: 'Failed to fetch medics' }, { status: 500 });
    }

    // Fetch GCal connection status from medic_preferences for all medics in one query
    const medicIds = (medics ?? []).map((m) => m.id);
    let connectedMedicIds = new Set<string>();

    if (medicIds.length > 0) {
      const { data: prefs } = await supabase
        .from('medic_preferences')
        .select('medic_id, google_calendar_enabled')
        .in('medic_id', medicIds)
        .eq('google_calendar_enabled', true);

      connectedMedicIds = new Set((prefs ?? []).map((p) => p.medic_id));
    }

    // Merge medics with their connection status
    const medicsWithStatus = (medics ?? []).map((m) => ({
      id: m.id,
      first_name: m.first_name,
      last_name: m.last_name,
      connected: connectedMedicIds.has(m.id),
    }));

    return NextResponse.json({
      credentialsConfigured,
      redirectUri,
      medics: medicsWithStatus,
    });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
