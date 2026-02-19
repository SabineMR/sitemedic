/**
 * Contract templates API route
 *
 * Handles CRUD operations for contract templates.
 * - GET: Fetch all templates
 * - POST: Create new template
 * - PUT: Update existing template
 * - DELETE: Archive template (soft delete)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireOrgId } from '@/lib/organizations/org-resolver';
import type { ContractTemplate, ContractClause } from '@/lib/contracts/types';

/**
 * GET /api/contracts/templates
 * Fetch all active templates for the current org
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Multi-tenant: Get current user's org_id
    const orgId = await requireOrgId();

    // IMPORTANT: Filter by org_id to prevent cross-org access
    const { data, error } = await supabase
      .from('contract_templates')
      .select('*')
      .eq('status', 'active')
      .eq('org_id', orgId)
      .order('is_default', { ascending: false })
      .order('name', { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json({ templates: data });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/contracts/templates
 * Create new template
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check auth
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Multi-tenant: Get current user's org_id
    const orgId = await requireOrgId();

    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.terms_and_conditions || !body.cancellation_policy) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // If setting as default, unset other defaults first
    // IMPORTANT: Filter by org_id to prevent cross-org access
    if (body.is_default) {
      await supabase
        .from('contract_templates')
        .update({ is_default: false })
        .eq('is_default', true)
        .eq('org_id', orgId);
    }

    // Create template
    const { data, error } = await supabase
      .from('contract_templates')
      .insert({
        org_id: orgId,
        name: body.name,
        description: body.description || null,
        clauses: body.clauses || [],
        terms_and_conditions: body.terms_and_conditions,
        cancellation_policy: body.cancellation_policy,
        is_default: body.is_default || false,
        version: 1,
        status: 'active',
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ template: data });
  } catch (error) {
    console.error('Error creating template:', error);
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/contracts/templates
 * Update existing template
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check auth
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Multi-tenant: Get current user's org_id
    const orgId = await requireOrgId();

    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { error: 'Template ID required' },
        { status: 400 }
      );
    }

    // If setting as default, unset other defaults first
    // IMPORTANT: Filter by org_id to prevent cross-org access
    if (body.is_default) {
      await supabase
        .from('contract_templates')
        .update({ is_default: false })
        .eq('is_default', true)
        .eq('org_id', orgId)
        .neq('id', body.id);
    }

    // Fetch current template to increment version
    // IMPORTANT: Filter by org_id to prevent cross-org access
    const { data: current } = await supabase
      .from('contract_templates')
      .select('version')
      .eq('id', body.id)
      .eq('org_id', orgId)
      .single();

    // Update template
    const updateData: Partial<ContractTemplate> = {
      updated_at: new Date().toISOString(),
    };

    if (body.name) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.clauses) updateData.clauses = body.clauses;
    if (body.terms_and_conditions)
      updateData.terms_and_conditions = body.terms_and_conditions;
    if (body.cancellation_policy)
      updateData.cancellation_policy = body.cancellation_policy;
    if (body.is_default !== undefined) updateData.is_default = body.is_default;

    // Increment version if content changed
    if (
      body.clauses ||
      body.terms_and_conditions ||
      body.cancellation_policy
    ) {
      updateData.version = (current?.version || 1) + 1;
    }

    // IMPORTANT: Filter by org_id to prevent cross-org access
    const { data, error } = await supabase
      .from('contract_templates')
      .update(updateData)
      .eq('id', body.id)
      .eq('org_id', orgId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ template: data });
  } catch (error) {
    console.error('Error updating template:', error);
    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/contracts/templates
 * Archive template (soft delete)
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check auth
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Multi-tenant: Get current user's org_id
    const orgId = await requireOrgId();

    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { error: 'Template ID required' },
        { status: 400 }
      );
    }

    // Archive template (soft delete)
    // IMPORTANT: Filter by org_id to prevent cross-org access
    const { error } = await supabase
      .from('contract_templates')
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .eq('id', body.id)
      .eq('org_id', orgId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error archiving template:', error);
    return NextResponse.json(
      { error: 'Failed to archive template' },
      { status: 500 }
    );
  }
}
