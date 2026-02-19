import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Booking Confirmation' };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
