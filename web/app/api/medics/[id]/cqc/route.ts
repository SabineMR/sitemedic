/**
 * PATCH /api/medics/[id]/cqc
 *
 * Updates a medic's CQC registration number.
 * Accessible by org admins only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireOrgId } from '@/lib/organizations/org-resolver';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: medicId } = await params;
    const supabase = await createClient();
    const orgId = await requireOrgId();

    let body: { cqc_registration_number?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const cqcNumber = body.cqc_registration_number;

    // Allow null/empty string to clear the number
    if (cqcNumber !== null && cqcNumber !== undefined && cqcNumber !== '') {
      if (typeof cqcNumber !== 'string') {
        return NextResponse.json(
          { error: 'cqc_registration_number must be a string' },
          { status: 400 }
        );
      }
      // CQC provider IDs are typically 1-XXXXXXXXXX format — allow any non-empty string
      if (cqcNumber.trim().length === 0) {
        return NextResponse.json(
          { error: 'cqc_registration_number cannot be blank' },
          { status: 400 }
        );
      }
    }

    // Ensure medic belongs to this org
    const { data: medic, error: fetchError } = await supabase
      .from('medics')
      .select('id')
      .eq('id', medicId)
      .eq('org_id', orgId)
      .single();

    if (fetchError || !medic) {
      return NextResponse.json({ error: 'Medic not found' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('medics')
      .update({
        cqc_registration_number: cqcNumber === '' ? null : (cqcNumber as string | null),
        updated_at: new Date().toISOString(),
      })
      .eq('id', medicId)
      .select('id, cqc_registration_number')
      .single();

    if (error) {
      console.error('Error updating CQC number:', error);
      return NextResponse.json({ error: 'Failed to update CQC number' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
