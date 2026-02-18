/**
 * Motorsport Incident Queries
 * Phase 23: Gap Closure — Plan 06 (MOTO-07)
 *
 * Generates the Motorsport UK Accident Form PDF via the
 * motorsport-incident-generator Edge Function.
 */

import { createClient } from '@/lib/supabase/client';

/**
 * Generate Motorsport UK Accident Form PDF for a motorsport treatment
 *
 * Calls the motorsport-incident-generator Edge Function and returns
 * a signed URL to the generated PDF in Supabase Storage.
 *
 * @param treatmentId - The treatment UUID to generate the report for
 * @returns Object with success flag, storage path, and signed URL
 */
export async function generateMotorsportIncidentPDF(treatmentId: string): Promise<{
  success: boolean;
  pdf_path: string;
  signed_url: string;
}> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/motorsport-incident-generator`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ incident_id: treatmentId, event_vertical: 'motorsport' }),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to generate Motorsport Incident Report');
  }

  return response.json();
}
