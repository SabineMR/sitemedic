'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Clock3, Save } from 'lucide-react';

interface MarketplaceSettingsResponse {
  settings: {
    id: string | null;
    defaultCommissionPercent: number;
    defaultDepositPercent: number;
    defaultQuoteDeadlineHours: number;
    commissionSplit: {
      platformFeePercent: number;
      medicPayoutPercent: number;
    };
    updatedAt: string | null;
    updatedBy: string | null;
  };
  audit: Array<{
    id: string;
    reason: string;
    changedAt: string;
    actor: {
      id: string;
      fullName: string | null;
      email: string | null;
    };
    beforeValues: {
      defaultCommissionPercent: number;
      defaultDepositPercent: number;
      defaultQuoteDeadlineHours: number;
    };
    afterValues: {
      defaultCommissionPercent: number;
      defaultDepositPercent: number;
      defaultQuoteDeadlineHours: number;
    };
  }>;
}

interface SettingsFormValues {
  defaultCommissionPercent: number;
  defaultDepositPercent: number;
  defaultQuoteDeadlineHours: number;
  reason: string;
}

const SETTINGS_QUERY_KEY = ['platform-marketplace-settings'];

async function fetchSettings(): Promise<MarketplaceSettingsResponse> {
  const response = await fetch('/api/platform/marketplace/settings', {
    cache: 'no-store',
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error || 'Failed to load marketplace settings');
  }

  return response.json();
}

async function updateSettings(values: SettingsFormValues) {
  const response = await fetch('/api/platform/marketplace/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(values),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error || 'Failed to save marketplace settings');
  }

  return payload;
}

