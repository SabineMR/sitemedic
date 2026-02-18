/**
 * Shared branding helpers for PDF and email Edge Functions.
 * Fetches org branding data from org_branding table.
 *
 * Phase 28: Branding — PDFs & Emails
 */

import { SupabaseClient } from 'npm:@supabase/supabase-js@2';

export interface OrgBranding {
  company_name: string;
  logo_path: string | null;
  primary_colour_hex: string | null;
  tagline: string | null;
  logo_url: string | null;
  subscription_tier: string | null;
}

const DEFAULT_BRANDING: OrgBranding = {
  company_name: 'SiteMedic',
  logo_path: null,
  primary_colour_hex: null,
  tagline: null,
  logo_url: null,
  subscription_tier: null,
};

/**
 * Fetch org branding and subscription tier for an organization.
 * Returns default SiteMedic branding if no org_branding row exists.
 */
export async function fetchOrgBranding(
  supabase: SupabaseClient,
  orgId: string
): Promise<OrgBranding> {
  const [brandingResult, orgResult] = await Promise.all([
    supabase
      .from('org_branding')
      .select('company_name, logo_path, primary_colour_hex, tagline')
      .eq('org_id', orgId)
      .single(),
    supabase
      .from('organizations')
      .select('subscription_tier')
      .eq('id', orgId)
      .single(),
  ]);

  const branding = brandingResult.data;
  const org = orgResult.data;

  if (!branding) {
    return { ...DEFAULT_BRANDING, subscription_tier: org?.subscription_tier ?? null };
  }

  const logoUrl = branding.logo_path
    ? `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/org-logos/${branding.logo_path}`
    : null;

  return {
    company_name: branding.company_name || 'SiteMedic',
    logo_path: branding.logo_path,
    primary_colour_hex: branding.primary_colour_hex,
    tagline: branding.tagline,
    logo_url: logoUrl,
    subscription_tier: org?.subscription_tier ?? null,
  };
}

/**
 * Fetch a logo image and convert to a base64 data URI.
 * Used as a reliable fallback for @react-pdf/renderer <Image> in Deno Edge,
 * since remote URL fetching at render time is untested.
 */
export async function fetchLogoAsDataUri(logoUrl: string): Promise<string | null> {
  try {
    const response = await fetch(logoUrl);
    if (!response.ok) return null;

    const contentType = response.headers.get('content-type') || 'image/png';
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // Convert to base64 in chunks to avoid stack overflow on large images
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }
    const base64 = btoa(binary);

    return `data:${contentType};base64,${base64}`;
  } catch {
    return null;
  }
}

/**
 * Check whether "Powered by SiteMedic" attribution should be shown.
 * Starter tier and unset tier show it; Growth and Enterprise do not.
 */
export function showPoweredBySiteMedic(tier: string | null): boolean {
  if (!tier || tier === 'starter') return true;
  return false;
}
