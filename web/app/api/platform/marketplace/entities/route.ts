import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const ENTITY_VALUES = ['events', 'quotes', 'awards', 'disputes', 'users'] as const;
type EntityKey = (typeof ENTITY_VALUES)[number];

const ENTITY_STATUSES: Record<EntityKey, string[]> = {
  events: ['all', 'draft', 'open', 'closed', 'cancelled', 'awarded'],
  quotes: ['all', 'draft', 'submitted', 'revised', 'withdrawn', 'awarded', 'rejected'],
  awards: ['all', 'awarded'],
  disputes: ['all', 'open', 'under_review', 'resolved'],
  users: ['all', 'active', 'inactive'],
};

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase service role env vars not configured');
  return createAdminClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function parseEntity(rawValue: string | null): EntityKey {
  if (rawValue && ENTITY_VALUES.includes(rawValue as EntityKey)) {
    return rawValue as EntityKey;
  }
  return 'events';
}

function parsePage(rawValue: string | null): number {
  const parsed = Number(rawValue ?? '1');
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.floor(parsed);
}

function parseLimit(rawValue: string | null): number {
  const parsed = Number(rawValue ?? '20');
  if (!Number.isFinite(parsed) || parsed < 1) return 20;
  return Math.min(Math.floor(parsed), 100);
}

function parseStatus(entity: EntityKey, rawValue: string | null): string | null {
  if (!rawValue || rawValue === 'all') return null;
  if (ENTITY_STATUSES[entity].includes(rawValue)) {
    return rawValue;
  }
  return null;
}

function normalizeSearch(rawValue: string | null): string {
  if (!rawValue) return '';
  return rawValue.trim().replace(/[%_]/g, '').slice(0, 120);
}

function buildRange(page: number, limit: number): { from: number; to: number } {
  const from = (page - 1) * limit;
  return { from, to: from + limit - 1 };
}

async function lookupEventIdsByName(serviceClient: ReturnType<typeof getServiceClient>, search: string) {
  const { data, error } = await serviceClient
    .from('marketplace_events')
    .select('id')
    .ilike('event_name', `%${search}%`)
    .limit(50);

  if (error) throw error;
  return (data || []).map((row) => row.id as string);
}

async function lookupCompanyIdsByName(serviceClient: ReturnType<typeof getServiceClient>, search: string) {
  const { data, error } = await serviceClient
    .from('marketplace_companies')
    .select('id')
    .ilike('company_name', `%${search}%`)
    .limit(50);

  if (error) throw error;
  return (data || []).map((row) => row.id as string);
}

async function listEvents(
  serviceClient: ReturnType<typeof getServiceClient>,
  status: string | null,
  search: string,
  page: number,
  limit: number
) {
  const { from, to } = buildRange(page, limit);

  let query = serviceClient
    .from('marketplace_events')
    .select(
      'id, event_name, event_type, status, location_postcode, quote_deadline, quote_count, created_at, posted_by',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);
  if (search) {
    query = query.or(`event_name.ilike.%${search}%,location_postcode.ilike.%${search}%`);
  }

  const { data, error, count } = await query.range(from, to);
  if (error) throw error;

  return {
    total: count || 0,
    items: (data || []).map((row) => ({
      id: row.id,
      entity: 'events',
      status: row.status,
      createdAt: row.created_at,
      primaryText: row.event_name,
      secondaryText: `${row.event_type} | ${row.location_postcode}`,
      amount: null,
      metadata: {
        quoteCount: row.quote_count,
        quoteDeadline: row.quote_deadline,
        postedBy: row.posted_by,
      },
    })),
  };
}

