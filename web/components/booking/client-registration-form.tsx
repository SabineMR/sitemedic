/**
 * Client Registration Form
 * Phase 4.5: Inline registration for new clients before payment
 */

'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ClientRegistrationFormProps {
  onRegistered: (clientId: string, paymentTerms: 'prepay' | 'net_30') => void;
}

export function ClientRegistrationForm({ onRegistered }: ClientRegistrationFormProps) {
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const supabase = createClient();

      // Generate a random password for initial signup
      const randomPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);

      // Create auth account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: randomPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          setError('Email already registered. Please login instead.');
        } else {
          setError(authError.message);
        }
        setLoading(false);
        return;
      }

      if (!authData.user) {
        setError('Failed to create account');
        setLoading(false);
        return;
      }

      // Create client record
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .insert({
          id: authData.user.id, // Use auth user ID as client ID
          company_name: companyName,
          contact_name: contactName,
          contact_email: email,
          contact_phone: phone,
          billing_address: 'To be provided',
          billing_postcode: 'TBD',
          payment_terms: 'prepay',
          credit_limit: 0,
          outstanding_balance: 0,
          total_bookings: 0,
        })
        .select()
        .single();

      if (clientError) {
        console.error('Error creating client:', clientError);
        setError('Failed to create client account');
        setLoading(false);
        return;
      }

      // Success - call the callback with new client ID
      onRegistered(client.id, 'prepay');
    } catch (err) {
      console.error('Registration error:', err);
      setError('An unexpected error occurred');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold">Create Account</h2>
        <p className="text-slate-600 mt-2">
          Enter your details to complete your booking
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-md text-sm">
          {error}
        </div>
      )}

      <div>
        <Label htmlFor="email">Email Address *</Label>
        <Input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          disabled={loading}
        />
      </div>

      <div>
        <Label htmlFor="companyName">Company Name *</Label>
        <Input
          id="companyName"
          type="text"
          required
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="ABC Construction Ltd"
          disabled={loading}
        />
      </div>

      <div>
        <Label htmlFor="contactName">Contact Name *</Label>
        <Input
          id="contactName"
          type="text"
          required
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
          placeholder="John Smith"
          disabled={loading}
        />
      </div>

      <div>
        <Label htmlFor="phone">Phone Number *</Label>
        <Input
          id="phone"
          type="tel"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="07700 900000"
          disabled={loading}
        />
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Creating Account...' : 'Continue to Payment'}
      </Button>

      <p className="text-xs text-slate-500 text-center">
        By continuing, you agree to our Terms and Conditions and Privacy Policy
      </p>
    </form>
  );
}
