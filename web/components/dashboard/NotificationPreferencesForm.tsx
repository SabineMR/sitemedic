'use client';

/**
 * NotificationPreferencesForm
 *
 * Channel × Category matrix for notification preferences.
 * Rows = notification categories (Events, Quotes, Awards, Payments, Ratings, Messages, Disputes)
 * Columns = channels (Dashboard, Email, SMS)
 *
 * Behaviour:
 *  - Dashboard column is always ON and greyed out — cannot be disabled.
 *  - Email column has toggles for all 7 categories.
 *  - SMS column has toggles for 4 time-sensitive categories only (events, quotes, awards, payments).
 *  - SMS opt-in section: phone number input + consent checkbox (PECR compliance).
 *  - Event alert radius: integer miles input (NULL = all UK, no filtering).
 *  - Saves via PUT /api/marketplace/notification-preferences.
 *  - Loads current preferences via GET on mount.
 *
 * Phase 38: Notifications & Alerts — Plan 04
 */

import { useState, useEffect } from 'react';
import { Bell, Smartphone, Mail, LayoutDashboard, MapPin, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import type { NotificationPreferences } from '@/lib/marketplace/notification-types';

// =============================================================================
// Category definitions
// =============================================================================

interface CategoryRow {
  key: string;
  label: string;
  description: string;
  emailField: keyof NotificationPreferences;
  smsField: (keyof NotificationPreferences) | null; // null = SMS not applicable
}

const CATEGORIES: CategoryRow[] = [
  {
    key:         'events',
    label:       'New Events',
    description: 'When a new event is posted matching your preferences',
    emailField:  'email_new_events',
    smsField:    'sms_new_events',
  },
  {
    key:         'quotes',
    label:       'Quotes',
    description: 'Quote submissions, revisions, and withdrawals',
    emailField:  'email_quotes',
    smsField:    'sms_quotes',
  },
  {
    key:         'awards',
    label:       'Awards',
    description: 'When your quote is awarded or not selected',
    emailField:  'email_awards',
    smsField:    'sms_awards',
  },
  {
    key:         'payments',
    label:       'Payments',
    description: 'Deposit confirmations and payment failures',
    emailField:  'email_payments',
    smsField:    'sms_payments',
  },
  {
    key:         'ratings',
    label:       'Ratings',
    description: 'New ratings and reminders to leave reviews',
    emailField:  'email_ratings',
    smsField:    null, // SMS not applicable
  },
  {
    key:         'messages',
    label:       'Messages',
    description: 'New marketplace messages from clients or companies',
    emailField:  'email_messages',
    smsField:    null,
  },
  {
    key:         'disputes',
    label:       'Disputes',
    description: 'Dispute filings and resolutions',
    emailField:  'email_disputes',
    smsField:    null,
  },
];

// =============================================================================
// Default form state (matches DEFAULT_PREFERENCES in the API route)
// =============================================================================

const DEFAULT_FORM: Omit<NotificationPreferences, 'user_id' | 'updated_at'> = {
  email_new_events: true,
  email_quotes:     true,
  email_awards:     true,
  email_payments:   true,
  email_ratings:    true,
  email_messages:   true,
  email_disputes:   true,

  sms_new_events: false,
  sms_quotes:     false,
  sms_awards:     false,
  sms_payments:   false,

  event_alert_radius_miles: null,
  sms_phone_number:         null,
  sms_opted_in_at:          null,
};

// =============================================================================
// Form state type
// =============================================================================

type FormState = Omit<NotificationPreferences, 'user_id' | 'updated_at'> & {
  /** Local-only: whether user has ticked the opt-in consent checkbox */
  smsConsentChecked: boolean;
  /** Local-only: raw text value for the radius input (allows empty string) */
  radiusInputValue: string;
};

// =============================================================================
// NotificationPreferencesForm
// =============================================================================

export function NotificationPreferencesForm() {
  const [form, setForm] = useState<FormState>({
    ...DEFAULT_FORM,
    smsConsentChecked: false,
    radiusInputValue:  '',
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving]   = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [phoneError, setPhoneError]     = useState('');

  // ---------------------------------------------------------------------------
  // Load preferences on mount
  // ---------------------------------------------------------------------------

  useEffect(() => {
    async function loadPreferences() {
      try {
        const res = await fetch('/api/marketplace/notification-preferences');
        if (!res.ok) {
          console.error('[NotifPrefs] Load failed:', res.status);
          setIsLoading(false);
          return;
        }
        const data: NotificationPreferences = await res.json();

        const anySmsEnabled =
          data.sms_new_events || data.sms_quotes || data.sms_awards || data.sms_payments;

        setForm({
          email_new_events: data.email_new_events,
          email_quotes:     data.email_quotes,
          email_awards:     data.email_awards,
          email_payments:   data.email_payments,
          email_ratings:    data.email_ratings,
          email_messages:   data.email_messages,
          email_disputes:   data.email_disputes,

          sms_new_events: data.sms_new_events,
          sms_quotes:     data.sms_quotes,
          sms_awards:     data.sms_awards,
          sms_payments:   data.sms_payments,

          event_alert_radius_miles: data.event_alert_radius_miles,
          sms_phone_number:         data.sms_phone_number,
          sms_opted_in_at:          data.sms_opted_in_at,

          // Consent checkbox pre-ticked if they previously enabled SMS
          smsConsentChecked: anySmsEnabled || data.sms_opted_in_at != null,

          radiusInputValue: data.event_alert_radius_miles != null
            ? String(data.event_alert_radius_miles)
            : '',
        });
      } catch (err) {
        console.error('[NotifPrefs] Unexpected load error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadPreferences();
  }, []);

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  function setEmailField(field: keyof NotificationPreferences, value: boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function setSmsField(field: keyof NotificationPreferences, value: boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const anySmsEnabled =
    form.sms_new_events || form.sms_quotes || form.sms_awards || form.sms_payments;

  // Phone validation (client-side mirror of API Zod schema)
  function validatePhone(value: string): boolean {
    if (!value) return true; // empty is fine — only validate if filled
    return /^\+447\d{9}$/.test(value);
  }

  function handlePhoneChange(value: string) {
    setForm((prev) => ({ ...prev, sms_phone_number: value || null }));
    if (value && !validatePhone(value)) {
      setPhoneError('Must be a UK mobile in +447xxxxxxxxx format');
    } else {
      setPhoneError('');
    }
  }

  function handleRadiusChange(value: string) {
    setForm((prev) => ({ ...prev, radiusInputValue: value }));
    const num = parseInt(value, 10);
    if (!value) {
      setForm((prev) => ({ ...prev, event_alert_radius_miles: null, radiusInputValue: '' }));
    } else if (!isNaN(num) && num >= 1 && num <= 500) {
      setForm((prev) => ({ ...prev, event_alert_radius_miles: num, radiusInputValue: value }));
    }
  }

  // ---------------------------------------------------------------------------
  // Save
  // ---------------------------------------------------------------------------

  async function handleSave() {
    // Validate SMS phone if any SMS channel enabled
    if (anySmsEnabled) {
      if (!form.smsConsentChecked) {
        setErrorMessage('Please tick the SMS opt-in consent checkbox to enable SMS notifications.');
        return;
      }
      if (form.sms_phone_number && !validatePhone(form.sms_phone_number)) {
        setErrorMessage('Phone number must be in +447xxxxxxxxx format.');
        return;
      }
    }

    setIsSaving(true);
    setSaveStatus('idle');
    setErrorMessage('');

    try {
      const payload: Record<string, unknown> = {
        email_new_events: form.email_new_events,
        email_quotes:     form.email_quotes,
        email_awards:     form.email_awards,
        email_payments:   form.email_payments,
        email_ratings:    form.email_ratings,
        email_messages:   form.email_messages,
        email_disputes:   form.email_disputes,

        sms_new_events: form.sms_new_events,
        sms_quotes:     form.sms_quotes,
        sms_awards:     form.sms_awards,
        sms_payments:   form.sms_payments,

        event_alert_radius_miles: form.event_alert_radius_miles,
        sms_phone_number:         form.sms_phone_number,
      };

      const res = await fetch('/api/marketplace/notification-preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg = (body as { error?: string }).error ?? 'Failed to save preferences';
        setErrorMessage(msg);
        setSaveStatus('error');
        return;
      }

      const updated: NotificationPreferences = await res.json();
      setForm((prev) => ({
        ...prev,
        sms_opted_in_at: updated.sms_opted_in_at,
      }));

      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      console.error('[NotifPrefs] Save error:', err);
      setErrorMessage('An unexpected error occurred. Please try again.');
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ------------------------------------------------------------------ */}
      {/* Channel × Category matrix                                           */}
      {/* ------------------------------------------------------------------ */}

      <section>
        <h2 className="text-base font-semibold mb-1">Notification channels</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Control which channels you receive for each notification category.
          The dashboard channel cannot be disabled.
        </p>

        <div className="rounded-lg border overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_80px_80px_80px] gap-0 bg-muted/50 border-b">
            <div className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Category
            </div>
            <div className="flex items-center justify-center py-3 gap-1.5">
              <LayoutDashboard className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Dashboard</span>
            </div>
            <div className="flex items-center justify-center py-3 gap-1.5">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Email</span>
            </div>
            <div className="flex items-center justify-center py-3 gap-1.5">
              <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">SMS</span>
            </div>
          </div>

          {/* Category rows */}
          {CATEGORIES.map((cat, idx) => (
            <div
              key={cat.key}
              className={`grid grid-cols-[1fr_80px_80px_80px] gap-0 items-center ${
                idx !== CATEGORIES.length - 1 ? 'border-b' : ''
              }`}
            >
              {/* Category info */}
              <div className="px-4 py-3.5">
                <p className="text-sm font-medium">{cat.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{cat.description}</p>
              </div>

              {/* Dashboard — always on, greyed out */}
              <div className="flex items-center justify-center py-3.5">
                <Switch
                  checked={true}
                  disabled={true}
                  aria-label={`Dashboard ${cat.label} (always on)`}
                  className="opacity-40 cursor-not-allowed"
                />
              </div>

              {/* Email toggle */}
              <div className="flex items-center justify-center py-3.5">
                <Switch
                  checked={(form as Record<string, unknown>)[cat.emailField] as boolean}
                  onCheckedChange={(val) => setEmailField(cat.emailField, val)}
                  aria-label={`Email ${cat.label}`}
                />
              </div>

              {/* SMS toggle — only for applicable categories */}
              <div className="flex items-center justify-center py-3.5">
                {cat.smsField ? (
                  <Switch
                    checked={(form as Record<string, unknown>)[cat.smsField] as boolean}
                    onCheckedChange={(val) => setSmsField(cat.smsField!, val)}
                    aria-label={`SMS ${cat.label}`}
                  />
                ) : (
                  <span className="text-xs text-muted-foreground/40 select-none">—</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* SMS opt-in section                                                   */}
      {/* ------------------------------------------------------------------ */}

      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold mb-1">SMS settings</h2>
          <p className="text-sm text-muted-foreground">
            SMS is off by default. To receive text notifications you must provide your
            UK mobile number and explicitly opt in. You can unsubscribe at any time.
          </p>
        </div>

        {/* Phone number input */}
        <div className="space-y-1.5">
          <Label htmlFor="sms-phone">
            UK mobile number{' '}
            <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Input
            id="sms-phone"
            type="tel"
            placeholder="+447XXXXXXXXX"
            value={form.sms_phone_number ?? ''}
            onChange={(e) => handlePhoneChange(e.target.value)}
            className={phoneError ? 'border-destructive focus-visible:ring-destructive' : ''}
            maxLength={13}
          />
          {phoneError ? (
            <p className="text-xs text-destructive mt-1">{phoneError}</p>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">
              Format: +447xxxxxxxxx &mdash; UK mobiles only
            </p>
          )}
        </div>

        {/* PECR consent checkbox */}
        <div className="flex items-start gap-3 p-4 rounded-lg border bg-muted/20">
          <Checkbox
            id="sms-consent"
            checked={form.smsConsentChecked}
            onCheckedChange={(val) =>
              setForm((prev) => ({ ...prev, smsConsentChecked: val === true }))
            }
            className="mt-0.5"
          />
          <div>
            <Label htmlFor="sms-consent" className="text-sm cursor-pointer">
              I consent to receive SMS notifications from SiteMedic
            </Label>
            <p className="text-xs text-muted-foreground mt-1">
              By ticking this box you agree to receive text messages to the number above
              for the SMS categories you have enabled. You can withdraw consent at any time
              by disabling all SMS channels or removing your number. Standard message rates
              may apply.
            </p>
            {form.sms_opted_in_at && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-1.5">
                SMS opt-in recorded: {new Date(form.sms_opted_in_at).toLocaleDateString('en-GB', {
                  day: 'numeric', month: 'long', year: 'numeric',
                })}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Event alert radius                                                   */}
      {/* ------------------------------------------------------------------ */}

      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold mb-1 flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Event alert radius
          </h2>
          <p className="text-sm text-muted-foreground">
            Limit new-event notifications to events within this distance. Leave blank to
            receive alerts for all UK events.
          </p>
        </div>

        <div className="flex items-center gap-3 max-w-xs">
          <Input
            id="event-radius"
            type="number"
            min={1}
            max={500}
            step={1}
            placeholder="No limit"
            value={form.radiusInputValue}
            onChange={(e) => handleRadiusChange(e.target.value)}
            className="w-36"
          />
          <span className="text-sm text-muted-foreground">miles</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {form.event_alert_radius_miles
            ? `You will only see events within ${form.event_alert_radius_miles} miles.`
            : 'No radius set — you will see all UK events.'}
        </p>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Save button + status                                                 */}
      {/* ------------------------------------------------------------------ */}

      <div className="flex items-center gap-4 pt-2">
        <Button
          onClick={handleSave}
          disabled={isSaving || !!phoneError}
          className="min-w-28"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Saving...
            </>
          ) : (
            'Save preferences'
          )}
        </Button>

        {saveStatus === 'success' && (
          <div className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4" />
            Preferences saved
          </div>
        )}

        {saveStatus === 'error' && (
          <div className="flex items-center gap-1.5 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {errorMessage || 'Failed to save'}
          </div>
        )}
      </div>
    </div>
  );
}
