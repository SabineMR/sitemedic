/**
 * Certification Expiry Email Templates
 * Phase 7: Certification Tracking - Plan 02
 */

import { Resend } from 'npm:resend@4.0.2';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

interface CertExpiryEmailData {
  medicFirstName: string;
  certType: string;
  certNumber: string;
  expiryDate: string; // formatted string
  daysRemaining: number;
  renewalUrl?: string;
  recipientEmail: string;
  recipientName: string;
  orgName: string;
  dashboardUrl: string;
}

export async function sendCertificationExpiryEmail(data: CertExpiryEmailData): Promise<string | null> {
  const urgencyLabel =
    data.daysRemaining <= 1 ? 'CRITICAL' :
    data.daysRemaining <= 7 ? 'URGENT' :
    data.daysRemaining <= 14 ? 'Important' :
    'Reminder';

  const alertBg =
    data.daysRemaining <= 1 ? '#fee2e2' :
    data.daysRemaining <= 7 ? '#fef3c7' :
    '#dbeafe';

  const alertBorder =
    data.daysRemaining <= 1 ? '#dc2626' :
    data.daysRemaining <= 7 ? '#f59e0b' :
    '#2563eb';

  const alertColor =
    data.daysRemaining <= 1 ? '#991b1b' :
    data.daysRemaining <= 7 ? '#92400e' :
    '#1e40af';

  try {
    const response = await resend.emails.send({
      from: `${data.orgName} <notifications@sitemedic.app>`,
      to: data.recipientEmail,
      subject: `${urgencyLabel}: ${data.certType} Certification Expires in ${data.daysRemaining} Day${data.daysRemaining > 1 ? 's' : ''}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; }
            .header { background: #003366; color: white; padding: 24px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; }
            .content { background: #ffffff; padding: 24px; }
            .alert-box {
              background: ${alertBg};
              border-left: 4px solid ${alertBorder};
              padding: 16px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .alert-box h2 {
              margin: 0 0 12px 0;
              color: ${alertColor};
              font-size: 18px;
            }
            .detail-row {
              margin: 10px 0;
              padding: 8px 0;
              border-bottom: 1px solid #e5e7eb;
            }
            .detail-row:last-child { border-bottom: none; }
            .label {
              display: inline-block;
              width: 160px;
              font-weight: 600;
              color: #6b7280;
              font-size: 14px;
            }
            .value {
              color: #1f2937;
              font-size: 14px;
            }
            .cta-button {
              display: inline-block;
              background: #003366;
              color: white !important;
              padding: 14px 28px;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              margin: 20px 0;
              text-align: center;
            }
            .cta-button:hover { background: #002347; }
            .renewal-button {
              display: inline-block;
              background: #059669;
              color: white !important;
              padding: 12px 24px;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              margin: 12px 0;
              text-align: center;
            }
            .renewal-button:hover { background: #047857; }
            .next-steps {
              background: #f3f4f6;
              padding: 16px;
              border-radius: 6px;
              margin: 20px 0;
            }
            .next-steps h4 {
              margin: 0 0 8px 0;
              font-size: 14px;
              color: #1f2937;
            }
            .next-steps ol {
              margin: 0;
              padding-left: 20px;
              font-size: 14px;
              color: #4b5563;
            }
            .footer {
              background: #f9fafb;
              padding: 20px;
              text-align: center;
              font-size: 12px;
              color: #6b7280;
              border-top: 1px solid #e5e7eb;
            }
            .footer a { color: #003366; text-decoration: none; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📋 Certification Expiry Reminder</h1>
            </div>

            <div class="content">
              <p style="font-size: 16px; margin-bottom: 20px;">
                Hello ${data.recipientName},
              </p>

              <p style="font-size: 16px; margin-bottom: 20px;">
                A certification for ${data.medicFirstName} at <strong>${data.orgName}</strong> is approaching expiry.
              </p>

              <div class="alert-box">
                <h2>
                  ${data.daysRemaining <= 1 ? '🚨 CRITICAL: ' :
                    data.daysRemaining <= 7 ? '⚠️ URGENT: ' :
                    data.daysRemaining <= 14 ? '⏰ ' : '📅 '}
                  ${data.daysRemaining} Day${data.daysRemaining > 1 ? 's' : ''} Until Expiry
                </h2>
                <p style="margin: 0; font-size: 14px; color: #4b5563;">
                  Certificate expiry date: <strong>${data.expiryDate}</strong>
                </p>
              </div>

              <h3 style="color: #1f2937; font-size: 16px; margin: 24px 0 12px 0;">Certification Details</h3>

              <div class="detail-row">
                <span class="label">Certification Type:</span>
                <span class="value">${data.certType}</span>
              </div>

              <div class="detail-row">
                <span class="label">Certificate Number:</span>
                <span class="value">${data.certNumber}</span>
              </div>

              <div class="detail-row">
                <span class="label">Expiry Date:</span>
                <span class="value">${data.expiryDate}</span>
              </div>

              <div class="detail-row">
                <span class="label">Days Remaining:</span>
                <span class="value"><strong>${data.daysRemaining}</strong></span>
              </div>

              <div style="text-align: center; margin: 28px 0;">
                <a href="${data.dashboardUrl}" class="cta-button">
                  View Certifications Dashboard
                </a>
              </div>

              <div class="next-steps">
                <h4>Next Steps:</h4>
                <ol>
                  <li>Visit the certification body website</li>
                  <li>Complete the renewal process</li>
                  <li>Update your records in SiteMedic</li>
                </ol>
              </div>

              ${data.renewalUrl ? `
              <div style="text-align: center; margin: 20px 0;">
                <a href="${data.renewalUrl}" class="renewal-button">
                  Start Renewal Process
                </a>
              </div>
              ` : ''}
            </div>

            <div class="footer">
              <p style="margin: 0 0 8px 0;">
                <strong>${data.orgName}</strong>
              </p>
              <p style="margin: 0;">
                This is an automated compliance reminder from SiteMedic
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log(`Certification expiry email sent to ${data.recipientEmail} for ${data.certType} (${data.daysRemaining} days)`);
    return response.data?.id || null;
  } catch (error) {
    console.error('Error sending certification expiry email:', error);
    return null;
  }
}
