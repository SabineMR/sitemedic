import type { Metadata } from 'next';
import './globals.css';
import CookieConsent from '@/components/CookieConsent';
import SkipToContent from '@/components/SkipToContent';
import { OrgProvider } from '@/contexts/org-context';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: 'Apex Safety Group - Professional Paramedics for Events, Productions & Worksites',
  description: 'Book HCPC-registered paramedics for film sets, music festivals, motorsport events, construction sites, sporting events and more. Apex Safety Group — compliance records generated automatically via SiteMedic.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-GB">
      <body className="antialiased">
        <OrgProvider>
          <SkipToContent />
          {children}
          <CookieConsent />
          <Toaster richColors position="top-right" />
        </OrgProvider>
      </body>
    </html>
  );
}
