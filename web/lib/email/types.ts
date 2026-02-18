/**
 * Org branding data for email templates.
 * Fetched from org_branding table before rendering any transactional email.
 *
 * Phase 28: Branding — PDFs & Emails
 */
export interface EmailBranding {
  companyName: string;
  logoUrl: string | null;
  primaryColourHex: string | null;
  tagline: string | null;
  showPoweredBy: boolean;
}

/** Default branding when no org branding is configured. */
export const DEFAULT_EMAIL_BRANDING: EmailBranding = {
  companyName: 'SiteMedic',
  logoUrl: null,
  primaryColourHex: '#2563eb',
  tagline: null,
  showPoweredBy: true,
};
