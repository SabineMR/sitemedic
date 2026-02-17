/**
 * Organisation Setup Page
 *
 * Shown to newly authenticated users who have no org_id in their app_metadata.
 * This happens when:
 *   - A new user signs up via magic link but hasn't been assigned to an org yet
 *   - An admin user's org_id was somehow cleared
 *
 * After completing this form:
 *   - An 'organizations' record is created
 *   - An 'org_memberships' record is created (org_admin role)
 *   - The user's app_metadata.org_id is updated via service role API
 *   - User is redirected to /admin
 *
 * Route: /setup/organization
 * Access: Any authenticated user without an org_id
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Building2, ArrowRight, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function OrganizationSetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    contact_email: '',
    contact_phone: '',
    address: '',
    postcode: '',
  });

  function updateField(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.name.trim() || !form.contact_email.trim()) {
      toast.error('Organisation name and contact email are required');
      return;
    }

    setSaving(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        toast.error('Authentication error. Please sign in again.');
        router.push('/login');
        return;
      }

      // 1. Create the organization
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: form.name.trim(),
          contact_email: form.contact_email.trim(),
          contact_phone: form.contact_phone.trim() || null,
          address: form.address.trim() || null,
          postcode: form.postcode.trim() || null,
          created_by: user.id,
        })
        .select('id')
        .single();

      if (orgError || !org) {
        console.error('Failed to create org:', orgError);
        toast.error('Failed to create organisation. Please try again.');
        setSaving(false);
        return;
      }

      // 2. Create org membership with org_admin role
      const { error: membershipError } = await supabase.from('org_memberships').insert({
        org_id: org.id,
        user_id: user.id,
        role: 'org_admin',
      });

      if (membershipError) {
        console.error('Failed to create membership:', membershipError);
        toast.error('Organisation created but membership setup failed. Contact support.');
        setSaving(false);
        return;
      }

      setStep('success');

      // Brief delay then redirect to admin
      setTimeout(() => {
        router.push('/admin');
        router.refresh();
      }, 1500);
    } catch (err) {
      console.error('Org setup error:', err);
      toast.error('Something went wrong. Please try again.');
      setSaving(false);
    }
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-green-600/20 border border-green-600/30 rounded-2xl flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-white text-2xl font-bold">Organisation Created!</h2>
          <p className="text-gray-400">Redirecting to your admin dashboard...</p>
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mt-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-blue-900/40">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Set Up Your Organisation</h1>
          <p className="text-gray-400 text-sm">
            Create your organisation to start managing bookings, medics, and compliance.
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6 space-y-4"
        >
          <div>
            <label className="text-gray-300 text-sm font-medium block mb-1.5">
              Organisation Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="e.g. Apex Safety Group Ltd"
              className="w-full px-3.5 py-2.5 bg-gray-900/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          <div>
            <label className="text-gray-300 text-sm font-medium block mb-1.5">
              Contact Email <span className="text-red-400">*</span>
            </label>
            <input
              type="email"
              required
              value={form.contact_email}
              onChange={(e) => updateField('contact_email', e.target.value)}
              placeholder="admin@yourcompany.co.uk"
              className="w-full px-3.5 py-2.5 bg-gray-900/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          <div>
            <label className="text-gray-300 text-sm font-medium block mb-1.5">Contact Phone</label>
            <input
              type="tel"
              value={form.contact_phone}
              onChange={(e) => updateField('contact_phone', e.target.value)}
              placeholder="+44 7700 900000"
              className="w-full px-3.5 py-2.5 bg-gray-900/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          <div>
            <label className="text-gray-300 text-sm font-medium block mb-1.5">Business Address</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => updateField('address', e.target.value)}
              placeholder="123 Business Park, Manchester"
              className="w-full px-3.5 py-2.5 bg-gray-900/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          <div>
            <label className="text-gray-300 text-sm font-medium block mb-1.5">Postcode</label>
            <input
              type="text"
              value={form.postcode}
              onChange={(e) => updateField('postcode', e.target.value.toUpperCase())}
              placeholder="M1 1AA"
              className="w-full px-3.5 py-2.5 bg-gray-900/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:from-blue-500 hover:to-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/40 mt-2"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Creating Organisation...
              </>
            ) : (
              <>
                Create Organisation
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-gray-500 text-xs">
          You will be assigned as Organisation Admin. You can invite team members from the admin panel.
        </p>
      </div>
    </div>
  );
}
