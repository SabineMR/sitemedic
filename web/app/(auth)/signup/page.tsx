/**
 * Signup page for SiteMedic — Unified Onboarding Flow
 *
 * Multi-step signup that guides a prospective medic business through:
 *   1. Plan selection (Starter / Growth / Enterprise)
 *   2. Account + Organisation details
 *   3. Magic link email verification
 *   4. Org provisioning + Stripe Checkout redirect
 *
 * The flow stores pending org data in user_metadata via signInWithOtp
 * so that after magic link authentication, the creating-org step can
 * read it back and call POST /api/billing/checkout.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Mail,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Building2,
  Sparkles,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Plan data
// ---------------------------------------------------------------------------

type PlanTier = 'starter' | 'growth' | 'enterprise';

interface PlanOption {
  tier: PlanTier;
  name: string;
  price: number;
  description: string;
  popular?: boolean;
  features: string[];
}

const PLANS: PlanOption[] = [
  {
    tier: 'starter',
    name: 'Starter',
    price: 149,
    description: 'Everything you need to manage site medics',
    features: [
      'Dashboard & Overview',
      'Treatment Logs',
      'Worker Registry',
      'Weekly Reports',
      'Compliance Tracking',
      'Basic Analytics',
    ],
  },
  {
    tier: 'growth',
    name: 'Growth',
    price: 299,
    description: 'Scale your medic operations with branding',
    popular: true,
    features: [
      'Everything in Starter',
      'White-Label Branding',
      'Custom Subdomain',
      'Advanced Analytics',
      'Custom Reports',
      'Priority Email Support',
    ],
  },
  {
    tier: 'enterprise',
    name: 'Enterprise',
    price: 599,
    description: 'Full platform with custom domain & API',
    features: [
      'Everything in Growth',
      'Custom Domain',
      'API Access',
      'Priority Support',
      'Dedicated Account Manager',
      'SLA Guarantee',
    ],
  },
];

// ---------------------------------------------------------------------------
// Step type
// ---------------------------------------------------------------------------

type Step = 'plan' | 'details' | 'email-sent' | 'creating-org';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SignupPage() {
  const searchParams = useSearchParams();

  // ---- State ----
  const [step, setStep] = useState<Step>('plan');
  const [selectedTier, setSelectedTier] = useState<PlanTier | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cancelled, setCancelled] = useState(false);

  // Account fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');

  // Org fields
  const [orgName, setOrgName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [address, setAddress] = useState('');
  const [postcode, setPostcode] = useState('');

  // ---- Creating-org logic ----

  const handleCreatingOrg = useCallback(async () => {
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError('Authentication required. Please sign up again.');
        setLoading(false);
        return;
      }

      // If user already has an org, redirect to onboarding
      if (user.app_metadata?.org_id) {
        window.location.href = '/onboarding';
        return;
      }

      // Read pending signup data from user_metadata
      const meta = user.user_metadata || {};
      const tier = meta.pending_tier as PlanTier | undefined;
      const pendingOrgName = meta.pending_org_name as string | undefined;
      const pendingContactEmail = meta.pending_contact_email as string | undefined;
      const pendingContactPhone = meta.pending_contact_phone as string | undefined;
      const pendingAddress = meta.pending_address as string | undefined;
      const pendingPostcode = meta.pending_postcode as string | undefined;

      if (!tier || !pendingOrgName || !pendingContactEmail) {
        setError(
          'Missing signup data. This can happen if you used an old link. Please start the signup process again.'
        );
        setLoading(false);
        return;
      }

      // Call checkout API
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier,
          orgName: pendingOrgName,
          contactEmail: pendingContactEmail,
          contactPhone: pendingContactPhone || undefined,
          address: pendingAddress || undefined,
          postcode: pendingPostcode || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error || 'Failed to create checkout session. Please try again.');
        setLoading(false);
        return;
      }

      const data = await response.json();

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError('No checkout URL received. Please try again.');
        setLoading(false);
      }
    } catch (err) {
      console.error('Creating org error:', err);
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  }, []);

  // ---- Query param handling on mount ----

  useEffect(() => {
    const stepParam = searchParams.get('step');
    const cancelledParam = searchParams.get('cancelled');

    if (stepParam === 'creating-org') {
      setStep('creating-org');
      handleCreatingOrg();
    } else if (cancelledParam === 'true') {
      setCancelled(true);
      setStep('plan');
    }
  }, [searchParams, handleCreatingOrg]);

  // ---- Handlers ----

  const handlePlanSelect = (tier: PlanTier) => {
    setSelectedTier(tier);
    setStep('details');
    setError(null);
  };

  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim() || !email.trim()) {
      setError('Full name and email are required.');
      return;
    }

    if (!orgName.trim() || !contactEmail.trim()) {
      setError('Organisation name and contact email are required.');
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      const nextPath = '/signup?step=creating-org';
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;

      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          data: {
            full_name: fullName.trim(),
            pending_tier: selectedTier,
            pending_org_name: orgName.trim(),
            pending_contact_email: contactEmail.trim(),
            pending_contact_phone: contactPhone.trim() || null,
            pending_address: address.trim() || null,
            pending_postcode: postcode.trim() || null,
          },
          emailRedirectTo: redirectTo,
        },
      });

      if (otpError) {
        setError(otpError.message);
        setLoading(false);
        return;
      }

      setStep('email-sent');
      setLoading(false);
    } catch (err) {
      console.error('Signup error:', err);
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  // Pre-fill contact email when account email changes
  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (!contactEmail || contactEmail === email) {
      setContactEmail(value);
    }
  };

  const selectedPlan = PLANS.find((p) => p.tier === selectedTier);

  // ---- Render: Creating Org (Step 4) ----

  if (step === 'creating-org') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 p-4">
        <div className="text-center space-y-6 max-w-md">
          {error ? (
            <>
              <div className="w-16 h-16 bg-red-600/20 border border-red-600/30 rounded-2xl flex items-center justify-center mx-auto">
                <Building2 className="w-8 h-8 text-red-400" />
              </div>
              <h2 className="text-white text-2xl font-bold">Setup Failed</h2>
              <p className="text-gray-400">{error}</p>
              <div className="flex flex-col gap-3">
                <Button
                  onClick={() => {
                    setError(null);
                    setLoading(true);
                    handleCreatingOrg();
                  }}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-500 hover:to-blue-600"
                >
                  Try Again
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setStep('plan');
                    setError(null);
                    setLoading(false);
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  Start Over
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-blue-600/20 border border-blue-600/30 rounded-2xl flex items-center justify-center mx-auto">
                <Building2 className="w-8 h-8 text-blue-400" />
              </div>
              <h2 className="text-white text-2xl font-bold">
                Setting up your organisation...
              </h2>
              <p className="text-gray-400">
                Creating your account and preparing checkout.
              </p>
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto" />
            </>
          )}
        </div>
      </div>
    );
  }

  // ---- Render: Email Sent (Step 3) ----

  if (step === 'email-sent') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-green-600/20 border border-green-600/30 rounded-2xl flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>
            <h2 className="text-white text-2xl font-bold">Check your email</h2>
            <p className="text-gray-400">
              We&apos;ve sent a login link to
            </p>
            <p className="text-white font-medium">{email}</p>
          </div>

          <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-blue-400 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="text-gray-200 font-medium mb-1">
                  Click the link in the email to continue setup
                </p>
                <p className="text-gray-400">
                  The link expires in 60 minutes for security. After clicking,
                  you&apos;ll be redirected to complete payment.
                </p>
              </div>
            </div>

            {selectedPlan && (
              <div className="border-t border-gray-700/50 pt-4">
                <p className="text-gray-400 text-sm">
                  Selected plan:{' '}
                  <span className="text-white font-medium">
                    {selectedPlan.name} — {'\u00A3'}{selectedPlan.price}/mo
                  </span>
                </p>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <p className="text-sm text-gray-500 text-center">
              Didn&apos;t receive the email? Check your spam folder.
            </p>
            <Button
              variant="ghost"
              className="w-full text-gray-400 hover:text-white border border-gray-700/50"
              onClick={() => {
                setStep('details');
                setError(null);
              }}
            >
              Send another link
            </Button>
          </div>

          <div className="text-center text-sm">
            <Link href="/login" className="text-gray-500 hover:text-gray-300">
              Already have an account? Sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ---- Render: Details Form (Step 2) ----

  if (step === 'details') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 p-4">
        <div className="w-full max-w-lg space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => {
                setStep('plan');
                setError(null);
              }}
              className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to plans
            </button>
            <h1 className="text-2xl font-bold text-white">Create your account</h1>
            {selectedPlan && (
              <p className="text-gray-400 text-sm">
                {selectedPlan.name} plan — {'\u00A3'}{selectedPlan.price}/mo
              </p>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleDetailsSubmit} className="space-y-6">
            {/* Account section */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6 space-y-4">
              <h2 className="text-white font-semibold text-lg">Your Account</h2>

              <div>
                <label className="text-gray-300 text-sm font-medium block mb-1.5">
                  Full Name <span className="text-red-400">*</span>
                </label>
                <Input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jane Smith"
                  disabled={loading}
                  autoFocus
                  className="bg-gray-900/50 border-gray-700/50 text-white placeholder-gray-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-gray-300 text-sm font-medium block mb-1.5">
                  Email <span className="text-red-400">*</span>
                </label>
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  placeholder="jane@company.com"
                  disabled={loading}
                  className="bg-gray-900/50 border-gray-700/50 text-white placeholder-gray-500 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Org section */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6 space-y-4">
              <h2 className="text-white font-semibold text-lg">Your Organisation</h2>

              <div>
                <label className="text-gray-300 text-sm font-medium block mb-1.5">
                  Organisation Name <span className="text-red-400">*</span>
                </label>
                <Input
                  type="text"
                  required
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="e.g. Apex Safety Group Ltd"
                  disabled={loading}
                  className="bg-gray-900/50 border-gray-700/50 text-white placeholder-gray-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-gray-300 text-sm font-medium block mb-1.5">
                  Contact Email <span className="text-red-400">*</span>
                </label>
                <Input
                  type="email"
                  required
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="admin@yourcompany.co.uk"
                  disabled={loading}
                  className="bg-gray-900/50 border-gray-700/50 text-white placeholder-gray-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-gray-300 text-sm font-medium block mb-1.5">
                  Contact Phone
                </label>
                <Input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+44 7700 900000"
                  disabled={loading}
                  className="bg-gray-900/50 border-gray-700/50 text-white placeholder-gray-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-gray-300 text-sm font-medium block mb-1.5">
                  Business Address
                </label>
                <Input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Business Park, Manchester"
                  disabled={loading}
                  className="bg-gray-900/50 border-gray-700/50 text-white placeholder-gray-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-gray-300 text-sm font-medium block mb-1.5">
                  Postcode
                </label>
                <Input
                  type="text"
                  value={postcode}
                  onChange={(e) => setPostcode(e.target.value.toUpperCase())}
                  placeholder="M1 1AA"
                  disabled={loading}
                  className="bg-gray-900/50 border-gray-700/50 text-white placeholder-gray-500 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="text-sm text-red-300 bg-red-900/30 border border-red-700/50 p-3 rounded-xl">
                {error}
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold hover:from-blue-500 hover:to-blue-600 shadow-lg shadow-blue-900/40"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Sending link...
                </>
              ) : (
                <>
                  Continue with magic link
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>

            <p className="text-center text-gray-500 text-xs">
              <Mail className="inline h-3 w-3 mr-1" />
              No password needed — we&apos;ll email you a secure sign-in link.
              After verification, you&apos;ll proceed to payment.
            </p>
          </form>

          <div className="text-center text-sm">
            <span className="text-gray-500">Already have an account? </span>
            <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ---- Render: Plan Selection (Step 1) ----

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 p-4">
      <div className="w-full max-w-5xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-blue-900/40">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">
            Choose your plan
          </h1>
          <p className="text-gray-400 max-w-lg mx-auto">
            Start managing your site medic operations with SiteMedic.
            All plans include a 14-day free trial.
          </p>
        </div>

        {/* Cancelled banner */}
        {cancelled && (
          <div className="max-w-2xl mx-auto bg-blue-900/30 border border-blue-700/50 rounded-xl p-4 flex items-start gap-3">
            <Mail className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="text-blue-200 font-medium">Payment was cancelled</p>
              <p className="text-blue-300/70">
                You can try again below. Your account has been created — just select a plan to continue.
              </p>
            </div>
          </div>
        )}

        {/* Plan cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {PLANS.map((plan) => (
            <Card
              key={plan.tier}
              className={`relative bg-gray-800/50 border rounded-2xl transition-all cursor-pointer hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-900/20 ${
                plan.popular
                  ? 'border-blue-500/50 shadow-lg shadow-blue-900/20'
                  : 'border-gray-700/50'
              }`}
              onClick={() => handlePlanSelect(plan.tier)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handlePlanSelect(plan.tier);
                }
              }}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-600 text-white text-xs font-semibold shadow-lg">
                    <Sparkles className="w-3 h-3" />
                    Most Popular
                  </span>
                </div>
              )}
              <CardHeader className="pb-4">
                <CardTitle className="text-white text-xl">{plan.name}</CardTitle>
                <p className="text-gray-400 text-sm">{plan.description}</p>
                <div className="pt-2">
                  <span className="text-4xl font-bold text-white">
                    {'\u00A3'}{plan.price}
                  </span>
                  <span className="text-gray-400 text-sm">/mo</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                    <span className="text-gray-300 text-sm">{feature}</span>
                  </div>
                ))}
                <Button
                  className={`w-full mt-4 ${
                    plan.popular
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-500 hover:to-blue-600 shadow-lg shadow-blue-900/40'
                      : 'bg-gray-700/50 text-white hover:bg-gray-600/50 border border-gray-600/50'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlanSelect(plan.tier);
                  }}
                >
                  Get Started
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center text-sm">
          <span className="text-gray-500">Already have an account? </span>
          <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
