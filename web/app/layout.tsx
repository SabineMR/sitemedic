import type { Metadata } from 'next';
import './globals.css';
import CookieConsent from '@/components/CookieConsent';
import SkipToContent from '@/components/SkipToContent';

export const metadata: Metadata = {
  title: 'Guardian Medics - Professional Paramedics for UK Construction Sites',
  description: 'Book qualified paramedics for your construction site. Guardian Medics provides expert care with built-in compliance technology powered by SiteMedic—RIDDOR reports generated automatically.',
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
