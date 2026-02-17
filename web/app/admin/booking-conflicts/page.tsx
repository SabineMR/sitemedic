/**
 * Admin Booking Conflicts Page
 *
 * View and resolve booking conflicts detected by the conflict-detector edge function.
 * Conflicts are stored in the booking_conflicts table and flagged during scheduling.
 *
 * DB table: booking_conflicts (id, org_id, booking_id, medic_id, conflict_type,
 *           conflict_description, resolved_at, resolved_by)
 */

'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useOrg } from '@/contexts/org-context';
import { AlertTriangle, Check, Clock, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface BookingConflict {
  id: string;
  booking_id: string;
  medic_id: string;
  conflict_type: string;
  conflict_description: string;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  booking: {
    site_name: string;
    shift_date: string;
    shift_start_time: string;
    shift_end_time: string;
  };
  medic: {
    first_name: string;
    last_name: string;
  };
}

const conflictTypeColors: Record<string, string> = {
  double_booking: 'bg-red-100 text-red-800',
  qualification_mismatch: 'bg-orange-100 text-orange-800',
  certification_expired: 'bg-yellow-100 text-yellow-800',
  geofence_violation: 'bg-purple-100 text-purple-800',
};

export default function BookingConflictsPage() {
  const { org } = useOrg();
  const [conflicts, setConflicts] = useState<BookingConflict[]>([]);
  const [loading, setLoading] = useState(true);
  const [showResolved, setShowResolved] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  async function fetchConflicts() {
    if (!org?.id) return;
    setLoading(true);
    const supabase = createClient();
    const query = supabase
      .from('booking_conflicts')
      .select(`
        *,
        booking:bookings!inner(site_name, shift_date, shift_start_time, shift_end_time),
        medic:medics!inner(first_name, last_name)
      `)
      .eq('org_id', org.id)
      .order('created_at', { ascending: false });

    if (!showResolved) {
      query.is('resolved_at', null);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching conflicts:', error);
    } else {
      setConflicts((data as unknown as BookingConflict[]) || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchConflicts();
  }, [org?.id, showResolved]);

  async function handleResolve(conflictId: string) {
    setResolvingId(conflictId);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('booking_conflicts')
      .update({
        resolved_at: new Date().toISOString(),
        resolved_by: user?.id,
      })
      .eq('id', conflictId);

    if (error) {
      toast.error('Failed to resolve conflict');
    } else {
      toast.success('Conflict marked as resolved');
      setConflicts((prev) =>
        prev.map((c) =>
          c.id === conflictId
            ? { ...c, resolved_at: new Date().toISOString(), resolved_by: user?.id ?? null }
            : c
        )
      );
    }
    setResolvingId(null);
  }

  const unresolvedCount = conflicts.filter((c) => !c.resolved_at).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Booking Conflicts</h1>
          <p className="text-gray-400 mt-1">Scheduling conflicts detected by the conflict checker</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-gray-300 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={showResolved}
              onChange={(e) => setShowResolved(e.target.checked)}
              className="w-4 h-4 accent-blue-600"
            />
            Show resolved
          </label>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-red-900/20 border border-red-700/30 rounded-2xl p-5 text-center">
          <div className="text-3xl font-bold text-red-400">{unresolvedCount}</div>
          <div className="text-gray-300 text-sm mt-1">Unresolved Conflicts</div>
        </div>
        <div className="bg-green-900/20 border border-green-700/30 rounded-2xl p-5 text-center">
          <div className="text-3xl font-bold text-green-400">
            {conflicts.filter((c) => c.resolved_at).length}
          </div>
          <div className="text-gray-300 text-sm mt-1">Resolved</div>
        </div>
      </div>

      {/* Conflicts List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : conflicts.length === 0 ? (
        <div className="text-center py-16 bg-gray-800/30 rounded-2xl border border-gray-700/50">
          <AlertTriangle className="w-12 h-12 text-gray-500 mx-auto mb-3" />
          <p className="text-gray-300 font-medium">No conflicts found</p>
          <p className="text-gray-500 text-sm mt-1">
            {showResolved ? 'No conflicts in history' : 'All scheduling conflicts have been resolved'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {conflicts.map((conflict) => (
            <div
              key={conflict.id}
              className={`bg-gray-800/50 border rounded-2xl p-5 ${
                conflict.resolved_at
                  ? 'border-gray-700/30 opacity-60'
                  : 'border-red-700/30'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        conflictTypeColors[conflict.conflict_type] ?? 'bg-gray-200 text-gray-800'
                      }`}
                    >
                      {conflict.conflict_type.replace(/_/g, ' ')}
                    </span>
                    {conflict.resolved_at && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Resolved
                      </span>
                    )}
                  </div>
                  <p className="text-white font-medium">{conflict.booking.site_name}</p>
                  <p className="text-gray-400 text-sm">
                    {format(new Date(conflict.booking.shift_date), 'EEE dd MMM yyyy')} ·{' '}
                    {conflict.booking.shift_start_time}–{conflict.booking.shift_end_time} ·{' '}
                    {conflict.medic.first_name} {conflict.medic.last_name}
                  </p>
                  <p className="text-gray-300 text-sm">{conflict.conflict_description}</p>
                  <div className="flex items-center gap-1 text-gray-500 text-xs">
                    <Clock className="w-3 h-3" />
                    Detected {format(new Date(conflict.created_at), 'dd MMM yyyy HH:mm')}
                  </div>
                </div>
                {!conflict.resolved_at && (
                  <button
                    onClick={() => handleResolve(conflict.id)}
                    disabled={resolvingId === conflict.id}
                    className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-500 transition-all text-sm font-medium flex-shrink-0 disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    Resolve
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
