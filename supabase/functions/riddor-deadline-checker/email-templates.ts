/**
 * RIDDOR Deadline Email Templates
 * Phase 6: RIDDOR Auto-Flagging - Plan 05
 */

import { Resend } from 'npm:resend@4.0.2';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

interface DeadlineEmailData {
  incidentId: string;
  workerName: string;
  workerCompany: string;
  injuryType: string;
  bodyPart: string;
  incidentDate: string;
  deadlineDate: string;
  daysRemaining: number;
  dashboardUrl: string;
  siteManagerEmail: string;
  orgName: string;
}

export async function sendDeadlineEmail(data: DeadlineEmailData): Promise<void> {
  const urgencyLabel = data.daysRemaining <= 1 ? 'URGENT' : 'Important';

  try {
    await resend.emails.send({
      from: 'SiteMedic Compliance <notifications@sitemedic.app>',
      to: data.siteManagerEmail,
      subject: `${urgencyLabel}: RIDDOR Deadline in ${data.daysRemaining} day${data.daysRemaining > 1 ? 's' : ''}`,
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
              background: ${data.daysRemaining <= 1 ? '#fee2e2' : '#fef3c7'};
              border-left: 4px solid ${data.daysRemaining <= 1 ? '#dc2626' : '#f59e0b'};
              padding: 16px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .alert-box h2 {
              margin: 0 0 12px 0;
              color: ${data.daysRemaining <= 1 ? '#991b1b' : '#92400e'};
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
              width: 140px;
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
              <h1>⚠️ RIDDOR Report Deadline Approaching</h1>
            </div>

            <div class="content">
              <p style="font-size: 16px; margin-bottom: 20px;">
                A RIDDOR-reportable incident at <strong>${data.orgName}</strong> requires HSE submission.
              </p>

              <div class="alert-box">
                <h2>
                  ${data.daysRemaining <= 1 ? '🚨 URGENT: ' : '⏰ '}
                  ${data.daysRemaining} Day${data.daysRemaining > 1 ? 's' : ''} Until Deadline
                </h2>
                <p style="margin: 0; font-size: 14px; color: #4b5563;">
                  HSE submission deadline: <strong>${new Date(data.deadlineDate).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric'
                  })}</strong>
                </p>
              </div>

              <h3 style="color: #1f2937; font-size: 16px; margin: 24px 0 12px 0;">Incident Summary</h3>

              <div class="detail-row">
                <span class="label">Worker:</span>
                <span class="value">${data.workerName}</span>
              </div>

              <div class="detail-row">
                <span class="label">Company:</span>
                <span class="value">${data.workerCompany}</span>
              </div>

              <div class="detail-row">
                <span class="label">Injury:</span>
                <span class="value">${data.injuryType.replace(/-/g, ' ')}</span>
              </div>

              <div class="detail-row">
                <span class="label">Body Part:</span>
                <span class="value">${data.bodyPart.replace(/_/g, ' ')}</span>
              </div>

              <div class="detail-row">
                <span class="label">Incident Date:</span>
                <span class="value">${new Date(data.incidentDate).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric'
                })}</span>
              </div>

              <div style="text-align: center; margin: 28px 0;">
                <a href="${data.dashboardUrl}" class="cta-button">
                  View Incident & Generate F2508
                </a>
              </div>

              <div style="background: #f3f4f6; padding: 16px; border-radius: 6px; margin: 20px 0;">
                <h4 style="margin: 0 0 8px 0; font-size: 14px; color: #1f2937;">Next Steps:</h4>
                <ol style="margin: 0; padding-left: 20px; font-size: 14px; color: #4b5563;">
                  <li>Review incident details in dashboard</li>
                  <li>Generate pre-filled F2508 form</li>
                  <li>Submit to HSE online: <a href="https://www.hse.gov.uk/riddor/report.htm" style="color: #003366;">hse.gov.uk/riddor</a></li>
                </ol>
              </div>
            </div>

            <div class="footer">
              <p style="margin: 0 0 8px 0;">
                This is an automated compliance reminder from SiteMedic
              </p>
              <p style="margin: 0;">
                <a href="${data.dashboardUrl}">View in Dashboard</a> |
                <a href="https://www.hse.gov.uk/riddor/">HSE RIDDOR Guidance</a>
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log(`Deadline email sent to ${data.siteManagerEmail} for incident ${data.incidentId}`);
  } catch (error) {
    console.error('Error sending deadline email:', error);
    throw error;
  }
}
