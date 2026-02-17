/**
 * Admin Settings Page
 *
 * Organisation-level configuration for the admin panel.
 * Covers: org profile, business configuration, notification preferences, billing, and account security.
 */

'use client';

import { useState, useEffect } from 'react';
import { Settings, Building2, Bell, CreditCard, Shield, Mail, Phone, Loader2, Sliders } from 'lucide-react';
import { useOrg } from '@/contexts/org-context';
import { toast } from 'sonner';

interface OrgSettings {
  base_rate: number;
  geofence_default_radius: number;
  urgency_premiums: number[];
  admin_email: string;
  net30_eligible: boolean;
  credit_limit: number;
}

export default function SettingsPage() {
  const { orgId, orgName } = useOrg();

  const [settings, setSettings] = useState<OrgSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [urgencyInput, setUrgencyInput] = useState('');

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch('/api/admin/settings');
        if (!res.ok) {
          throw new Error('Failed to load settings');
        }
        const data: OrgSettings = await res.json();
        setSettings(data);
        setUrgencyInput((data.urgency_premiums ?? []).join(', '));
      } catch (err) {
        console.error('Error fetching settings:', err);
        toast.error('Could not load business configuration');
      } finally {
        setSettingsLoading(false);
      }
    }

    fetchSettings();
  }, []);

  async function handleSaveSettings() {
    if (!settings) return;

    // Parse urgency premiums from comma-separated input
    const premiumStrings = urgencyInput
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s !== '');
    const premiums = premiumStrings.map(Number);

    // Client-side validation
    if (premiums.length === 0) {
      toast.error('At least one urgency premium tier is required');
      return;
    }
    if (premiums.some((v) => isNaN(v) || v < 0)) {
      toast.error('Urgency premiums must be non-negative numbers');
      return;
    }
    if (settings.base_rate <= 0) {
      toast.error('Base rate must be greater than 0');
      return;
    }
    if (settings.geofence_default_radius < 50 || settings.geofence_default_radius > 5000) {
      toast.error('Geofence radius must be between 50 and 5000 metres');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base_rate: settings.base_rate,
          geofence_default_radius: settings.geofence_default_radius,
          urgency_premiums: premiums,
          admin_email: settings.admin_email,
          net30_eligible: settings.net30_eligible,
          credit_limit: settings.credit_limit,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        toast.error(errorData.error ?? 'Failed to save settings');
        return;
      }

      const updated: OrgSettings = await res.json();
      setSettings(updated);
      setUrgencyInput((updated.urgency_premiums ?? []).join(', '));
      toast.success('Business configuration saved');
    } catch (err) {
      console.error('Error saving settings:', err);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

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
                  defaultValue={orgName ?? ''}
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
                  value={orgId ?? '—'}
                  readOnly
                  className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-400 text-sm font-mono cursor-not-allowed"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Business Configuration */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-orange-400" />
            Business Configuration
          </h2>
          <div className="bg-gray-800/50 backdrop-blur-xl rounded-xl border border-gray-700/50 shadow-2xl p-6 space-y-5">
            {settingsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                <span className="ml-3 text-gray-400 text-sm">Loading configuration...</span>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Base Rate */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Base Rate (GBP/hr)
                    </label>
                    <input
                      type="number"
                      min={1}
                      step={0.5}
                      value={settings?.base_rate ?? ''}
                      onChange={(e) =>
                        setSettings((prev) =>
                          prev ? { ...prev, base_rate: parseFloat(e.target.value) || 0 } : prev
                        )
                      }
                      className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">Hourly rate charged to clients before premiums.</p>
                  </div>

                  {/* Geofence Default Radius */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Default Geofence Radius (metres)
                    </label>
                    <input
                      type="number"
                      min={50}
                      max={5000}
                      step={50}
                      value={settings?.geofence_default_radius ?? ''}
                      onChange={(e) =>
                        setSettings((prev) =>
                          prev
                            ? { ...prev, geofence_default_radius: parseInt(e.target.value, 10) || 0 }
                            : prev
                        )
                      }
                      className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">Default radius (50–5000 m) used for site geofencing.</p>
                  </div>

                  {/* Urgency Premium Tiers */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Urgency Premium Tiers (%)
                    </label>
                    <input
                      type="text"
                      value={urgencyInput}
                      onChange={(e) => setUrgencyInput(e.target.value)}
                      placeholder="e.g. 0, 20, 50, 75"
                      className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">Comma-separated percentage premiums applied for urgency.</p>
                  </div>

                  {/* Admin Notification Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Admin Notification Email
                    </label>
                    <input
                      type="email"
                      value={settings?.admin_email ?? ''}
                      onChange={(e) =>
                        setSettings((prev) =>
                          prev ? { ...prev, admin_email: e.target.value } : prev
                        )
                      }
                      placeholder="admin@yourcompany.co.uk"
                      className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">Email address for admin system notifications.</p>
                  </div>

                  {/* Default Credit Limit */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Default Credit Limit (GBP)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={100}
                      value={settings?.credit_limit ?? ''}
                      onChange={(e) =>
                        setSettings((prev) =>
                          prev
                            ? { ...prev, credit_limit: parseFloat(e.target.value) || 0 }
                            : prev
                        )
                      }
                      className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">Default credit limit applied to new Net 30 clients.</p>
                  </div>
                </div>

                {/* Net 30 Payment Terms */}
                <div className="flex items-center justify-between py-3 border-t border-gray-700/50">
                  <div>
                    <p className="text-sm font-medium text-white">Net 30 Payment Terms Available</p>
                    <p className="text-xs text-gray-400 mt-0.5">Allow eligible clients to pay within 30 days of invoice</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings?.net30_eligible ?? false}
                      onChange={(e) =>
                        setSettings((prev) =>
                          prev ? { ...prev, net30_eligible: e.target.checked } : prev
                        )
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleSaveSettings}
                    disabled={saving}
                    className="px-5 py-2.5 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg font-medium text-sm transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-2"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Configuration'
                    )}
                  </button>
                </div>
              </>
            )}
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
