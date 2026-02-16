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

  // Redirect to /login if not authenticated (except for public routes and login itself)
  const isPublicRoute =
    request.nextUrl.pathname === '/' ||
    request.nextUrl.pathname === '/login' ||
    request.nextUrl.pathname.startsWith('/pricing') ||
    request.nextUrl.pathname.startsWith('/terms-and-conditions') ||
    request.nextUrl.pathname.startsWith('/privacy-policy') ||
    request.nextUrl.pathname.startsWith('/refund-policy') ||
    request.nextUrl.pathname.startsWith('/cookie-policy') ||
    request.nextUrl.pathname.startsWith('/complaints') ||
    request.nextUrl.pathname.startsWith('/accessibility-statement') ||
    request.nextUrl.pathname.startsWith('/acceptable-use') ||
    request.nextUrl.pathname.startsWith('/api/');

  if (!user && !isPublicRoute) {
    // Redirect to login
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
