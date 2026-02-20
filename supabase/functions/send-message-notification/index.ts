/**
 * Send Message Notification - GDPR-safe Push via Expo Push API
 * Phase 43: Real-Time Push Notifications (Plan 03)
 *
 * Triggered by PostgreSQL AFTER INSERT trigger on messages table (via pg_net).
 * Resolves recipient push tokens and sends a push notification showing only
 * the sender's name -- NEVER the message content (GDPR compliance).
 *
 * Handles:
 * - Direct (1:1) messages: notifies the other participant
 * - Broadcast messages: notifies all org members except the sender
 * - Token cleanup: removes DeviceNotRegistered tokens from profiles
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const EXPO_ACCESS_TOKEN = Deno.env.get('EXPO_ACCESS_TOKEN');
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const BATCH_SIZE = 100;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { message_id, conversation_id, sender_id, org_id } = await req.json();

    // Validate required fields
    if (!message_id || !conversation_id || !sender_id || !org_id) {
      console.error('[PushNotification] Missing required fields:', {
        message_id: !!message_id,
        conversation_id: !!conversation_id,
        sender_id: !!sender_id,
        org_id: !!org_id,
      });
      return new Response(
        JSON.stringify({ error: 'Missing required fields: message_id, conversation_id, sender_id, org_id' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // -----------------------------------------------------------------------
    // 1. Resolve sender display name (GDPR: only the name, never content)
    // -----------------------------------------------------------------------
    const senderName = await resolveSenderName(sender_id);

    // -----------------------------------------------------------------------
    // 2. Fetch conversation details
    // -----------------------------------------------------------------------
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('type, medic_id, created_by')
      .eq('id', conversation_id)
      .single();

    if (convError || !conversation) {
      console.error('[PushNotification] Conversation not found:', conversation_id, convError);
      return new Response(
        JSON.stringify({ skipped: true, reason: 'Conversation not found' }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // -----------------------------------------------------------------------
    // 3. Determine recipient push tokens
    // -----------------------------------------------------------------------
    let recipientTokens: string[] = [];

    if (conversation.type === 'direct') {
      // Direct (1:1): Notify the other participant
      // If sender is the medic, notify admin (created_by). Otherwise, notify the medic.
      let recipientId: string | null = null;

      if (conversation.medic_id) {
        // Look up the medic's user_id to compare with sender
        const { data: medic } = await supabase
          .from('medics')
          .select('user_id')
          .eq('id', conversation.medic_id)
          .single();

        if (medic) {
          recipientId = medic.user_id === sender_id
            ? conversation.created_by   // Sender is medic -> notify admin
            : medic.user_id;            // Sender is admin -> notify medic
        }
      }

      if (!recipientId) {
        console.log('[PushNotification] No recipient resolved for direct conversation:', conversation_id);
        return new Response(
          JSON.stringify({ skipped: true, reason: 'No recipient resolved' }),
          { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      // Fetch the recipient's push token
      const { data: profile } = await supabase
        .from('profiles')
        .select('push_token')
        .eq('id', recipientId)
        .not('push_token', 'is', null)
        .single();

      if (!profile?.push_token) {
        console.log('[PushNotification] Recipient has no push token:', recipientId);
        return new Response(
          JSON.stringify({ skipped: true, reason: 'No push token' }),
          { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      recipientTokens = [profile.push_token];
    } else if (conversation.type === 'broadcast') {
      // Broadcast: Notify all org members EXCEPT the sender
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('push_token')
        .eq('org_id', org_id)
        .neq('id', sender_id)
        .not('push_token', 'is', null);

      if (profilesError) {
        console.error('[PushNotification] Error fetching broadcast recipients:', profilesError);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch recipients' }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      recipientTokens = (profiles || [])
        .map((p) => p.push_token as string)
        .filter(Boolean);

      if (recipientTokens.length === 0) {
        console.log('[PushNotification] No broadcast recipients with push tokens in org:', org_id);
        return new Response(
          JSON.stringify({ skipped: true, reason: 'No recipients with push tokens' }),
          { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }
    } else {
      console.warn('[PushNotification] Unknown conversation type:', conversation.type);
      return new Response(
        JSON.stringify({ skipped: true, reason: `Unknown conversation type: ${conversation.type}` }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // -----------------------------------------------------------------------
    // 4. Build GDPR-safe notification payload
    //    IMPORTANT: Only sender name. NEVER include message content.
    // -----------------------------------------------------------------------
    const notificationBody = conversation.type === 'broadcast'
      ? `New broadcast from ${senderName}`
      : `New message from ${senderName}`;

    // -----------------------------------------------------------------------
    // 5. Send via Expo Push API (in batches of 100)
    // -----------------------------------------------------------------------
    const allResults: ExpoPushResult[] = [];

    for (let i = 0; i < recipientTokens.length; i += BATCH_SIZE) {
      const batch = recipientTokens.slice(i, i + BATCH_SIZE);
      const payload = {
        to: batch,
        sound: 'default',
        title: 'SiteMedic',
        body: notificationBody,
        data: {
          conversationId: conversation_id,
          messageId: message_id,
          url: `messages/${conversation_id}`,
        },
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };
      if (EXPO_ACCESS_TOKEN) {
        headers['Authorization'] = `Bearer ${EXPO_ACCESS_TOKEN}`;
      }

      try {
        const response = await fetch(EXPO_PUSH_URL, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[PushNotification] Expo Push API error:', response.status, errorText);
          continue;
        }

        const result = await response.json();
        if (result.data) {
          allResults.push(...result.data);
        }
      } catch (fetchError) {
        console.error('[PushNotification] Fetch error sending push:', fetchError);
      }
    }

    // -----------------------------------------------------------------------
    // 6. Token cleanup: Remove DeviceNotRegistered tokens
    // -----------------------------------------------------------------------
    await cleanupInvalidTokens(allResults, recipientTokens);

    console.log('[PushNotification] Sent notification for message:', message_id, {
      conversationType: conversation.type,
      recipientCount: recipientTokens.length,
      senderName,
    });

    return new Response(
      JSON.stringify({
        success: true,
        sent: recipientTokens.length,
        conversationType: conversation.type,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (error) {
    console.error('[PushNotification] Unhandled error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});

// ---------------------------------------------------------------------------
// Helper: Resolve sender display name
// Checks medics table first (has first_name/last_name), falls back to profiles.full_name
// ---------------------------------------------------------------------------
async function resolveSenderName(senderId: string): Promise<string> {
  // Try medics table first (medics have first_name + last_name)
  const { data: medic } = await supabase
    .from('medics')
    .select('first_name, last_name')
    .eq('user_id', senderId)
    .single();

  if (medic) {
    const name = `${medic.first_name} ${medic.last_name}`.trim();
    if (name) return name;
  }

  // Fall back to profiles table (admins have full_name)
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', senderId)
    .single();

  if (profile?.full_name) {
    return profile.full_name;
  }

  // Final fallback
  return 'Someone';
}

// ---------------------------------------------------------------------------
// Helper: Clean up DeviceNotRegistered tokens
// When Expo reports a token is no longer valid, clear it from profiles
// ---------------------------------------------------------------------------
interface ExpoPushResult {
  status: 'ok' | 'error';
  message?: string;
  details?: {
    error?: 'DeviceNotRegistered' | 'MessageTooBig' | 'MessageRateExceeded' | 'MismatchSenderId' | 'InvalidCredentials';
  };
}

async function cleanupInvalidTokens(
  results: ExpoPushResult[],
  tokens: string[]
): Promise<void> {
  const badTokens: string[] = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (
      result.status === 'error' &&
      result.details?.error === 'DeviceNotRegistered' &&
      tokens[i]
    ) {
      badTokens.push(tokens[i]);
    }
  }

  if (badTokens.length === 0) return;

  console.log('[PushNotification] Cleaning up invalid tokens:', badTokens.length);

  for (const badToken of badTokens) {
    const { error } = await supabase
      .from('profiles')
      .update({ push_token: null, push_token_updated_at: null })
      .eq('push_token', badToken);

    if (error) {
      console.error('[PushNotification] Failed to clean token:', badToken, error);
    } else {
      console.log('[PushNotification] Cleaned invalid token:', badToken.substring(0, 20) + '...');
    }
  }
}
