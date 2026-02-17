/**
 * Shared Email Templates
 *
 * Centralized email notification functions using Resend API.
 * Used across Edge Functions for critical business notifications.
 */

import { Resend } from 'https://esm.sh/resend@3.2.0';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

// Initialize Resend (will be null if API key not configured)
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

// =============================================================================
// PAYOUT FAILURE NOTIFICATION
// =============================================================================

interface PayoutFailure {
  medicName: string;
  amount: number;
  error: string;
}

export async function sendPayoutFailureEmail(
  adminEmail: string,
  orgName: string,
  failures: PayoutFailure[]
): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.warn('⚠️  Resend API key not configured - email not sent');
    return { success: false, error: 'Resend API key not configured' };
  }

  try {
    const failureList = failures
      .map(
        (f) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${f.medicName}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">£${f.amount.toFixed(2)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #dc2626;">${f.error}</td>
      </tr>
    `
      )
      .join('');

    await resend.emails.send({
      from: 'SiteMedic Alerts <alerts@sitemedic.co.uk>',
      to: adminEmail,
      subject: `⚠️ Payout Failures - ${orgName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); padding: 32px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Payout Processing Failed</h1>
          </div>

          <div style="background: white; padding: 32px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              <strong>${failures.length}</strong> payout(s) failed for <strong>${orgName}</strong>. Immediate action required to resolve payment issues.
            </p>

            <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
              <thead>
                <tr style="background: #f3f4f6;">
                  <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Medic</th>
                  <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Amount</th>
                  <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Error</th>
                </tr>
              </thead>
              <tbody>
                ${failureList}
              </tbody>
            </table>

            <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 24px 0; border-radius: 4px;">
              <p style="margin: 0; color: #991b1b; font-weight: 600;">⚠️ Action Required</p>
              <p style="margin: 8px 0 0 0; color: #7f1d1d; font-size: 14px;">
                Medics will not receive payment until these issues are resolved. Please check Stripe accounts and retry payouts.
              </p>
            </div>

            <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">
              Sent by SiteMedic Platform
            </p>
          </div>
        </div>
      `,
    });

    console.log(`✅ Payout failure email sent to ${adminEmail}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Failed to send payout failure email:', error);
    return { success: false, error: String(error) };
  }
}

// =============================================================================
// CASH FLOW CRITICAL ALERT
// =============================================================================

export async function sendCashFlowAlert(
  platformAdminEmail: string,
  balance: number,
  weeklyPayouts: number,
  daysUntilCashOut: number
): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.warn('⚠️  Resend API key not configured - email not sent');
    return { success: false, error: 'Resend API key not configured' };
  }

  try {
    await resend.emails.send({
      from: 'SiteMedic Alerts <alerts@sitemedic.co.uk>',
      to: platformAdminEmail,
      subject: '🚨 URGENT: Cash Flow Critical Alert',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); padding: 32px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🚨 Cash Flow Critical</h1>
          </div>

          <div style="background: white; padding: 32px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 20px; margin-bottom: 24px; border-radius: 4px;">
              <p style="margin: 0; color: #991b1b; font-size: 18px; font-weight: 600;">
                Platform running low on funds
              </p>
              <p style="margin: 12px 0 0 0; color: #7f1d1d; font-size: 14px;">
                Immediate action required to prevent payout failures
              </p>
            </div>

            <div style="margin: 24px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 12px; background: #f9fafb; font-weight: 600; color: #374151;">Current Balance</td>
                  <td style="padding: 12px; background: #f9fafb; color: #dc2626; font-weight: 600; text-align: right;">£${balance.toLocaleString()}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; color: #374151;">Weekly Payouts Due</td>
                  <td style="padding: 12px; color: #374151; text-align: right;">£${weeklyPayouts.toLocaleString()}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; background: #f9fafb; font-weight: 600; color: #374151;">Days Until Cash Out</td>
                  <td style="padding: 12px; background: #f9fafb; color: ${daysUntilCashOut <= 7 ? '#dc2626' : '#f59e0b'}; font-weight: 600; text-align: right;">${daysUntilCashOut} days</td>
                </tr>
              </table>
            </div>

            <div style="background: #fef9c3; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 4px;">
              <p style="margin: 0; color: #78350f; font-weight: 600;">💡 Recommended Actions</p>
              <ul style="margin: 8px 0 0 0; padding-left: 24px; color: #92400e; font-size: 14px;">
                <li>Transfer funds to Stripe balance immediately</li>
                <li>Follow up on outstanding invoices</li>
                <li>Consider reducing credit limits for slow-paying clients</li>
                <li>Review weekly payout schedule</li>
              </ul>
            </div>

            <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">
              This is an automated alert from SiteMedic Platform. Check daily at 8 AM.
            </p>
          </div>
        </div>
      `,
    });

    console.log(`✅ Cash flow alert sent to ${platformAdminEmail}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Failed to send cash flow alert:', error);
    return { success: false, error: String(error) };
  }
}

// =============================================================================
// INVOICE EMAIL
// =============================================================================

interface InvoiceDetails {
  invoiceNumber: string;
  clientName: string;
  total: number;
  dueDate: string;
  pdfUrl: string;
}

export async function sendInvoiceEmail(
  clientEmail: string,
  invoice: InvoiceDetails
): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.warn('⚠️  Resend API key not configured - email not sent');
    return { success: false, error: 'Resend API key not configured' };
  }

  try {
    await resend.emails.send({
      from: 'SiteMedic Invoices <invoices@sitemedic.co.uk>',
      to: clientEmail,
      subject: `Invoice ${invoice.invoiceNumber} from SiteMedic`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); padding: 32px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Invoice Ready</h1>
          </div>

          <div style="background: white; padding: 32px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              Dear <strong>${invoice.clientName}</strong>,
            </p>

            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              Your invoice is ready for payment. Please find the details below:
            </p>

            <div style="background: #f9fafb; border-radius: 8px; padding: 24px; margin: 24px 0;">
              <table style="width: 100%;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Invoice Number</td>
                  <td style="padding: 8px 0; color: #111827; font-weight: 600; text-align: right;">${invoice.invoiceNumber}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Amount Due</td>
                  <td style="padding: 8px 0; color: #111827; font-weight: 600; text-align: right; font-size: 18px;">£${invoice.total.toLocaleString()}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Due Date</td>
                  <td style="padding: 8px 0; color: #dc2626; font-weight: 600; text-align: right;">${invoice.dueDate}</td>
                </tr>
              </table>
            </div>

            <div style="text-align: center; margin: 32px 0;">
              <a href="${invoice.pdfUrl}" style="display: inline-block; background: #7c3aed; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                Download Invoice PDF
              </a>
            </div>

            <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 24px 0; border-radius: 4px;">
              <p style="margin: 0; color: #1e3a8a; font-size: 14px;">
                💳 Payment terms: Net 30 days from invoice date
              </p>
            </div>

            <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">
              If you have any questions about this invoice, please contact us.
            </p>

            <p style="color: #6b7280; font-size: 14px;">
              Thank you for your business,<br>
              <strong>SiteMedic Team</strong>
            </p>
          </div>
        </div>
      `,
    });

    console.log(`✅ Invoice email sent to ${clientEmail}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Failed to send invoice email:', error);
    return { success: false, error: String(error) };
  }
}
