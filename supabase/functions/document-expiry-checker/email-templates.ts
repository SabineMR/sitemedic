/**
 * Document Expiry Digest Email Templates
 * Phase 46: Expiry Tracking & Alerts - Plan 01
 *
 * Two digest email functions:
 * 1. sendMedicDigestEmail - One email per medic listing all their documents hitting a threshold
 * 2. sendAdminDigestEmail - One org-wide digest for the admin listing all medics with expiring documents
 *
 * Escalating urgency: blue (30d) -> blue (14d) -> amber (7d) -> red (1d)
 * Dev mode fallback: console.log when RESEND_API_KEY is not set
 */

import { Resend } from 'npm:resend@4.0.2';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DigestItem {
  categoryName: string;
  fileName: string;
  expiryDate: string; // formatted string e.g. "20 Mar 2026"
  daysRemaining: number;
}

export interface MedicDigestParams {
  medicFirstName: string;
  medicLastName: string;
  medicEmail: string;
  orgName: string;
  items: DigestItem[];
  daysRemaining: number; // smallest daysRemaining in the batch (drives urgency)
  dashboardUrl: string;
}

export interface AdminDigestGroup {
  medicName: string;
  items: DigestItem[];
}

export interface AdminDigestParams {
  adminEmail: string;
  adminName: string;
  orgName: string;
  groups: AdminDigestGroup[];
  daysRemaining: number; // smallest daysRemaining across all groups (drives urgency)
  dashboardUrl: string;
}

// ---------------------------------------------------------------------------
// Resend Client (dev mode fallback)
// ---------------------------------------------------------------------------

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

