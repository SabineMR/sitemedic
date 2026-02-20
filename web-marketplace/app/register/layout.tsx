/**
 * Layout for Marketplace Company Registration
 * Phase 32: Foundation Schema & Registration
 *
 * Clean, public-facing layout (no dashboard sidebar/header).
 * Follows the pattern from the signup page with centered content,
 * SiteMedic branding, and a progress-friendly design.
 */

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Register Your Company | SiteMedic Marketplace',
  description:
    'Register your CQC-regulated medical company on the SiteMedic Marketplace to bid on events needing medical cover.',
};

export default function MarketplaceRegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800">
      {children}
    </div>
  );
}
