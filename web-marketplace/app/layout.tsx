import type { Metadata } from 'next';
import './globals.css';
import { OrgProvider } from '@/contexts/org-context';
import { QueryProvider } from '@/components/providers/query-provider';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: {
    template: '%s — SiteMedic Marketplace',
    default: 'SiteMedic Marketplace — CQC-Verified Medical Cover for Events',
  },
  description:
    'Post your event and receive itemized quotes from CQC-registered medical companies across England & Wales. Compare staffing plans, verify compliance, and pay securely.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-GB">
      <body className="antialiased">
        <QueryProvider>
          <OrgProvider>
            {children}
            <Toaster richColors position="top-right" />
          </OrgProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
