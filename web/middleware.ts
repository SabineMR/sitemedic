/**
 * Next.js middleware for auth session refresh and route protection
 *
 * This middleware runs on ALL requests matching the config below.
 * It refreshes Supabase auth tokens and redirects unauthenticated users to /login.
 */

import { updateSession } from '@/lib/supabase/middleware';
import { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api/ routes (API routes)
     * - Public marketing pages (homepage, /pricing, /terms-and-conditions, etc.)
     *
     * Note: Public routes are also defined in lib/supabase/middleware.ts
     */
    '/((?!_next/static|_next/image|favicon.ico|api/|pricing|terms-and-conditions|privacy-policy|refund-policy|cookie-policy|complaints|accessibility-statement|acceptable-use)(?!$).*)',
  ],
};
