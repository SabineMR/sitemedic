/**
 * Medic Payslips Page
 *
 * View and download payslips for all paid timesheets.
 * Uses the generate-payslip-pdf edge function.
 */

'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { FileText, Download, Calendar, PoundSterling } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface Payslip {
  id: string;
  booking_id: string;
  logged_hours: number;
  payout_amount: number;
  payout_status: string;
  paid_at: string | null;
  stripe_transfer_id: string | null;
  booking: {
    site_name: string;
    shift_date: string;
    client: { company_name: string };
  };
}

export default function MedicPayslipsPage() {
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [medicId, setMedicId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPayslips() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get medic record to get medic ID
      const { data: medic } = await supabase
        .from('medics')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (medic) setMedicId(medic.id);

      const { data, error } = await supabase
        .from('timesheets')
        .select(`
          id, booking_id, logged_hours, payout_amount, payout_status, paid_at, stripe_transfer_id,
          booking:bookings!inner(
            site_name, shift_date,
            client:clients!inner(company_name)
          )
        `)
        .eq('medic_id', user.id)
        .in('payout_status', ['admin_approved', 'paid'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching payslips:', error);
      } else {
        setPayslips((data as unknown as Payslip[]) || []);
      }
      setLoading(false);
    }
    fetchPayslips();
  }, []);

  async function handleDownload(payslip: Payslip) {
    if (!medicId) {
      toast.error('Unable to identify medic account');
      return;
    }
    setDownloadingId(payslip.id);
    const supabase = createClient();

    try {
      const { data, error } = await supabase.functions.invoke('generate-payslip-pdf', {
        body: { timesheet_id: payslip.id, medic_id: medicId },
      });

      if (error) throw error;

      if (data?.pdf_url) {
        window.open(data.pdf_url, '_blank');
        toast.success('Payslip opened');
      } else if (data?.pdf_base64) {
        const byteCharacters = atob(data.pdf_base64);
        const byteArray = new Uint8Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteArray[i] = byteCharacters.charCodeAt(i);
        }
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `payslip-${format(new Date(payslip.booking.shift_date), 'yyyy-MM')}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Payslip downloaded');
      } else {
        toast.error('Payslip not available yet');
      }
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Failed to download payslip');
    }
    setDownloadingId(null);
  }

  const totalEarned = payslips.reduce((sum, p) => sum + p.payout_amount, 0);
  const totalHours = payslips.reduce((sum, p) => sum + p.logged_hours, 0);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Payslips</h1>
        <p className="text-gray-400 mt-1">Download payslips for your approved and paid shifts</p>
      </div>

      {/* Summary */}
      {!loading && payslips.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-green-900/20 border border-green-700/30 rounded-2xl p-4 text-center">
            <div className="text-2xl font-bold text-green-400">£{totalEarned.toFixed(2)}</div>
            <div className="text-gray-400 text-sm mt-1">Total Earned</div>
          </div>
          <div className="bg-blue-900/20 border border-blue-700/30 rounded-2xl p-4 text-center">
            <div className="text-2xl font-bold text-blue-400">{totalHours.toFixed(1)}h</div>
            <div className="text-gray-400 text-sm mt-1">Total Hours</div>
          </div>
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-4 text-center">
            <div className="text-2xl font-bold text-white">{payslips.length}</div>
            <div className="text-gray-400 text-sm mt-1">Total Shifts</div>
          </div>
        </div>
      )}

      {/* Payslips list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : payslips.length === 0 ? (
        <div className="text-center py-16 bg-gray-800/30 rounded-2xl border border-gray-700/50">
          <FileText className="w-12 h-12 text-gray-500 mx-auto mb-3" />
          <p className="text-gray-300 font-medium">No payslips yet</p>
          <p className="text-gray-500 text-sm mt-1">Payslips are available once timesheets are approved</p>
        </div>
      ) : (
        <div className="bg-gray-800/30 border border-gray-700/50 rounded-2xl divide-y divide-gray-700/30">
          {payslips.map((p) => (
            <div key={p.id} className="flex items-center justify-between px-6 py-4">
              <div className="space-y-1">
                <p className="text-white font-medium">{p.booking.site_name}</p>
                <p className="text-gray-400 text-sm">{p.booking.client.company_name}</p>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(p.booking.shift_date), 'dd MMM yyyy')}
                  </span>
                  <span>{p.logged_hours}h</span>
                  {p.paid_at && (
                    <span className="text-green-400">Paid {format(new Date(p.paid_at), 'dd MMM yyyy')}</span>
                  )}
                  {!p.paid_at && (
                    <span className="text-yellow-400">Approved — awaiting payment</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-white font-semibold">£{p.payout_amount.toFixed(2)}</span>
                <button
                  onClick={() => handleDownload(p)}
                  disabled={downloadingId === p.id}
                  className="flex items-center gap-1.5 px-4 py-2 bg-green-600/20 text-green-400 border border-green-600/30 rounded-xl hover:bg-green-600/30 transition-all text-sm font-medium disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  {downloadingId === p.id ? 'Loading...' : 'Download'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
