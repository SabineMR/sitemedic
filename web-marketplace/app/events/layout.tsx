import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Browse Events - SiteMedic Marketplace',
  description: 'Find events needing medical cover across the UK.',
};

export default function EventsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
