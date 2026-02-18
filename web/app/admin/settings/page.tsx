/**
 * Admin Settings Page
 *
 * Organisation-level configuration for the admin panel.
 * Covers: org profile, business configuration, notification preferences, billing, and account security.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Building2, Bell, CreditCard, Shield, Mail, Phone, Loader2, Sliders, Layers, Clapperboard, Gauge, HardHat, Music2, Trophy, FerrisWheel, Briefcase, Star, GraduationCap, Tent, ShieldCheck, Palette, Upload, Banknote, Car, Percent, Calendar, CheckCircle2, XCircle } from 'lucide-react';
import { useOrg } from '@/contexts/org-context';
import { toast } from 'sonner';

type VerticalId =
  | 'construction' | 'tv_film' | 'motorsport' | 'festivals'
  | 'sporting_events' | 'fairs_shows' | 'corporate'
  | 'private_events' | 'education' | 'outdoor_adventure';

const VERTICALS: {
  id: VerticalId;
  label: string;
  desc: string;
  color: string;
  icon: React.ReactNode;
}[] = [
  { id: 'construction',     label: 'Construction & Industrial', desc: 'Worksites, plant ops, HSE compliance',     color: 'orange',  icon: <HardHat className="w-5 h-5" /> },
  { id: 'tv_film',          label: 'TV & Film',                 desc: 'Set medic, stunt & production cover',      color: 'violet',  icon: <Clapperboard className="w-5 h-5" /> },
  { id: 'motorsport',       label: 'Motorsport & Extreme',      desc: 'Track, karting, Motorsport UK events',     color: 'red',     icon: <Gauge className="w-5 h-5" /> },
  { id: 'festivals',        label: 'Music Festivals',           desc: 'Purple Guide, crowd medicine',             color: 'pink',    icon: <Music2 className="w-5 h-5" /> },
  { id: 'sporting_events',  label: 'Sporting Events',           desc: 'Stadiums, marathons, FA-governed events',  color: 'green',   icon: <Trophy className="w-5 h-5" /> },
  { id: 'fairs_shows',      label: 'Fairs & Shows',             desc: 'Agricultural shows, public exhibitions',   color: 'yellow',  icon: <FerrisWheel className="w-5 h-5" /> },
  { id: 'corporate',        label: 'Corporate Events',          desc: 'Conferences, team away-days',              color: 'blue',    icon: <Briefcase className="w-5 h-5" /> },
  { id: 'private_events',   label: 'Private Events',            desc: 'Weddings, galas, private parties',         color: 'rose',    icon: <Star className="w-5 h-5" /> },
  { id: 'education',        label: 'Education & Youth',         desc: 'Schools, universities, youth events',      color: 'teal',    icon: <GraduationCap className="w-5 h-5" /> },
  { id: 'outdoor_adventure',label: 'Outdoor Adventure',         desc: 'Endurance, OCR, remote access events',     color: 'emerald', icon: <Tent className="w-5 h-5" /> },
];

const COLOR_MAP: Record<string, string> = {
  orange:  'border-orange-500/60 bg-orange-500/10 text-orange-300',
  violet:  'border-violet-500/60 bg-violet-500/10 text-violet-300',
  red:     'border-red-500/60 bg-red-500/10 text-red-300',
  pink:    'border-pink-500/60 bg-pink-500/10 text-pink-300',
  green:   'border-green-500/60 bg-green-500/10 text-green-300',
  yellow:  'border-yellow-500/60 bg-yellow-500/10 text-yellow-300',
  blue:    'border-blue-500/60 bg-blue-500/10 text-blue-300',
  rose:    'border-rose-500/60 bg-rose-500/10 text-rose-300',
  teal:    'border-teal-500/60 bg-teal-500/10 text-teal-300',
  emerald: 'border-emerald-500/60 bg-emerald-500/10 text-emerald-300',
};

interface OrgSettings {
  base_rate: number;
  geofence_default_radius: number;
  urgency_premiums: number[];
  admin_email: string;
  net30_eligible: boolean;
  credit_limit: number;
  industry_verticals: VerticalId[];
  cqc_registered: boolean;
  cqc_registration_number: string | null;
  cqc_registration_date: string | null;
  // Payout configuration
  mileage_enabled: boolean;
  mileage_rate_pence: number;
  referral_commission_percent: number;
}

export default function SettingsPage() {
  const { orgId, orgName } = useOrg();

  const [settings, setSettings] = useState<OrgSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [urgencyInput, setUrgencyInput] = useState('');
  const [savingVerticals, setSavingVerticals] = useState(false);
  const [savingCqc, setSavingCqc] = useState(false);
  const [savingContact, setSavingContact] = useState(false);
  const [billingEmail, setBillingEmail] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [savingPayout, setSavingPayout] = useState(false);
  const [mileageEnabled, setMileageEnabled] = useState(true);
  const [mileageRatePence, setMileageRatePence] = useState(45);
  const [referralCommissionPercent, setReferralCommissionPercent] = useState(10);

  // Notification preferences — persisted to org_settings DB column
  const [savingNotifs, setSavingNotifs] = useState(false);
  const defaultNotifPrefs = {
    booking_confirmations: true,
    riddor_alerts: true,
    cert_expiry: true,
    payout_summaries: true,
    cashflow_alerts: true,
  };
  const [notifPrefs, setNotifPrefs] = useState(defaultNotifPrefs);

  // Subscription state
  const [subscriptionTier, setSubscriptionTier] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);

  // Google Calendar integration state
  const [gcalLoading, setGcalLoading] = useState(true);
  const [gcalCredentialsConfigured, setGcalCredentialsConfigured] = useState(false);
  const [gcalRedirectUri, setGcalRedirectUri] = useState('');
  const [gcalMedics, setGcalMedics] = useState<Array<{ id: string; first_name: string; last_name: string; connected: boolean }>>([]);

  // Branding state
  const [brandingLoading, setBrandingLoading] = useState(true);
  const [savingBranding, setSavingBranding] = useState(false);
  const [brandCompanyName, setBrandCompanyName] = useState('');
  const [brandTagline, setBrandTagline] = useState('');
  const [brandColor, setBrandColor] = useState('#2563EB');
  const [brandLogoPath, setBrandLogoPath] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch('/api/admin/settings');
        if (!res.ok) {
          throw new Error('Failed to load settings');
        }
        const data: OrgSettings = await res.json();
        // Back-fill defaults if columns don't exist yet on older rows
        if (!data.industry_verticals) data.industry_verticals = ['construction'];
        if (data.cqc_registered === undefined || data.cqc_registered === null) data.cqc_registered = false;
        if (data.cqc_registration_number === undefined) data.cqc_registration_number = null;
        if (data.cqc_registration_date === undefined) data.cqc_registration_date = null;
        setSettings(data);
        setUrgencyInput((data.urgency_premiums ?? []).join(', '));
        setBillingEmail(data.admin_email ?? '');
        // Payout configuration defaults
        setMileageEnabled(data.mileage_enabled ?? true);
        setMileageRatePence(data.mileage_rate_pence ?? 45);
        setReferralCommissionPercent(data.referral_commission_percent ?? 10);
        // Notification preferences from DB
        if (data.notification_preferences) {
          setNotifPrefs({ ...defaultNotifPrefs, ...data.notification_preferences });
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
        toast.error('Could not load business configuration');
      } finally {
        setSettingsLoading(false);
      }
    }

    fetchSettings();

    // Fetch subscription
    async function fetchSubscription() {
      try {
        const res = await fetch('/api/admin/subscription');
        if (res.ok) {
          const data = await res.json();
          setSubscriptionTier(data.subscription_tier ?? 'starter');
          setSubscriptionStatus(data.subscription_status ?? 'active');
        }
      } catch { /* ignore */ }
      finally { setSubscriptionLoading(false); }
    }
    fetchSubscription();

    // Fetch Google Calendar integration status
    async function fetchGcalStatus() {
      try {
        const res = await fetch('/api/admin/google-calendar-status');
        if (res.ok) {
          const data = await res.json();
          setGcalCredentialsConfigured(data.credentialsConfigured ?? false);
          setGcalRedirectUri(data.redirectUri ?? '');
          setGcalMedics(data.medics ?? []);
        }
      } catch { /* endpoint may not exist yet */ }
      finally { setGcalLoading(false); }
    }
    fetchGcalStatus();

    // Fetch branding
    async function fetchBranding() {
      try {
        const res = await fetch('/api/admin/branding');
        if (res.ok) {
          const data = await res.json();
          setBrandCompanyName(data.company_name ?? '');
          setBrandTagline(data.tagline ?? '');
          setBrandColor(data.primary_colour_hex ?? '#2563EB');
          setBrandLogoPath(data.logo_path ?? null);
        }
      } catch { /* branding table may not exist yet */ }
      finally { setBrandingLoading(false); }
    }
    fetchBranding();
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

  function toggleVertical(id: VerticalId) {
    setSettings((prev) => {
      if (!prev) return prev;
      const current = prev.industry_verticals ?? [];
      const next = current.includes(id)
        ? current.filter((v) => v !== id)
        : [...current, id];
      // Must keep at least one selected
      if (next.length === 0) return prev;
      return { ...prev, industry_verticals: next };
    });
  }

  async function handleSaveVerticals() {
    if (!settings) return;
    setSavingVerticals(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ industry_verticals: settings.industry_verticals }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        toast.error(errorData.error ?? 'Failed to save verticals');
        return;
      }
      const updated: OrgSettings = await res.json();
      setSettings((prev) => prev ? { ...prev, industry_verticals: updated.industry_verticals } : prev);
      toast.success('Industry verticals saved');
    } catch {
      toast.error('Failed to save verticals');
    } finally {
      setSavingVerticals(false);
    }
  }

  async function handleSaveCqc() {
    if (!settings) return;
    setSavingCqc(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cqc_registered: settings.cqc_registered,
          cqc_registration_number: settings.cqc_registration_number ?? '',
          cqc_registration_date: settings.cqc_registration_date ?? '',
        }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        toast.error(errorData.error ?? 'Failed to save CQC settings');
        return;
      }
      const updated: OrgSettings = await res.json();
      setSettings((prev) => prev ? {
        ...prev,
        cqc_registered: updated.cqc_registered,
        cqc_registration_number: updated.cqc_registration_number,
        cqc_registration_date: updated.cqc_registration_date,
      } : prev);
      toast.success('CQC compliance settings saved');
    } catch {
      toast.error('Failed to save CQC settings');
    } finally {
      setSavingCqc(false);
    }
  }

  async function handleSaveBranding() {
    setSavingBranding(true);
    try {
      const res = await fetch('/api/admin/branding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: brandCompanyName,
          tagline: brandTagline,
          primary_colour_hex: brandColor,
        }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        toast.error(errorData.error ?? 'Failed to save branding');
        return;
      }
      toast.success('Branding settings saved');
    } catch {
      toast.error('Failed to save branding');
    } finally {
      setSavingBranding(false);
    }
  }

  async function handleSaveContactDetails() {
    setSavingContact(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_email: billingEmail }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        toast.error(errorData.error ?? 'Failed to save contact details');
        return;
      }
      const updated: OrgSettings = await res.json();
      setSettings((prev) => prev ? { ...prev, admin_email: updated.admin_email } : prev);
      toast.success('Contact details saved');
    } catch {
      toast.error('Failed to save contact details');
    } finally {
      setSavingContact(false);
    }
  }

  async function handleSavePayout() {
    setSavingPayout(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mileage_enabled: mileageEnabled,
          mileage_rate_pence: mileageRatePence,
          referral_commission_percent: referralCommissionPercent,
        }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        toast.error(errorData.error ?? 'Failed to save payout settings');
        return;
      }
      const updated: OrgSettings = await res.json();
      setMileageEnabled(updated.mileage_enabled ?? true);
      setMileageRatePence(updated.mileage_rate_pence ?? 45);
      setReferralCommissionPercent(updated.referral_commission_percent ?? 10);
      toast.success('Payout configuration saved');
    } catch {
      toast.error('Failed to save payout settings');
    } finally {
      setSavingPayout(false);
    }
  }

  async function handleNotifToggle(key: keyof typeof defaultNotifPrefs) {
    const next = { ...notifPrefs, [key]: !notifPrefs[key] };
    setNotifPrefs(next);
    setSavingNotifs(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notification_preferences: next }),
      });
      if (!res.ok) throw new Error('Failed to save');
      toast.success(`${next[key] ? 'Enabled' : 'Disabled'} notification`);
    } catch {
      // Revert on failure
      setNotifPrefs(notifPrefs);
      toast.error('Failed to save notification preference');
    } finally {
      setSavingNotifs(false);
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

        {/* Branding */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Palette className="w-5 h-5 text-pink-400" />
            Branding
          </h2>
          <div className="bg-gray-800/50 backdrop-blur-xl rounded-xl border border-gray-700/50 shadow-2xl p-6 space-y-5">
            {brandingLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                <span className="ml-3 text-gray-400 text-sm">Loading branding...</span>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-400">
                  Customise your organisation&apos;s branding for white-label portals, PDFs, and emails.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Company Display Name
                    </label>
                    <input
                      type="text"
                      value={brandCompanyName}
                      onChange={(e) => setBrandCompanyName(e.target.value)}
                      placeholder="Your Company Name"
                      className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">Shown on branded documents and client-facing pages.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Primary Brand Colour
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={brandColor}
                        onChange={(e) => setBrandColor(e.target.value)}
                        className="w-10 h-10 rounded-lg border border-gray-700 bg-transparent cursor-pointer"
                      />
                      <input
                        type="text"
                        value={brandColor}
                        onChange={(e) => setBrandColor(e.target.value)}
                        placeholder="#2563EB"
                        pattern="^#[0-9A-Fa-f]{6}$"
                        className="w-32 bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm font-mono placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <div
                        className="w-10 h-10 rounded-lg border border-gray-700"
                        style={{ backgroundColor: brandColor }}
                      />
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Tagline
                    </label>
                    <input
                      type="text"
                      value={brandTagline}
                      onChange={(e) => setBrandTagline(e.target.value)}
                      placeholder="e.g. Professional Medical Staffing Solutions"
                      className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">Displayed below your logo on the white-label portal.</p>
                  </div>
                </div>

                {/* Logo info */}
                <div className="flex items-start gap-3 px-4 py-3 bg-gray-700/20 border border-gray-700/40 rounded-xl">
                  <Upload className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-gray-400">
                    <span className="text-gray-200 font-medium">Logo upload</span>
                    {' '}— {brandLogoPath ? `Current: ${brandLogoPath}` : 'No logo uploaded yet.'}
                    {' '}Logo upload via file picker coming soon.
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleSaveBranding}
                    disabled={savingBranding}
                    className="px-5 py-2.5 bg-gradient-to-r from-pink-600 to-pink-700 hover:from-pink-500 hover:to-pink-600 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg font-medium text-sm transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-2"
                  >
                    {savingBranding ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Branding'
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Industry & Verticals */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Layers className="w-5 h-5 text-teal-400" />
            Industry &amp; Verticals
          </h2>
          <div className="bg-gray-800/50 backdrop-blur-xl rounded-xl border border-gray-700/50 shadow-2xl p-6">
            {settingsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                <span className="ml-3 text-gray-400 text-sm">Loading verticals...</span>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-400 mb-5">
                  Select every type of event or site your organisation covers. This drives
                  context-aware labels and compliance checklists across the platform.
                  Select at least one.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
                  {VERTICALS.map((v) => {
                    const selected = (settings?.industry_verticals ?? []).includes(v.id);
                    const colorCls = selected
                      ? COLOR_MAP[v.color]
                      : 'border-gray-700 bg-gray-900/40 text-gray-400 hover:border-gray-500';
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => toggleVertical(v.id)}
                        className={`flex flex-col items-start gap-2 p-3.5 rounded-xl border-2 transition-all duration-150 text-left ${colorCls}`}
                      >
                        <span className={selected ? '' : 'opacity-50'}>{v.icon}</span>
                        <span className="text-xs font-semibold leading-tight">{v.label}</span>
                        <span className="text-[10px] leading-snug opacity-70">{v.desc}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-gray-700/50">
                  <p className="text-xs text-gray-500">
                    {(settings?.industry_verticals ?? []).length} vertical
                    {(settings?.industry_verticals ?? []).length !== 1 ? 's' : ''} selected
                  </p>
                  <button
                    onClick={handleSaveVerticals}
                    disabled={savingVerticals}
                    className="px-5 py-2.5 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-500 hover:to-teal-600 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg font-medium text-sm transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-2"
                  >
                    {savingVerticals ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Verticals'
                    )}
                  </button>
                </div>
              </>
            )}
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

        {/* Payout Configuration */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Banknote className="w-5 h-5 text-emerald-400" />
            Payout Configuration
          </h2>
          <div className="bg-gray-800/50 backdrop-blur-xl rounded-xl border border-gray-700/50 shadow-2xl p-6 space-y-5">
            {settingsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                <span className="ml-3 text-gray-400 text-sm">Loading payout settings...</span>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-400">
                  Configure how medics are reimbursed for mileage and how referral commissions are calculated.
                </p>

                {/* Mileage Reimbursement */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Car className="w-4 h-4 text-gray-400" />
                    Mileage Reimbursement
                  </h3>

                  {/* Mileage toggle */}
                  <div className="flex items-center justify-between py-3 border-b border-gray-700/50">
                    <div>
                      <p className="text-sm font-medium text-white">Reimburse medics for mileage</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        When enabled, mileage is auto-calculated from medic home postcode to job site
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={mileageEnabled}
                        onChange={(e) => setMileageEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>

                  {/* Mileage rate input — only shown when mileage is enabled */}
                  {mileageEnabled && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Rate per mile
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          max={200}
                          step={1}
                          value={mileageRatePence}
                          onChange={(e) => setMileageRatePence(Math.max(0, Math.min(200, parseInt(e.target.value) || 0)))}
                          className="w-28 bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <span className="text-gray-400 text-sm">p/mile</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        HMRC approved rate: 45p/mile. Auto-calculated from medic home postcode to job site.
                      </p>
                    </div>
                  )}
                </div>

                {/* Referral Commission */}
                <div className="space-y-4 pt-2 border-t border-gray-700/50">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Percent className="w-4 h-4 text-gray-400" />
                    Referral Commission
                  </h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Referral commission %
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        value={referralCommissionPercent}
                        onChange={(e) => setReferralCommissionPercent(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                        className="w-28 bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <span className="text-gray-400 text-sm">%</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Percentage of pre-VAT subtotal paid to referrers. Set to 0 to disable referral payouts.
                    </p>
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleSavePayout}
                    disabled={savingPayout}
                    className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg font-medium text-sm transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-2"
                  >
                    {savingPayout ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Payout Settings'
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Google Calendar Integration */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-400" />
            Google Calendar Integration
          </h2>
          <div className="bg-gray-800/50 backdrop-blur-xl rounded-xl border border-gray-700/50 shadow-2xl p-6 space-y-5">
            {gcalLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                <span className="ml-3 text-gray-400 text-sm">Loading Google Calendar status...</span>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-400">
                  Google Calendar 2-way sync allows medics to connect their calendars so the scheduling
                  team can see busy blocks and confirmed bookings are pushed to the medic&apos;s calendar automatically.
                </p>

                {/* Credentials status */}
                <div className={`flex items-center justify-between p-4 rounded-xl border ${
                  gcalCredentialsConfigured
                    ? 'bg-green-900/20 border-green-700/30'
                    : 'bg-red-900/20 border-red-700/30'
                }`}>
                  <div className="flex items-center gap-3">
                    {gcalCredentialsConfigured ? (
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-400" />
                    )}
                    <div>
                      <p className={`text-sm font-medium ${gcalCredentialsConfigured ? 'text-green-300' : 'text-red-300'}`}>
                        OAuth Credentials {gcalCredentialsConfigured ? 'Configured' : 'Not Configured'}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {gcalCredentialsConfigured
                          ? 'GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set'
                          : 'Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET environment variables'}
                      </p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                    gcalCredentialsConfigured
                      ? 'bg-green-500/20 text-green-300 border-green-500/30'
                      : 'bg-red-500/20 text-red-300 border-red-500/30'
                  }`}>
                    {gcalCredentialsConfigured ? 'Ready' : 'Action Required'}
                  </span>
                </div>

                {/* Redirect URI reference */}
                {gcalRedirectUri && (
                  <div className="flex items-start gap-3 px-4 py-3 bg-gray-700/20 border border-gray-700/40 rounded-xl">
                    <Calendar className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-gray-400">
                      <span className="text-gray-200 font-medium">Redirect URI</span>
                      {' '}&mdash; <code className="text-purple-300 bg-gray-900/50 px-1.5 py-0.5 rounded">{gcalRedirectUri}</code>
                      <br />
                      <span className="mt-1 inline-block">Ensure this is added to your Google Cloud Console OAuth 2.0 authorized redirect URIs.</span>
                    </div>
                  </div>
                )}

                {/* Medic sync table */}
                <div>
                  <h3 className="text-sm font-semibold text-white mb-3">Medic Connection Status</h3>
                  {gcalMedics.length === 0 ? (
                    <p className="text-sm text-gray-500">No medics found in this organisation.</p>
                  ) : (
                    <div className="overflow-hidden rounded-xl border border-gray-700/50">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-900/50 border-b border-gray-700/50">
                            <th className="text-left px-4 py-2.5 text-gray-400 font-medium">Medic</th>
                            <th className="text-right px-4 py-2.5 text-gray-400 font-medium">Calendar Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {gcalMedics.map((medic) => (
                            <tr key={medic.id} className="border-b border-gray-700/30 last:border-0">
                              <td className="px-4 py-3 text-white">
                                {medic.first_name} {medic.last_name}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {medic.connected ? (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-900/50 border border-green-700/50 text-green-300 rounded-full text-xs font-medium">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Connected
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-700/50 border border-gray-600/50 text-gray-400 rounded-full text-xs font-medium">
                                    <XCircle className="w-3 h-3" />
                                    Not Connected
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-3">
                    {gcalMedics.filter((m) => m.connected).length} of {gcalMedics.length} medic{gcalMedics.length !== 1 ? 's' : ''} connected.
                    Medics can connect their calendar from their profile page.
                  </p>
                </div>
              </>
            )}
          </div>
        </section>

        {/* CQC Compliance */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-400" />
            CQC Compliance
          </h2>
          <div className="bg-gray-800/50 backdrop-blur-xl rounded-xl border border-gray-700/50 shadow-2xl p-6 space-y-5">
            {settingsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                <span className="ml-3 text-gray-400 text-sm">Loading CQC settings...</span>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-400">
                  If your organisation is registered with the Care Quality Commission (CQC) as a
                  regulated health or social care provider, record your details here. These will
                  appear on client-facing documents and booking confirmations.
                </p>

                {/* CQC Registered toggle */}
                <div className="flex items-center justify-between py-3 border-b border-gray-700/50">
                  <div>
                    <p className="text-sm font-medium text-white">Organisation is CQC Registered</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Enable to record your CQC registration number and date
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings?.cqc_registered ?? false}
                      onChange={(e) =>
                        setSettings((prev) =>
                          prev ? { ...prev, cqc_registered: e.target.checked } : prev
                        )
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Registration details — only shown when registered */}
                {settings?.cqc_registered && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        CQC Registration Number
                      </label>
                      <input
                        type="text"
                        value={settings.cqc_registration_number ?? ''}
                        onChange={(e) =>
                          setSettings((prev) =>
                            prev ? { ...prev, cqc_registration_number: e.target.value || null } : prev
                          )
                        }
                        placeholder="e.g. 1-XXXXXXXXXX"
                        className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-500 mt-1">Your CQC provider ID (format: 1-XXXXXXXXXX).</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Registration Date
                      </label>
                      <input
                        type="date"
                        value={settings.cqc_registration_date ?? ''}
                        onChange={(e) =>
                          setSettings((prev) =>
                            prev ? { ...prev, cqc_registration_date: e.target.value || null } : prev
                          )
                        }
                        className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-500 mt-1">Date your CQC registration was granted.</p>
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleSaveCqc}
                    disabled={savingCqc}
                    className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg font-medium text-sm transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-2"
                  >
                    {savingCqc ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save CQC Settings'
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
              {([
                { key: 'booking_confirmations' as const, label: 'Booking confirmations', desc: 'Email when a booking is confirmed or updated' },
                { key: 'riddor_alerts' as const, label: 'RIDDOR deadline alerts', desc: 'Email 48h before a RIDDOR report is due' },
                { key: 'cert_expiry' as const, label: 'Certification expiry warnings', desc: 'Email 30 days before a medic cert expires' },
                { key: 'payout_summaries' as const, label: 'Weekly payout summaries', desc: 'Email every Friday with payout breakdown' },
                { key: 'cashflow_alerts' as const, label: 'Cash flow alerts', desc: 'Email when Stripe balance drops below threshold' },
              ]).map((item) => (
                <div key={item.key} className="flex items-center justify-between py-3 border-b border-gray-700/50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-white">{item.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifPrefs[item.key]}
                      onChange={() => handleNotifToggle(item.key)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-4">Preferences saved locally. Server-side notification routing coming soon.</p>
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
                  value={billingEmail}
                  onChange={(e) => setBillingEmail(e.target.value)}
                  placeholder="billing@yourcompany.co.uk"
                  className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Used for billing notifications and invoices.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                  <Phone className="w-4 h-4" /> Emergency Contact
                </label>
                <input
                  type="tel"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  placeholder="+44 7700 900000"
                  className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Stored locally. Server-side storage coming soon.</p>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={handleSaveContactDetails}
                disabled={savingContact}
                className="px-5 py-2.5 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg font-medium text-sm transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-2"
              >
                {savingContact ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
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
          <div className="bg-gray-800/50 backdrop-blur-xl rounded-xl border border-gray-700/50 shadow-2xl p-6 space-y-5">
            {subscriptionLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                <span className="ml-3 text-gray-400 text-sm">Loading subscription...</span>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">Current Plan</p>
                    <p className="text-gray-400 text-sm mt-1">
                      {subscriptionTier === 'enterprise' ? 'Enterprise' : subscriptionTier === 'growth' ? 'Growth' : 'Starter'}
                      {' '}tier · billed via Stripe
                    </p>
                  </div>
                  <span className={`px-4 py-1.5 rounded-full text-sm font-semibold border ${
                    subscriptionStatus === 'active'
                      ? 'bg-green-500/20 text-green-300 border-green-500/30'
                      : subscriptionStatus === 'past_due'
                      ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                      : 'bg-red-500/20 text-red-300 border-red-500/30'
                  }`}>
                    {subscriptionStatus === 'active' ? 'Active' : subscriptionStatus === 'past_due' ? 'Past Due' : 'Cancelled'}
                  </span>
                </div>

                {/* Tier comparison */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { tier: 'starter', label: 'Starter', features: 'Up to 5 medics, basic reports' },
                    { tier: 'growth', label: 'Growth', features: 'Up to 25 medics, analytics, territories' },
                    { tier: 'enterprise', label: 'Enterprise', features: 'Unlimited medics, white-label, API access' },
                  ].map((plan) => (
                    <div
                      key={plan.tier}
                      className={`px-4 py-3 rounded-xl border text-sm ${
                        subscriptionTier === plan.tier
                          ? 'bg-purple-900/30 border-purple-500/50 text-purple-300'
                          : 'bg-gray-900/30 border-gray-700/50 text-gray-400'
                      }`}
                    >
                      <p className="font-semibold text-white">{plan.label}</p>
                      <p className="text-xs mt-1 leading-relaxed">{plan.features}</p>
                      {subscriptionTier === plan.tier && (
                        <p className="text-xs text-purple-400 font-medium mt-2">Current plan</p>
                      )}
                    </div>
                  ))}
                </div>

                <p className="text-xs text-gray-500">
                  To upgrade or manage billing, contact support at{' '}
                  <a href="mailto:support@sitemedic.co.uk" className="text-blue-400 hover:text-blue-300">
                    support@sitemedic.co.uk
                  </a>
                </p>
              </>
            )}
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
