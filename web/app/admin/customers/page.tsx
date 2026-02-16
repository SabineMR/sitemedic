/**
 * Admin Customers Page
 *
 * Display all client/customer accounts with company info, payment terms,
 * credit status, booking history, and Stripe integration status.
 */

'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import CurrencyWithTooltip from '@/components/CurrencyWithTooltip';
import Link from 'next/link';

interface Customer {
  id: string;
  user_id: string | null;
  company_name: string;
  vat_number: string | null;
  billing_address: string;
  billing_postcode: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  payment_terms: 'prepay' | 'net_30';
  credit_limit: number;
  outstanding_balance: number;
  stripe_customer_id: string | null;
  default_payment_method_id: string | null;
  status: 'active' | 'suspended' | 'closed';
  suspended_reason: string | null;
  suspended_at: string | null;
  total_bookings: number;
  successful_bookings: number;
  cancelled_bookings: number;
  late_payments: number;
  created_at: string;
}

type StatusFilter = 'all' | 'active' | 'suspended' | 'closed';
type PaymentFilter = 'all' | 'prepay' | 'net_30';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('company_name', { ascending: true });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter customers
  const filteredCustomers = customers.filter((customer) => {
    // Status filter
    const matchesStatus = statusFilter === 'all' || customer.status === statusFilter;

    // Payment terms filter
    const matchesPayment = paymentFilter === 'all' || customer.payment_terms === paymentFilter;

    // Search filter
    const matchesSearch =
      searchTerm === '' ||
      customer.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.contact_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.billing_postcode.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesStatus && matchesPayment && matchesSearch;
  });

  // Calculate stats
  const stats = {
    total: customers.length,
    active: customers.filter((c) => c.status === 'active').length,
    suspended: customers.filter((c) => c.status === 'suspended').length,
    closed: customers.filter((c) => c.status === 'closed').length,
    net30: customers.filter((c) => c.payment_terms === 'net_30').length,
    overdueBalance: customers
      .filter((c) => c.outstanding_balance > 0)
      .reduce((sum, c) => sum + c.outstanding_balance, 0),
    atRisk: customers.filter(
      (c) =>
        c.late_payments > 2 ||
        (c.payment_terms === 'net_30' && c.outstanding_balance > c.credit_limit * 0.8)
    ).length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading customers...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Customers</h1>
            <p className="text-gray-400">Manage client accounts and payment terms</p>
          </div>
          <Link
            href="/admin/customers/new"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
          >
            ➕ Add Customer
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="p-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4 mb-8">
          <StatCard label="Total" value={stats.total} color="blue" />
          <StatCard label="Active" value={stats.active} color="green" />
          <StatCard
            label="Suspended"
            value={stats.suspended}
            color="red"
            highlight={stats.suspended > 0}
          />
          <StatCard label="Closed" value={stats.closed} color="gray" />
          <StatCard label="Net 30" value={stats.net30} color="purple" />
          <StatCard
            label="At Risk"
            value={stats.atRisk}
            color="yellow"
            highlight={stats.atRisk > 0}
          />
          <div className="col-span-2 md:col-span-4 xl:col-span-1">
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 h-full">
              <div className="text-gray-400 text-xs font-medium mb-1">Outstanding</div>
              <div className="text-xl font-bold text-white">
                <CurrencyWithTooltip amount={stats.overdueBalance} />
              </div>
            </div>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 mb-6">
          <div className="space-y-4">
            {/* Search */}
            <div>
              <input
                type="text"
                placeholder="Search by company, contact, email, or postcode..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex flex-wrap gap-2">
              <div className="flex gap-2">
                <span className="text-gray-400 text-sm font-medium py-2">Status:</span>
                <FilterButton
                  label="All"
                  count={customers.length}
                  active={statusFilter === 'all'}
                  onClick={() => setStatusFilter('all')}
                />
                <FilterButton
                  label="Active"
                  count={stats.active}
                  active={statusFilter === 'active'}
                  onClick={() => setStatusFilter('active')}
                  color="green"
                />
                <FilterButton
                  label="Suspended"
                  count={stats.suspended}
                  active={statusFilter === 'suspended'}
                  onClick={() => setStatusFilter('suspended')}
                  color="red"
                />
                <FilterButton
                  label="Closed"
                  count={stats.closed}
                  active={statusFilter === 'closed'}
                  onClick={() => setStatusFilter('closed')}
                  color="gray"
                />
              </div>

              <div className="border-l border-gray-700 mx-2"></div>

              <div className="flex gap-2">
                <span className="text-gray-400 text-sm font-medium py-2">Payment:</span>
                <FilterButton
                  label="All"
                  count={customers.length}
                  active={paymentFilter === 'all'}
                  onClick={() => setPaymentFilter('all')}
                />
                <FilterButton
                  label="Prepay"
                  count={customers.filter((c) => c.payment_terms === 'prepay').length}
                  active={paymentFilter === 'prepay'}
                  onClick={() => setPaymentFilter('prepay')}
                  color="blue"
                />
                <FilterButton
                  label="Net 30"
                  count={stats.net30}
                  active={paymentFilter === 'net_30'}
                  onClick={() => setPaymentFilter('net_30')}
                  color="purple"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Results count */}
        <div className="text-gray-400 text-sm mb-4">
          Showing {filteredCustomers.length} of {customers.length} customers
        </div>

        {/* Customers Table */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900 border-b border-gray-700">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Payment Terms
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Financials
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Bookings
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Stripe
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                      No customers found
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((customer) => (
                    <CustomerRow key={customer.id} customer={customer} />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Stat Card Component
 */
function StatCard({
  label,
  value,
  color,
  highlight = false,
}: {
  label: string;
  value: number;
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'gray';
  highlight?: boolean;
}) {
  const colorClasses = {
    blue: 'from-blue-600 to-blue-700',
    green: 'from-green-600 to-green-700',
    yellow: 'from-yellow-600 to-yellow-700',
    red: 'from-red-600 to-red-700',
    purple: 'from-purple-600 to-purple-700',
    gray: 'from-gray-600 to-gray-700',
  };

  return (
    <div
      className={`bg-gray-800 rounded-lg p-4 border ${
        highlight ? 'border-yellow-500/50 ring-2 ring-yellow-500/20' : 'border-gray-700'
      }`}
    >
      <div className="text-gray-400 text-xs font-medium mb-1">{label}</div>
      <div
        className={`text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-br ${colorClasses[color]}`}
      >
        {value}
      </div>
    </div>
  );
}

/**
 * Filter Button Component
 */
function FilterButton({
  label,
  count,
  active,
  onClick,
  color = 'blue',
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'gray';
}) {
  const activeColors = {
    blue: 'bg-blue-600 text-white',
    green: 'bg-green-600 text-white',
    yellow: 'bg-yellow-600 text-white',
    red: 'bg-red-600 text-white',
    purple: 'bg-purple-600 text-white',
    gray: 'bg-gray-600 text-white',
  };

  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 rounded-lg font-medium text-sm transition ${
        active ? activeColors[color] : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
      }`}
    >
      {label} ({count})
    </button>
  );
}

/**
 * Customer Row Component
 */
function CustomerRow({ customer }: { customer: Customer }) {
  const getStatusBadge = (status: string, suspendedReason?: string | null) => {
    const badges = {
      active: { color: 'bg-green-500/20 text-green-400', label: '✓ Active' },
      suspended: { color: 'bg-red-500/20 text-red-400', label: '⚠️ Suspended' },
      closed: { color: 'bg-gray-500/20 text-gray-400', label: '✗ Closed' },
    };

    const badge = badges[status as keyof typeof badges] || badges.active;
    return (
      <div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${badge.color}`}>
          {badge.label}
        </span>
        {status === 'suspended' && suspendedReason && (
          <div className="text-xs text-red-400 mt-1">{suspendedReason}</div>
        )}
      </div>
    );
  };

  const getPaymentTermsBadge = (terms: string) => {
    if (terms === 'net_30') {
      return (
        <span className="px-3 py-1 bg-purple-500/20 text-purple-400 text-sm rounded-full font-medium">
          Net 30
        </span>
      );
    }
    return (
      <span className="px-3 py-1 bg-blue-500/20 text-blue-400 text-sm rounded-full font-medium">
        Prepay
      </span>
    );
  };

  const successRate =
    customer.total_bookings > 0
      ? ((customer.successful_bookings / customer.total_bookings) * 100).toFixed(0)
      : 0;

  // Check if customer is at risk
  const isAtRisk =
    customer.late_payments > 2 ||
    (customer.payment_terms === 'net_30' &&
      customer.outstanding_balance > customer.credit_limit * 0.8);

  return (
    <tr className="hover:bg-gray-700/50 transition">
      {/* Company */}
      <td className="px-6 py-4">
        <div>
          <div className="font-medium text-white flex items-center gap-2">
            {customer.company_name}
            {isAtRisk && (
              <span className="text-yellow-400 text-xs" title="At risk: late payments or high balance">
                ⚠️
              </span>
            )}
          </div>
          <div className="text-sm text-gray-400">{customer.billing_postcode}</div>
          {customer.vat_number && (
            <div className="text-xs text-gray-500">VAT: {customer.vat_number}</div>
          )}
        </div>
      </td>

      {/* Contact */}
      <td className="px-6 py-4">
        <div className="text-sm">
          <div className="text-white font-medium">{customer.contact_name}</div>
          <div className="text-gray-400">{customer.contact_email}</div>
          <div className="text-gray-400">{customer.contact_phone}</div>
        </div>
      </td>

      {/* Payment Terms */}
      <td className="px-6 py-4">{getPaymentTermsBadge(customer.payment_terms)}</td>

      {/* Financials */}
      <td className="px-6 py-4">
        <div className="text-sm">
          {customer.payment_terms === 'net_30' && (
            <>
              <div className="text-white">
                Credit: <CurrencyWithTooltip amount={customer.credit_limit} />
              </div>
              <div
                className={
                  customer.outstanding_balance > 0 ? 'text-yellow-400' : 'text-gray-400'
                }
              >
                Balance: <CurrencyWithTooltip amount={customer.outstanding_balance} />
              </div>
              {customer.late_payments > 0 && (
                <div className="text-red-400 text-xs">
                  {customer.late_payments} late payment{customer.late_payments > 1 ? 's' : ''}
                </div>
              )}
            </>
          )}
          {customer.payment_terms === 'prepay' && (
            <div className="text-gray-400 text-xs">Pay on booking</div>
          )}
        </div>
      </td>

      {/* Bookings */}
      <td className="px-6 py-4">
        <div className="text-sm">
          <div className="text-white font-medium">{customer.total_bookings} total</div>
          <div className="text-green-400 text-xs">{customer.successful_bookings} completed</div>
          {customer.cancelled_bookings > 0 && (
            <div className="text-red-400 text-xs">{customer.cancelled_bookings} cancelled</div>
          )}
          <div className="text-gray-400 text-xs">{successRate}% success rate</div>
        </div>
      </td>

      {/* Status */}
      <td className="px-6 py-4">{getStatusBadge(customer.status, customer.suspended_reason)}</td>

      {/* Stripe */}
      <td className="px-6 py-4">
        {customer.stripe_customer_id ? (
          <div>
            <span className="px-3 py-1 bg-green-500/20 text-green-400 text-sm rounded-full font-medium">
              ✓ Connected
            </span>
            {customer.default_payment_method_id && (
              <div className="text-xs text-gray-400 mt-1">Card on file</div>
            )}
          </div>
        ) : (
          <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 text-sm rounded-full font-medium">
            Not setup
          </span>
        )}
      </td>

      {/* Actions */}
      <td className="px-6 py-4 text-right">
        <Link
          href={`/admin/customers/${customer.id}`}
          className="text-blue-400 hover:text-blue-300 text-sm font-medium"
        >
          View Details →
        </Link>
      </td>
    </tr>
  );
}
