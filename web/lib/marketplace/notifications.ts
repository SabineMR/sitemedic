/**
 * Marketplace Award Notifications
 * Phase 35: Award Flow & Payment — Plan 04
 *
 * Email notification functions for award, rejection, deposit confirmation,
 * and remainder failure events. Uses the shared Resend client with dev mode
 * fallback.
 *
 * All functions are wrapped in try/catch and return success/error.
 * Email failure must NEVER block webhook processing.
 */

import { resend } from '@/lib/email/resend';

const FROM_ADDRESS = 'SiteMedic Marketplace <marketplace@sitemedic.co.uk>';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://sitemedic.co.uk';

// =============================================================================
// Award Notification — to winning company
// =============================================================================

interface AwardNotificationParams {
  companyEmail: string;
  companyName: string;
  eventName: string;
  eventId: string;
  totalPrice: number;
  clientName: string;
  clientEmail: string;
  clientPhone: string | null;
  eventAddress: string | null;
  eventDates: string[];
}

export async function sendAwardNotification(
  params: AwardNotificationParams
): Promise<{ success: boolean; error?: string }> {
  try {
    const datesList = params.eventDates
      .map((d) => new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }))
      .join('<br>');

    await resend.emails.send({
      from: FROM_ADDRESS,
      to: params.companyEmail,
      subject: `Congratulations! Your quote has been awarded for ${params.eventName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 32px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Quote Awarded!</h1>
          </div>
          <div style="background: white; padding: 32px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              Hi <strong>${params.companyName}</strong>,
            </p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              Your quote of <strong>&pound;${params.totalPrice.toLocaleString()}</strong> for
              <strong>${params.eventName}</strong> has been awarded by the client.
            </p>

            <div style="background: #ecfdf5; border-left: 4px solid #059669; padding: 16px; margin: 24px 0; border-radius: 4px;">
              <p style="margin: 0 0 12px 0; color: #065f46; font-weight: 600;">Client Contact Details</p>
              <table style="width: 100%; font-size: 14px; color: #374151;">
                <tr><td style="padding: 4px 0; font-weight: 600;">Name:</td><td>${params.clientName}</td></tr>
                <tr><td style="padding: 4px 0; font-weight: 600;">Email:</td><td><a href="mailto:${params.clientEmail}" style="color: #2563eb;">${params.clientEmail}</a></td></tr>
                ${params.clientPhone ? `<tr><td style="padding: 4px 0; font-weight: 600;">Phone:</td><td><a href="tel:${params.clientPhone}" style="color: #2563eb;">${params.clientPhone}</a></td></tr>` : ''}
                ${params.eventAddress ? `<tr><td style="padding: 4px 0; font-weight: 600;">Event Location:</td><td>${params.eventAddress}</td></tr>` : ''}
              </table>
            </div>

            <div style="background: #f9fafb; padding: 16px; margin: 24px 0; border-radius: 8px;">
              <p style="margin: 0 0 8px 0; color: #374151; font-weight: 600;">Event Dates</p>
              <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.8;">${datesList}</p>
            </div>

            <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 24px 0; border-radius: 4px;">
              <p style="margin: 0 0 4px 0; color: #1e3a8a; font-weight: 600;">Next Steps</p>
              <p style="margin: 0; color: #1e40af; font-size: 14px;">
                Contact the client to coordinate logistics. Your booking is confirmed in your SiteMedic dashboard.
              </p>
            </div>

            <div style="text-align: center; margin: 32px 0;">
              <a href="${SITE_URL}/marketplace/events/${params.eventId}" style="display: inline-block; background: #059669; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                View Event Details
              </a>
            </div>

            <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">
              Sent by SiteMedic Marketplace
            </p>
          </div>
        </div>
      `,
    });

    return { success: true };
  } catch (error) {
    console.error('[Notifications] Failed to send award notification:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// =============================================================================
// Rejection Notification — to non-winning companies
// =============================================================================

interface RejectionNotificationParams {
  companyEmail: string;
  companyName: string;
  eventName: string;
  totalPrice: number;
}

export async function sendRejectionNotification(
  params: RejectionNotificationParams
): Promise<{ success: boolean; error?: string }> {
  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: params.companyEmail,
      subject: `Update on your quote for ${params.eventName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); padding: 32px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Quote Update</h1>
          </div>
          <div style="background: white; padding: 32px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              Hi <strong>${params.companyName}</strong>,
            </p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              Thank you for submitting your quote for <strong>${params.eventName}</strong>.
            </p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              Unfortunately, the client has selected another provider for this event.
              Your quote of &pound;${params.totalPrice.toLocaleString()} has been marked as not selected.
            </p>

            <div style="background: #f5f3ff; border-left: 4px solid #7c3aed; padding: 16px; margin: 24px 0; border-radius: 4px;">
              <p style="margin: 0; color: #5b21b6; font-size: 14px;">
                New events are posted regularly on the marketplace. Browse current opportunities to find your next booking.
              </p>
            </div>

            <div style="text-align: center; margin: 32px 0;">
              <a href="${SITE_URL}/marketplace/events" style="display: inline-block; background: #7c3aed; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                Browse Events
              </a>
            </div>

            <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">
              Sent by SiteMedic Marketplace
            </p>
          </div>
        </div>
      `,
    });

    return { success: true };
  } catch (error) {
    console.error('[Notifications] Failed to send rejection notification:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// =============================================================================
// Client Deposit Confirmation
// =============================================================================

interface DepositConfirmationParams {
  clientEmail: string;
  clientName: string;
  eventName: string;
  depositAmount: number;
  depositPercent: number;
  remainderAmount: number;
  remainderDueDate: string;
  companyName: string;
  paymentIntentId: string;
}

export async function sendClientDepositConfirmation(
  params: DepositConfirmationParams
): Promise<{ success: boolean; error?: string }> {
  try {
    const dueDateFormatted = new Date(params.remainderDueDate).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    await resend.emails.send({
      from: FROM_ADDRESS,
      to: params.clientEmail,
      subject: `Deposit Confirmed - ${params.eventName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 32px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Deposit Confirmed</h1>
          </div>
          <div style="background: white; padding: 32px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              Hi <strong>${params.clientName}</strong>,
            </p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              Your deposit of <strong>&pound;${params.depositAmount.toFixed(2)}</strong> (${params.depositPercent}%)
              for <strong>${params.eventName}</strong> has been processed successfully.
            </p>

            <div style="background: #ecfdf5; border-left: 4px solid #059669; padding: 16px; margin: 24px 0; border-radius: 4px;">
              <p style="margin: 0; color: #065f46; font-weight: 600; font-size: 16px;">Booking Confirmed</p>
            </div>

            <div style="background: #f9fafb; padding: 16px; margin: 24px 0; border-radius: 8px;">
              <p style="margin: 0 0 8px 0; color: #374151; font-weight: 600;">Awarded Company</p>
              <p style="margin: 0; color: #6b7280; font-size: 14px;">${params.companyName}</p>
            </div>

            <div style="background: #f9fafb; padding: 16px; margin: 24px 0; border-radius: 8px;">
              <p style="margin: 0 0 12px 0; color: #374151; font-weight: 600;">Payment Summary</p>
              <table style="width: 100%; font-size: 14px; color: #374151;">
                <tr>
                  <td style="padding: 4px 0;">Deposit paid</td>
                  <td style="text-align: right; font-weight: 600;">&pound;${params.depositAmount.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0;">Remainder due</td>
                  <td style="text-align: right; font-weight: 600;">&pound;${params.remainderAmount.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0;">Remainder date</td>
                  <td style="text-align: right;">${dueDateFormatted}</td>
                </tr>
              </table>
            </div>

            <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
              Your card has been securely saved for the remainder payment. You can
              <a href="${SITE_URL}/marketplace/payments" style="color: #2563eb;">update your payment method</a>
              at any time.
            </p>

            <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">
              Payment reference: ${params.paymentIntentId}
            </p>

            <p style="color: #6b7280; font-size: 14px; margin-top: 16px;">
              Sent by SiteMedic Marketplace
            </p>
          </div>
        </div>
      `,
    });

    return { success: true };
  } catch (error) {
    console.error('[Notifications] Failed to send deposit confirmation:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// =============================================================================
// Remainder Failed Notification — to client
// =============================================================================

interface RemainderFailedParams {
  clientEmail: string;
  clientName: string;
  eventName: string;
  remainderAmount: number;
  attempt: number;
  maxAttempts: number;
}

export async function sendRemainderFailedNotification(
  params: RemainderFailedParams
): Promise<{ success: boolean; error?: string }> {
  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: params.clientEmail,
      subject: `Action Required: Payment Failed for ${params.eventName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); padding: 32px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Payment Failed</h1>
          </div>
          <div style="background: white; padding: 32px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              Hi <strong>${params.clientName}</strong>,
            </p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              We were unable to charge your payment method for the remaining
              <strong>&pound;${params.remainderAmount.toFixed(2)}</strong> for
              <strong>${params.eventName}</strong>.
            </p>

            <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 24px 0; border-radius: 4px;">
              <p style="margin: 0; color: #991b1b; font-size: 14px;">
                This was attempt ${params.attempt} of ${params.maxAttempts}. We'll retry automatically,
                but to avoid any issues please update your payment method.
              </p>
            </div>

            <div style="text-align: center; margin: 32px 0;">
              <a href="${SITE_URL}/marketplace/payments" style="display: inline-block; background: #dc2626; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                Update Payment Method
              </a>
            </div>

            <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">
              Sent by SiteMedic Marketplace
            </p>
          </div>
        </div>
      `,
    });

    return { success: true };
  } catch (error) {
    console.error('[Notifications] Failed to send remainder failed notification:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// =============================================================================
// Marketplace Message Notification — Airbnb-style (Phase 36)
// =============================================================================

interface MarketplaceMessageNotificationParams {
  recipientEmail: string;
  recipientName: string;
  senderName: string;
  messagePreview: string;
  eventName: string;
  conversationId: string;
}

export async function sendMarketplaceMessageNotification(
  params: MarketplaceMessageNotificationParams
): Promise<{ success: boolean; error?: string }> {
  try {
    const preview = params.messagePreview.length > 100
      ? params.messagePreview.slice(0, 100) + '...'
      : params.messagePreview;

    await resend.emails.send({
      from: FROM_ADDRESS,
      to: params.recipientEmail,
      subject: `New message about ${params.eventName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%); padding: 32px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">New Message</h1>
          </div>
          <div style="background: white; padding: 32px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              Hi <strong>${params.recipientName}</strong>,
            </p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              <strong>${params.senderName}</strong> sent you a message about <strong>${params.eventName}</strong>.
            </p>

            <div style="background: #f9fafb; border-left: 4px solid #3b82f6; padding: 16px; margin: 24px 0; border-radius: 4px;">
              <p style="margin: 0; color: #4b5563; font-size: 14px; font-style: italic;">
                "${preview}"
              </p>
            </div>

            <div style="text-align: center; margin: 32px 0;">
              <a href="${SITE_URL}/marketplace/messages?conversation=${params.conversationId}" style="display: inline-block; background: #3b82f6; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                Reply on SiteMedic
              </a>
            </div>

            <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">
              For your privacy, only a preview is shown in this email. Log in to SiteMedic to see the full message and reply.
            </p>

            <p style="color: #6b7280; font-size: 14px; margin-top: 16px;">
              Sent by SiteMedic Marketplace
            </p>
          </div>
        </div>
      `,
    });

    return { success: true };
  } catch (error) {
    console.error('[Notifications] Failed to send marketplace message notification:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// =============================================================================
// Dispute Filed Notification (Phase 36)
// =============================================================================

interface DisputeFiledNotificationParams {
  recipientEmail: string;
  recipientName: string;
  eventName: string;
  eventId: string;
  disputeCategory: string;
  filedByName: string;
}

export async function sendDisputeFiledNotification(
  params: DisputeFiledNotificationParams
): Promise<{ success: boolean; error?: string }> {
  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: params.recipientEmail,
      subject: `Dispute filed for ${params.eventName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); padding: 32px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Dispute Filed</h1>
          </div>
          <div style="background: white; padding: 32px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              Hi <strong>${params.recipientName}</strong>,
            </p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              A dispute has been filed for <strong>${params.eventName}</strong> by ${params.filedByName}.
            </p>

            <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 24px 0; border-radius: 4px;">
              <p style="margin: 0 0 4px 0; color: #991b1b; font-weight: 600;">Category: ${params.disputeCategory}</p>
              <p style="margin: 0; color: #991b1b; font-size: 14px;">
                Any pending remainder payments have been placed on hold until the dispute is resolved.
              </p>
            </div>

            <div style="text-align: center; margin: 32px 0;">
              <a href="${SITE_URL}/marketplace/events/${params.eventId}" style="display: inline-block; background: #dc2626; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                View Dispute Details
              </a>
            </div>

            <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">
              Sent by SiteMedic Marketplace
            </p>
          </div>
        </div>
      `,
    });

    return { success: true };
  } catch (error) {
    console.error('[Notifications] Failed to send dispute filed notification:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// =============================================================================
// Dispute Resolved Notification (Phase 36)
// =============================================================================

interface DisputeResolvedNotificationParams {
  recipientEmail: string;
  recipientName: string;
  eventName: string;
  resolutionType: string;
  resolutionNotes: string;
}

export async function sendDisputeResolvedNotification(
  params: DisputeResolvedNotificationParams
): Promise<{ success: boolean; error?: string }> {
  try {
    const resolutionLabels: Record<string, string> = {
      full_refund: 'Full refund to client',
      partial_refund: 'Partial refund',
      dismissed: 'Dispute dismissed',
      suspend_party: 'Account action taken',
    };

    await resend.emails.send({
      from: FROM_ADDRESS,
      to: params.recipientEmail,
      subject: `Dispute resolved for ${params.eventName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 32px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Dispute Resolved</h1>
          </div>
          <div style="background: white; padding: 32px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              Hi <strong>${params.recipientName}</strong>,
            </p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              The dispute for <strong>${params.eventName}</strong> has been resolved.
            </p>

            <div style="background: #ecfdf5; border-left: 4px solid #059669; padding: 16px; margin: 24px 0; border-radius: 4px;">
              <p style="margin: 0 0 4px 0; color: #065f46; font-weight: 600;">
                Resolution: ${resolutionLabels[params.resolutionType] || params.resolutionType}
              </p>
              ${params.resolutionNotes ? `<p style="margin: 0; color: #065f46; font-size: 14px;">${params.resolutionNotes}</p>` : ''}
            </div>

            <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">
              Sent by SiteMedic Marketplace
            </p>
          </div>
        </div>
      `,
    });

    return { success: true };
  } catch (error) {
    console.error('[Notifications] Failed to send dispute resolved notification:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// =============================================================================
// Cancellation Notification (Phase 36)
// =============================================================================

interface CancellationNotificationParams {
  recipientEmail: string;
  recipientName: string;
  eventName: string;
  cancelledBy: string;
  refundAmount: number;
  reason: string;
}

// =============================================================================
// Rating Nudge Notification (Phase 36 Extension — Feature 7)
// =============================================================================

interface RatingNudgeNotificationParams {
  recipientEmail: string;
  recipientName: string;
  eventName: string;
  eventId: string;
  recipientRole: 'client' | 'company';
}

export async function sendRatingNudgeNotification(
  params: RatingNudgeNotificationParams
): Promise<{ success: boolean; error?: string }> {
  try {
    const actionText = params.recipientRole === 'client'
      ? 'Rate the company you worked with and help other clients make informed decisions.'
      : 'Rate the client you worked with to build your company\'s reputation on the platform.';

    await resend.emails.send({
      from: FROM_ADDRESS,
      to: params.recipientEmail,
      subject: `How was your experience? Rate ${params.eventName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%); padding: 32px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">How Was Your Experience?</h1>
          </div>
          <div style="background: white; padding: 32px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              Hi <strong>${params.recipientName}</strong>,
            </p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              <strong>${params.eventName}</strong> has been completed. We'd love to hear how it went!
            </p>

            <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 4px;">
              <p style="margin: 0; color: #92400e; font-size: 14px;">
                ${actionText}
              </p>
            </div>

            <div style="text-align: center; margin: 32px 0;">
              <div style="margin-bottom: 16px;">
                <span style="font-size: 32px;">&#9733; &#9733; &#9733; &#9733; &#9733;</span>
              </div>
              <a href="${SITE_URL}/marketplace/events/${params.eventId}" style="display: inline-block; background: #f59e0b; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                Leave Your Rating
              </a>
            </div>

            <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">
              Ratings help build trust in the SiteMedic Marketplace. Your feedback is anonymous until both parties have rated.
            </p>

            <p style="color: #6b7280; font-size: 14px; margin-top: 16px;">
              Sent by SiteMedic Marketplace
            </p>
          </div>
        </div>
      `,
    });

    return { success: true };
  } catch (error) {
    console.error('[Notifications] Failed to send rating nudge:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// =============================================================================
// Cancellation Notification (Phase 36)
// =============================================================================

export async function sendCancellationNotification(
  params: CancellationNotificationParams
): Promise<{ success: boolean; error?: string }> {
  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: params.recipientEmail,
      subject: `Event cancelled: ${params.eventName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); padding: 32px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Event Cancelled</h1>
          </div>
          <div style="background: white; padding: 32px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              Hi <strong>${params.recipientName}</strong>,
            </p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              <strong>${params.eventName}</strong> has been cancelled by ${params.cancelledBy}.
            </p>

            <div style="background: #f9fafb; padding: 16px; margin: 24px 0; border-radius: 8px;">
              <table style="width: 100%; font-size: 14px; color: #374151;">
                <tr><td style="padding: 4px 0; font-weight: 600;">Reason:</td><td>${params.reason}</td></tr>
                <tr><td style="padding: 4px 0; font-weight: 600;">Refund amount:</td><td>&pound;${params.refundAmount.toFixed(2)}</td></tr>
              </table>
            </div>

            ${params.refundAmount > 0 ? `
              <div style="background: #ecfdf5; border-left: 4px solid #059669; padding: 16px; margin: 24px 0; border-radius: 4px;">
                <p style="margin: 0; color: #065f46; font-size: 14px;">
                  Your refund of &pound;${params.refundAmount.toFixed(2)} will be processed to your original payment method within 5-10 business days.
                </p>
              </div>
            ` : ''}

            <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">
              Sent by SiteMedic Marketplace
            </p>
          </div>
        </div>
      `,
    });

    return { success: true };
  } catch (error) {
    console.error('[Notifications] Failed to send cancellation notification:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
