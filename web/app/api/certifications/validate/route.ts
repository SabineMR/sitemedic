/**
 * Certification Validation API Endpoint
 *
 * Enforces CERT-06 requirement: Workers with expired certifications
 * cannot be selected for incident logging.
 *
 * POST /api/certifications/validate
 * Body: { worker_id: string } // Note: worker_id refers to medic_id in practice
 *
 * Returns:
 * - 200 if all certifications are valid
 * - 403 if any certifications are expired with detailed error message
 * - 404 if worker/medic not found
 * - 400 if worker_id is missing
 */

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { Certification } from '@/types/certification.types';

export async function POST(request: Request) {
  try {
    // Parse request body
    const body = await request.json();
    const { worker_id } = body;

    // Validate worker_id is provided
    if (!worker_id) {
      return NextResponse.json(
        { error: 'worker_id is required' },
        { status: 400 }
      );
    }

    // Create Supabase client
    const supabase = await createClient();

    // Fetch medic by id (worker_id is actually medic_id in this context)
    const { data: medic, error } = await supabase
      .from('medics')
      .select('id, first_name, last_name, certifications')
      .eq('id', worker_id)
      .single();

    // If not found, return 404
    if (error || !medic) {
      return NextResponse.json(
        { error: 'Worker not found' },
        { status: 404 }
      );
    }

    // Parse certifications JSONB as Certification[]
    const certifications: Certification[] = Array.isArray(medic.certifications)
      ? medic.certifications
      : [];

    // Filter expired certs using date comparison
    const now = new Date();
    const expiredCerts = certifications.filter((cert) => {
      const expiryDate = new Date(cert.expiry_date);
      return expiryDate < now;
    });

    // Build worker name
    const workerName = `${medic.first_name} ${medic.last_name}`;

    // If there are expired certs, return 403
    if (expiredCerts.length > 0) {
      const expiredCertTypes = expiredCerts.map((cert) => cert.type);

      return NextResponse.json(
        {
          valid: false,
          error: 'Worker has expired certification(s)',
          expired_certs: expiredCertTypes,
          message: `Worker ${workerName} has ${expiredCerts.length} expired certification(s): ${expiredCertTypes.join(', ')}. Workers with expired certifications cannot be selected for incident logging.`,
          worker_name: workerName,
        },
        { status: 403 }
      );
    }

    // If no expired certs, return 200
    return NextResponse.json({
      valid: true,
      expired_certs: [],
      worker_name: workerName,
    });
  } catch (err) {
    console.error('Error validating certifications:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
