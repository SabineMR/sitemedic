import type { Metadata } from 'next';
import { headers } from 'next/headers';
import './globals.css';
import CookieConsent from '@/components/CookieConsent';
import SkipToContent from '@/components/SkipToContent';
import { OrgProvider } from '@/contexts/org-context';
import { BrandingProvider } from '@/contexts/branding-context';
import { Toaster } from 'sonner';

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const companyName = headersList.get('x-org-company-name') || '';

  return {
    title: companyName
      ? { template: `%s \u2014 ${companyName}`, default: `${companyName} \u2014 SiteMedic` }
      : { template: '%s \u2014 SiteMedic', default: 'SiteMedic \u2014 Professional Paramedics for Events, Productions & Worksites' },
    description: 'Book HCPC-registered paramedics for film sets, music festivals, motorsport events, construction sites, sporting events and more. Compliance records generated automatically via SiteMedic.',
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();

  const branding = {
    companyName: headersList.get('x-org-company-name') || '',
    logoUrl: headersList.get('x-org-logo-url') || '',
    primaryColour: headersList.get('x-org-primary-colour') || '',
    tagline: headersList.get('x-org-tagline') || '',
    isSubdomain: !!headersList.get('x-org-slug'),
  };

  return (
    <html lang="en-GB">
      <body className="antialiased">
        <OrgProvider>
          <BrandingProvider branding={branding}>
            <SkipToContent />
            {children}
            <CookieConsent />
            <Toaster richColors position="top-right" />
          </BrandingProvider>
        </OrgProvider>
      </body>
    </html>
  );
}
