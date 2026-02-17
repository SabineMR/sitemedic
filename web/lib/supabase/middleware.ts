/**
 * Supabase middleware client for session refresh and auth protection
 *
 * Uses @supabase/ssr with request/response cookie handling.
 * This client should ONLY be used in middleware.ts.
 */

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
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
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
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

    // Allow access to setup pages even without org_id
    const isSetupRoute = request.nextUrl.pathname.startsWith('/setup/');

    if (!orgId && !isSetupRoute) {
      console.warn(
        `User ${user.id} authenticated but has no org_id - redirecting to org setup`
      );

      const url = request.nextUrl.clone();
      url.pathname = '/setup/organization';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
