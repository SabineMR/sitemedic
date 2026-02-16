/**
 * Payment Page
 * Phase 4.5: Step 2 - Payment or Net 30 confirmation
 *
 * Flow:
 * 1. Check auth session
 * 2. If not authenticated, show ClientRegistrationForm
 * 3. After registration or if already authenticated, fetch client
 * 4. If payment_terms='prepay', show PaymentForm
 * 5. If payment_terms='net_30', show Net30Confirmation
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { ClientRegistrationForm } from '@/components/booking/client-registration-form';
import { PaymentForm } from '@/components/booking/payment-form';
import { Net30Confirmation } from '@/components/booking/net30-confirmation';

type PaymentFlow = 'loading' | 'registration' | 'prepay' | 'net_30';

interface ClientData {
  id: string;
  payment_terms: 'prepay' | 'net_30';
  credit_limit: number;
  outstanding_balance: number;
}

export default function PaymentPage() {
  const [flow, setFlow] = useState<PaymentFlow>('loading');
  const [client, setClient] = useState<ClientData | null>(null);

  useEffect(() => {
    checkAuthAndClient();
  }, []);

  const checkAuthAndClient = async () => {
    const supabase = createClient();

    // Check auth session
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      // Not authenticated - show registration form
      setFlow('registration');
      return;
    }

    // Authenticated - fetch client data
    const { data: clientData, error } = await supabase
      .from('clients')
      .select('id, payment_terms, credit_limit, outstanding_balance')
      .eq('id', session.user.id)
      .single();

    if (error || !clientData) {
      console.error('Error fetching client:', error);
      setFlow('registration');
      return;
    }

    setClient(clientData);
    setFlow(clientData.payment_terms === 'net_30' ? 'net_30' : 'prepay');
  };

  const handleRegistered = (clientId: string, paymentTerms: 'prepay' | 'net_30') => {
    setClient({
      id: clientId,
      payment_terms: paymentTerms,
      credit_limit: 0,
      outstanding_balance: 0,
    });
    setFlow(paymentTerms);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-3xl mx-auto px-4">
        {/* Step indicator */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center space-x-4 mb-4">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold">
                ✓
              </div>
              <span className="ml-2 text-sm font-medium text-slate-600">
                Booking Details
              </span>
            </div>
            <div className="w-12 h-1 bg-slate-300"></div>
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                2
              </div>
              <span className="ml-2 text-sm font-medium text-blue-600">Payment</span>
            </div>
            <div className="w-12 h-1 bg-slate-300"></div>
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-slate-300 text-white flex items-center justify-center font-bold">
                3
              </div>
              <span className="ml-2 text-sm font-medium text-slate-400">
                Confirmation
              </span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Complete Your Booking</h1>
        </div>

        {/* Content based on flow */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          {flow === 'loading' && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-slate-600">Loading...</p>
              </div>
            </div>
          )}

          {flow === 'registration' && (
            <ClientRegistrationForm onRegistered={handleRegistered} />
          )}

          {flow === 'prepay' && client && <PaymentForm clientId={client.id} />}

          {flow === 'net_30' && client && (
            <Net30Confirmation
              clientId={client.id}
              creditLimit={client.credit_limit}
              outstandingBalance={client.outstanding_balance}
            />
          )}
        </div>

        {/* Back link */}
        <div className="mt-6 text-center">
          <Link
            href="/book"
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            ← Back to booking details
          </Link>
        </div>
      </div>
    </div>
  );
}
