/**
 * Client Marketplace Registration Page
 * Phase 32: Lightweight Marketplace Signup for Clients
 *
 * Single-click registration page for clients who want to post events
 * on the marketplace. Intentionally minimal to reduce friction.
 * Billing details collected later when they award a job.
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  CheckCircle2,
  Loader2,
  Calendar,
  Users,
  CreditCard,
  ArrowRight,
  Building2,
} from 'lucide-react';

export default function ClientRegisterPage() {
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEnable = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/marketplace/client-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (data.success) {
        setEnabled(true);
        toast.success(data.message || 'Marketplace access enabled!');
      } else {
        setError(data.error || 'Something went wrong');
        toast.error(data.error || 'Something went wrong');
      }
    } catch {
      setError('An unexpected error occurred');
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Success state
  if (enabled) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="w-16 h-16 bg-green-600/20 border border-green-600/30 rounded-2xl flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">You&apos;re All Set!</h1>
          <p className="text-gray-400">
            Marketplace access is now enabled. You can post events and receive
            quotes from verified medic companies.
          </p>
          <Button
            asChild
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-500 hover:to-blue-600"
          >
            <Link href="/marketplace/events/new">
              Post Your First Event
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-blue-900/40">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">
            Post Events on the Marketplace
          </h1>
          <p className="text-gray-400 text-sm">
            Register to post events needing medical cover. Verified medic
            companies will submit quotes for your review.
          </p>
        </div>

        {/* Benefits */}
        <Card className="bg-gray-800/50 border-gray-700/50">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-gray-200 font-medium text-sm">Free to post events</p>
                <p className="text-gray-500 text-xs">
                  Describe your event and medical requirements at no cost.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-gray-200 font-medium text-sm">
                  Compare quotes from verified companies
                </p>
                <p className="text-gray-500 text-xs">
                  All medic companies are CQC-verified and compliance-checked.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CreditCard className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-gray-200 font-medium text-sm">
                  Pay only when you award a quote
                </p>
                <p className="text-gray-500 text-xs">
                  No upfront costs. Billing details collected when you book.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error */}
        {error && (
          <div className="text-sm text-red-300 bg-red-900/30 border border-red-700/50 p-3 rounded-xl">
            {error}
          </div>
        )}

        {/* CTA */}
        <Button
          onClick={handleEnable}
          disabled={loading}
          className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold hover:from-blue-500 hover:to-blue-600 shadow-lg shadow-blue-900/40"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Enabling...
            </>
          ) : (
            <>
              Enable Marketplace Access
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>

        {/* Footer */}
        <div className="text-center text-sm">
          <span className="text-gray-500">Are you a medic company? </span>
          <Link
            href="/marketplace/register"
            className="text-blue-400 hover:text-blue-300 font-medium"
          >
            Register as a provider
          </Link>
        </div>
      </div>
    </div>
  );
}
