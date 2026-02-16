/**
 * Resend Email Client
 * Phase 4.5: Email sending via Resend API with dev mode fallback
 */

import { Resend } from 'resend';

// Graceful fallback: If RESEND_API_KEY is not set, create a mock client
// that logs emails to console instead of sending (dev mode)
export const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : ({
      emails: {
        send: async (params: any) => {
          console.log('📧 [DEV MODE] Email not sent (RESEND_API_KEY not configured):');
          console.log('From:', params.from);
          console.log('To:', params.to);
          console.log('Subject:', params.subject);
          console.log('Attachments:', params.attachments?.length || 0);
          return { data: { id: 'dev-mode-mock-id' }, error: null };
        },
      },
    } as any);
