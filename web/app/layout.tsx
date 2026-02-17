import type { Metadata } from 'next';
import './globals.css';
import CookieConsent from '@/components/CookieConsent';
import SkipToContent from '@/components/SkipToContent';
import { OrgProvider } from '@/contexts/org-context';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: 'Apex Safety Group - Professional Paramedics for UK Construction Sites',
  description: 'Book qualified paramedics for your construction site. Apex Safety Group provides expert care with built-in compliance technology powered by SiteMedic—RIDDOR reports generated automatically.',
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
