import type { Metadata } from 'next';
import './globals.css';
import CookieConsent from '@/components/CookieConsent';

export const metadata: Metadata = {
  title: 'SiteMedic - Automatic Compliance for Construction Site Medics',
  description: 'Turn clinical work into automatic compliance documentation. RIDDOR-ready reports in 60 seconds.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <CookieConsent />
      </body>
    </html>
  );
}
