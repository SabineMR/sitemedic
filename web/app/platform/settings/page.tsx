/**
 * Platform Settings Page
 *
 * Global platform configuration for SiteMedic super admins.
 * Controls platform-wide settings: feature flags, billing defaults, email config, etc.
 */

'use client';

import { useState } from 'react';
import { Settings, Bell, Mail, Shield, Zap, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function PlatformSettingsPage() {
  const [saving, setSaving] = useState(false);

  // Feature flags state
  const [features, setFeatures] = useState({
    shift_swaps: true,
    geofencing: true,
    riddor_auto_detect: true,
    stripe_payouts: true,
    magic_link_only: true,
  });

  // Notification defaults
  const [notifications, setNotifications] = useState({
    new_org_signup: true,
    payment_failures: true,
    riddor_reports: true,
    medic_alerts: true,
  });

  async function handleSave() {
    setSaving(true);
    // In production: POST to /api/platform/settings
    await new Promise((r) => setTimeout(r, 600));
    setSaving(false);
    toast.success('Platform settings saved');
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Platform Settings</h1>
        <p className="text-purple-200 mt-1">Global configuration for the SiteMedic platform</p>
      </div>

      {/* Feature Flags */}
      <div className="bg-purple-800/30 border border-purple-700/50 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-purple-300" />
          <h2 className="text-white font-semibold text-lg">Feature Flags</h2>
        </div>
        {Object.entries(features).map(([key, value]) => (
          <div key={key} className="flex items-center justify-between py-2 border-b border-purple-700/30 last:border-0">
            <div>
              <p className="text-white font-medium capitalize">{key.replace(/_/g, ' ')}</p>
            </div>
            <button
              onClick={() => setFeatures((prev) => ({ ...prev, [key]: !value }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                value ? 'bg-purple-500' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  value ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        ))}
      </div>

      {/* Notification Alerts */}
      <div className="bg-purple-800/30 border border-purple-700/50 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-5 h-5 text-purple-300" />
          <h2 className="text-white font-semibold text-lg">Platform Notifications</h2>
          <p className="text-purple-300 text-sm ml-auto">Alert platform admins when...</p>
        </div>
        {Object.entries(notifications).map(([key, value]) => (
          <div key={key} className="flex items-center justify-between py-2 border-b border-purple-700/30 last:border-0">
            <p className="text-white font-medium capitalize">{key.replace(/_/g, ' ')}</p>
            <button
              onClick={() => setNotifications((prev) => ({ ...prev, [key]: !value }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                value ? 'bg-purple-500' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  value ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        ))}
      </div>

      {/* Email Configuration */}
      <div className="bg-purple-800/30 border border-purple-700/50 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Mail className="w-5 h-5 text-purple-300" />
          <h2 className="text-white font-semibold text-lg">Email Configuration</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-purple-300 text-sm font-medium block mb-1">Support Email</label>
            <input
              type="email"
              defaultValue="support@sitemedic.co.uk"
              className="w-full px-3 py-2 bg-purple-900/50 border border-purple-700/50 rounded-xl text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
            />
          </div>
          <div>
            <label className="text-purple-300 text-sm font-medium block mb-1">No-Reply Sender</label>
            <input
              type="email"
              defaultValue="noreply@sitemedic.co.uk"
              className="w-full px-3 py-2 bg-purple-900/50 border border-purple-700/50 rounded-xl text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="bg-purple-800/30 border border-purple-700/50 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-purple-300" />
          <h2 className="text-white font-semibold text-lg">Security</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-purple-300 text-sm font-medium block mb-1">Session Timeout (minutes)</label>
            <input
              type="number"
              defaultValue={60}
              min={15}
              max={480}
              className="w-full px-3 py-2 bg-purple-900/50 border border-purple-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
            />
          </div>
          <div>
            <label className="text-purple-300 text-sm font-medium block mb-1">Max Login Attempts</label>
            <input
              type="number"
              defaultValue={5}
              min={3}
              max={10}
              className="w-full px-3 py-2 bg-purple-900/50 border border-purple-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-900/50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
