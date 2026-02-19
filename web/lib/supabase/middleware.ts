/**
 * Supabase middleware client for session refresh, auth protection, and subdomain routing
 *
 * Uses @supabase/ssr with request/response cookie handling.
 * This client should ONLY be used in middleware.ts.
 *
 * Subdomain routing (Phase 26):
 * - Extracts subdomain from host header (e.g., apex.sitemedic.co.uk → 'apex')
 * - Looks up org by slug using service-role client (bypasses RLS)
 * - Injects x-org-* headers for downstream SSR pages to consume
 * - Strips incoming x-org-* headers to prevent header injection (CVE-2025-29927)
 *
 * Cookie scope: @supabase/ssr does NOT set explicit cookie domain.
 * Browser defaults to the exact hostname (e.g., apex.sitemedic.co.uk).
 * This ensures session isolation between org subdomains — a session on
 * apex.sitemedic.co.uk is NOT accessible from another.sitemedic.co.uk.
 * NEVER add domain: '.sitemedic.co.uk' to cookie options.
 */

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Extract subdomain from the request host header.
 * Returns the subdomain string (e.g., 'apex') or null for apex/www/preview domains.
 */
function extractSubdomain(request: NextRequest): string | null {
  const hostname = request.headers.get('host') ?? '';
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'sitemedic.co.uk';

  // Apex domain and www — no subdomain
  if (hostname === rootDomain || hostname === `www.${rootDomain}`) {
    return null;
  }

  // Vercel preview deployments — skip subdomain logic
  if (hostname.endsWith('.vercel.app')) {
    return null;
  }

  // Strip port for comparison (handles localhost:30500 and sitemedic.co.uk:443)
  const hostnameWithoutPort = hostname.split(':')[0];
  const rootWithoutPort = rootDomain.split(':')[0];

  // Match: tenant.sitemedic.co.uk or tenant.localhost
  if (hostnameWithoutPort.endsWith(`.${rootWithoutPort}`)) {
    const subdomain = hostnameWithoutPort.replace(`.${rootWithoutPort}`, '');
    return subdomain || null;
  }

  return null;
}

/** Headers injected by middleware for org context — stripped from incoming requests */
const ORG_HEADERS = [
  'x-org-id', 'x-org-slug', 'x-org-tier',
  'x-org-company-name', 'x-org-primary-colour',
  'x-org-logo-url', 'x-org-tagline',
] as const;

