'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
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

interface LatePaymentTrackerProps {
  autoRefresh?: boolean;
  refreshInterval?: number; // milliseconds
}

export default function LatePaymentTracker({
  autoRefresh = true,
  refreshInterval = 60000, // 60 seconds
}: LatePaymentTrackerProps) {
  const [overdueInvoices, setOverdueInvoices] = useState<OverdueInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | '1-7' | '8-14' | '15+'>('all');
  const [clientFilter, setClientFilter] = useState<string>('');
  const supabase = createClientComponentClient();

  const fetchOverdueInvoices = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
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
          client:clients(company_name)
        `)
        .eq('status', 'sent')
        .lt('due_date', today.toISOString().split('T')[0])
        .order('due_date', { ascending: true });

      if (error) throw error;

      const processed: OverdueInvoice[] = (data || []).map((invoice: any) => {
        const dueDate = new Date(invoice.due_date);
        const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

        let lastReminder: '7_days' | '14_days' | '21_days' | null = null;
        if (invoice.reminder_sent_21_days) lastReminder = '21_days';
        else if (invoice.reminder_sent_14_days) lastReminder = '14_days';
        else if (invoice.reminder_sent_7_days) lastReminder = '7_days';

        return {
          id: invoice.id,
          invoice_number: invoice.invoice_number,
          client_id: invoice.client_id,
          client_name: invoice.client?.company_name || 'Unknown',
          total: parseFloat(invoice.total),
          due_date: invoice.due_date,
          days_overdue: daysOverdue,
          last_reminder: lastReminder,
          late_fee: calculateLateFee(parseFloat(invoice.total)),
          status: invoice.status,
        };
      });

      setOverdueInvoices(processed);
    } catch (error) {
      console.error('Error fetching overdue invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverdueInvoices();

    if (autoRefresh) {
      const interval = setInterval(fetchOverdueInvoices, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  const filteredInvoices = overdueInvoices.filter((invoice) => {
    // Days overdue filter
    if (filter === '1-7' && (invoice.days_overdue < 1 || invoice.days_overdue > 7)) return false;
    if (filter === '8-14' && (invoice.days_overdue < 8 || invoice.days_overdue > 14)) return false;
    if (filter === '15+' && invoice.days_overdue < 15) return false;

    // Client name filter
    if (clientFilter && !invoice.client_name.toLowerCase().includes(clientFilter.toLowerCase())) {
      return false;
    }

    return true;
  });

  const getRowColor = (daysOverdue: number): string => {
    if (daysOverdue >= 15) return 'bg-red-50 border-red-200';
    if (daysOverdue >= 8) return 'bg-orange-50 border-orange-200';
    return 'bg-yellow-50 border-yellow-200';
  };

  const handleSendReminder = async (invoiceId: string, reminderType: '7_days' | '14_days' | '21_days') => {
    try {
      const response = await fetch('/api/invoices/send-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId, reminderType }),
      });

      if (!response.ok) {
        throw new Error('Failed to send reminder');
      }

      // Refresh list
      fetchOverdueInvoices();
      alert('Reminder sent successfully');
    } catch (error) {
      console.error('Error sending reminder:', error);
      alert('Failed to send reminder');
    }
  };

  const handleMarkPaid = async (invoiceId: string) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ status: 'paid', paid_at: new Date().toISOString() })
        .eq('id', invoiceId);

      if (error) throw error;

      // Refresh list
      fetchOverdueInvoices();
      alert('Invoice marked as paid');
    } catch (error) {
      console.error('Error marking invoice as paid:', error);
      alert('Failed to mark invoice as paid');
    }
  };

  if (loading) {
    return <div className="p-4">Loading overdue invoices...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-center">
        <h2 className="text-2xl font-bold">Late Payment Tracker</h2>
        <button
          onClick={fetchOverdueInvoices}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Overdue Period</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="border rounded px-3 py-2"
          >
            <option value="all">All</option>
            <option value="1-7">1-7 days</option>
            <option value="8-14">8-14 days</option>
            <option value="15+">15+ days</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Client Name</label>
          <input
            type="text"
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            placeholder="Filter by client..."
            className="border rounded px-3 py-2"
          />
        </div>
      </div>

      {/* Invoice List */}
      {filteredInvoices.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          No overdue invoices found
        </div>
      ) : (
        <div className="space-y-2">
          {filteredInvoices.map((invoice) => (
            <div
              key={invoice.id}
              className={`p-4 border-2 rounded-lg ${getRowColor(invoice.days_overdue)}`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="font-bold text-lg">{invoice.invoice_number}</div>
                  <div className="text-sm text-gray-700">{invoice.client_name}</div>
                  <div className="text-sm mt-2">
                    <span className="font-medium">Due: </span>
                    {new Date(invoice.due_date).toLocaleDateString('en-GB')}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Days Overdue: </span>
                    <span className="font-bold">{invoice.days_overdue}</span>
                  </div>
                  {invoice.last_reminder && (
                    <div className="text-sm text-gray-600">
                      Last Reminder: {invoice.last_reminder.replace('_', ' ')}
                    </div>
                  )}
                </div>

                <div className="text-right space-y-2">
                  <div>
                    <div className="text-sm text-gray-600">Amount</div>
                    <div className="text-xl font-bold">
                      £{invoice.total.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Late Fee</div>
                    <div className="text-lg font-semibold text-red-600">
                      £{invoice.late_fee.toFixed(2)}
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    {invoice.days_overdue >= 7 && !invoice.last_reminder && (
                      <button
                        onClick={() => handleSendReminder(invoice.id, '7_days')}
                        className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700"
                      >
                        Send 7-day
                      </button>
                    )}
                    {invoice.days_overdue >= 14 && invoice.last_reminder !== '14_days' && invoice.last_reminder !== '21_days' && (
                      <button
                        onClick={() => handleSendReminder(invoice.id, '14_days')}
                        className="px-3 py-1 bg-orange-600 text-white rounded text-sm hover:bg-orange-700"
                      >
                        Send 14-day
                      </button>
                    )}
                    {invoice.days_overdue >= 21 && invoice.last_reminder !== '21_days' && (
                      <button
                        onClick={() => handleSendReminder(invoice.id, '21_days')}
                        className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                      >
                        Send 21-day
                      </button>
                    )}
                    <button
                      onClick={() => handleMarkPaid(invoice.id)}
                      className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                    >
                      Mark Paid
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
