/**
 * GET /api/documents
 * Phase 45-01: List documents for a medic
 *
 * If medicId query param provided (admin viewing medic's docs), uses that.
 * Otherwise resolves medic from current user's medic record.
 *
 * Returns documents with current version and category info.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireOrgId } from '@/lib/organizations/org-resolver';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = await requireOrgId();

    // Resolve medic ID
    const { searchParams } = new URL(request.url);
    const queryMedicId = searchParams.get('medicId');
    let resolvedMedicId: string;

    if (queryMedicId) {
      // Admin viewing another medic's documents — verify admin role
      const role = user.app_metadata?.role as string | undefined;
      if (role !== 'org_admin' && role !== 'platform_admin') {
        return NextResponse.json(
          { error: 'Only admins can view other medics\' documents' },
          { status: 403 }
        );
      }

      // Verify medic belongs to org
      const { data: medicRecord, error: medicError } = await supabase
        .from('medics')
        .select('id')
        .eq('id', queryMedicId)
        .eq('org_id', orgId)
        .single();

      if (medicError || !medicRecord) {
        return NextResponse.json(
          { error: 'Medic not found in your organisation' },
          { status: 404 }
        );
      }

      resolvedMedicId = medicRecord.id;
    } else {
      // Current user is a medic viewing own documents
      const { data: medicRecord, error: medicError } = await supabase
        .from('medics')
        .select('id')
        .eq('user_id', user.id)
        .eq('org_id', orgId)
        .single();

      if (medicError || !medicRecord) {
        return NextResponse.json(
          { error: 'Medic record not found for current user' },
          { status: 404 }
        );
      }

      resolvedMedicId = medicRecord.id;
    }

    // Fetch documents with current version and category info
    const { data: documents, error: docError } = await supabase
      .from('documents')
      .select(`
        *,
        document_categories!documents_category_id_fkey (
          name,
          slug,
          is_required
        )
      `)
      .eq('medic_id', resolvedMedicId)
      .eq('org_id', orgId)
      .neq('status', 'archived')
      .order('created_at', { ascending: false });

    if (docError) {
      console.error('Error fetching documents:', docError);
      return NextResponse.json(
        { error: 'Failed to fetch documents' },
        { status: 500 }
      );
    }

    // For each document with a current_version_id, fetch the version
    const docsWithVersions = await Promise.all(
      (documents || []).map(async (doc) => {
        let currentVersion = null;
        if (doc.current_version_id) {
          const { data: version } = await supabase
            .from('document_versions')
            .select('*')
            .eq('id', doc.current_version_id)
            .single();
          currentVersion = version;
        }

        const category = doc.document_categories as unknown as {
          name: string;
          slug: string;
          is_required: boolean;
        } | null;

        return {
          ...doc,
          document_categories: undefined,
          category_name: category?.name ?? 'Unknown',
          category_slug: category?.slug ?? 'unknown',
          current_version: currentVersion,
        };
      })
    );

    return NextResponse.json(docsWithVersions);
  } catch (err) {
    console.error('GET /api/documents error:', err);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
