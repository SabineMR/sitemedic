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
    '/login',
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

  // Redirect authenticated users from /login to dashboard
  if (user && request.nextUrl.pathname === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
