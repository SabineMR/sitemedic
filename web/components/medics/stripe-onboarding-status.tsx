'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface StripeOnboardingStatusProps {
  medicId: string;
}

interface MedicStripeData {
  stripe_account_id: string | null;
  stripe_onboarding_url: string | null;
  stripe_onboarding_complete: boolean;
  stripe_charges_enabled: boolean;
  stripe_payouts_enabled: boolean;
  updated_at: string;
}

export function StripeOnboardingStatus({ medicId }: StripeOnboardingStatusProps) {
  const [loading, setLoading] = useState(true);
  const [medic, setMedic] = useState<MedicStripeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const supabase = createClient();

  const fetchMedicData = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('medics')
        .select('stripe_account_id, stripe_onboarding_url, stripe_onboarding_complete, stripe_charges_enabled, stripe_payouts_enabled, updated_at')
        .eq('id', medicId)
        .single();

      if (fetchError) throw fetchError;

      setMedic(data);
    } catch (err) {
      console.error('Error fetching medic Stripe data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const checkStripeStatus = async () => {
    if (!medic?.stripe_account_id) return;

    setChecking(true);

    try {
      // Call Stripe Connect Edge Function to check status
      const { data, error: checkError } = await supabase.functions.invoke('stripe-connect', {
        body: {
          action: 'check_account_status',
          stripe_account_id: medic.stripe_account_id,
        },
      });

      if (checkError) throw checkError;

      // Update medics table with latest status
      await supabase
        .from('medics')
        .update({
          stripe_onboarding_complete: data.charges_enabled && data.payouts_enabled,
          stripe_charges_enabled: data.charges_enabled,
          stripe_payouts_enabled: data.payouts_enabled,
          updated_at: new Date().toISOString(),
        })
        .eq('id', medicId);

      // Refresh data
      await fetchMedicData();
    } catch (err) {
      console.error('Error checking Stripe status:', err);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    fetchMedicData();

    // Auto-refresh every 30 seconds if onboarding not complete
    const interval = setInterval(() => {
      if (medic && medic.stripe_account_id && !medic.stripe_onboarding_complete) {
        checkStripeStatus();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [medicId, medic?.stripe_onboarding_complete]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600 text-sm">Loading Stripe status...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800 text-sm">{error}</p>
      </div>
    );
  }

  if (!medic) {
    return null;
  }

  // Not Started
  if (!medic.stripe_account_id) {
    return (
      <div className="bg-gray-50 border rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-1">Payout Account Not Set Up</h3>
            <p className="text-sm text-gray-600 mb-4">
              You need to set up your Stripe Express account to receive payouts. This takes about 5 minutes.
            </p>
            <p className="text-xs text-gray-500 mb-3">
              IR35 status must be completed before setting up payouts.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // In Progress
  if (!medic.stripe_onboarding_complete) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-1">Complete Stripe Onboarding</h3>
            <p className="text-sm text-gray-700 mb-4">
              You need to complete your bank account details before receiving payouts.
            </p>
            <div className="space-y-3">
              <div className="text-xs text-gray-600">
                <strong>Last updated:</strong> {new Date(medic.updated_at).toLocaleString()}
              </div>
              <div className="flex gap-3">
                <a
                  href={medic.stripe_onboarding_url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition text-sm font-medium"
                >
                  Continue Onboarding
                </a>
                <button
                  onClick={checkStripeStatus}
                  disabled={checking}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition text-sm font-medium disabled:opacity-50"
                >
                  {checking ? 'Checking...' : 'Refresh Status'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Complete
  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-6">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">Payout Account Active</h3>
          <p className="text-sm text-gray-700 mb-4">
            Your Stripe Express account is fully set up and ready to receive payouts.
          </p>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Charges enabled:</span>
              <span className={medic.stripe_charges_enabled ? 'text-green-700 font-medium' : 'text-red-700'}>
                {medic.stripe_charges_enabled ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Payouts enabled:</span>
              <span className={medic.stripe_payouts_enabled ? 'text-green-700 font-medium' : 'text-red-700'}>
                {medic.stripe_payouts_enabled ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
          <button
            onClick={checkStripeStatus}
            disabled={checking}
            className="mt-4 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition text-sm font-medium disabled:opacity-50"
          >
            {checking ? 'Checking...' : 'Refresh Status'}
          </button>
        </div>
      </div>
    </div>
  );
}
