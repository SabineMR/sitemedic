/**
 * GET /api/marketplace/notification-preferences
 * PUT /api/marketplace/notification-preferences
 *
 * Read and update notification preferences for the authenticated user.
 * Phase 38: Notifications & Alerts — Plan 04
 *
 * GET:
 *   - Returns the user's notification preferences row.
 *   - If no row exists (first visit), auto-creates with sensible defaults via upsert.
 *
 * PUT:
 *   - Validates body with Zod.
 *   - Handles PECR-compliant SMS opt-in: sets sms_opted_in_at when any SMS channel
 *     is first enabled; clears it when all SMS channels are disabled.
 *   - Upserts the preferences row and returns the updated record.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// =============================================================================
// Defaults used for auto-create on first GET
// =============================================================================

const DEFAULT_PREFERENCES = {
  email_new_events: true,
  email_quotes:     true,
  email_awards:     true,
  email_payments:   true,
  email_ratings:    true,
  email_messages:   true,
  email_disputes:   true,

  // SMS opt-in required — all default to OFF (PECR compliance)
  sms_new_events: false,
  sms_quotes:     false,
  sms_awards:     false,
  sms_payments:   false,

  // NULL = all UK events (no radius filter)
  event_alert_radius_miles: null,

  // Set when user first enables any SMS channel
  sms_phone_number:  null,
  sms_opted_in_at:   null,
};

// =============================================================================
// Zod schema for PUT body
// =============================================================================

const PutSchema = z.object({
  email_new_events: z.boolean().optional(),
  email_quotes:     z.boolean().optional(),
  email_awards:     z.boolean().optional(),
  email_payments:   z.boolean().optional(),
  email_ratings:    z.boolean().optional(),
  email_messages:   z.boolean().optional(),
  email_disputes:   z.boolean().optional(),

  sms_new_events: z.boolean().optional(),
  sms_quotes:     z.boolean().optional(),
  sms_awards:     z.boolean().optional(),
  sms_payments:   z.boolean().optional(),

  event_alert_radius_miles: z.number().int().min(1).max(500).nullable().optional(),

  sms_phone_number: z
    .string()
    .regex(/^\+447\d{9}$/, 'UK mobile number must be in +447xxxxxxxxx format')
    .nullable()
    .optional(),
});

// =============================================================================
// GET — fetch or auto-create preferences
// =============================================================================

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

    const { data: prefs, error: fetchError } = await supabase
      .from('marketplace_notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // PGRST116 = no rows returned — auto-create defaults on first visit
    if (fetchError && fetchError.code === 'PGRST116') {
      const { data: created, error: createError } = await supabase
        .from('marketplace_notification_preferences')
        .upsert(
          { user_id: user.id, ...DEFAULT_PREFERENCES },
          { onConflict: 'user_id' }
        )
        .select()
        .single();

      if (createError) {
        console.error('[NotifPrefs GET] Auto-create error:', createError);
        return NextResponse.json({ error: 'Failed to initialise preferences' }, { status: 500 });
      }

      return NextResponse.json(created);
    }

    if (fetchError) {
      console.error('[NotifPrefs GET] Fetch error:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 });
    }

    return NextResponse.json(prefs);
  } catch (error) {
    console.error('[NotifPrefs GET] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// =============================================================================
// PUT — update preferences
// =============================================================================

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Parse + validate body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = PutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: parsed.error.issues },
        { status: 422 }
      );
    }

    const updates = parsed.data;

    // -------------------------------------------------------------------------
    // PECR SMS opt-in logic
    //
    // Fetch the current row so we can compare sms_opted_in_at and existing SMS
    // channel states before deciding whether to set / clear the timestamp.
    // -------------------------------------------------------------------------

    const { data: current } = await supabase
      .from('marketplace_notification_preferences')
      .select('sms_opted_in_at, sms_new_events, sms_quotes, sms_awards, sms_payments')
      .eq('user_id', user.id)
      .single();

    // Resolve the effective SMS states after this update
    const effectiveSmsNewEvents = updates.sms_new_events  ?? current?.sms_new_events  ?? false;
    const effectiveSmsQuotes    = updates.sms_quotes       ?? current?.sms_quotes       ?? false;
    const effectiveSmsAwards    = updates.sms_awards       ?? current?.sms_awards       ?? false;
    const effectiveSmsPayments  = updates.sms_payments     ?? current?.sms_payments     ?? false;

    const anySmsEnabled = effectiveSmsNewEvents || effectiveSmsQuotes || effectiveSmsAwards || effectiveSmsPayments;
    const allSmsOff     = !anySmsEnabled;

    let smsOptedInAt: string | null | undefined = undefined; // undefined = don't touch

    if (anySmsEnabled && !current?.sms_opted_in_at) {
      // First time any SMS channel is enabled — record consent timestamp (PECR)
      smsOptedInAt = new Date().toISOString();
    } else if (allSmsOff) {
      // All SMS channels disabled — clear consent record
      smsOptedInAt = null;
    }

    // Build the upsert payload
    const payload: Record<string, unknown> = {
      user_id: user.id,
      ...updates,
    };

    if (smsOptedInAt !== undefined) {
      payload.sms_opted_in_at = smsOptedInAt;
    }

    const { data: updated, error: upsertError } = await supabase
      .from('marketplace_notification_preferences')
      .upsert(payload, { onConflict: 'user_id' })
      .select()
      .single();

    if (upsertError) {
      console.error('[NotifPrefs PUT] Upsert error:', upsertError);
      return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[NotifPrefs PUT] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
