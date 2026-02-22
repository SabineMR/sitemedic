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

async function logDeliveryAttempt(
  supabase: any,
  input: {
    recipientUserId?: string;
    notificationType?: NotificationType;
    payload: Record<string, unknown>;
    status: 'pending' | 'sent' | 'failed' | 'dead_letter';
    attemptCount: number;
    lastError?: string;
    nextRetryAt?: string | null;
  }
) {
  try {
    await supabase.from('marketplace_alert_delivery_attempts').insert({
      channel: 'dashboard_feed',
      recipient_user_id: input.recipientUserId ?? null,
      notification_type: input.notificationType ?? null,
      status: input.status,
      attempt_count: input.attemptCount,
      last_error: input.lastError ?? null,
      payload: input.payload,
      next_retry_at: input.nextRetryAt ?? null,
      last_attempt_at: new Date().toISOString(),
      delivered_at: input.status === 'sent' ? new Date().toISOString() : null,
    });
  } catch (error) {
    console.error('[Notifications] Failed to log delivery attempt:', error);
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

  const payload = {
    user_id: params.userId,
    type: params.type,
    title: params.title,
    body: params.body,
    link: params.link ?? null,
    metadata: params.metadata ?? {},
  };

  const maxAttempts = 3;
  let lastErrorMessage = '';

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const { error } = await supabase.from('user_notifications').insert(payload);
      if (!error) {
        await logDeliveryAttempt(supabase, {
          recipientUserId: params.userId,
          notificationType: params.type,
          payload,
          status: 'sent',
          attemptCount: attempt,
        });
        return;
      }
      lastErrorMessage = error.message;
    } catch (error) {
      lastErrorMessage = error instanceof Error ? error.message : String(error);
    }

    const nextRetryAt =
      attempt < maxAttempts ? new Date(Date.now() + attempt * 30_000).toISOString() : null;
    await logDeliveryAttempt(supabase, {
      recipientUserId: params.userId,
      notificationType: params.type,
      payload,
      status: attempt < maxAttempts ? 'failed' : 'dead_letter',
      attemptCount: attempt,
      lastError: lastErrorMessage,
      nextRetryAt,
    });

    if (attempt < maxAttempts) {
      await sleep(150 * attempt);
    }
  }

  console.error('[Notifications] Notification moved to dead-letter after retries:', lastErrorMessage);
}

// =============================================================================
// createBulkNotifications — fan-out to multiple users in a single INSERT
// =============================================================================

export async function createBulkNotifications(
  notifications: CreateNotificationParams[]
): Promise<void> {
  if (!notifications.length) return;

  for (const notification of notifications) {
    await createNotification(notification);
  }
}
