/**
 * Onboarding Success Page
 *
 * Post-payment landing page shown after Stripe Checkout completes.
 * Polls GET /api/billing/checkout-status until the billing webhook
 * confirms subscription is active.
 *
 * States:
 *   1. Processing — webhook hasn't fired yet, polling every 3s
 *   2. Confirmed — subscription active, pending platform admin activation
 *   3. Completed — onboarding_completed=true, redirect to /admin
 *
 * Route: /onboarding
 * Access: Authenticated users with onboarding_completed=false (middleware enforced)
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, Clock, Palette, ArrowRight, Loader2 } from 'lucide-react';

interface CheckoutStatus {
  subscriptionStatus: string | null;
  subscriptionTier: string | null;
  onboardingCompleted: boolean;
  isPending: boolean;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [status, setStatus] = useState<CheckoutStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/billing/checkout-status');
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Failed to check status');
        setLoading(false);
        return;
      }
      const data: CheckoutStatus = await res.json();

      // If onboarding already completed, redirect to admin
      if (data.onboardingCompleted) {
        router.replace('/admin');
        return;
      }

      setStatus(data);
      setLoading(false);
    } catch {
      setError('Unable to connect. Please check your internet connection.');
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchStatus();

    // Poll every 3 seconds until subscription status is confirmed
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/billing/checkout-status');
        if (!res.ok) return;
        const data: CheckoutStatus = await res.json();

        if (data.onboardingCompleted) {
          clearInterval(interval);
          router.replace('/admin');
          return;
        }

        setStatus(data);
        setLoading(false);

        // Stop polling once subscription status is confirmed
        if (data.subscriptionStatus) {
          clearInterval(interval);
        }
      } catch {
        // Silently retry on polling errors
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [fetchStatus, router]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 text-sm">Loading your account status...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-16 h-16 bg-red-600/20 border border-red-600/30 rounded-2xl flex items-center justify-center">
          <Clock className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="text-white text-xl font-bold">Something went wrong</h2>
        <p className="text-gray-400 text-sm text-center max-w-md">{error}</p>
        <button
          onClick={() => { setError(null); setLoading(true); fetchStatus(); }}
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm hover:bg-gray-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  const isProcessing = !status?.subscriptionStatus;
  const planName = status?.subscriptionTier
    ? status.subscriptionTier.charAt(0).toUpperCase() + status.subscriptionTier.slice(1)
    : 'Your';

  return (
    <div className="space-y-8 pt-8">
      {/* Payment Status */}
      <div className="text-center space-y-4">
        {isProcessing ? (
          <>
            <div className="w-16 h-16 bg-blue-600/20 border border-blue-600/30 rounded-2xl flex items-center justify-center mx-auto">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
            </div>
            <h1 className="text-2xl font-bold text-white">Processing Your Payment...</h1>
            <p className="text-gray-400 max-w-md mx-auto">
              We are confirming your payment with Stripe. This usually takes a few seconds.
            </p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-green-600/20 border border-green-600/30 rounded-2xl flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Payment Confirmed</h1>
            <p className="text-gray-400 max-w-md mx-auto">
              Your {planName} subscription is active. Your account is pending activation by our team.
            </p>
          </>
        )}
      </div>

      {/* What Happens Next */}
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600/20 border border-blue-600/30 rounded-xl flex items-center justify-center">
            <Clock className="w-5 h-5 text-blue-400" />
          </div>
          <h2 className="text-white font-semibold text-lg">What Happens Next</h2>
        </div>
        <ul className="space-y-2 text-gray-400 text-sm ml-[52px]">
          <li>Our team will review your account and activate it within 24 hours.</li>
          <li>Once activated, you will receive a welcome email with your login details.</li>
        </ul>
      </div>

      {/* While You Wait — Branding Setup */}
      <div>
        <h2 className="text-white font-semibold text-lg mb-3">While You Wait</h2>
        <Link
          href="/onboarding/branding"
          className="block bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6 hover:border-blue-600/50 hover:bg-gray-800/80 transition-all group"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-purple-600/20 border border-purple-600/30 rounded-xl flex items-center justify-center flex-shrink-0">
              <Palette className="w-6 h-6 text-purple-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-semibold mb-1">Set Up Your Branding</h3>
              <p className="text-gray-400 text-sm">
                Upload your logo, choose your brand colour, and set your company name. Your
                branding will be ready when your account is activated.
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-500 group-hover:text-blue-400 transition-colors flex-shrink-0 mt-1" />
          </div>
        </Link>
      </div>

      {/* Activation SLA note */}
      <p className="text-gray-500 text-xs text-center">
        Most accounts are activated within a few hours during UK business hours (Mon&ndash;Fri 9am&ndash;5pm).
      </p>
    </div>
  );
}
