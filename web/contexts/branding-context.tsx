'use client';

/**
 * Branding Context
 *
 * Provides org branding to client-side components via React context.
 * Props are passed from the root layout server component which reads
 * x-org-* headers injected by middleware (Phase 26).
 *
 * Also injects a <style> tag setting :root { --org-primary } CSS custom
 * property so Tailwind arbitrary value classes like bg-[color:var(--org-primary)]
 * work throughout the app.
 *
 * This context is SEPARATE from OrgContext — OrgContext provides org_id/role
 * from the JWT; BrandingContext provides visual branding from SSR headers.
 */

import { createContext, useContext, type ReactNode } from 'react';

/** Org branding values resolved from x-org-* headers */
export interface Branding {
  companyName: string;
  logoUrl: string;
  primaryColour: string;
  tagline: string;
  isSubdomain: boolean;
}

/** SiteMedic defaults — used when no org branding is configured */
export const DEFAULT_BRANDING: Branding = {
  companyName: 'SiteMedic',
  logoUrl: '',
  primaryColour: '#2563eb',
  tagline: '',
  isSubdomain: false,
};

const BrandingContext = createContext<Branding>(DEFAULT_BRANDING);

interface BrandingProviderProps {
  branding: Partial<Branding>;
  children: ReactNode;
}

/**
 * BrandingProvider — wraps children with org branding context + CSS custom property.
 *
 * Renders a <style> tag injecting --org-primary at :root level so it's
 * available to all components (including those that render before context resolves).
 */
export function BrandingProvider({ branding, children }: BrandingProviderProps) {
  const merged: Branding = { ...DEFAULT_BRANDING, ...branding };

  // Use provided colour if valid hex, otherwise fall back to default
  const safeColour = /^#[0-9a-fA-F]{6}$/.test(merged.primaryColour)
    ? merged.primaryColour
    : DEFAULT_BRANDING.primaryColour;

  return (
    <BrandingContext.Provider value={{ ...merged, primaryColour: safeColour }}>
      <style>{`:root { --org-primary: ${safeColour}; }`}</style>
      {children}
    </BrandingContext.Provider>
  );
}

/**
 * Hook to access org branding in client components.
 *
 * @returns Branding values (companyName, logoUrl, primaryColour, tagline, isSubdomain)
 */
export function useBranding(): Branding {
  const context = useContext(BrandingContext);

  if (context === undefined) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }

  return context;
}
