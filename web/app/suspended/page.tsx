'use client';

/**
 * /suspended — Subscription Inactive Page
 *
 * Shown to org admins whose subscription has been cancelled.
 * Provides a clear path to reactivation via Stripe Customer Portal
 * and explicitly reassures that data is preserved.
 *
 * Phase 30-05: Subscription suspension enforcement
 */

import { useState } from 'react';
import { ShieldOff, ArrowRight, Loader2, Mail, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useOrg } from '@/contexts/org-context';

export default function SuspendedPage() {
  const { orgName } = useOrg();
  const [reactivating, setReactivating] = useState(false);
  const router = useRouter();

  async function handleReactivate() {
    setReactivating(true);
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to open billing portal');
        setReactivating(false);
        return;
      }

      // Redirect to Stripe Customer Portal for reactivation
      window.location.href = data.url;
    } catch {
      toast.error('Something went wrong. Please try again.');
      setReactivating(false);
    }
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8 space-y-6">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
              <ShieldOff className="w-8 h-8 text-red-400" />
            </div>
          </div>

          {/* Heading */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-gray-900">
              Subscription Inactive
            </h1>
            {orgName && (
              <p className="text-sm text-gray-500">{orgName}</p>
            )}
            <p className="text-gray-600">
              Your subscription has been cancelled. Your data is safe and fully preserved.
            </p>
          </div>

          {/* Data preservation callout */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 flex items-center justify-center mt-0.5">
                <div className="w-2 h-2 rounded-full bg-green-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-green-800">
                  Your data is safe
                </p>
                <p className="text-sm text-green-700 mt-1">
                  All bookings, medic records, invoices, and reports are fully
                  preserved. Reactivate your subscription to regain access.
                </p>
              </div>
            </div>
          </div>

          {/* Reactivate button */}
          <button
            onClick={handleReactivate}
            disabled={reactivating}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-medium rounded-lg transition-colors"
          >
            {reactivating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Opening billing portal...
              </>
            ) : (
              <>
                Reactivate Subscription
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-2 text-gray-400">or</span>
            </div>
          </div>

          {/* Secondary actions */}
          <div className="flex items-center justify-between text-sm">
            <a
              href="mailto:support@sitemedic.co.uk"
              className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-700 transition-colors"
            >
              <Mail className="w-4 h-4" />
              Contact Support
            </a>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-700 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Log Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
