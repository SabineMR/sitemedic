'use client';

import { useState } from 'react';
import { AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import type { MarketplaceEntityRecord } from '@/lib/queries/platform/marketplace-entities';

interface IntegrityCasePanelProps {
  caseRecord: MarketplaceEntityRecord;
  onActionComplete: () => void;
}

export function IntegrityCasePanel({ caseRecord, onActionComplete }: IntegrityCasePanelProps) {
  const [note, setNote] = useState('');
  const [action, setAction] = useState<'dismiss' | 'confirm' | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const riskBand = String(caseRecord.metadata.riskBand || 'low');
  const payoutHoldApplied = caseRecord.metadata.payoutHoldApplied === true;
  const caseId = caseRecord.id;

  async function resolve(outcome: 'resolved_dismissed' | 'resolved_confirmed') {
    setAction(outcome === 'resolved_dismissed' ? 'dismiss' : 'confirm');
    setFeedback(null);

    try {
      const response = await fetch(`/api/platform/marketplace/integrity/cases/${caseId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outcome,
          note,
          releaseHold: outcome === 'resolved_dismissed',
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to resolve case');
      }

      setFeedback({
        type: 'success',
        message:
          outcome === 'resolved_dismissed'
            ? 'Case dismissed and hold released.'
            : 'Violation confirmed and case closed.',
      });
      setNote('');
      onActionComplete();
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to resolve case',
      });
    } finally {
      setAction(null);
    }
  }

  return (
    <aside className="rounded-2xl border border-purple-700/40 bg-purple-900/20 p-4 space-y-4">
      <header>
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-purple-200" />
          Integrity Case
        </h2>
        <p className="text-xs text-purple-200 mt-1">Case ID: {caseId}</p>
      </header>

      <div className="space-y-2 text-sm text-purple-100">
        <p>
          <span className="text-purple-300">Risk band:</span> {riskBand}
        </p>
        <p>
          <span className="text-purple-300">Score:</span> {caseRecord.amount ?? 0}
        </p>
        <p>
          <span className="text-purple-300">Hold applied:</span> {payoutHoldApplied ? 'Yes' : 'No'}
        </p>
      </div>

      <label className="block text-sm text-purple-100">
        Resolution note
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={4}
          placeholder="Capture evidence and final decision rationale..."
          className="mt-2 w-full rounded-xl border border-purple-700/40 bg-purple-900/30 px-3 py-2 text-sm text-white placeholder:text-purple-300"
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => resolve('resolved_dismissed')}
          disabled={action !== null || note.trim().length < 8}
          className="inline-flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-600/20 px-3 py-2 text-xs font-medium text-amber-100 disabled:opacity-50"
        >
          <CheckCircle2 className="h-4 w-4" />
          {action === 'dismiss' ? 'Dismissing...' : 'Dismiss + release hold'}
        </button>

        <button
          type="button"
          onClick={() => resolve('resolved_confirmed')}
          disabled={action !== null || note.trim().length < 8}
          className="inline-flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-600/20 px-3 py-2 text-xs font-medium text-red-100 disabled:opacity-50"
        >
          <AlertTriangle className="h-4 w-4" />
          {action === 'confirm' ? 'Confirming...' : 'Confirm violation'}
        </button>
      </div>

      {feedback && (
        <p className={`text-sm ${feedback.type === 'success' ? 'text-emerald-300' : 'text-red-300'}`}>
          {feedback.message}
        </p>
      )}
    </aside>
  );
}
