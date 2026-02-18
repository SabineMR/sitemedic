/**
 * Busy Block Form
 *
 * Allows medics to add manual busy blocks (personal appointments, errands, etc.)
 * Writes to medic_availability with is_available=false, request_type='personal',
 * status='approved' (no admin approval needed for self-reported blocks).
 */

'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { X, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface BusyBlockFormProps {
  medicId: string;
  onSaved: () => void;
  onCancel: () => void;
}

export function BusyBlockForm({ medicId, onSaved, onCancel }: BusyBlockFormProps) {
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  // Default date to tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!date) {
      toast.error('Please select a date');
      return;
    }

    setSaving(true);
    const supabase = createClient();

    const { error } = await supabase.from('medic_availability').upsert(
      {
        medic_id: medicId,
        date,
        is_available: false,
        request_type: 'personal',
        status: 'approved',
        reason: reason.trim() || 'Personal',
        requested_at: new Date().toISOString(),
      },
      { onConflict: 'medic_id,date' }
    );

    if (error) {
      if (error.code === '23505') {
        toast.error('You already have a busy block for this date');
      } else {
        toast.error('Failed to add busy block');
        console.error('Busy block error:', error);
      }
    } else {
      toast.success('Busy block added');
      onSaved();
    }
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-800/50 border border-orange-700/30 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold">Add Busy Block</h3>
        <button
          type="button"
          onClick={onCancel}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-gray-400 text-sm mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            min={minDate}
            required
            className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white text-sm focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 outline-none"
          />
        </div>
        <div>
          <label className="block text-gray-400 text-sm mb-1">Reason (optional)</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Dentist appointment"
            maxLength={100}
            className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white text-sm placeholder-gray-500 focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 outline-none"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          Add Busy Block
        </button>
      </div>
    </form>
  );
}
