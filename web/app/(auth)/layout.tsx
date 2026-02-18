/**
 * Auth layout
 *
 * Simple centered layout for login page without dashboard shell.
 * Reads x-org-primary-colour from middleware headers and injects it as a
 * CSS custom property for branded accent colours on subdomain login pages.
 */

import { headers } from 'next/headers';

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const primaryColour = headersList.get('x-org-primary-colour') || '';

  return (
    <div
      className="min-h-screen bg-background flex items-center justify-center p-4"
      style={primaryColour ? { '--org-primary': primaryColour } as React.CSSProperties : undefined}
    >
      {children}
    </div>
  );
}
