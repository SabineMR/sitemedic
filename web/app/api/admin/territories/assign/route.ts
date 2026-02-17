/**
 * Territory Assignment API Endpoint
 *
 * Handles assignment of primary/secondary medics to territories.
 *
 * POST /api/admin/territories/assign
 * Body: { territory_id: string, medic_id: string, role: 'primary' | 'secondary' }
 *
 * Returns:
 * - 200 with updated territory data if successful
 * - 400 if invalid input (missing fields, invalid role)
 * - 401 if not authenticated
 * - 403 if territory doesn't belong to user's org
 * - 404 if territory or medic not found
 */

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // Parse request body
    const body = await request.json();
    const { territory_id, medic_id, role } = body;

    // Validate required fields
    if (!territory_id || !role) {
      return NextResponse.json(
        { error: 'territory_id and role are required' },
        { status: 400 }
      );
    }

    // Validate role is primary or secondary
    if (role !== 'primary' && role !== 'secondary') {
      return NextResponse.json(
        { error: 'role must be "primary" or "secondary"' },
        { status: 400 }
      );
    }

    // Create Supabase client
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch user's org_id from profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 401 }
      );
    }

    const orgId = profile.org_id;

    // Verify territory exists and belongs to user's org
    const { data: territory, error: territoryError } = await supabase
      .from('territories')
      .select('id, org_id, postcode_sector')
      .eq('id', territory_id)
      .single();

    if (territoryError || !territory) {
      return NextResponse.json(
        { error: 'Territory not found' },
        { status: 404 }
      );
    }

    if (territory.org_id !== orgId) {
      return NextResponse.json(
        { error: 'Territory does not belong to your organization' },
        { status: 403 }
      );
    }

    // If medic_id is null, this is an unassign operation
    let medicName: string | null = null;
    if (medic_id !== null && medic_id !== undefined) {
      // Verify medic exists and belongs to user's org
      const { data: medic, error: medicError } = await supabase
        .from('medics')
        .select('id, org_id, first_name, last_name')
        .eq('id', medic_id)
        .single();

      if (medicError || !medic) {
        return NextResponse.json(
          { error: 'Medic not found' },
          { status: 404 }
        );
      }

      if (medic.org_id !== orgId) {
        return NextResponse.json(
          { error: 'Medic does not belong to your organization' },
          { status: 403 }
        );
      }

      medicName = `${medic.first_name} ${medic.last_name}`;
    }

    // Update territory with new assignment (or null to unassign)
    const updateData =
      role === 'primary'
        ? { primary_medic_id: medic_id }
        : { secondary_medic_id: medic_id };

    const { data: updatedTerritory, error: updateError } = await supabase
      .from('territories')
      .update(updateData)
      .eq('id', territory_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating territory:', updateError);
      return NextResponse.json(
        { error: 'Failed to update territory assignment' },
        { status: 500 }
      );
    }

    // Return updated territory with medic name (null if unassigned)
    return NextResponse.json({
      success: true,
      territory: {
        ...updatedTerritory,
        medic_name: medicName,
      },
    });
  } catch (err) {
    console.error('Error assigning medic to territory:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
