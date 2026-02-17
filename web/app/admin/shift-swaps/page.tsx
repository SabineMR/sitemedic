/**
 * Admin Shift Swaps Page
 *
 * Manage and approve/reject medic-initiated shift swap requests.
 * Reads from the shift_swaps table and calls the shift-swap edge function.
 */

'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useOrg } from '@/contexts/org-context';
import { RefreshCw, Check, X, Clock, User } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface ShiftSwap {
  id: string;
  booking_id: string;
  requesting_medic_id: string;
  target_medic_id: string;
  status: 'pending' | 'approved' | 'rejected';
  reason: string | null;
  created_at: string;
  booking: {
    site_name: string;
    shift_date: string;
    shift_start_time: string;
    shift_end_time: string;
  };
  requesting_medic: { first_name: string; last_name: string };
  target_medic: { first_name: string; last_name: string };
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

export default function ShiftSwapsPage() {
  const { orgId } = useOrg();
  const [swaps, setSwaps] = useState<ShiftSwap[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  async function fetchSwaps() {
    if (!orgId) return;
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from('shift_swaps')
      .select(`
        *,
        booking:bookings!inner(site_name, shift_date, shift_start_time, shift_end_time),
        requesting_medic:medics!shift_swaps_requesting_medic_id_fkey(first_name, last_name),
        target_medic:medics!shift_swaps_target_medic_id_fkey(first_name, last_name)
      `)
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching shift swaps:', error);
    } else {
      setSwaps((data as unknown as ShiftSwap[]) || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchSwaps();
  }, [orgId]);

  async function handleAction(swapId: string, action: 'approved' | 'rejected') {
    setActionId(swapId);
    const supabase = createClient();
    const { error } = await supabase
      .from('shift_swaps')
      .update({ status: action, reviewed_at: new Date().toISOString() })
      .eq('id', swapId);

    if (error) {
      toast.error(`Failed to ${action === 'approved' ? 'approve' : 'reject'} swap`);
    } else {
      toast.success(`Shift swap ${action}`);
      setSwaps((prev) =>
        prev.map((s) => (s.id === swapId ? { ...s, status: action } : s))
      );
    }
    setActionId(null);
  }

  const pending = swaps.filter((s) => s.status === 'pending');
  const resolved = swaps.filter((s) => s.status !== 'pending');

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Shift Swaps</h1>
          <p className="text-gray-400 mt-1">Review and manage medic shift swap requests</p>
        </div>
        <button
          onClick={fetchSwaps}
          className="flex items-center gap-2 px-4 py-2 bg-gray-700/50 text-gray-300 rounded-xl hover:bg-gray-700 transition-all text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Pending', value: pending.length, color: 'text-yellow-400' },
          { label: 'Approved', value: swaps.filter((s) => s.status === 'approved').length, color: 'text-green-400' },
          { label: 'Rejected', value: swaps.filter((s) => s.status === 'rejected').length, color: 'text-red-400' },
        ].map((stat) => (
          <div key={stat.label} className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-4 text-center">
            <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-gray-400 text-sm mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Pending Swaps */}
      {pending.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4 text-yellow-400" />
            Pending Approval ({pending.length})
          </h2>
          {pending.map((swap) => (
            <div key={swap.id} className="bg-gray-800/50 border border-yellow-500/30 rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 flex-1">
                  <p className="text-white font-medium">{swap.booking.site_name}</p>
                  <p className="text-gray-400 text-sm">
                    {format(new Date(swap.booking.shift_date), 'EEE dd MMM yyyy')} ·{' '}
                    {swap.booking.shift_start_time}–{swap.booking.shift_end_time}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <div className="flex items-center gap-1 text-gray-300">
                      <User className="w-3.5 h-3.5" />
                      <span>{swap.requesting_medic.first_name} {swap.requesting_medic.last_name}</span>
                      <span className="text-gray-500">→</span>
                      <span>{swap.target_medic.first_name} {swap.target_medic.last_name}</span>
                    </div>
                  </div>
                  {swap.reason && (
                    <p className="text-gray-400 text-sm italic mt-1">"{swap.reason}"</p>
                  )}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleAction(swap.id, 'approved')}
                    disabled={actionId === swap.id}
                    className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-500 transition-all text-sm font-medium disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    Approve
                  </button>
                  <button
                    onClick={() => handleAction(swap.id, 'rejected')}
                    disabled={actionId === swap.id}
                    className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-500 transition-all text-sm font-medium disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* History */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : swaps.length === 0 ? (
        <div className="text-center py-16 bg-gray-800/30 rounded-2xl border border-gray-700/50">
          <RefreshCw className="w-12 h-12 text-gray-500 mx-auto mb-3" />
          <p className="text-gray-300 font-medium">No shift swap requests yet</p>
          <p className="text-gray-500 text-sm mt-1">Swap requests from medics will appear here</p>
        </div>
      ) : resolved.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-white font-semibold text-sm text-gray-400">History</h2>
          <div className="bg-gray-800/30 border border-gray-700/50 rounded-2xl divide-y divide-gray-700/30">
            {resolved.map((swap) => (
              <div key={swap.id} className="px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="text-white text-sm font-medium">{swap.booking.site_name}</p>
                  <p className="text-gray-400 text-xs">
                    {format(new Date(swap.booking.shift_date), 'dd MMM yyyy')} ·{' '}
                    {swap.requesting_medic.first_name} → {swap.target_medic.first_name}
                  </p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${statusColors[swap.status]}`}>
                  {swap.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
