/**
 * Medic Shifts Page
 *
 * Shows all assigned bookings for the logged-in medic,
 * past and upcoming, with site details.
 */

'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Calendar, MapPin, Clock, ChevronDown, Plus, Trash2, AlertCircle } from 'lucide-react';
import { format, isPast, isToday, isBefore } from 'date-fns';
import { BusyBlockForm } from '@/components/medic/busy-block-form';
import { toast } from 'sonner';

interface Shift {
  id: string;
  site_name: string;
  site_address: string | null;
  shift_date: string;
  shift_start_time: string;
  shift_end_time: string;
  status: string;
  confined_space_required: boolean;
  trauma_specialist_required: boolean;
  client: { company_name: string } | null;
}

interface BusyBlock {
  id: string;
  date: string;
  reason: string | null;
  request_type: string;
}

const statusColors: Record<string, string> = {
  confirmed: 'bg-green-900/50 text-green-300',
  pending: 'bg-yellow-900/50 text-yellow-300',
  urgent_broadcast: 'bg-red-900/50 text-red-300',
  completed: 'bg-gray-700 text-gray-400',
  cancelled: 'bg-red-900/20 text-red-400 line-through',
};

export default function MedicShiftsPage() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'upcoming' | 'past' | 'all'>('upcoming');
  const [busyBlocks, setBusyBlocks] = useState<BusyBlock[]>([]);
  const [showBusyForm, setShowBusyForm] = useState(false);
  const [medicId, setMedicId] = useState<string | null>(null);

  async function fetchBusyBlocks(supabase: ReturnType<typeof createClient>, mId: string) {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('medic_availability')
      .select('id, date, reason, request_type')
      .eq('medic_id', mId)
      .eq('is_available', false)
      .eq('status', 'approved')
      .gte('date', today)
      .order('date', { ascending: true });
    setBusyBlocks((data as BusyBlock[]) || []);
  }

  useEffect(() => {
    async function fetchShifts() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get medic record
      const { data: medicData } = await supabase
        .from('medics')
        .select('id')
        .eq('user_id', user.id)
        .single();

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id, site_name, site_address, shift_date, shift_start_time, shift_end_time,
          status, confined_space_required, trauma_specialist_required,
          client:clients(company_name)
        `)
        .eq('medic_id', user.id)
        .order('shift_date', { ascending: false });

      if (error) {
        console.error('Error fetching shifts:', error);
      } else {
        setShifts((data as unknown as Shift[]) || []);
      }

      // Fetch busy blocks if we have a medic record
      if (medicData) {
        setMedicId(medicData.id);
        await fetchBusyBlocks(supabase, medicData.id);
      }

      setLoading(false);
    }
    fetchShifts();
  }, []);

  const filtered = shifts.filter((s) => {
    const past = isPast(new Date(s.shift_date)) && !isToday(new Date(s.shift_date));
    if (filter === 'upcoming') return !past;
    if (filter === 'past') return past;
    return true;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">My Shifts</h1>
          <p className="text-gray-400 mt-1">All your assigned shift bookings</p>
        </div>
        <div className="flex gap-2">
          {(['upcoming', 'past', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all ${
                filter === f
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-gray-800/30 rounded-2xl border border-gray-700/50">
          <Calendar className="w-12 h-12 text-gray-500 mx-auto mb-3" />
          <p className="text-gray-300 font-medium">No {filter} shifts</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((shift) => (
            <div key={shift.id} className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-white font-semibold">{shift.site_name}</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[shift.status] ?? 'bg-gray-700 text-gray-300'}`}>
                      {shift.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  {shift.client && (
                    <p className="text-gray-400 text-sm">{shift.client.company_name}</p>
                  )}
                  {shift.site_address && (
                    <div className="flex items-center gap-1 text-gray-400 text-sm">
                      <MapPin className="w-3.5 h-3.5" />
                      {shift.site_address}
                    </div>
                  )}
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1 text-gray-300">
                      <Calendar className="w-3.5 h-3.5 text-green-400" />
                      {format(new Date(shift.shift_date), 'EEE dd MMMM yyyy')}
                    </span>
                    <span className="flex items-center gap-1 text-gray-300">
                      <Clock className="w-3.5 h-3.5 text-green-400" />
                      {shift.shift_start_time}–{shift.shift_end_time}
                    </span>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {shift.confined_space_required && (
                      <span className="px-2 py-0.5 bg-orange-900/40 text-orange-300 rounded-full text-xs">Confined Space</span>
                    )}
                    {shift.trauma_specialist_required && (
                      <span className="px-2 py-0.5 bg-red-900/40 text-red-300 rounded-full text-xs">Trauma Specialist</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* My Busy Blocks Section */}
      <div className="border-t border-gray-700/50 pt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white">My Busy Blocks</h2>
            <p className="text-gray-400 text-sm mt-0.5">
              Mark dates when you&apos;re unavailable (personal appointments, etc.)
            </p>
          </div>
          {medicId && !showBusyForm && (
            <button
              onClick={() => setShowBusyForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Busy Block
            </button>
          )}
        </div>

        {showBusyForm && medicId && (
          <div className="mb-4">
            <BusyBlockForm
              medicId={medicId}
              onSaved={() => {
                setShowBusyForm(false);
                const supabase = createClient();
                fetchBusyBlocks(supabase, medicId);
              }}
              onCancel={() => setShowBusyForm(false)}
            />
          </div>
        )}

        {busyBlocks.length === 0 ? (
          <div className="text-center py-8 bg-gray-800/30 rounded-2xl border border-gray-700/50">
            <AlertCircle className="w-10 h-10 text-gray-500 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">No upcoming busy blocks</p>
          </div>
        ) : (
          <div className="space-y-2">
            {busyBlocks.map((block) => (
              <div
                key={block.id}
                className="flex items-center justify-between bg-orange-900/10 border border-orange-700/30 rounded-xl px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-orange-400 text-sm font-medium">
                    {format(new Date(block.date), 'EEE dd MMM yyyy')}
                  </span>
                  <span className="text-gray-400 text-sm">
                    {block.reason || 'Personal'}
                  </span>
                  <span className="px-2 py-0.5 bg-orange-900/40 text-orange-300 rounded-full text-xs capitalize">
                    {block.request_type?.replace(/_/g, ' ') || 'personal'}
                  </span>
                </div>
                <button
                  onClick={async () => {
                    const supabase = createClient();
                    const { error } = await supabase
                      .from('medic_availability')
                      .delete()
                      .eq('id', block.id);
                    if (error) {
                      toast.error('Failed to remove busy block');
                    } else {
                      toast.success('Busy block removed');
                      if (medicId) fetchBusyBlocks(supabase, medicId);
                    }
                  }}
                  className="text-gray-500 hover:text-red-400 transition-colors"
                  title="Remove busy block"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
