/**
 * Supabase middleware for the Marketplace app
 *
 * Simplified version — no subdomain routing, no org branding headers,
 * no onboarding/suspension checks. Only handles:
 * 1. Session refresh (cookie handling)
 * 2. Public route allowlist
 * 3. Redirect unauthenticated users for protected routes
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
          cookiesToSet.forEach(({ name, value }) =>
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Public routes — no auth required
  const publicRoutes = [
    '/',
    '/login',
    '/auth',
    '/events',
    '/for-clients',
    '/for-companies',
    '/faq',
    '/register',
    '/client-register',
    '/companies',
  ];

  const isPublicRoute = publicRoutes.some(
    (route) =>
      request.nextUrl.pathname === route ||
      request.nextUrl.pathname.startsWith(`${route}/`) ||
      request.nextUrl.pathname.startsWith('/api/')
  );

  // Redirect unauthenticated users to /login for protected routes
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
