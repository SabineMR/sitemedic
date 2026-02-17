/**
 * Medic Timesheets Page
 *
 * Medics submit actual hours worked for each completed shift.
 * Shows pending, submitted, and approved timesheets.
 */

'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Clock, CheckCircle2, AlertCircle, Send } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface TimesheetRow {
  id: string;
  booking_id: string;
  scheduled_hours: number;
  logged_hours: number | null;
  discrepancy_reason: string | null;
  medic_submitted_at: string | null;
  payout_status: string;
  payout_amount: number;
  booking: {
    site_name: string;
    shift_date: string;
    shift_start_time: string;
    shift_end_time: string;
  };
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Not Submitted', color: 'bg-yellow-900/40 text-yellow-300' },
  manager_approved: { label: 'Under Review', color: 'bg-blue-900/40 text-blue-300' },
  admin_approved: { label: 'Approved', color: 'bg-green-900/40 text-green-300' },
  paid: { label: 'Paid', color: 'bg-green-900/40 text-green-400' },
  rejected: { label: 'Rejected', color: 'bg-red-900/40 text-red-300' },
};

export default function MedicTimesheetsPage() {
  const [timesheets, setTimesheets] = useState<TimesheetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [hoursInput, setHoursInput] = useState('');
  const [reasonInput, setReasonInput] = useState('');

  useEffect(() => {
    fetchTimesheets();
  }, []);

  async function fetchTimesheets() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('timesheets')
      .select(`
        id, booking_id, scheduled_hours, logged_hours, discrepancy_reason,
        medic_submitted_at, payout_status, payout_amount,
        booking:bookings!inner(site_name, shift_date, shift_start_time, shift_end_time)
      `)
      .eq('medic_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching timesheets:', error);
    } else {
      setTimesheets((data as unknown as TimesheetRow[]) || []);
    }
    setLoading(false);
  }

  function startEdit(ts: TimesheetRow) {
    setEditId(ts.id);
    setHoursInput(String(ts.logged_hours ?? ts.scheduled_hours));
    setReasonInput(ts.discrepancy_reason ?? '');
  }

  async function handleSubmit(tsId: string, scheduledHours: number) {
    const hours = parseFloat(hoursInput);
    if (isNaN(hours) || hours <= 0) {
      toast.error('Please enter valid hours worked');
      return;
    }
    if (hours !== scheduledHours && !reasonInput.trim()) {
      toast.error('Please provide a reason for the hours discrepancy');
      return;
    }

    setSubmitting(tsId);
    const supabase = createClient();

    const { error } = await supabase
      .from('timesheets')
      .update({
        logged_hours: hours,
        discrepancy_reason: hours !== scheduledHours ? reasonInput.trim() : null,
        medic_submitted_at: new Date().toISOString(),
        medic_confirmed: true,
      })
      .eq('id', tsId);

    if (error) {
      toast.error('Failed to submit timesheet');
    } else {
      toast.success('Timesheet submitted successfully');
      setEditId(null);
      await fetchTimesheets();
    }
    setSubmitting(null);
  }

  const pending = timesheets.filter((t) => !t.medic_submitted_at);
  const submitted = timesheets.filter((t) => t.medic_submitted_at);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Timesheets</h1>
        <p className="text-gray-400 mt-1">Submit your hours for each completed shift</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-2xl p-4 text-center">
          <div className="text-2xl font-bold text-yellow-400">{pending.length}</div>
          <div className="text-gray-400 text-sm mt-1">Awaiting Submission</div>
        </div>
        <div className="bg-green-900/20 border border-green-700/30 rounded-2xl p-4 text-center">
          <div className="text-2xl font-bold text-green-400">
            £{timesheets.filter((t) => t.payout_status === 'admin_approved' || t.payout_status === 'paid')
              .reduce((sum, t) => sum + t.payout_amount, 0).toFixed(2)}
          </div>
          <div className="text-gray-400 text-sm mt-1">Approved Payout</div>
        </div>
        <div className="bg-blue-900/20 border border-blue-700/30 rounded-2xl p-4 text-center">
          <div className="text-2xl font-bold text-blue-400">
            {timesheets.reduce((sum, t) => sum + (t.logged_hours ?? t.scheduled_hours), 0).toFixed(1)}h
          </div>
          <div className="text-gray-400 text-sm mt-1">Total Hours</div>
        </div>
      </div>

      {/* Pending submission */}
      {!loading && pending.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-yellow-400" />
            Needs Submission ({pending.length})
          </h2>
          {pending.map((ts) => (
            <div key={ts.id} className="bg-gray-800/50 border border-yellow-700/30 rounded-2xl p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-white font-medium">{ts.booking.site_name}</p>
                  <p className="text-gray-400 text-sm">
                    {format(new Date(ts.booking.shift_date), 'EEE dd MMM yyyy')} ·{' '}
                    {ts.booking.shift_start_time}–{ts.booking.shift_end_time}
                  </p>
                  <p className="text-gray-500 text-xs mt-0.5">Scheduled: {ts.scheduled_hours}h</p>
                </div>
                {editId !== ts.id && (
                  <button
                    onClick={() => startEdit(ts)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-500 transition-all text-sm font-medium"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Submit Hours
                  </button>
                )}
              </div>

              {editId === ts.id && (
                <div className="space-y-3 pt-2 border-t border-gray-700/50">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-gray-400 text-xs mb-1 block">Actual Hours Worked</label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={hoursInput}
                        onChange={(e) => setHoursInput(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700/50 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  </div>
                  {parseFloat(hoursInput) !== ts.scheduled_hours && (
                    <div>
                      <label className="text-gray-400 text-xs mb-1 block">
                        Reason for discrepancy (required)
                      </label>
                      <textarea
                        value={reasonInput}
                        onChange={(e) => setReasonInput(e.target.value)}
                        rows={2}
                        placeholder="e.g. Site closed early due to weather"
                        className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700/50 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                      />
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSubmit(ts.id, ts.scheduled_hours)}
                      disabled={submitting === ts.id}
                      className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-500 transition-all text-sm font-medium disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {submitting === ts.id ? 'Submitting...' : 'Confirm & Submit'}
                    </button>
                    <button
                      onClick={() => setEditId(null)}
                      className="px-4 py-2 bg-gray-700 text-gray-300 rounded-xl hover:bg-gray-600 transition-all text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Submitted history */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : submitted.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-gray-400 text-sm font-semibold">Submission History</h2>
          <div className="bg-gray-800/30 border border-gray-700/50 rounded-2xl divide-y divide-gray-700/30">
            {submitted.map((ts) => {
              const config = statusConfig[ts.payout_status] ?? statusConfig.pending;
              return (
                <div key={ts.id} className="flex items-center justify-between px-5 py-4">
                  <div>
                    <p className="text-white font-medium text-sm">{ts.booking.site_name}</p>
                    <p className="text-gray-400 text-xs">
                      {format(new Date(ts.booking.shift_date), 'dd MMM yyyy')} · {ts.logged_hours ?? ts.scheduled_hours}h
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-white text-sm font-medium">£{ts.payout_amount.toFixed(2)}</span>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${config.color}`}>
                      {config.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!loading && timesheets.length === 0 && (
        <div className="text-center py-16 bg-gray-800/30 rounded-2xl border border-gray-700/50">
          <Clock className="w-12 h-12 text-gray-500 mx-auto mb-3" />
          <p className="text-gray-300 font-medium">No timesheets yet</p>
          <p className="text-gray-500 text-sm mt-1">Timesheets are created after your shifts are confirmed</p>
        </div>
      )}
    </div>
  );
}
