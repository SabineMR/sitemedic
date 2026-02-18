/**
 * Page Footer Component
 * Phase 28: Branding — PDFs & Emails
 */

import type { OrgBranding } from '../../_shared/branding-helpers.ts';
import { showPoweredBySiteMedic } from '../../_shared/branding-helpers.ts';
import { BrandedPdfFooter } from '../../_shared/pdf-branding.tsx';

interface FooterProps {
  projectName: string;
  branding: OrgBranding;
}

export function Footer({ projectName, branding }: FooterProps) {
  return (
    <BrandedPdfFooter
      companyName={branding.company_name}
      showPoweredBy={showPoweredBySiteMedic(branding.subscription_tier)}
      projectName={projectName}
    />
  );
}
