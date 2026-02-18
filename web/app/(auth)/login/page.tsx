/**
 * Login page — server component
 *
 * Reads x-org-* headers from middleware to pass org branding to the login form.
 * On subdomain (e.g., apex.sitemedic.co.uk/login), shows org's branding.
 * On apex domain (sitemedic.co.uk/login), shows SiteMedic defaults.
 */

import { headers } from 'next/headers';
import { Suspense } from 'react';
import { LoginForm } from './login-form';

export default async function LoginPage() {
  const headersList = await headers();

  const branding = {
    companyName: headersList.get('x-org-company-name') || 'SiteMedic',
    logoUrl: headersList.get('x-org-logo-url') || '',
    primaryColour: headersList.get('x-org-primary-colour') || '',
    tagline: headersList.get('x-org-tagline') || 'Site Manager Dashboard',
    isSubdomain: !!headersList.get('x-org-slug'),
  };

  return (
    <Suspense>
      <LoginForm branding={branding} />
    </Suspense>
  );
}
