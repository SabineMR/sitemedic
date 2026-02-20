/**
 * Next.js middleware for the Marketplace app
 *
 * Handles auth session refresh and route protection.
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
     * - api/ routes (handled by route handlers)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
};
