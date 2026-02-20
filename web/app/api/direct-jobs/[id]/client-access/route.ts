/**
 * GET /api/direct-jobs/[id]/client-access
 * Phase 34.1: Self-Procured Jobs -- Plan 05
 *
 * Returns a client-safe view of a direct job, excluding all medic personal
 * information (no names, IDs, or contact info). Staffing is aggregated to
 * role counts only (e.g. "2 Paramedics, 1 EMT").
 *
 * Access: Company admin who created the job (full view).
 * Future: Client users linked to the job's client record (client view).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { StaffingRole } from '@/lib/marketplace/event-types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// =============================================================================
// Client-safe response type (exported for reuse in components)
// =============================================================================

export interface ClientSafeJob {
  id: string;
  event_name: string;
  status: string;
  event_type: string;
  event_description: string | null;
  special_requirements: string | null;
  indoor_outdoor: string;
  expected_attendance: number | null;
  agreed_price: number;
  deposit_percent: number;
  location_postcode: string;
  location_address: string | null;
  equipment_required: Array<{ type: string; notes?: string }>;
  event_days: Array<{ event_date: string; start_time: string; end_time: string }>;
  staffing_summary: Array<{ role: string; total_quantity: number }>;
  client: {
    client_name: string;
    contact_name: string | null;
    contact_email: string | null;
    contact_phone: string | null;
  } | null;
  payment: {
    deposit_amount: number;
    deposit_paid: boolean;
    remainder_amount: number;
    total_paid: number;
  };
  compliance_reports: Array<{ id: string; report_date: string; pdf_url: string }>;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Fetch the direct job with related data (no medic-specific joins)
    const { data: job, error } = await supabase
      .from('marketplace_events')
      .select(`
        id,
        posted_by,
        event_name,
        status,
        event_type,
        event_description,
        special_requirements,
        indoor_outdoor,
        expected_attendance,
        agreed_price,
        location_postcode,
        location_address,
        equipment_required,
        source,
        client_id,
        direct_clients (
          client_name,
          contact_name,
          contact_email,
          contact_phone
        ),
        event_days (
          event_date,
          start_time,
          end_time
        ),
        event_staffing_requirements (
          role,
          quantity
        )
      `)
      .eq('id', id)
      .eq('source', 'direct')
      .single();

    if (error || !job) {
      return NextResponse.json({ error: 'Direct job not found' }, { status: 404 });
    }

    // Auth: verify the requesting user is the company admin who created this job
    if (job.posted_by !== user.id) {
      return NextResponse.json({ error: 'Not authorised to view this job' }, { status: 403 });
    }

    // Aggregate staffing requirements by role (no individual medic info)
    const staffingMap = new Map<string, number>();
    const staffingReqs = (job.event_staffing_requirements || []) as Array<{
      role: StaffingRole;
      quantity: number;
    }>;
    for (const req of staffingReqs) {
      const current = staffingMap.get(req.role) || 0;
      staffingMap.set(req.role, current + req.quantity);
    }
    const staffing_summary = Array.from(staffingMap.entries()).map(
      ([role, total_quantity]) => ({ role, total_quantity })
    );

    // Calculate payment summary (deposit is a percentage of agreed_price)
    const agreedPrice = Number(job.agreed_price) || 0;
    // Default deposit_percent is 25% for direct jobs
    const depositPercent = 25;
    const depositAmount = Math.round(agreedPrice * (depositPercent / 100) * 100) / 100;
    const remainderAmount = Math.round((agreedPrice - depositAmount) * 100) / 100;

    // Build the client-safe response -- NO medic IDs, names, or contact info
    const clientSafe: ClientSafeJob = {
      id: job.id,
      event_name: job.event_name,
      status: job.status,
      event_type: job.event_type,
      event_description: job.event_description,
      special_requirements: job.special_requirements,
      indoor_outdoor: job.indoor_outdoor,
      expected_attendance: job.expected_attendance,
      agreed_price: agreedPrice,
      deposit_percent: depositPercent,
      location_postcode: job.location_postcode,
      location_address: job.location_address,
      equipment_required: (job.equipment_required || []) as Array<{ type: string; notes?: string }>,
      event_days: ((job.event_days || []) as Array<{ event_date: string; start_time: string; end_time: string }>)
        .sort((a, b) => a.event_date.localeCompare(b.event_date)),
      staffing_summary,
      client: job.direct_clients
        ? (() => {
            // Supabase returns object for FK-based joins; cast through unknown for safety
            const dc = job.direct_clients as unknown as {
              client_name: string;
              contact_name: string | null;
              contact_email: string | null;
              contact_phone: string | null;
            };
            return {
              client_name: dc.client_name,
              contact_name: dc.contact_name,
              contact_email: dc.contact_email,
              contact_phone: dc.contact_phone,
            };
          })()
        : null,
      payment: {
        deposit_amount: depositAmount,
        deposit_paid: false, // Will be driven by Stripe PaymentIntent status in Phase 35
        remainder_amount: remainderAmount,
        total_paid: 0, // Will be updated when payment integration is complete
      },
      compliance_reports: [], // Will be populated when compliance reporting is integrated
    };

    return NextResponse.json({ job: clientSafe });
  } catch (error) {
    console.error('[Client Access GET] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
