/**
 * Admin Settings Page
 *
 * Organisation-level configuration for the admin panel.
 * Covers: org profile, notification preferences, billing, and account security.
 */

'use client';

import { Settings, Building2, Bell, CreditCard, Shield, Mail, Phone } from 'lucide-react';
import { useOrg } from '@/contexts/org-context';

export default function SettingsPage() {
  const { org } = useOrg();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800">
      {/* Header */}
      <header className="bg-gray-800/50 backdrop-blur-xl border-b border-gray-700/50 px-8 py-6 shadow-lg">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight flex items-center gap-3">
            <Settings className="w-8 h-8 text-blue-400" />
            Settings
          </h1>
          <p className="text-gray-400 text-sm">Manage your organisation account and preferences</p>
        </div>
      </header>

      <div className="p-8 space-y-8">
        {/* Organisation Profile */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-400" />
            Organisation Profile
          </h2>
          <div className="bg-gray-800/50 backdrop-blur-xl rounded-xl border border-gray-700/50 shadow-2xl p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Organisation Name
                </label>
                <input
                  type="text"
                  defaultValue={org?.name ?? ''}
                  readOnly
                  className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-not-allowed opacity-70"
                />
                <p className="text-xs text-gray-500 mt-1">Contact support to change your org name.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Organisation ID
                </label>
                <input
                  type="text"
                  value={org?.id ?? '—'}
                  readOnly
                  className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-400 text-sm font-mono cursor-not-allowed"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Notifications */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5 text-yellow-400" />
            Notifications
          </h2>
          <div className="bg-gray-800/50 backdrop-blur-xl rounded-xl border border-gray-700/50 shadow-2xl p-6">
            <div className="space-y-4">
              {[
                { label: 'Booking confirmations', desc: 'Email when a booking is confirmed or updated' },
                { label: 'RIDDOR deadline alerts', desc: 'Email 48h before a RIDDOR report is due' },
                { label: 'Certification expiry warnings', desc: 'Email 30 days before a medic cert expires' },
                { label: 'Weekly payout summaries', desc: 'Email every Friday with payout breakdown' },
                { label: 'Cash flow alerts', desc: 'Email when Stripe balance drops below threshold' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-3 border-b border-gray-700/50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-white">{item.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Contact Details */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Mail className="w-5 h-5 text-green-400" />
            Contact Details
          </h2>
          <div className="bg-gray-800/50 backdrop-blur-xl rounded-xl border border-gray-700/50 shadow-2xl p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                  <Mail className="w-4 h-4" /> Billing Email
                </label>
                <input
                  type="email"
                  placeholder="billing@yourcompany.co.uk"
                  className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                  <Phone className="w-4 h-4" /> Emergency Contact
                </label>
                <input
                  type="tel"
                  placeholder="+44 7700 900000"
                  className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-lg font-medium text-sm transition-all duration-200 hover:scale-105 active:scale-95">
                Save Changes
              </button>
            </div>
          </div>
        </section>

        {/* Billing */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-purple-400" />
            Billing & Subscription
          </h2>
          <div className="bg-gray-800/50 backdrop-blur-xl rounded-xl border border-gray-700/50 shadow-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Current Plan</p>
                <p className="text-gray-400 text-sm mt-1">Billed via Stripe. Contact support to change your plan.</p>
              </div>
              <span className="px-4 py-1.5 bg-blue-500/20 text-blue-300 rounded-full text-sm font-semibold border border-blue-500/30">
                Active
              </span>
            </div>
          </div>
        </section>

        {/* Security */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-red-400" />
            Security
          </h2>
          <div className="bg-gray-800/50 backdrop-blur-xl rounded-xl border border-gray-700/50 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-700/50">
              <div>
                <p className="text-sm font-medium text-white">Authentication Method</p>
                <p className="text-xs text-gray-400 mt-0.5">Magic link (passwordless) via email</p>
              </div>
              <span className="text-xs text-green-400 font-medium bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">
                Enabled
              </span>
            </div>
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-white">Session Timeout</p>
                <p className="text-xs text-gray-400 mt-0.5">Sessions expire after 168 hours of inactivity</p>
              </div>
              <span className="text-xs text-gray-300 font-mono">7 days</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
