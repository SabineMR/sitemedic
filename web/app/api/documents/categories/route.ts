/**
 * GET/POST /api/documents/categories
 * Phase 45-01: List document categories and create custom ones
 *
 * GET: Returns all active document categories for the user's org
 * POST: Creates a custom category (org_admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireOrgId } from '@/lib/organizations/org-resolver';

export const dynamic = 'force-dynamic';

export async function GET() {
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

    const { data: categories, error } = await supabase
      .from('document_categories')
      .select('*')
      .eq('org_id', orgId)
      .eq('is_active', true)
      .order('sort_order');

    if (error) {
      console.error('Error fetching categories:', error);
      return NextResponse.json(
        { error: 'Failed to fetch categories' },
        { status: 500 }
      );
    }

    return NextResponse.json(categories);
  } catch (err) {
    console.error('GET /api/documents/categories error:', err);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
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

    // Only org_admin can create categories
    const role = user.app_metadata?.role as string | undefined;
    if (role !== 'org_admin' && role !== 'platform_admin') {
      return NextResponse.json(
        { error: 'Only admins can create categories' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name } = body as { name?: string };

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'name is required' },
        { status: 400 }
      );
    }

    // Generate slug from name
    const slug = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Get next sort_order
    const { data: maxOrder } = await supabase
      .from('document_categories')
      .select('sort_order')
      .eq('org_id', orgId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    const nextOrder = (maxOrder?.sort_order ?? 0) + 1;

    const { data: category, error: insertError } = await supabase
      .from('document_categories')
      .insert({
        org_id: orgId,
        name: name.trim(),
        slug,
        is_required: false,
        is_active: true,
        sort_order: nextOrder,
      })
      .select()
      .single();

    if (insertError) {
      // Duplicate slug
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'A category with this name already exists' },
          { status: 409 }
        );
      }
      console.error('Error creating category:', insertError);
      return NextResponse.json(
        { error: 'Failed to create category' },
        { status: 500 }
      );
    }

    return NextResponse.json(category, { status: 201 });
  } catch (err) {
    console.error('POST /api/documents/categories error:', err);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
