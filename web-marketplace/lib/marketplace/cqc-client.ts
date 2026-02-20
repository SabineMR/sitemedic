/**
 * CQC API Client
 * Phase 32: Foundation Schema & Registration
 *
 * Wraps the public CQC API (api.cqc.org.uk/public/v1) for provider verification.
 * Designed for use in Next.js API routes (NOT Supabase Edge Functions which use Deno).
 *
 * The CQC API is free, requires no authentication, and supports 2,000 requests/minute
 * when a partnerCode is provided.
 */

import type { CQCProvider, CQCVerificationResult } from './types';

const CQC_BASE_URL = 'https://api.cqc.org.uk/public/v1';
const CQC_PARTNER_CODE = process.env.CQC_PARTNER_CODE || 'SiteMedic';

/**
 * Verify a CQC provider ID against the CQC public API.
 *
 * @param providerId - The CQC provider ID to verify (e.g. "1-123456789")
 * @returns Verification result with valid flag, provider data, and any error message
 *
 * @example
 * ```ts
 * const result = await verifyCQCProvider('1-123456789');
 * if (result.valid) {
 *   console.log(`Verified: ${result.provider?.providerName}`);
 * } else {
 *   console.log(`Failed: ${result.error}`);
 * }
 * ```
 */
export async function verifyCQCProvider(
  providerId: string
): Promise<CQCVerificationResult> {
  // Input validation
  if (!providerId || typeof providerId !== 'string') {
    return { valid: false, provider: null, error: 'Invalid provider ID' };
  }

  const trimmedId = providerId.trim();
  if (trimmedId.length === 0) {
    return { valid: false, provider: null, error: 'Provider ID cannot be empty' };
  }

  try {
    const url = `${CQC_BASE_URL}/providers/${encodeURIComponent(trimmedId)}?partnerCode=${CQC_PARTNER_CODE}`;

    const response = await fetch(url, {
      cache: 'no-store', // No caching — always fetch fresh CQC data
    });

    if (response.status === 404) {
      return { valid: false, provider: null, error: 'CQC provider not found' };
    }

    if (!response.ok) {
      return {
        valid: false,
        provider: null,
        error: `CQC API error: ${response.status}`,
      };
    }

    const data = await response.json();

    const provider: CQCProvider = {
      providerId: data.providerId ?? trimmedId,
      providerName: data.providerName ?? '',
      registrationStatus: data.registrationStatus ?? 'Unknown',
      registrationDate: data.registrationDate ?? '',
      organisationType: data.organisationType ?? '',
      locationIds: data.locationIds ?? [],
    };

    const isRegistered = provider.registrationStatus === 'Registered';

    return {
      valid: isRegistered,
      provider,
      error: !isRegistered
        ? `CQC status is "${provider.registrationStatus}", not "Registered"`
        : undefined,
    };
  } catch (err) {
    return {
      valid: false,
      provider: null,
      error: `CQC API request failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
    };
  }
}
