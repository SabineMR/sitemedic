/**
 * POST /api/messages/conversations
 *
 * Create a new direct conversation or return the existing one.
 * Handles both admin (picks medic) and medic (auto-resolves self) flows.
 *
 * Duplicate prevention: SELECT-then-INSERT with unique constraint catch
 * for the race condition where two requests try to create the same
 * conversation simultaneously.
 *
 * Phase 41: Web Messaging Core
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireOrgId } from '@/lib/organizations/org-resolver';

export const dynamic = 'force-dynamic';

interface CreateConversationBody {
  medicId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // 2. Get org_id (enforces org membership)
    const orgId = await requireOrgId();

    // 3. Get user role from app_metadata
    const role = user.app_metadata?.role as string | undefined;

    // 4. Parse request body
    const body: CreateConversationBody = await request.json();

    // 5. Resolve the medic_id based on role
    let resolvedMedicId: string;

    if (role === 'medic') {
      // Medic flow: look up the medic record for this user
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
    } else if (role === 'org_admin') {
      // Admin flow: medicId is required from the request body
      if (!body.medicId) {
        return NextResponse.json(
          { error: 'medicId is required for admin users' },
          { status: 400 }
        );
      }

      // Validate the medic belongs to this org
      const { data: medicRecord, error: medicError } = await supabase
        .from('medics')
        .select('id')
        .eq('id', body.medicId)
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
      return NextResponse.json(
        { error: 'Unsupported role for conversation creation' },
        { status: 403 }
      );
    }

    // 6. Try to find an existing conversation first
    const { data: existing, error: selectError } = await supabase
      .from('conversations')
      .select('id')
      .eq('org_id', orgId)
      .eq('medic_id', resolvedMedicId)
      .eq('type', 'direct')
      .maybeSingle();

    if (selectError) {
      console.error('Error checking existing conversation:', selectError);
      return NextResponse.json(
        { error: 'Failed to check existing conversations' },
        { status: 500 }
      );
    }

    // 7a. If found, return existing conversation
    if (existing) {
      return NextResponse.json(
        { conversationId: existing.id, created: false },
        { status: 200 }
      );
    }

    // 7b. Not found — INSERT new conversation
    const { data: newConversation, error: insertError } = await supabase
      .from('conversations')
      .insert({
        org_id: orgId,
        type: 'direct',
        medic_id: resolvedMedicId,
        created_by: user.id,
      })
      .select('id')
      .single();

    if (insertError) {
      // 7c. Handle race condition: unique constraint violation (code 23505)
      // Another request created the conversation between our SELECT and INSERT
      if (insertError.code === '23505') {
        const { data: raceExisting, error: raceError } = await supabase
          .from('conversations')
          .select('id')
          .eq('org_id', orgId)
          .eq('medic_id', resolvedMedicId)
          .eq('type', 'direct')
          .maybeSingle();

        if (raceError || !raceExisting) {
          console.error('Error recovering from race condition:', raceError);
          return NextResponse.json(
            { error: 'Failed to create conversation' },
            { status: 500 }
          );
        }

        return NextResponse.json(
          { conversationId: raceExisting.id, created: false },
          { status: 200 }
        );
      }

      console.error('Error creating conversation:', insertError);
      return NextResponse.json(
        { error: 'Failed to create conversation' },
        { status: 500 }
      );
    }

    // 7d. Successfully created — return 201
    return NextResponse.json(
      { conversationId: newConversation.id, created: true },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST /api/messages/conversations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
