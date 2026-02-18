/**
 * send-emergency-sms Edge Function
 *
 * Two responsibilities:
 *
 * 1. SMS Fallback (triggered by pg_cron every 60 seconds):
 *    - Finds unacknowledged emergency_alerts where push was sent >60s ago
 *    - Sends Twilio SMS to each alert's contact phone number
 *    - Updates sms_sent_at on the alert row to prevent double-sends
 *
 * 2. Whisper Transcription (called by EmergencyAlertService during recording):
 *    - Receives base64 audio chunk
 *    - POSTs to OpenAI Whisper API
 *    - Returns transcript text
 *
 * Environment variables required (set via `supabase secrets set`):
 *   TWILIO_ACCOUNT_SID
 *   TWILIO_AUTH_TOKEN
 *   TWILIO_PHONE_NUMBER
 *   OPENAI_API_KEY
 *
 * pg_cron schedule (run in Supabase SQL editor after deploying):
 *   SELECT cron.schedule(
 *     'emergency-sms-fallback',
 *     '* * * * *',
 *     $$
 *       SELECT net.http_post(
 *         url := current_setting('app.supabase_url') || '/functions/v1/send-emergency-sms',
 *         headers := jsonb_build_object(
 *           'Content-Type', 'application/json',
 *           'Authorization', 'Bearer ' || current_setting('app.service_role_key')
 *         ),
 *         body := '{"action":"sms_fallback"}'::jsonb
 *       )
 *     $$
 *   );
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER');
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      },
    });
  }

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  try {
    const body = await req.json();
    const action = body.action as string;

    // ─── Route: Live transcription chunk ───────────────────────────────────
    if (action === 'transcribe') {
      const transcript = await transcribeAudio(body.audioBase64, body.mimeType);
      return new Response(JSON.stringify({ transcript }), { headers: corsHeaders });
    }

    // ─── Route: SMS fallback (called by pg_cron) ───────────────────────────
    if (action === 'sms_fallback' || !action) {
      const result = await runSmsFallback();
      return new Response(JSON.stringify(result), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400,
      headers: corsHeaders,
    });
  } catch (err) {
    console.error('[send-emergency-sms] Unhandled error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});

/**
 * Find unacknowledged alerts older than 60 seconds and send Twilio SMS.
 */
async function runSmsFallback() {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    console.warn('[SMS Fallback] Twilio env vars not configured — skipping');
    return { smsSent: 0, skipped: 'Twilio not configured' };
  }

  // Query alerts: push sent >60s ago, not yet acknowledged, SMS not yet sent
  const { data: alerts, error } = await supabase
    .from('emergency_alerts')
    .select(`
      id,
      text_message,
      audio_url,
      booking_id,
      sent_by,
      contact_id,
      emergency_contacts ( name, phone ),
      profiles!emergency_alerts_sent_by_fkey ( full_name, phone )
    `)
    .is('acknowledged_at', null)
    .is('sms_sent_at', null)
    .not('push_sent_at', 'is', null)
    .lt('push_sent_at', new Date(Date.now() - 60_000).toISOString());

  if (error) {
    console.error('[SMS Fallback] Query error:', error);
    return { error: error.message };
  }

  if (!alerts || alerts.length === 0) {
    return { smsSent: 0, message: 'No unacknowledged alerts requiring SMS' };
  }

  let smsSent = 0;

  for (const alert of alerts) {
    const contact = Array.isArray(alert.emergency_contacts)
      ? alert.emergency_contacts[0]
      : alert.emergency_contacts;
    const medic = Array.isArray(alert.profiles)
      ? alert.profiles[0]
      : alert.profiles;

    if (!contact?.phone) {
      console.warn('[SMS Fallback] No phone number for contact on alert:', alert.id);
      continue;
    }

    const medicName = medic?.full_name || 'A medic';
    const medicPhone = medic?.phone || 'unknown';
    const smsBody = [
      `🚨 EMERGENCY — SiteMedic`,
      `${medicName} has triggered an emergency alert.`,
      alert.text_message ? `Message: "${alert.text_message}"` : '',
      `Open the SiteMedic app immediately or call ${medicPhone}.`,
    ].filter(Boolean).join('\n');

    const sent = await sendTwilioSms(contact.phone, smsBody);

    if (sent) {
      // Mark SMS as sent to prevent re-sending
      await supabase
        .from('emergency_alerts')
        .update({ sms_sent_at: new Date().toISOString() })
        .eq('id', alert.id);

      console.log('[SMS Fallback] SMS sent for alert:', alert.id, '→', contact.phone);
      smsSent++;
    }
  }

  return { smsSent, totalUnacknowledged: alerts.length };
}

/**
 * Send an SMS via Twilio REST API.
 */
async function sendTwilioSms(to: string, body: string): Promise<boolean> {
  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const credentials = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

    const formData = new URLSearchParams({
      To: to,
      From: TWILIO_PHONE_NUMBER!,
      Body: body,
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Twilio] SMS failed:', response.status, errorText);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[Twilio] Network error:', err);
    return false;
  }
}

/**
 * Transcribe base64 audio using OpenAI Whisper.
 * Returns transcript text (empty string if failed).
 */
async function transcribeAudio(audioBase64: string, mimeType = 'audio/m4a'): Promise<string> {
  if (!OPENAI_API_KEY) {
    console.warn('[Transcribe] OPENAI_API_KEY not configured');
    return '';
  }

  try {
    // Convert base64 to Blob for the Whisper API multipart upload
    const binaryString = atob(audioBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const formData = new FormData();
    // OpenAI Whisper identifies M4A by the filename extension (.m4a).
    // The MIME type must be audio/mp4 — not audio/m4a — because audio/m4a is
    // non-standard and causes a 400 "Invalid file format" response from the API.
    const blobType = mimeType === 'audio/m4a' ? 'audio/mp4' : mimeType;
    formData.append('file', new Blob([bytes], { type: blobType }), 'audio.m4a');
    formData.append('model', 'whisper-1');
    formData.append('language', 'en');
    // Context prompt reduces hallucinations — Whisper uses it to bias towards
    // medical/emergency vocabulary instead of YouTube-style filler phrases.
    formData.append('prompt', 'Emergency medical situation. Site medic speaking.');
    // verbose_json gives us per-segment no_speech_prob so we can discard silence.
    formData.append('response_format', 'verbose_json');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Whisper] Transcription failed:', response.status, errorText);
      return '';
    }

    const result = await response.json();

    // Filter out hallucinations: if the average no_speech_prob across segments
    // is above 0.6, the chunk was mostly silence — discard it.
    if (result.segments && result.segments.length > 0) {
      const avgNoSpeech =
        result.segments.reduce((sum: number, s: any) => sum + (s.no_speech_prob ?? 0), 0) /
        result.segments.length;
      if (avgNoSpeech > 0.6) {
        console.log('[Whisper] Discarding silent chunk, no_speech_prob:', avgNoSpeech.toFixed(2));
        return '';
      }
    }

    // Strip known Whisper silence/filler tokens before returning.
    const cleaned = (result.text || '')
      .replace(/\bSilence\.?\b/gi, '')
      .replace(/\[BLANK_AUDIO\]/gi, '')
      .replace(/\(silence\)/gi, '')
      .replace(/\.{3,}/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();

    return cleaned;
  } catch (err) {
    console.error('[Whisper] Error:', err);
    return '';
  }
}
