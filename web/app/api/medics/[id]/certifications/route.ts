/**
 * GET  /api/medics/[id]/certifications
 * PATCH /api/medics/[id]/certifications
 *
 * GET  — Return the certifications array for a medic with computed status
 *         (valid / expiring-soon / expired) and renewal URL from CERT_TYPE_METADATA.
 * PATCH — Replace the full certifications JSONB array for a medic.
 *          Accepts an array of Certification objects and writes them to medics.certifications.
 *
 * Access: org_admin only (RLS enforced by Supabase; org_id scoped).
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import type { Certification, CertificationStatus } from '@/types/certification.types';
import { CERT_TYPE_METADATA } from '@/types/certification.types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function computeStatus(expiryDate: string): CertificationStatus {
  const daysRemaining = Math.ceil(
    (new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  if (daysRemaining <= 0) return 'expired';
  if (daysRemaining <= 30) return 'expiring-soon';
  return 'valid';
}

// ---------------------------------------------------------------------------
// GET
// ---------------------------------------------------------------------------

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: medicId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // RLS ensures this medic belongs to the caller's org
  const { data: medic, error } = await supabase
    .from('medics')
    .select('id, first_name, last_name, certifications')
    .eq('id', medicId)
    .single();

  if (error || !medic) {
    return NextResponse.json({ error: 'Medic not found' }, { status: 404 });
  }

  const certs: Certification[] = Array.isArray(medic.certifications)
    ? medic.certifications
    : [];

  // Annotate each cert with computed status and renewal URL
  const annotated = certs.map((cert) => {
    const meta = CERT_TYPE_METADATA[cert.type as keyof typeof CERT_TYPE_METADATA];
    return {
      ...cert,
      status: computeStatus(cert.expiry_date),
      label: meta?.label ?? cert.type,
      renewal_url: meta?.renewalUrl ?? null,
    };
  });

  return NextResponse.json({
    medic_id: medic.id,
    medic_name: `${medic.first_name} ${medic.last_name}`,
    certifications: annotated,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: medicId } = await params;
  const supabase = await createClient();

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { certifications?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!Array.isArray(body.certifications)) {
    return NextResponse.json({ error: 'certifications must be an array' }, { status: 400 });
  }

  // Basic shape validation — each entry must have at minimum type + expiry_date
  const certs = body.certifications as Certification[];
  for (const cert of certs) {
    if (!cert.type || typeof cert.type !== 'string') {
      return NextResponse.json({ error: 'Each certification must have a type' }, { status: 400 });
    }
    if (!cert.expiry_date || typeof cert.expiry_date !== 'string') {
      return NextResponse.json({ error: 'Each certification must have an expiry_date (YYYY-MM-DD)' }, { status: 400 });
    }
  }

  // RLS ensures the medic belongs to the admin's org
  const { data, error } = await supabase
    .from('medics')
    .update({ certifications: certs })
    .eq('id', medicId)
    .select('id, certifications')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ medic_id: data.id, certifications: data.certifications });
}
