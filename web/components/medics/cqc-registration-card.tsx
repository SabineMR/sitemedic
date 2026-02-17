'use client';

/**
 * CQCRegistrationCard
 *
 * Admin-facing card on the medic onboarding page.
 * Displays the medic's CQC registration number and allows inline editing.
 */

import { useState } from 'react';
import { ShieldCheck, Pencil, Check, X } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  medicId: string;
  initialNumber: string | null;
}

export function CQCRegistrationCard({ medicId, initialNumber }: Props) {
  const [cqcNumber, setCqcNumber] = useState(initialNumber ?? '');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialNumber ?? '');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/medics/${medicId}/cqc`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cqc_registration_number: draft.trim() || null }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        toast.error(err.error ?? 'Failed to save CQC number');
        return;
      }

      setCqcNumber(draft.trim());
      setEditing(false);
      toast.success('CQC registration number saved');
    } catch {
      toast.error('Failed to save CQC number');
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setDraft(cqcNumber);
    setEditing(false);
  }

  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-blue-400" />
          <h2 className="text-white font-semibold text-lg">CQC Registration</h2>
        </div>
        {!editing && (
          <button
            onClick={() => { setDraft(cqcNumber); setEditing(true); }}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-700/50"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">
              CQC Registration Number
            </label>
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="e.g. 1-XXXXXXXXXX"
              className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-1">
              CQC provider IDs are typically in the format 1-XXXXXXXXXX. Leave blank to clear.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Check className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={handleCancel}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-sm font-medium transition-colors"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div>
          {cqcNumber ? (
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-900/30 border border-blue-700/40 text-blue-200 rounded-xl text-sm font-mono">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
                {cqcNumber}
              </span>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No CQC registration number recorded — click Edit to add one.</p>
          )}
        </div>
      )}
    </div>
  );
}
