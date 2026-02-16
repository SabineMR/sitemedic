/**
 * Stripe Onboarding Status Component
 * Phase 6.5: Display Stripe Express account onboarding progress
 */

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface StripeOnboardingStatusProps {
  medicId: string;
}

interface MedicStripeData {
  stripe_account_id: string | null;
  stripe_onboarding_complete: boolean;
  stripe_onboarding_url: string | null;
}

export function StripeOnboardingStatus({ medicId }: StripeOnboardingStatusProps) {
  const [medicData, setMedicData] = useState<MedicStripeData | null>(null);
  const [accountStatus, setAccountStatus] = useState<{
    charges_enabled: boolean;
    payouts_enabled: boolean;
    details_submitted: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);

  // Fetch medic Stripe data
  const fetchMedicData = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('medics')
      .select('stripe_account_id, stripe_onboarding_complete, stripe_onboarding_url')
      .eq('id', medicId)
      .single();

    if (error) {
      console.error('Error fetching medic data:', error);
      setLoading(false);
      return;
    }

    setMedicData(data);
    setLoading(false);

    // If account exists, fetch status
    if (data.stripe_account_id) {
      await checkAccountStatus(data.stripe_account_id);
    }
  };

  // Check Stripe account status
  const checkAccountStatus = async (stripeAccountId: string) => {
    setChecking(true);
    const supabase = createClient();

    try {
      const { data, error } = await supabase.functions.invoke('stripe-connect', {
        body: {
          action: 'check_account_status',
          stripe_account_id: stripeAccountId,
        },
      });

      if (error) {
        console.error('Error checking account status:', error);
        setChecking(false);
        return;
      }

      setAccountStatus(data);

      // Update medics table if onboarding is complete
      if (data.details_submitted && data.payouts_enabled) {
        await supabase
          .from('medics')
          .update({ stripe_onboarding_complete: true })
          .eq('id', medicId);
      }
    } catch (err) {
      console.error('Account status check error:', err);
    }

    setChecking(false);
  };

  // Auto-refresh every 30 seconds to check for completion
  useEffect(() => {
    fetchMedicData();

    const interval = setInterval(() => {
      if (medicData?.stripe_account_id && !medicData.stripe_onboarding_complete) {
        checkAccountStatus(medicData.stripe_account_id);
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [medicId, medicData?.stripe_account_id, medicData?.stripe_onboarding_complete]);

  const handleContinueOnboarding = () => {
    if (medicData?.stripe_onboarding_url) {
      window.open(medicData.stripe_onboarding_url, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="p-4 bg-slate-50 rounded-md">
        <p className="text-slate-600">Loading payout account status...</p>
      </div>
    );
  }

  if (!medicData?.stripe_account_id) {
    return (
      <div className="p-4 bg-yellow-50 rounded-md border border-yellow-200">
        <h3 className="font-semibold text-yellow-900 mb-2">Payout Account Not Set Up</h3>
        <p className="text-sm text-yellow-800 mb-3">
          Complete your IR35 assessment above to set up your payout account.
        </p>
      </div>
    );
  }

  // Onboarding complete
  if (medicData.stripe_onboarding_complete || (accountStatus?.details_submitted && accountStatus?.payouts_enabled)) {
    return (
      <div className="p-4 bg-green-50 rounded-md border border-green-200">
        <div className="flex items-center gap-2 mb-2">
          <svg
            className="h-5 w-5 text-green-600"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M5 13l4 4L19 7"></path>
          </svg>
          <h3 className="font-semibold text-green-900">Payout Account Active</h3>
        </div>
        <p className="text-sm text-green-800 mb-2">
          Your bank account is connected and ready to receive payouts.
        </p>
        {accountStatus && (
          <div className="text-xs text-green-700 space-y-1">
            <p>Charges enabled: {accountStatus.charges_enabled ? 'Yes' : 'No'}</p>
            <p>Payouts enabled: {accountStatus.payouts_enabled ? 'Yes' : 'No'}</p>
          </div>
        )}
      </div>
    );
  }

  // Onboarding in progress
  return (
    <div className="p-4 bg-orange-50 rounded-md border border-orange-200">
      <div className="flex items-center gap-2 mb-2">
        <svg
          className="h-5 w-5 text-orange-600"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
        </svg>
        <h3 className="font-semibold text-orange-900">Complete Stripe Onboarding</h3>
      </div>
      <p className="text-sm text-orange-800 mb-3">
        You need to complete your bank account details before receiving payouts.
      </p>
      {accountStatus && (
        <div className="text-xs text-orange-700 mb-3 space-y-1">
          <p>Details submitted: {accountStatus.details_submitted ? 'Yes' : 'No'}</p>
          <p>Status: {checking ? 'Checking...' : 'In progress'}</p>
        </div>
      )}
      <Button
        onClick={handleContinueOnboarding}
        variant="outline"
        className="w-full border-orange-300 hover:bg-orange-100"
      >
        Continue Onboarding
      </Button>
      <p className="text-xs text-orange-600 mt-2">
        Auto-refreshing every 30 seconds...
      </p>
    </div>
  );
}
