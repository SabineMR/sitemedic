/**
 * POST /api/marketplace/cqc-verify
 * Phase 32: Marketplace Company Registration
 *
 * Instant CQC provider verification endpoint.
 * Proxies to the CQC public API via our cqc-client.
 *
 * No authentication required (CQC API is public), but
 * we log requests and could add rate limiting in the future.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyCQCProvider } from '@/lib/marketplace/cqc-client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    let body: { cqcProviderId?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { valid: false, error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const { cqcProviderId } = body;

    if (!cqcProviderId || typeof cqcProviderId !== 'string') {
      return NextResponse.json(
        { valid: false, error: 'cqcProviderId is required' },
        { status: 400 }
      );
    }

    // Log the verification attempt (for future rate limiting / audit)
    const clientIp =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      'unknown';
    console.log(
      `[CQC Verify] IP=${clientIp} providerId=${cqcProviderId.trim()}`
    );

    // Call the CQC client
    const result = await verifyCQCProvider(cqcProviderId);

    return NextResponse.json({
      valid: result.valid,
      providerName: result.provider?.providerName ?? null,
      registrationStatus: result.provider?.registrationStatus ?? null,
      error: result.error ?? null,
    });
  } catch (error) {
    console.error('[CQC Verify] Unexpected error:', error);
    return NextResponse.json(
      { valid: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
