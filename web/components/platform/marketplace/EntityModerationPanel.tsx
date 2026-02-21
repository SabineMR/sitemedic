'use client';

import { useMemo, useState } from 'react';
import type { MarketplaceEntityRecord } from '@/lib/queries/platform/marketplace-entities';

type ModerationAction = 'suspend' | 'ban' | 'reinstate';

interface EntityModerationPanelProps {
  user: MarketplaceEntityRecord;
  onActionComplete: () => void;
}

const REASON_PRESETS = [
  'Policy breach - marketplace conduct issue',
  'Fraud concern - requires investigation',
  'Repeated no-show reports from clients',
  'Safety concern raised in active dispute',
];

export function EntityModerationPanel({ user, onActionComplete }: EntityModerationPanelProps) {
  const [reason, setReason] = useState('');
  const [pendingAction, setPendingAction] = useState<ModerationAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const company = useMemo(() => {
    const rawCompany = user.metadata.company;
    if (rawCompany && typeof rawCompany === 'object') {
      return rawCompany as {
        id: string;
        companyName: string;
        canSubmitQuotes: boolean;
        verificationStatus: string;
      };
    }
    return null;
  }, [user.metadata.company]);

  const role = typeof user.metadata.role === 'string' ? user.metadata.role : 'unknown';
  const isActive = user.status === 'active';

  async function submitAction(action: ModerationAction) {
    setError(null);
    setSuccess(null);

    if (reason.trim().length < 12) {
      setError('Reason must be at least 12 characters for audit compliance.');
      return;
    }

    try {
      setPendingAction(action);

      const response = await fetch('/api/platform/marketplace/moderation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetUserId: user.id,
          action,
          reason: reason.trim(),
          context: {
            source: 'platform-marketplace-entities',
            entity: 'users',
          },
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to apply moderation action');
      }

      setSuccess(`${action} action saved and audited.`);
      setReason('');
      onActionComplete();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unexpected moderation error');
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <aside className="rounded-2xl border border-purple-700/40 bg-purple-900/25 p-5">
      <h2 className="text-lg font-semibold text-white">User Moderation</h2>
      <p className="mt-1 text-sm text-purple-200">All actions are written to immutable moderation audit logs.</p>

      <div className="mt-4 space-y-2 rounded-xl border border-purple-700/40 bg-purple-950/40 p-4 text-sm">
        <p className="text-white font-medium">{user.primaryText}</p>
        <p className="text-purple-200">{user.secondaryText || user.id}</p>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-purple-700/50 px-2 py-1 text-purple-100">Role: {role}</span>
          <span className="rounded-full bg-purple-700/50 px-2 py-1 text-purple-100">
            Status: {isActive ? 'active' : 'inactive'}
          </span>
          {company && (
            <span className="rounded-full bg-purple-700/50 px-2 py-1 text-purple-100">
              Company: {company.companyName}
            </span>
          )}
        </div>
      </div>

      <label className="mt-4 block text-sm font-medium text-purple-100" htmlFor="moderation-reason">
        Moderation reason (required)
      </label>

      <select
        aria-label="Reason presets"
        className="mt-2 w-full rounded-lg border border-purple-700/40 bg-purple-900/30 px-3 py-2 text-sm text-white"
        defaultValue=""
        onChange={(event) => {
          if (event.target.value) {
            setReason(event.target.value);
          }
        }}
      >
        <option value="">Use a preset reason...</option>
        {REASON_PRESETS.map((preset) => (
          <option key={preset} value={preset}>
            {preset}
          </option>
        ))}
      </select>

      <textarea
        id="moderation-reason"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        placeholder="Document the moderation decision and evidence summary..."
        className="mt-2 min-h-28 w-full rounded-xl border border-purple-700/40 bg-purple-900/30 px-3 py-2 text-sm text-white placeholder:text-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
      />

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => submitAction('suspend')}
          disabled={pendingAction !== null}
          className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-60"
        >
          {pendingAction === 'suspend' ? 'Applying...' : 'Suspend'}
        </button>
        <button
          type="button"
          onClick={() => submitAction('ban')}
          disabled={pendingAction !== null}
          className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-60"
        >
          {pendingAction === 'ban' ? 'Applying...' : 'Ban'}
        </button>
        <button
          type="button"
          onClick={() => submitAction('reinstate')}
          disabled={pendingAction !== null}
          className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
        >
          {pendingAction === 'reinstate' ? 'Applying...' : 'Reinstate'}
        </button>
      </div>

      {error && (
        <p className="mt-3 rounded-lg border border-red-600/50 bg-red-900/30 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      )}

      {success && (
        <p className="mt-3 rounded-lg border border-emerald-600/50 bg-emerald-900/20 px-3 py-2 text-sm text-emerald-200">
          {success}
        </p>
      )}
    </aside>
  );
}