export async function updateSession(request: NextRequest) {
  // SECURITY: Strip any externally-injected x-org-* headers (CVE-2025-29927 mitigation)
  // These headers are set by OUR middleware only — never trust incoming values
  const requestHeaders = new Headers(request.headers);
  ORG_HEADERS.forEach(h => requestHeaders.delete(h));

  // Subdomain resolution — resolve org from slug
  const subdomain = extractSubdomain(request);

  if (subdomain) {
    // Service-role client for org lookup (bypasses RLS, server-only)
    const { createClient: createAdminClient } = await import('@supabase/supabase-js');
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Single query: org + branding via join
    const { data: orgData } = await adminClient
      .from('organizations')
      .select(`
        id, slug, subscription_tier, subscription_status,
        org_branding ( company_name, primary_colour_hex, logo_path, tagline )
      `)
      .eq('slug', subdomain)
      .maybeSingle();

    if (!orgData) {
      // Unknown subdomain — redirect to apex domain root
      const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'sitemedic.co.uk';
      const protocol = request.nextUrl.protocol;
      return NextResponse.redirect(new URL(`${protocol}//${rootDomain}/`));
    }

    // Inject org context headers for downstream SSR pages
    requestHeaders.set('x-org-id', orgData.id);
    requestHeaders.set('x-org-slug', orgData.slug);
    requestHeaders.set('x-org-tier', orgData.subscription_tier ?? 'starter');

    // Branding headers (org_branding is returned as object or array from join)
    const branding = Array.isArray(orgData.org_branding)
      ? orgData.org_branding[0]
      : orgData.org_branding;

    if (branding) {
      requestHeaders.set('x-org-company-name', branding.company_name ?? '');
      requestHeaders.set('x-org-primary-colour', branding.primary_colour_hex ?? '');
      // Construct public logo URL from storage path
      if (branding.logo_path) {
        const logoUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/org-logos/${branding.logo_path}`;
        requestHeaders.set('x-org-logo-url', logoUrl);
      }
      requestHeaders.set('x-org-tagline', branding.tagline ?? '');
    }
  }

  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request: { headers: requestHeaders },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Use getUser() NOT getSession() for security
  // getSession() only checks if a JWT exists, getUser() validates it with the server
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Define public routes (no auth required)
  const publicRoutes = [
    '/',
    '/login',
    '/signup',
    '/auth',    // Magic link callback (must be public - user is not authenticated yet when clicking link)
    '/pricing',
    '/terms-and-conditions',
    '/privacy-policy',
    '/refund-policy',
    '/cookie-policy',
    '/complaints',
    '/accessibility-statement',
    '/acceptable-use',
    '/admin', // Admin routes (existing admin pages)
  ];

  const isPublicRoute = publicRoutes.some(
    (route) =>
      request.nextUrl.pathname === route ||
      request.nextUrl.pathname.startsWith(`${route}/`) ||
      request.nextUrl.pathname.startsWith('/api/')
  );

  // Redirect unauthenticated users to /login (except for public routes)
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages
  if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup')) {
    const url = request.nextUrl.clone();
    // Redirect to role-appropriate dashboard
    const role = user.app_metadata?.role;
    switch (role) {
      case 'platform_admin':
        url.pathname = '/platform';
        break;
      case 'org_admin':
        url.pathname = '/admin';
        break;
      case 'medic':
        url.pathname = '/medic';
        break;
      default:
        url.pathname = '/dashboard';
    }
    return NextResponse.redirect(url);
  }

  // Multi-tenant architecture: Check if authenticated user has org_id
  // Users without org_id should be redirected to org setup (future feature)
  if (user && !isPublicRoute) {
    const orgId = user.app_metadata?.org_id;

    // Allow access to setup, onboarding, and marketplace registration without org_id
    const isSetupRoute = request.nextUrl.pathname.startsWith('/setup/') ||
                         request.nextUrl.pathname.startsWith('/onboarding') ||
                         request.nextUrl.pathname.startsWith('/marketplace/register') ||
                         request.nextUrl.pathname.startsWith('/marketplace/client-register');

    // Platform admins have no org_id by design — they manage all orgs
    const isPlatformAdmin = user.app_metadata?.role === 'platform_admin';

    if (!orgId && !isSetupRoute && !isPlatformAdmin) {
      console.warn(
        `User ${user.id} authenticated but has no org_id - redirecting to org setup`
      );

      const url = request.nextUrl.clone();
      url.pathname = '/setup/organization';
      return NextResponse.redirect(url);
    }
  }

  // Onboarding routing: orgs with onboarding_completed=false go to /onboarding
  // Separate from the !isPublicRoute block above because /admin is in publicRoutes
  // (existing admin pages need public access), but we still need to intercept
  // pending-onboarding orgs trying to access /admin.
  // Legacy orgs (null onboarding_completed) are treated as completed (?? true)
  if (user) {
    const orgId = user.app_metadata?.org_id;

    if (orgId) {
      const isOnboardingRoute = request.nextUrl.pathname.startsWith('/onboarding');
      const isSuspendedRoute = request.nextUrl.pathname.startsWith('/suspended');
      const isDashboardRoute = request.nextUrl.pathname.startsWith('/admin') ||
                               request.nextUrl.pathname.startsWith('/dashboard') ||
                               request.nextUrl.pathname.startsWith('/medic');

      // Only query DB for dashboard, onboarding, or suspended routes to avoid unnecessary calls
      if (isDashboardRoute || isOnboardingRoute || isSuspendedRoute) {
        const { data: orgStatus } = await supabase
          .from('organizations')
          .select('onboarding_completed, subscription_status')
          .eq('id', orgId)
          .single();

        const onboardingCompleted = orgStatus?.onboarding_completed ?? true;

        if (!onboardingCompleted && !isOnboardingRoute) {
          // Org hasn't completed onboarding — redirect to onboarding wizard
          const url = request.nextUrl.clone();
          url.pathname = '/onboarding';
          return NextResponse.redirect(url);
        }

        if (onboardingCompleted && isOnboardingRoute) {
          // Org already completed onboarding — redirect to admin
          const url = request.nextUrl.clone();
          url.pathname = '/admin';
          return NextResponse.redirect(url);
        }

        // Suspension check: redirect cancelled orgs to /suspended
        // Only checks for 'cancelled' — NULL (legacy orgs) and 'active'/'past_due' pass through
        if (orgStatus?.subscription_status === 'cancelled') {
          if (!isSuspendedRoute) {
            const url = request.nextUrl.clone();
            url.pathname = '/suspended';
            return NextResponse.redirect(url);
          }
        }
      }
    }
  }

  return supabaseResponse;
}