async function listQuotes(
  serviceClient: ReturnType<typeof getServiceClient>,
  status: string | null,
  search: string,
  page: number,
  limit: number
) {
  const { from, to } = buildRange(page, limit);

  let query = serviceClient
    .from('marketplace_quotes')
    .select(
      'id, status, total_price, submitted_at, created_at, event_id, company_id, event:marketplace_events!marketplace_quotes_event_id_fkey(id,event_name), company:marketplace_companies!marketplace_quotes_company_id_fkey(id,company_name)',
      { count: 'exact' }
    )
    .order('submitted_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);
  if (search) {
    const [eventIds, companyIds] = await Promise.all([
      lookupEventIdsByName(serviceClient, search),
      lookupCompanyIdsByName(serviceClient, search),
    ]);

    const clauses: string[] = [];
    if (eventIds.length > 0) clauses.push(`event_id.in.(${eventIds.join(',')})`);
    if (companyIds.length > 0) clauses.push(`company_id.in.(${companyIds.join(',')})`);

    if (clauses.length === 0) {
      return { total: 0, items: [] };
    }

    query = query.or(clauses.join(','));
  }

  const { data, error, count } = await query.range(from, to);
  if (error) throw error;

  return {
    total: count || 0,
    items: (data || []).map((row) => {
      const event = Array.isArray(row.event) ? row.event[0] : row.event;
      const company = Array.isArray(row.company) ? row.company[0] : row.company;
      return {
        id: row.id,
        entity: 'quotes',
        status: row.status,
        createdAt: row.submitted_at || row.created_at,
        primaryText: event?.event_name || row.event_id,
        secondaryText: company?.company_name || row.company_id,
        amount: Number(row.total_price || 0),
        metadata: {
          eventId: row.event_id,
          companyId: row.company_id,
        },
      };
    }),
  };
}

async function listAwards(
  serviceClient: ReturnType<typeof getServiceClient>,
  search: string,
  page: number,
  limit: number
) {
  const { from, to } = buildRange(page, limit);

  let query = serviceClient
    .from('marketplace_award_history')
    .select(
      'id, event_id, winning_quote_id, awarded_by, awarded_at, total_amount, deposit_amount, deposit_percent, event:marketplace_events!marketplace_award_history_event_id_fkey(id,event_name)',
      { count: 'exact' }
    )
    .order('awarded_at', { ascending: false });

  if (search) {
    const eventIds = await lookupEventIdsByName(serviceClient, search);
    if (eventIds.length === 0) {
      return { total: 0, items: [] };
    }
    query = query.in('event_id', eventIds);
  }

  const { data, error, count } = await query.range(from, to);
  if (error) throw error;

  return {
    total: count || 0,
    items: (data || []).map((row) => {
      const event = Array.isArray(row.event) ? row.event[0] : row.event;
      return {
        id: row.id,
        entity: 'awards',
        status: 'awarded',
        createdAt: row.awarded_at,
        primaryText: event?.event_name || row.event_id,
        secondaryText: `Winning quote: ${row.winning_quote_id}`,
        amount: Number(row.total_amount || 0),
        metadata: {
          eventId: row.event_id,
          awardedBy: row.awarded_by,
          depositAmount: Number(row.deposit_amount || 0),
          depositPercent: row.deposit_percent,
        },
      };
    }),
  };
}

async function listDisputes(
  serviceClient: ReturnType<typeof getServiceClient>,
  status: string | null,
  search: string,
  page: number,
  limit: number
) {
  const { from, to } = buildRange(page, limit);

  let query = serviceClient
    .from('marketplace_disputes')
    .select(
      'id, event_id, status, category, filed_by, filed_by_type, created_at, resolved_at, resolution_type, event:marketplace_events!marketplace_disputes_event_id_fkey(id,event_name)',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);

  if (search) {
    const eventIds = await lookupEventIdsByName(serviceClient, search);
    if (eventIds.length === 0) {
      return { total: 0, items: [] };
    }
    query = query.in('event_id', eventIds);
  }

  const { data, error, count } = await query.range(from, to);
  if (error) throw error;

  return {
    total: count || 0,
    items: (data || []).map((row) => {
      const event = Array.isArray(row.event) ? row.event[0] : row.event;
      return {
        id: row.id,
        entity: 'disputes',
        status: row.status,
        createdAt: row.created_at,
        primaryText: event?.event_name || row.event_id,
        secondaryText: row.category,
        amount: null,
        metadata: {
          filedBy: row.filed_by,
          filedByType: row.filed_by_type,
          resolutionType: row.resolution_type,
          resolvedAt: row.resolved_at,
        },
      };
    }),
  };
}

async function listUsers(
  serviceClient: ReturnType<typeof getServiceClient>,
  status: string | null,
  search: string,
  page: number,
  limit: number
) {
  const { from, to } = buildRange(page, limit);

  let query = serviceClient
    .from('profiles')
    .select('id, email, full_name, role, is_active, created_at', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (status === 'active') query = query.eq('is_active', true);
  if (status === 'inactive') query = query.eq('is_active', false);

  if (search) {
    query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
  }

  const { data, error, count } = await query.range(from, to);
  if (error) throw error;

  const userIds = (data || []).map((row) => row.id as string);
  let companyMap = new Map<
    string,
    { id: string; companyName: string; canSubmitQuotes: boolean; verificationStatus: string }
  >();

  if (userIds.length > 0) {
    const { data: companies, error: companiesError } = await serviceClient
      .from('marketplace_companies')
      .select('id, admin_user_id, company_name, can_submit_quotes, verification_status')
      .in('admin_user_id', userIds);

    if (companiesError) throw companiesError;

    companyMap = new Map(
      (companies || []).map((company) => [
        company.admin_user_id,
        {
          id: company.id,
          companyName: company.company_name,
          canSubmitQuotes: Boolean(company.can_submit_quotes),
          verificationStatus: company.verification_status,
        },
      ])
    );
  }

  return {
    total: count || 0,
    items: (data || []).map((row) => {
      const isActive = row.is_active !== false;
      const company = companyMap.get(row.id);
      return {
        id: row.id,
        entity: 'users',
        status: isActive ? 'active' : 'inactive',
        createdAt: row.created_at,
        primaryText: row.full_name || row.email || row.id,
        secondaryText: row.email || null,
        amount: null,
        metadata: {
          role: row.role,
          isActive,
          company,
        },
      };
    }),
  };
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (user.app_metadata?.role !== 'platform_admin') {
      return NextResponse.json({ error: 'Forbidden - platform admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const entity = parseEntity(searchParams.get('entity'));
    const page = parsePage(searchParams.get('page'));
    const limit = parseLimit(searchParams.get('limit'));
    const status = parseStatus(entity, searchParams.get('status'));
    const search = normalizeSearch(searchParams.get('search'));

    const serviceClient = getServiceClient();

    let result: { total: number; items: Array<Record<string, unknown>> };

    if (entity === 'events') {
      result = await listEvents(serviceClient, status, search, page, limit);
    } else if (entity === 'quotes') {
      result = await listQuotes(serviceClient, status, search, page, limit);
    } else if (entity === 'awards') {
      result = await listAwards(serviceClient, search, page, limit);
    } else if (entity === 'disputes') {
      result = await listDisputes(serviceClient, status, search, page, limit);
    } else {
      result = await listUsers(serviceClient, status, search, page, limit);
    }

    const totalPages = Math.max(1, Math.ceil(result.total / limit));

    return NextResponse.json(
      {
        entity,
        page,
        limit,
        total: result.total,
        totalPages,
        availableStatuses: ENTITY_STATUSES[entity],
        items: result.items,
      },
      {
        status: 200,
        headers: { 'Cache-Control': 'no-store' },
      }
    );
  } catch (error) {
    console.error('Platform marketplace entities API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
