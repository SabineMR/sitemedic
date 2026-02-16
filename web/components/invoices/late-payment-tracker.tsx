'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { calculateLateFee } from '@/lib/invoices/late-fees';

interface OverdueInvoice {
  id: string;
  invoice_number: string;
  client_id: string;
  client_name: string;
  total: number;
  due_date: string;
  days_overdue: number;
  last_reminder: '7_days' | '14_days' | '21_days' | null;
  late_fee: number;
  status: string;
}

export function LatePaymentTracker() {
  const [overdueInvoices, setOverdueInvoices] = useState<OverdueInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);

  const supabase = createClient();

  const fetchOverdueInvoices = async () => {
    setLoading(true);
    setError(null);

    try {
      const today = new Date().toISOString().split('T')[0];

      const { data, error: fetchError } = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          client_id,
          total,
          due_date,
          status,
          reminder_sent_7_days,
          reminder_sent_14_days,
          reminder_sent_21_days,
          late_fee_charged,
          clients(company_name)
        `)
        .in('status', ['sent', 'overdue'])
        .lt('due_date', today);

      if (fetchError) throw fetchError;

      const formatted: OverdueInvoice[] = (data || []).map((invoice: any) => {
        const dueDate = new Date(invoice.due_date);
        const todayDate = new Date(today);
        const daysOverdue = Math.floor((todayDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

        let lastReminder: '7_days' | '14_days' | '21_days' | null = null;
        if (invoice.reminder_sent_21_days) lastReminder = '21_days';
        else if (invoice.reminder_sent_14_days) lastReminder = '14_days';
        else if (invoice.reminder_sent_7_days) lastReminder = '7_days';

        return {
          id: invoice.id,
          invoice_number: invoice.invoice_number,
          client_id: invoice.client_id,
          client_name: invoice.clients?.company_name || 'Unknown',
          total: Number(invoice.total),
          due_date: invoice.due_date,
          days_overdue: daysOverdue,
          last_reminder: lastReminder,
          late_fee: Number(invoice.late_fee_charged || calculateLateFee(invoice.total)),
          status: invoice.status,
        };
      });

      setOverdueInvoices(formatted.sort((a, b) => b.days_overdue - a.days_overdue));
    } catch (err) {
      console.error('Error fetching overdue invoices:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const sendReminder = async (invoiceId: string, daysOverdue: number) => {
    setSendingReminder(invoiceId);

    try {
      let reminderType: '7_days' | '14_days' | '21_days';
      if (daysOverdue >= 21) reminderType = '21_days';
      else if (daysOverdue >= 14) reminderType = '14_days';
      else reminderType = '7_days';

      const response = await fetch('/api/invoices/send-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId, reminderType }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send reminder');
      }

      alert('Reminder sent successfully!');
      await fetchOverdueInvoices();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to send reminder');
    } finally {
      setSendingReminder(null);
    }
  };

  const markAsPaid = async (invoiceId: string) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ status: 'paid', paid_at: new Date().toISOString() })
        .eq('id', invoiceId);

      if (error) throw error;

      alert('Invoice marked as paid!');
      await fetchOverdueInvoices();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to mark as paid');
    }
  };

  useEffect(() => {
    fetchOverdueInvoices();

    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchOverdueInvoices, 60000);
    return () => clearInterval(interval);
  }, []);

  const getColorClass = (daysOverdue: number) => {
    if (daysOverdue >= 15) return 'bg-red-50 border-red-200';
    if (daysOverdue >= 8) return 'bg-orange-50 border-orange-200';
    return 'bg-yellow-50 border-yellow-200';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading overdue invoices...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error loading overdue invoices: {error}</p>
      </div>
    );
  }

  if (overdueInvoices.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <svg className="w-12 h-12 text-green-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        <p className="text-green-800 font-medium">No overdue invoices!</p>
        <p className="text-green-600 text-sm mt-1">All invoices are paid or current.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Late Payment Tracker</h2>
        <button
          onClick={fetchOverdueInvoices}
          className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition"
        >
          Refresh
        </button>
      </div>

      {overdueInvoices.map((invoice) => (
        <div
          key={invoice.id}
          className={`border rounded-lg p-4 ${getColorClass(invoice.days_overdue)}`}
        >
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="font-semibold text-gray-900">{invoice.invoice_number}</h3>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  invoice.days_overdue >= 15 ? 'bg-red-100 text-red-800' :
                  invoice.days_overdue >= 8 ? 'bg-orange-100 text-orange-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {invoice.days_overdue} days overdue
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Client</p>
                  <p className="font-medium text-gray-900">{invoice.client_name}</p>
                </div>
                <div>
                  <p className="text-gray-600">Amount Due</p>
                  <p className="font-medium text-gray-900">£{invoice.total.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Late Fee</p>
                  <p className="font-medium text-gray-900">£{invoice.late_fee.toFixed(2)}</p>
                </div>
              </div>
              <div className="mt-3 text-sm">
                <p className="text-gray-600">
                  Due: {new Date(invoice.due_date).toLocaleDateString('en-GB')}
                  {invoice.last_reminder && (
                    <span className="ml-3 text-gray-500">
                      • Last reminder: {invoice.last_reminder.replace('_', ' ')}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex gap-2 ml-4">
              <button
                onClick={() => sendReminder(invoice.id, invoice.days_overdue)}
                disabled={sendingReminder === invoice.id}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm font-medium disabled:opacity-50"
              >
                {sendingReminder === invoice.id ? 'Sending...' : 'Send Reminder'}
              </button>
              <button
                onClick={() => markAsPaid(invoice.id)}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition text-sm font-medium"
              >
                Mark as Paid
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
