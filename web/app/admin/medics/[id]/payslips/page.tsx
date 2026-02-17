/**
 * Medic Payslips Page
 *
 * View and generate payslips for a specific medic.
 * Uses the generate-payslip-pdf edge function to produce PDF payslips.
 *
 * Route: /admin/medics/[id]/payslips
 */

'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useOrg } from '@/contexts/org-context';
import { FileText, Download, ArrowLeft, Calendar } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { use } from 'react';

interface Timesheet {
  id: string;
  booking_id: string;
  logged_hours: number;
  payout_amount: number;
  payout_status: string;
  admin_approved_at: string | null;
  paid_at: string | null;
  stripe_transfer_id: string | null;
  booking: {
    site_name: string;
    shift_date: string;
    client: { company_name: string };
  };
}

interface MedicProfile {
  first_name: string;
  last_name: string;
  email: string;
}

export default function MedicPayslipsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: medicId } = use(params);
  const { orgId } = useOrg();
  const [medic, setMedic] = useState<MedicProfile | null>(null);
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!orgId || !medicId) return;
      const supabase = createClient();

      const [medicResult, timesheetsResult] = await Promise.all([
        supabase.from('medics').select('first_name, last_name, email').eq('id', medicId).single(),
        supabase
          .from('timesheets')
          .select(`
            id,
            booking_id,
            logged_hours,
            payout_amount,
            payout_status,
            admin_approved_at,
            paid_at,
            stripe_transfer_id,
            booking:bookings!inner(
              site_name,
              shift_date,
              client:clients!inner(company_name)
            )
          `)
          .eq('medic_id', medicId)
          .eq('org_id', orgId)
          .in('payout_status', ['admin_approved', 'paid'])
          .order('created_at', { ascending: false }),
      ]);

      if (medicResult.data) setMedic(medicResult.data);
      setTimesheets((timesheetsResult.data as unknown as Timesheet[]) || []);
      setLoading(false);
    }

    fetchData();
  }, [orgId, medicId]);

  async function handleGeneratePayslip(timesheet: Timesheet) {
    setGeneratingId(timesheet.id);
    const supabase = createClient();

    try {
      const { data, error } = await supabase.functions.invoke('generate-payslip-pdf', {
        body: {
          timesheet_id: timesheet.id,
          medic_id: medicId,
          org_id: orgId,
        },
      });

      if (error) throw error;

      if (data?.pdf_url) {
        window.open(data.pdf_url, '_blank');
        toast.success('Payslip generated and opened');
      } else if (data?.pdf_base64) {
        // Base64 PDF — trigger download
        const byteCharacters = atob(data.pdf_base64);
        const byteArray = new Uint8Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteArray[i] = byteCharacters.charCodeAt(i);
        }
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `payslip-${medic?.last_name?.toLowerCase()}-${format(new Date(timesheet.booking.shift_date), 'yyyy-MM')}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Payslip downloaded');
      } else {
        toast.error('No PDF returned from payslip generator');
      }
    } catch (err) {
      console.error('Payslip generation error:', err);
      toast.error('Failed to generate payslip');
    }
    setGeneratingId(null);
  }

  return (
    <div className="p-6 space-y-6">
      {/* Back + Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/medics"
          className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Medics
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-white">
          {medic ? `${medic.first_name} ${medic.last_name}` : 'Loading...'} — Payslips
        </h1>
        {medic && <p className="text-gray-400 mt-1">{medic.email}</p>}
      </div>

      {/* Stats */}
      {!loading && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-4 text-center">
            <div className="text-2xl font-bold text-white">{timesheets.length}</div>
            <div className="text-gray-400 text-sm mt-1">Total Shifts</div>
          </div>
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-4 text-center">
            <div className="text-2xl font-bold text-green-400">
              £{timesheets.reduce((sum, t) => sum + t.payout_amount, 0).toFixed(2)}
            </div>
            <div className="text-gray-400 text-sm mt-1">Total Earned</div>
          </div>
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-4 text-center">
            <div className="text-2xl font-bold text-blue-400">
              {timesheets.reduce((sum, t) => sum + t.logged_hours, 0).toFixed(1)}h
            </div>
            <div className="text-gray-400 text-sm mt-1">Total Hours</div>
          </div>
        </div>
      )}

      {/* Payslips Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : timesheets.length === 0 ? (
        <div className="text-center py-16 bg-gray-800/30 rounded-2xl border border-gray-700/50">
          <FileText className="w-12 h-12 text-gray-500 mx-auto mb-3" />
          <p className="text-gray-300 font-medium">No approved timesheets</p>
          <p className="text-gray-500 text-sm mt-1">Payslips are generated from admin-approved timesheets</p>
        </div>
      ) : (
        <div className="bg-gray-800/30 border border-gray-700/50 rounded-2xl divide-y divide-gray-700/30">
          {timesheets.map((ts) => (
            <div key={ts.id} className="flex items-center justify-between px-6 py-4">
              <div className="space-y-1">
                <p className="text-white font-medium">{ts.booking.site_name}</p>
                <p className="text-gray-400 text-sm">{ts.booking.client.company_name}</p>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(ts.booking.shift_date), 'dd MMM yyyy')}
                  </span>
                  <span>{ts.logged_hours}h</span>
                  <span className={`px-2 py-0.5 rounded-full ${
                    ts.payout_status === 'paid'
                      ? 'bg-green-900/50 text-green-300'
                      : 'bg-yellow-900/50 text-yellow-300'
                  }`}>
                    {ts.payout_status === 'paid' ? 'Paid' : 'Approved'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-white font-semibold">£{ts.payout_amount.toFixed(2)}</span>
                <button
                  onClick={() => handleGeneratePayslip(ts)}
                  disabled={generatingId === ts.id}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600/20 text-blue-400 border border-blue-600/30 rounded-xl hover:bg-blue-600/30 transition-all text-sm font-medium disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  {generatingId === ts.id ? 'Generating...' : 'Payslip'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
