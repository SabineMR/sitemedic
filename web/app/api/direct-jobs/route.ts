/**
 * POST /api/direct-jobs — Create a new direct (self-procured) job
 * GET  /api/direct-jobs — List direct jobs for the current user's company
 *
 * Phase 34.1: Self-Procured Jobs — Plan 01
 *
 * Direct jobs are marketplace_events with source='direct' and 0% platform commission.
 * The POST endpoint creates the client record (or links existing), inserts the event,
 * event_days, and staffing_requirements in a single transaction.
 *
 * Follows the same patterns as web/app/api/marketplace/events/route.ts.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { directJobFormSchema } from '@/lib/direct-jobs/schemas';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    // Validate with Zod
    const parsed = directJobFormSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Verify user is a company admin with marketplace registration
    const { data: company, error: companyError } = await supabase
      .from('marketplace_companies')
      .select('id, verification_status, org_id')
      .eq('admin_user_id', user.id)
      .single();

    if (companyError || !company) {
      return NextResponse.json(
        { error: 'You must be registered as a marketplace company to create direct jobs' },
        { status: 403 }
      );
    }

    // Verify company's organization has an active SiteMedic subscription
    if (!company.org_id) {
      return NextResponse.json(
        { error: 'Your company must be linked to a SiteMedic organization with an active subscription to create direct jobs' },
        { status: 403 }
      );
    }

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('subscription_tier, subscription_status')
      .eq('id', company.org_id)
      .single();

    if (orgError || !org || !org.subscription_tier) {
      return NextResponse.json(
        { error: 'An active SiteMedic subscription is required to create direct jobs' },
        { status: 403 }
      );
    }

    // Block past_due or cancelled subscriptions
    // NULL subscription_status = legacy org not yet on Stripe billing — treat as active (per migration 133)
    const blockedStatuses = ['past_due', 'cancelled'];
    if (org.subscription_status && blockedStatuses.includes(org.subscription_status)) {
      return NextResponse.json(
        { error: 'Your SiteMedic subscription must be active to create direct jobs' },
        { status: 403 }
      );
    }

    // Resolve client: use existing or create new
    let clientId: string | null = null;

    if (data.existing_client_id) {
      // Verify the existing client belongs to this company
      const { data: existingClient, error: clientCheckError } = await supabase
        .from('direct_clients')
        .select('id')
        .eq('id', data.existing_client_id)
        .eq('company_id', company.id)
        .single();

      if (clientCheckError || !existingClient) {
        return NextResponse.json(
          { error: 'Selected client not found or does not belong to your company' },
          { status: 400 }
        );
      }

      clientId = existingClient.id;
    } else {
      // Create new client record
      const { data: newClient, error: clientCreateError } = await supabase
        .from('direct_clients')
        .insert({
          company_id: company.id,
          created_by: user.id,
          client_name: data.client_name,
          contact_name: data.contact_name || null,
          contact_email: data.contact_email || null,
          contact_phone: data.contact_phone || null,
          address_line_1: data.address_line_1 || null,
          address_line_2: data.address_line_2 || null,
          city: data.city || null,
          postcode: data.postcode || null,
        })
        .select('id')
        .single();

      if (clientCreateError || !newClient) {
        console.error('[Direct Jobs POST] Failed to create client:', clientCreateError);
        return NextResponse.json({ error: 'Failed to create client record' }, { status: 500 });
      }

      clientId = newClient.id;
    }

    // Determine initial status
    const saveAsDraft = (body.save_as_draft as boolean) === true;

    // Build event row — source='direct', agreed_price set, no budget_min/max, no quote_deadline
    const eventRow: Record<string, unknown> = {
      posted_by: user.id,
      source: 'direct',
      client_id: clientId,
      event_name: data.event_name,
      event_type: data.event_type,
      event_description: data.event_description || null,
      special_requirements: data.special_requirements || null,
      indoor_outdoor: data.indoor_outdoor,
      expected_attendance: data.expected_attendance || null,
      agreed_price: data.agreed_price,
      location_postcode: data.location_postcode,
      location_address: data.location_address || null,
      location_what3words: data.location_what3words || null,
      location_display: data.location_display || null,
      // Direct jobs don't use quote_deadline — set to far future to satisfy NOT NULL constraint
      quote_deadline: '2099-12-31T23:59:59Z',
      status: saveAsDraft ? 'draft' : 'confirmed',
      equipment_required: data.equipment_required,
    };

    // Insert event
    const { data: event, error: eventError } = await supabase
      .from('marketplace_events')
      .insert(eventRow)
      .select('id')
      .single();

    if (eventError || !event) {
      console.error('[Direct Jobs POST] Failed to create job:', eventError);
      return NextResponse.json({ error: 'Failed to create direct job' }, { status: 500 });
    }

    // Set location_coordinates via raw update if lat/lng provided
    if (data.location_lat != null && data.location_lng != null) {
      const { error: coordError } = await supabase
        .from('marketplace_events')
        .update({
          location_coordinates: `SRID=4326;POINT(${data.location_lng} ${data.location_lat})`,
        } as Record<string, unknown>)
        .eq('id', event.id);

      if (coordError) {
        console.error('[Direct Jobs POST] Coordinate update failed:', coordError);
      }
    }

    // Insert event days
    if (data.event_days.length > 0) {
      const dayRows = data.event_days.map((day, index) => ({
        event_id: event.id,
        event_date: day.event_date,
        start_time: day.start_time,
        end_time: day.end_time,
        sort_order: index,
      }));

      const { error: daysError } = await supabase
        .from('event_days')
        .insert(dayRows);

      if (daysError) {
        console.error('[Direct Jobs POST] Failed to insert event days:', daysError);
      }
    }

    // Insert staffing requirements
    if (data.staffing_requirements.length > 0) {
      const staffingRows = data.staffing_requirements.map((req) => ({
        event_id: event.id,
        event_day_id: req.event_day_id || null,
        role: req.role,
        quantity: req.quantity,
        additional_notes: req.additional_notes || null,
      }));

      const { error: staffingError } = await supabase
        .from('event_staffing_requirements')
        .insert(staffingRows);

      if (staffingError) {
        console.error('[Direct Jobs POST] Failed to insert staffing requirements:', staffingError);
      }
    }

    return NextResponse.json({ success: true, jobId: event.id }, { status: 201 });
  } catch (error) {
    console.error('[Direct Jobs POST] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const offset = (page - 1) * limit;

    // Query direct jobs for current user (source='direct')
    let query = supabase
      .from('marketplace_events')
      .select(
        '*, direct_clients(*), event_days(*), event_staffing_requirements(*)',
        { count: 'exact' }
      )
      .eq('source', 'direct')
      .eq('posted_by', user.id);

    if (status) {
      query = query.eq('status', status);
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: jobs, error, count } = await query;

    if (error) {
      console.error('[Direct Jobs GET] Query error:', error);
      return NextResponse.json({ error: 'Failed to fetch direct jobs' }, { status: 500 });
    }

    // Map joined data
    const mappedJobs = (jobs || []).map((row: Record<string, unknown>) => ({
      ...row,
      client: row.direct_clients || null,
    }));

    return NextResponse.json({
      jobs: mappedJobs,
      total: count || 0,
      page,
      limit,
    });
  } catch (error) {
    console.error('[Direct Jobs GET] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
