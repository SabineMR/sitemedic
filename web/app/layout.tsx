import type { Metadata } from 'next';
import './globals.css';
import CookieConsent from '@/components/CookieConsent';
import SkipToContent from '@/components/SkipToContent';

export const metadata: Metadata = {
  title: 'SiteMedic - UK Paramedic Staffing for Construction Sites',
  description: 'Book qualified paramedics for your construction site. Our medics provide professional care with built-in compliance technology—RIDDOR reports generated automatically.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-GB">
      <body className="antialiased">
        <SkipToContent />
        {children}
        <CookieConsent />
      </body>
    </html>
  );
}
