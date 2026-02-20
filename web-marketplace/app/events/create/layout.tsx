import { Suspense } from 'react';

export const metadata = { title: 'Post an Event - SiteMedic Marketplace' };

export default function CreateEventLayout({ children }: { children: React.ReactNode }) {
  return <Suspense>{children}</Suspense>;
}
