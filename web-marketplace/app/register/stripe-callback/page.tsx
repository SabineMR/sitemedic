/**
 * Stripe Connect Onboarding Callback Page
 * Phase 32: Marketplace Company Registration
 *
 * Handles the return from Stripe Connect hosted onboarding.
 *
 * URL params:
 *   ?complete=true&company_id=xxx  - User completed Stripe onboarding
 *   ?refresh=true&company_id=xxx   - Onboarding link expired, need to restart
 *
 * On complete:
 *   1. Checks account status via Edge Function (charges_enabled, payouts_enabled)
 *   2. If truly complete: updates marketplace_companies.stripe_onboarding_complete
 *   3. Shows success UI
 *
 * On refresh:
 *   1. Shows message about expired link
 *   2. "Resume Onboarding" button generates a fresh Account Link
 */

'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { CheckCircle, RefreshCw, AlertCircle, Loader2, ArrowRight } from 'lucide-react';

type CallbackState =
  | 'loading'
  | 'success'
  | 'incomplete'
  | 'refresh'
  | 'error';

function StripeCallbackContent() {
  const searchParams = useSearchParams();
  const [state, setState] = useState<CallbackState>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resuming, setResuming] = useState(false);

  const isComplete = searchParams.get('complete') === 'true';
  const isRefresh = searchParams.get('refresh') === 'true';
  const companyId = searchParams.get('company_id');

  useEffect(() => {
    if (!companyId) {
      setState('error');
      setErrorMessage('Missing company ID. Please return to the registration wizard.');
      return;
    }

    if (isRefresh) {
      setState('refresh');
      return;
    }

    if (isComplete) {
      verifyOnboarding();
      return;
    }

    // No recognized params
    setState('error');
    setErrorMessage('Invalid callback parameters.');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, isComplete, isRefresh]);

  const verifyOnboarding = async () => {
    setState('loading');

    try {
      const supabase = createClient();

      // Get the company's stripe_account_id
      const { data: company, error: companyError } = await supabase
        .from('marketplace_companies')
        .select('stripe_account_id')
        .eq('id', companyId!)
        .single();

      if (companyError || !company?.stripe_account_id) {
        setState('error');
        setErrorMessage('Company or Stripe account not found.');
        return;
      }

      // Check the account status via the Edge Function
      const { data: status, error: statusError } = await supabase.functions.invoke(
        'stripe-connect',
        {
          body: {
            action: 'check_account_status',
            stripe_account_id: company.stripe_account_id,
          },
        }
      );

      if (statusError) {
        setState('error');
        setErrorMessage('Failed to verify Stripe account status.');
        return;
      }

      const onboardingComplete =
        status.charges_enabled && status.payouts_enabled && status.details_submitted;

      if (onboardingComplete) {
        // Update marketplace_companies to mark onboarding as complete
        const { error: updateError } = await supabase
          .from('marketplace_companies')
          .update({ stripe_onboarding_complete: true })
          .eq('id', companyId!);

        if (updateError) {
          console.error('Failed to update stripe_onboarding_complete:', updateError);
          // Still show success to user -- the webhook will catch it
        }

        setState('success');
      } else {
        // Details submitted but Stripe still reviewing, or not fully complete
        setState('incomplete');
      }
    } catch (err) {
      console.error('Verification error:', err);
      setState('error');
      setErrorMessage('An unexpected error occurred.');
    }
  };

  const handleResumeOnboarding = async () => {
    if (!companyId) return;
    setResuming(true);

    try {
      const response = await fetch('/api/marketplace/stripe-connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId }),
      });

      const data = await response.json();

      if (data.onboarding_url) {
        window.location.href = data.onboarding_url;
      } else {
        setState('error');
        setErrorMessage(data.error || 'Failed to generate new onboarding link.');
        setResuming(false);
      }
    } catch {
      setState('error');
      setErrorMessage('Failed to resume onboarding.');
      setResuming(false);
    }
  };

  // ---- Render states ----

  if (state === 'loading') {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <Loader2 className="w-12 h-12 text-blue-400 animate-spin" />
        <h2 className="text-xl font-semibold text-white">Verifying your Stripe account...</h2>
        <p className="text-gray-400 text-sm max-w-md">
          Please wait while we confirm your Stripe Connect onboarding status.
        </p>
      </div>
    );
  }

  if (state === 'success') {
    return (
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="w-16 h-16 bg-green-900/30 border border-green-700/50 rounded-full flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-green-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Stripe Connect Onboarding Complete
          </h2>
          <p className="text-gray-400 max-w-md">
            Your company is now set up to receive payouts through Stripe.
            Once your company is verified by our team, you can start receiving
            payments for marketplace bookings.
          </p>
        </div>
        <div className="flex gap-4 mt-4">
          <Link href="/register/success">
            <Button className="bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-500 hover:to-green-600">
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (state === 'incomplete') {
    return (
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="w-16 h-16 bg-yellow-900/30 border border-yellow-700/50 rounded-full flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-yellow-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Onboarding Almost Complete
          </h2>
          <p className="text-gray-400 max-w-md">
            You&apos;ve submitted your details to Stripe, but they are still
            being reviewed. This usually takes a few minutes. You can check back
            later or continue with your registration.
          </p>
        </div>
        <div className="flex gap-4 mt-4">
          <Button
            variant="outline"
            onClick={verifyOnboarding}
            className="text-gray-300 border-gray-600 hover:bg-gray-700/50"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Check Again
          </Button>
          <Link href="/register/success">
            <Button className="bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-500 hover:to-blue-600">
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (state === 'refresh') {
    return (
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="w-16 h-16 bg-blue-900/30 border border-blue-700/50 rounded-full flex items-center justify-center">
          <RefreshCw className="w-8 h-8 text-blue-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Onboarding Link Expired
          </h2>
          <p className="text-gray-400 max-w-md">
            Your Stripe onboarding session has expired. Click below to generate
            a new link and continue where you left off.
          </p>
        </div>
        <Button
          onClick={handleResumeOnboarding}
          disabled={resuming}
          className="bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-500 hover:to-blue-600 mt-4"
        >
          {resuming ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Generating Link...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Resume Onboarding
            </>
          )}
        </Button>
      </div>
    );
  }

  // state === 'error'
  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <div className="w-16 h-16 bg-red-900/30 border border-red-700/50 rounded-full flex items-center justify-center">
        <AlertCircle className="w-8 h-8 text-red-400" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">
          Something Went Wrong
        </h2>
        <p className="text-gray-400 max-w-md">
          {errorMessage || 'An unexpected error occurred during Stripe onboarding.'}
        </p>
      </div>
      <div className="flex gap-4 mt-4">
        <Link href="/register">
          <Button
            variant="outline"
            className="text-gray-300 border-gray-600 hover:bg-gray-700/50"
          >
            Return to Registration
          </Button>
        </Link>
        {companyId && (
          <Button
            onClick={handleResumeOnboarding}
            disabled={resuming}
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-500 hover:to-blue-600"
          >
            {resuming ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Starting...
              </>
            ) : (
              'Start Stripe Onboarding'
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

export default function StripeCallbackPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <Suspense
        fallback={
          <div className="flex flex-col items-center gap-4 text-center">
            <Loader2 className="w-12 h-12 text-blue-400 animate-spin" />
            <h2 className="text-xl font-semibold text-white">Loading...</h2>
          </div>
        }
      >
        <StripeCallbackContent />
      </Suspense>
    </div>
  );
}