async function sendEmail(params: {
  from: string;
  to: string;
  subject: string;
  html: string;
}): Promise<string | null> {
  if (!resend) {
    console.log('[DEV MODE] Email not sent (RESEND_API_KEY not configured):');
    console.log('From:', params.from);
    console.log('To:', params.to);
    console.log('Subject:', params.subject);
    console.log('HTML length:', params.html.length);
    return 'dev-mode-mock-id';
  }

  try {
    const response = await resend.emails.send(params);
    return response.data?.id || null;
  } catch (error) {
    console.error('Error sending email via Resend:', error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Urgency Helpers
// ---------------------------------------------------------------------------

function getUrgencyLabel(daysRemaining: number): string {
  if (daysRemaining <= 1) return 'CRITICAL';
  if (daysRemaining <= 7) return 'URGENT';
  if (daysRemaining <= 14) return 'Action Required';
  return 'Reminder';
}

function getAlertBg(daysRemaining: number): string {
  if (daysRemaining <= 1) return '#fee2e2'; // red-100
  if (daysRemaining <= 7) return '#fef3c7'; // amber-100
  return '#dbeafe'; // blue-100
}

function getAlertBorder(daysRemaining: number): string {
  if (daysRemaining <= 1) return '#dc2626'; // red-600
  if (daysRemaining <= 7) return '#f59e0b'; // amber-500
  return '#2563eb'; // blue-600
}

function getAlertColor(daysRemaining: number): string {
  if (daysRemaining <= 1) return '#991b1b'; // red-900
  if (daysRemaining <= 7) return '#92400e'; // amber-900
  return '#1e40af'; // blue-800
}

function getAlertIcon(daysRemaining: number): string {
  if (daysRemaining <= 1) return '&#128680;'; // siren
  if (daysRemaining <= 7) return '&#9888;&#65039;'; // warning
  if (daysRemaining <= 14) return '&#9200;'; // alarm clock
  return '&#128197;'; // calendar
}

// ---------------------------------------------------------------------------
// Shared HTML Styles
// ---------------------------------------------------------------------------

const sharedStyles = `
  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 0 auto; }
  .header { background: #003366; color: white; padding: 24px; text-align: center; }
  .header h1 { margin: 0; font-size: 22px; }
  .content { background: #ffffff; padding: 24px; }
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
  table.doc-table {
    width: 100%;
    border-collapse: collapse;
    margin: 16px 0;
    font-size: 14px;
  }
  table.doc-table th {
    background: #f3f4f6;
    text-align: left;
    padding: 10px 12px;
    font-weight: 600;
    color: #374151;
    border-bottom: 2px solid #d1d5db;
  }
  table.doc-table td {
    padding: 10px 12px;
    border-bottom: 1px solid #e5e7eb;
    color: #1f2937;
  }
  table.doc-table tr:last-child td { border-bottom: none; }
`;

// ---------------------------------------------------------------------------
// 1. Medic Digest Email
// ---------------------------------------------------------------------------

export async function sendMedicDigestEmail(params: MedicDigestParams): Promise<string | null> {
  const {
    medicFirstName,
    medicLastName,
    medicEmail,
    orgName,
    items,
    daysRemaining,
    dashboardUrl,
  } = params;

  const urgency = getUrgencyLabel(daysRemaining);
  const alertBg = getAlertBg(daysRemaining);
  const alertBorder = getAlertBorder(daysRemaining);
  const alertColor = getAlertColor(daysRemaining);
  const icon = getAlertIcon(daysRemaining);

  const docCount = items.length;
  const subject =
    daysRemaining <= 1
      ? `CRITICAL: ${docCount} Document${docCount > 1 ? 's' : ''} Expiring Tomorrow`
      : daysRemaining <= 7
      ? `URGENT: ${docCount} Document${docCount > 1 ? 's' : ''} Expiring in ${daysRemaining} Days`
      : daysRemaining <= 14
      ? `Action Required: ${docCount} Document${docCount > 1 ? 's' : ''} Expiring in ${daysRemaining} Days`
      : `Reminder: ${docCount} Document${docCount > 1 ? 's' : ''} Expiring in 30 Days`;

  const documentRows = items
    .map(
      (item) => `
      <tr>
        <td>${item.categoryName}</td>
        <td>${item.fileName}</td>
        <td>${item.expiryDate}</td>
        <td><strong>${item.daysRemaining}</strong></td>
      </tr>
    `
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>${sharedStyles}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Document Expiry Alert</h1>
        </div>

        <div class="content">
          <p style="font-size: 16px; margin-bottom: 20px;">
            Hello ${medicFirstName},
          </p>

          <p style="font-size: 16px; margin-bottom: 20px;">
            The following compliance document${docCount > 1 ? 's' : ''} at <strong>${orgName}</strong> ${docCount > 1 ? 'are' : 'is'} approaching ${daysRemaining <= 1 ? 'expiry <strong>tomorrow</strong>' : `expiry in <strong>${daysRemaining} days</strong>`}.
          </p>

          <div style="background: ${alertBg}; border-left: 4px solid ${alertBorder}; padding: 16px; margin: 20px 0; border-radius: 4px;">
            <h2 style="margin: 0 0 8px 0; color: ${alertColor}; font-size: 18px;">
              ${icon} ${urgency}: ${docCount} Document${docCount > 1 ? 's' : ''} Expiring
            </h2>
            <p style="margin: 0; font-size: 14px; color: #4b5563;">
              Please upload replacement documents before expiry to maintain compliance.
            </p>
          </div>

          <table class="doc-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>File</th>
                <th>Expiry Date</th>
                <th>Days</th>
              </tr>
            </thead>
            <tbody>
              ${documentRows}
            </tbody>
          </table>

          <div style="text-align: center; margin: 28px 0;">
            <a href="${dashboardUrl}/documents" class="cta-button">
              Upload Replacement Document
            </a>
          </div>

          <div class="next-steps">
            <h4>Next Steps:</h4>
            <ol>
              <li>Review the expiring document${docCount > 1 ? 's' : ''} listed above</li>
              <li>Obtain updated copies from the relevant issuing body</li>
              <li>Upload the new document${docCount > 1 ? 's' : ''} via the SiteMedic portal</li>
            </ol>
          </div>
        </div>

        <div class="footer">
          <p style="margin: 0 0 8px 0;">
            <strong>${orgName}</strong>
          </p>
          <p style="margin: 0;">
            This is an automated compliance reminder from SiteMedic
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  console.log(`Sending medic digest email to ${medicEmail} (${medicFirstName} ${medicLastName}): ${docCount} document(s), ${daysRemaining} days`);

  return await sendEmail({
    from: `${orgName} <notifications@sitemedic.app>`,
    to: medicEmail,
    subject,
    html,
  });
}

// ---------------------------------------------------------------------------
// 2. Admin Digest Email
// ---------------------------------------------------------------------------

export async function sendAdminDigestEmail(params: AdminDigestParams): Promise<string | null> {
  const {
    adminEmail,
    adminName,
    orgName,
    groups,
    daysRemaining,
    dashboardUrl,
  } = params;

  const totalDocs = groups.reduce((sum, g) => sum + g.items.length, 0);
  const totalMedics = groups.length;

  const urgency = getUrgencyLabel(daysRemaining);
  const alertBg = getAlertBg(daysRemaining);
  const alertBorder = getAlertBorder(daysRemaining);
  const alertColor = getAlertColor(daysRemaining);
  const icon = getAlertIcon(daysRemaining);

  const subject = `${urgency}: ${totalDocs} Document${totalDocs > 1 ? 's' : ''} Expiring Across ${totalMedics} Medic${totalMedics > 1 ? 's' : ''}`;

  // Build per-medic sections
  const medicSections = groups
    .map((group) => {
      const rows = group.items
        .map(
          (item) => `
          <tr>
            <td>${item.categoryName}</td>
            <td>${item.fileName}</td>
            <td>${item.expiryDate}</td>
            <td><strong>${item.daysRemaining}</strong></td>
          </tr>
        `
        )
        .join('');

      return `
        <h3 style="color: #1f2937; font-size: 15px; margin: 24px 0 8px 0; padding-bottom: 4px; border-bottom: 1px solid #e5e7eb;">
          ${group.medicName} (${group.items.length} document${group.items.length > 1 ? 's' : ''})
        </h3>
        <table class="doc-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>File</th>
              <th>Expiry Date</th>
              <th>Days</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      `;
    })
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>${sharedStyles}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Organisation Document Expiry Alert</h1>
        </div>

        <div class="content">
          <p style="font-size: 16px; margin-bottom: 20px;">
            Hello ${adminName},
          </p>

          <p style="font-size: 16px; margin-bottom: 20px;">
            This is a compliance summary for <strong>${orgName}</strong>. The following documents across your organisation are approaching expiry.
          </p>

          <div style="background: ${alertBg}; border-left: 4px solid ${alertBorder}; padding: 16px; margin: 20px 0; border-radius: 4px;">
            <h2 style="margin: 0 0 8px 0; color: ${alertColor}; font-size: 18px;">
              ${icon} ${urgency}: ${totalDocs} Document${totalDocs > 1 ? 's' : ''} Across ${totalMedics} Medic${totalMedics > 1 ? 's' : ''}
            </h2>
            <p style="margin: 0; font-size: 14px; color: #4b5563;">
              Please ensure affected medics upload replacement documents before expiry.
            </p>
          </div>

          ${medicSections}

          <div style="text-align: center; margin: 28px 0;">
            <a href="${dashboardUrl}/admin/document-expiry" class="cta-button">
              View Expiry Dashboard
            </a>
          </div>

          <div class="next-steps">
            <h4>Recommended Actions:</h4>
            <ol>
              <li>Review the expiring documents listed above</li>
              <li>Contact affected medics to request updated documents</li>
              <li>Monitor the Document Expiry Dashboard for compliance status</li>
            </ol>
          </div>
        </div>

        <div class="footer">
          <p style="margin: 0 0 8px 0;">
            <strong>${orgName}</strong>
          </p>
          <p style="margin: 0;">
            This is an automated compliance alert from SiteMedic
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  console.log(`Sending admin digest email to ${adminEmail} (${adminName}): ${totalDocs} document(s) across ${totalMedics} medic(s), urgency=${daysRemaining} days`);

  return await sendEmail({
    from: `${orgName} <notifications@sitemedic.app>`,
    to: adminEmail,
    subject,
    html,
  });
}