function formatDate(value: string | null) {
  if (!value) return 'Never';
  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function MarketplaceSettingsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<SettingsFormValues | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const query = useQuery({
    queryKey: SETTINGS_QUERY_KEY,
    queryFn: fetchSettings,
    staleTime: 20_000,
    refetchInterval: 60_000,
  });

  const mutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: () => {
      setFeedback({ type: 'success', message: 'Marketplace defaults saved successfully.' });
      setForm((previous) =>
        previous
          ? {
              ...previous,
              reason: '',
            }
          : previous
      );
      queryClient.invalidateQueries({ queryKey: SETTINGS_QUERY_KEY });
    },
    onError: (error) => {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to save settings',
      });
    },
  });

  const settings = query.data?.settings;

  useEffect(() => {
    if (!settings) return;
    setForm((current) =>
      current || {
        defaultCommissionPercent: settings.defaultCommissionPercent,
        defaultDepositPercent: settings.defaultDepositPercent,
        defaultQuoteDeadlineHours: settings.defaultQuoteDeadlineHours,
        reason: '',
      }
    );
  }, [settings]);

  const computedSplit = useMemo(() => {
    const commission = form?.defaultCommissionPercent ?? settings?.defaultCommissionPercent ?? 60;
    const clamped = Math.max(0, Math.min(100, Number(commission || 0)));
    return {
      platformFeePercent: clamped,
      medicPayoutPercent: 100 - clamped,
    };
  }, [form?.defaultCommissionPercent, settings?.defaultCommissionPercent]);

  return (
    <div className="p-8 space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-white">Marketplace Settings</h1>
          <p className="mt-2 text-sm text-purple-200">
            Configure default commission, deposit, and quote-deadline behavior for marketplace operations.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/platform/marketplace"
            className="rounded-lg border border-purple-600/50 bg-purple-800/40 px-4 py-2 text-sm font-medium text-purple-100 hover:bg-purple-700/50"
          >
            Dashboard
          </Link>
          <Link
            href="/platform/marketplace/entities"
            className="rounded-lg border border-purple-600/50 bg-purple-800/40 px-4 py-2 text-sm font-medium text-purple-100 hover:bg-purple-700/50"
          >
            Entity Ops
          </Link>
        </div>
      </header>

      {query.isLoading ? (
        <div className="space-y-3 rounded-2xl border border-purple-700/40 bg-purple-900/20 p-6">
          <div className="h-6 w-56 animate-pulse rounded bg-purple-700/30" />
          <div className="h-32 animate-pulse rounded bg-purple-700/20" />
        </div>
      ) : query.isError ? (
        <div className="rounded-2xl border border-red-700/50 bg-red-900/20 p-6 text-red-200">
          <div className="flex items-center gap-2 font-medium">
            <AlertTriangle className="h-5 w-5" />
            Failed to load marketplace settings
          </div>
          <p className="mt-2 text-sm">{query.error instanceof Error ? query.error.message : 'Unknown error'}</p>
          <button
            type="button"
            onClick={() => query.refetch()}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
          >
            Retry
          </button>
        </div>
      ) : form ? (
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <section className="space-y-5 rounded-2xl border border-purple-700/40 bg-purple-900/20 p-6">
            <h2 className="text-lg font-semibold text-white">Default Marketplace Values</h2>

            <label className="block space-y-2">
              <span className="text-sm text-purple-100">Default commission (%)</span>
              <input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={form.defaultCommissionPercent}
                onChange={(event) =>
                  setForm((previous) =>
                    previous
                      ? {
                          ...previous,
                          defaultCommissionPercent: Number(event.target.value),
                        }
                      : previous
                  )
                }
                className="w-full rounded-xl border border-purple-700/40 bg-purple-900/10 px-3 py-2 text-sm text-white"
              />
              <p className="text-xs text-purple-300">
                Platform fee {computedSplit.platformFeePercent.toFixed(2)}% / company payout {computedSplit.medicPayoutPercent.toFixed(2)}%
              </p>
            </label>

            <label className="block space-y-2">
              <span className="text-sm text-purple-100">Default deposit (%)</span>
              <input
                type="number"
                min={1}
                max={100}
                step={1}
                value={form.defaultDepositPercent}
                onChange={(event) =>
                  setForm((previous) =>
                    previous
                      ? {
                          ...previous,
                          defaultDepositPercent: Number(event.target.value),
                        }
                      : previous
                  )
                }
                className="w-full rounded-xl border border-purple-700/40 bg-purple-900/10 px-3 py-2 text-sm text-white"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm text-purple-100">default_quote_deadline_hours</span>
              <input
                type="number"
                min={1}
                max={720}
                step={1}
                value={form.defaultQuoteDeadlineHours}
                onChange={(event) =>
                  setForm((previous) =>
                    previous
                      ? {
                          ...previous,
                          defaultQuoteDeadlineHours: Number(event.target.value),
                        }
                      : previous
                  )
                }
                className="w-full rounded-xl border border-purple-700/40 bg-purple-900/10 px-3 py-2 text-sm text-white"
              />
              <p className="text-xs text-purple-300">Used as the default event quote deadline window from now.</p>
            </label>

            <label className="block space-y-2">
              <span className="text-sm text-purple-100">Change reason</span>
              <textarea
                value={form.reason}
                onChange={(event) =>
                  setForm((previous) =>
                    previous
                      ? {
                          ...previous,
                          reason: event.target.value,
                        }
                      : previous
                  )
                }
                rows={3}
                placeholder="Why are you changing marketplace defaults?"
                className="w-full rounded-xl border border-purple-700/40 bg-purple-900/10 px-3 py-2 text-sm text-white placeholder:text-purple-300"
              />
            </label>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => mutation.mutate(form)}
                disabled={mutation.isPending || form.reason.trim().length < 8}
                className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-500 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {mutation.isPending ? 'Saving...' : 'Save settings'}
              </button>

              {feedback?.type === 'success' && (
                <p className="inline-flex items-center gap-1.5 text-sm text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" />
                  {feedback.message}
                </p>
              )}

              {feedback?.type === 'error' && (
                <p className="inline-flex items-center gap-1.5 text-sm text-red-300">
                  <AlertTriangle className="h-4 w-4" />
                  {feedback.message}
                </p>
              )}
            </div>
          </section>

          <section className="space-y-4 rounded-2xl border border-purple-700/40 bg-purple-900/20 p-6">
            <h2 className="text-lg font-semibold text-white">Recent changes</h2>
            <p className="text-xs text-purple-300">Latest update: {formatDate(settings?.updatedAt || null)}</p>

            {query.data?.audit?.length ? (
              <ul className="space-y-3">
                {query.data.audit.slice(0, 8).map((entry) => (
                  <li key={entry.id} className="rounded-xl border border-purple-700/40 bg-purple-800/25 p-3">
                    <div className="flex items-center gap-2 text-xs text-purple-300">
                      <Clock3 className="h-3.5 w-3.5" />
                      {formatDate(entry.changedAt)}
                    </div>
                    <p className="mt-1 text-sm font-medium text-white">{entry.reason}</p>
                    <p className="mt-1 text-xs text-purple-200">
                      {entry.actor.fullName || entry.actor.email || entry.actor.id}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-xl border border-purple-700/30 bg-purple-800/20 p-4 text-sm text-purple-200">
                No settings changes recorded yet.
              </div>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
