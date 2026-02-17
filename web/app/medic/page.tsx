/**
 * Medic Dashboard — Home
 *
 * Overview of upcoming shifts, pending timesheets, and quick stats.
 * First page medics see after login.
 */

'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Calendar, Clock, FileText, Star, MapPin, CheckCircle2, AlertCircle } from 'lucide-react';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import Link from 'next/link';

interface UpcomingShift {
  id: string;
  site_name: string;
  shift_date: string;
  shift_start_time: string;
  shift_end_time: string;
  status: string;
  client: { company_name: string } | null;
}

interface PendingTimesheet {
  id: string;
  booking_id: string;
  payout_amount: number;
  payout_status: string;
  booking: { site_name: string; shift_date: string };
}

interface MedicProfile {
  id: string;
  first_name: string;
  last_name: string;
  star_rating: number | null;
  available_for_work: boolean;
  stripe_onboarding_complete: boolean;
}

function shiftDateLabel(dateStr: string): { label: string; color: string } {
  const d = new Date(dateStr);
  if (isToday(d)) return { label: 'Today', color: 'text-green-400' };
  if (isTomorrow(d)) return { label: 'Tomorrow', color: 'text-yellow-400' };
  if (isPast(d)) return { label: format(d, 'dd MMM'), color: 'text-gray-500' };
  return { label: format(d, 'EEE dd MMM'), color: 'text-gray-300' };
}

export default function MedicDashboard() {
  const [profile, setProfile] = useState<MedicProfile | null>(null);
  const [shifts, setShifts] = useState<UpcomingShift[]>([]);
  const [pendingTimesheets, setPendingTimesheets] = useState<PendingTimesheet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [medicResult, shiftsResult, timesheetsResult] = await Promise.all([
        supabase
          .from('medics')
          .select('id, first_name, last_name, star_rating, available_for_work, stripe_onboarding_complete')
          .eq('user_id', user.id)
          .single(),
        supabase
          .from('bookings')
          .select(`
            id, site_name, shift_date, shift_start_time, shift_end_time, status,
            client:clients(company_name)
          `)
          .eq('medic_id', user.id)
          .gte('shift_date', new Date().toISOString().split('T')[0])
          .order('shift_date', { ascending: true })
          .limit(5),
        supabase
          .from('timesheets')
          .select('id, booking_id, payout_amount, payout_status, booking:bookings(site_name, shift_date)')
          .eq('medic_id', user.id)
          .eq('payout_status', 'pending')
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      if (medicResult.data) setProfile(medicResult.data);
      setShifts((shiftsResult.data as unknown as UpcomingShift[]) || []);
      setPendingTimesheets((timesheetsResult.data as unknown as PendingTimesheet[]) || []);
      setLoading(false);
    }
    fetchData();
  }, []);

  const pendingPayout = pendingTimesheets.reduce((sum, t) => sum + (t.payout_amount || 0), 0);

  return (
    <div className="p-6 space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          {loading ? 'Welcome back' : `Welcome back, ${profile?.first_name ?? 'Medic'}`}
        </h1>
        <p className="text-gray-400 mt-1">
          {format(new Date(), "EEEE dd MMMM yyyy")}
        </p>
      </div>

      {/* Stripe warning banner */}
      {!loading && profile && !profile.stripe_onboarding_complete && (
        <div className="flex items-start gap-3 bg-yellow-900/20 border border-yellow-600/30 rounded-2xl p-4">
          <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-yellow-300 font-medium text-sm">Payout account incomplete</p>
            <p className="text-yellow-400/80 text-sm mt-0.5">
              Complete your Stripe Express account setup to receive payouts for your shifts.
            </p>
            <Link
              href="/medic/profile"
              className="text-yellow-300 hover:text-yellow-200 text-sm underline mt-1 inline-block"
            >
              Set up payouts →
            </Link>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Calendar className="w-5 h-5 text-blue-400" />}
          label="Upcoming Shifts"
          value={loading ? '—' : String(shifts.length)}
          bg="bg-blue-900/20 border-blue-700/30"
        />
        <StatCard
          icon={<Clock className="w-5 h-5 text-yellow-400" />}
          label="Pending Timesheets"
          value={loading ? '—' : String(pendingTimesheets.length)}
          bg="bg-yellow-900/20 border-yellow-700/30"
        />
        <StatCard
          icon={<FileText className="w-5 h-5 text-green-400" />}
          label="Pending Payout"
          value={loading ? '—' : `£${pendingPayout.toFixed(2)}`}
          bg="bg-green-900/20 border-green-700/30"
        />
        <StatCard
          icon={<Star className="w-5 h-5 text-purple-400" />}
          label="Star Rating"
          value={loading ? '—' : profile?.star_rating ? `${profile.star_rating.toFixed(1)} ★` : 'N/A'}
          bg="bg-purple-900/20 border-purple-700/30"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Shifts */}
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold">Upcoming Shifts</h2>
            <Link href="/medic/shifts" className="text-green-400 hover:text-green-300 text-sm transition-colors">
              View all →
            </Link>
          </div>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-3 border-green-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : shifts.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-10 h-10 text-gray-600 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">No upcoming shifts</p>
            </div>
          ) : (
            <div className="space-y-3">
              {shifts.map((shift) => {
                const { label, color } = shiftDateLabel(shift.shift_date);
                return (
                  <div key={shift.id} className="flex items-center gap-3 p-3 bg-gray-700/30 rounded-xl">
                    <div className="w-10 h-10 bg-green-900/40 border border-green-700/40 rounded-xl flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-4 h-4 text-green-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{shift.site_name}</p>
                      <p className="text-gray-400 text-xs">
                        {shift.shift_start_time}–{shift.shift_end_time}
                      </p>
                    </div>
                    <span className={`text-xs font-medium flex-shrink-0 ${color}`}>{label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pending Timesheets */}
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold">Pending Timesheets</h2>
            <Link href="/medic/timesheets" className="text-green-400 hover:text-green-300 text-sm transition-colors">
              View all →
            </Link>
          </div>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-3 border-green-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : pendingTimesheets.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="w-10 h-10 text-green-600/40 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">All timesheets submitted</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingTimesheets.map((ts) => (
                <div key={ts.id} className="flex items-center justify-between p-3 bg-yellow-900/10 border border-yellow-700/20 rounded-xl">
                  <div>
                    <p className="text-white text-sm font-medium">{ts.booking?.site_name}</p>
                    <p className="text-gray-400 text-xs">
                      {ts.booking?.shift_date ? format(new Date(ts.booking.shift_date), 'dd MMM yyyy') : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-400 font-semibold text-sm">£{ts.payout_amount?.toFixed(2)}</span>
                    <Link
                      href="/medic/timesheets"
                      className="px-3 py-1 bg-yellow-600/20 text-yellow-400 border border-yellow-600/30 rounded-lg text-xs font-medium hover:bg-yellow-600/30 transition-all"
                    >
                      Submit
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, bg }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  bg: string;
}) {
  return (
    <div className={`border rounded-2xl p-4 ${bg}`}>
      <div className="flex items-center gap-2 mb-2">{icon}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-gray-400 text-xs mt-1">{label}</div>
    </div>
  );
}
