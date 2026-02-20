/**
 * Twilio SMS Utility
 * Phase 38: Notifications & Alerts — Plan 01
 *
 * Fire-and-forget SMS sending via Twilio SDK v5.
 * When TWILIO_* env vars are not configured, falls back to console.log
 * (dev-mode mock) — matches the same graceful fallback pattern as resend.ts.
 *
 * Usage:
 *   const result = await sendSMS({ to: '+447xxxxxxxxx', body: 'New event alert...' });
 *   // result.success is always true in dev mode
 */

import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

// Graceful fallback: if env vars are not configured, set client to null.
// The sendSMS function checks for null before attempting to call Twilio.
const client =
  accountSid && authToken ? twilio(accountSid, authToken) : null;

// =============================================================================
// Types
// =============================================================================

interface SMSParams {
  to: string;    // E.164 format: +447xxxxxxxxx (UK mobile)
  body: string;  // SMS body — keep under 160 chars to avoid multi-segment billing
}

interface SMSResult {
  success: boolean;
  sid?: string;
  error?: string;
}

// =============================================================================
// sendSMS
// =============================================================================

export async function sendSMS(params: SMSParams): Promise<SMSResult> {
  // Dev-mode fallback: log to console when Twilio is not configured
  if (!client || !fromNumber) {
    console.log('[SMS DEV MODE] Would send to:', params.to, '|', params.body);
    return { success: true, sid: 'dev-mode-mock-sid' };
  }

  try {
    const message = await client.messages.create({
      body: params.body,
      from: fromNumber,
      to: params.to,
    });

    console.log('[SMS] Sent successfully. SID:', message.sid);
    return { success: true, sid: message.sid };
  } catch (error) {
    console.error('[SMS] Failed to send:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown Twilio error',
    };
  }
}
