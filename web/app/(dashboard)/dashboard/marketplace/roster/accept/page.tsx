/**
 * Roster Invitation Acceptance Page
 * Phase 37: Company Accounts — Plan 02
 *
 * WHY: Medics receiving roster invitations click a link containing a JWT token.
 * This page processes the token via POST /api/marketplace/roster/accept,
 * links their medic record to the company roster, and shows success/error state.
 *
 * URL: /dashboard/marketplace/roster/accept?token=<JWT>
 *
 * FEATURES:
 * - Reads JWT token from URL search params
 * - Calls POST /api/marketplace/roster/accept on mount
 * - Loading state: "Accepting invitation..."
 * - Success: "Welcome to {company_name} roster!" with dashboard link
 * - Error states: expired, invalid, already accepted, no medic profile
 * - If user not logged in, redirects to login with return URL
 */

'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

type AcceptState = 'loading' | 'success' | 'error' | 'no-token';

function AcceptInvitationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [state, setState] = useState<AcceptState>('loading');
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setState('no-token');
      return;
    }

    const acceptInvitation = async () => {
      // First check if user is logged in
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // Redirect to login with return URL
        const returnUrl = `/dashboard/marketplace/roster/accept?token=${encodeURIComponent(token)}`;
        router.push(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
        return;
      }

      try {
        const res = await fetch('/api/marketplace/roster/accept', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const data = await res.json();

        if (!res.ok) {
          setState('error');
          setErrorMessage(data.error || 'Failed to accept invitation');
          return;
        }

        setState('success');
        setMessage(data.message || 'Successfully joined the roster!');
      } catch {
        setState('error');
        setErrorMessage('An unexpected error occurred. Please try again.');
      }
    };

    acceptInvitation();
  }, [token, router]);

  // =========================================================================
  // No token provided
  // =========================================================================
  if (state === 'no-token') {
    return (
      <div className="text-center py-16 max-w-md mx-auto">
        <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Invalid invitation link</h2>
        <p className="text-gray-500 mb-6">
          This invitation link is missing the required token. Please check the link in your email
          and try again.
        </p>
        <Link href="/dashboard/marketplace">
          <Button variant="outline">Go to Marketplace</Button>
        </Link>
      </div>
    );
  }

  // =========================================================================
  // Loading
  // =========================================================================
  if (state === 'loading') {
    return (
      <div className="text-center py-16 max-w-md mx-auto">
        <Loader2 className="h-12 w-12 text-blue-500 mx-auto mb-4 animate-spin" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Accepting invitation...</h2>
        <p className="text-gray-500">Please wait while we process your invitation.</p>
      </div>
    );
  }

  // =========================================================================
  // Success
  // =========================================================================
  if (state === 'success') {
    return (
      <div className="text-center py-16 max-w-md mx-auto">
        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{message}</h2>
        <p className="text-gray-500 mb-6">
          You are now part of the team. The company admin can assign you to marketplace quotes
          and events.
        </p>
        <Link href="/dashboard/marketplace">
          <Button>Go to Marketplace Dashboard</Button>
        </Link>
      </div>
    );
  }

  // =========================================================================
  // Error
  // =========================================================================
  return (
    <div className="text-center py-16 max-w-md mx-auto">
      <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to accept invitation</h2>
      <p className="text-gray-500 mb-6">{errorMessage}</p>
      <Link href="/dashboard/marketplace">
        <Button variant="outline">Go to Marketplace Dashboard</Button>
      </Link>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center py-16">
          <Loader2 className="h-12 w-12 text-blue-500 mx-auto mb-4 animate-spin" />
          <p className="text-gray-500">Loading...</p>
        </div>
      }
    >
      <AcceptInvitationContent />
    </Suspense>
  );
}
