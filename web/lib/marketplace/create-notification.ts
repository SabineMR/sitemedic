/**
 * Fire-and-Forget Notification Creator
 * Phase 38: Notifications & Alerts — Plan 01
 *
 * Writes rows to user_notifications using the service-role Supabase client.
 * Must use service-role (NOT anon-key cookie client) because:
 *   1. The 'service_role_insert_notifications' RLS policy grants INSERT to service-role.
 *   2. Fan-out (Plan 03) inserts notifications for OTHER users — the anon-key client
 *      would be denied by RLS since user_id != auth.uid() for those rows.
 *
 * All functions are fire-and-forget: errors are logged, never thrown.
 * Notification failure must NEVER block the primary API response.
 *
 * Pattern: matches web/lib/email/send-welcome.ts (service-role client setup)
 */

import { createClient } from '@supabase/supabase-js';
import type { NotificationType } from './notification-types';

// =============================================================================
// Types
// =============================================================================

export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

// =============================================================================
// Internal: build service-role client
// =============================================================================

function getServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error(
      '[Notifications] Supabase service role env vars not configured — ' +
      'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required'
    );
    return null;
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// =============================================================================
// createNotification — single notification
// =============================================================================

export async function createNotification(
  params: CreateNotificationParams
): Promise<void> {
  const supabase = getServiceRoleClient();
  if (!supabase) return;

  try {
    const { error } = await supabase.from('user_notifications').insert({
      user_id:  params.userId,
      type:     params.type,
      title:    params.title,
      body:     params.body,
      link:     params.link ?? null,
      metadata: params.metadata ?? {},
    });

    if (error) {
      console.error('[Notifications] Failed to insert notification:', error);
    }
  } catch (error) {
    console.error('[Notifications] Unexpected error creating notification:', error);
  }
}

// =============================================================================
// createBulkNotifications — fan-out to multiple users in a single INSERT
// =============================================================================

export async function createBulkNotifications(
  notifications: CreateNotificationParams[]
): Promise<void> {
  if (!notifications.length) return;

  const supabase = getServiceRoleClient();
  if (!supabase) return;

  try {
    const rows = notifications.map((n) => ({
      user_id:  n.userId,
      type:     n.type,
      title:    n.title,
      body:     n.body,
      link:     n.link ?? null,
      metadata: n.metadata ?? {},
    }));

    const { error } = await supabase.from('user_notifications').insert(rows);

    if (error) {
      console.error('[Notifications] Failed to bulk insert notifications:', error);
    }
  } catch (error) {
    console.error('[Notifications] Unexpected error in bulk notification insert:', error);
  }
}
