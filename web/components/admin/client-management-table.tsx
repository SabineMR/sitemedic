/**
 * Client Management Table
 *
 * Features:
 * - Payment terms upgrade/downgrade (Prepay ↔ Net 30)
 * - Reliability scoring (0-100 based on late payments)
 * - At Risk filter (late payments >2 or balance >80% credit limit)
 * - Client booking history view
 * - Search by company, contact, email, postcode
 * - Status and payment terms filters
 */

'use client';

import { useState, useMemo } from 'react';
import {
  useClients,
  useUpgradeToNet30,
  useDowngradeToPrePay,
  ClientWithHistory,
  PaymentTermsUpgrade,
  PaymentTermsDowngrade,
} from '@/lib/queries/admin/clients';
import CurrencyWithTooltip from '@/components/CurrencyWithTooltip';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  MoreVertical,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  CreditCard,
} from 'lucide-react';

type StatusFilter = 'all' | 'active' | 'suspended' | 'closed';
type PaymentFilter = 'all' | 'prepay' | 'net_30';

interface UpgradeDialogState {
  open: boolean;
  client: ClientWithHistory | null;
  creditLimit: number;
  reason: string;
}

interface DowngradeDialogState {
  open: boolean;
  client: ClientWithHistory | null;
  reason: string;
}

export function ClientManagementTable() {
  const { data: clients, isLoading } = useClients();
  const upgradeMutation = useUpgradeToNet30();
  const downgradeMutation = useDowngradeToPrePay();

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all');
  const [atRiskOnly, setAtRiskOnly] = useState(false);

  // Dialogs
  const [upgradeDialog, setUpgradeDialog] = useState<UpgradeDialogState>({
    open: false,
    client: null,
    creditLimit: 5000,
    reason: '',
  });
  const [downgradeDialog, setDowngradeDialog] = useState<DowngradeDialogState>({
    open: false,
    client: null,
    reason: '',
  });

  // Filter clients
  const filteredClients = useMemo(() => {
    if (!clients) return [];

    return clients.filter((client) => {
      // Status filter
      if (statusFilter !== 'all' && client.status !== statusFilter) return false;

      // Payment terms filter
      if (paymentFilter !== 'all' && client.payment_terms !== paymentFilter) return false;

      // At Risk filter
      if (atRiskOnly) {
        const isAtRisk =
          client.late_payments > 2 ||
          (client.payment_terms === 'net_30' &&
            client.outstanding_balance > client.credit_limit * 0.8);
        if (!isAtRisk) return false;
      }

      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        return (
          client.company_name.toLowerCase().includes(search) ||
          client.contact_name.toLowerCase().includes(search) ||
          client.contact_email.toLowerCase().includes(search) ||
          client.billing_postcode.toLowerCase().includes(search)
        );
      }

      return true;
    });
  }, [clients, searchTerm, statusFilter, paymentFilter, atRiskOnly]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!clients) return null;

    return {
      total: clients.length,
      active: clients.filter((c) => c.status === 'active').length,
      suspended: clients.filter((c) => c.status === 'suspended').length,
      net30: clients.filter((c) => c.payment_terms === 'net_30').length,
      atRisk: clients.filter(
        (c) =>
          c.late_payments > 2 ||
          (c.payment_terms === 'net_30' && c.outstanding_balance > c.credit_limit * 0.8)
      ).length,
      outstandingBalance: clients
        .filter((c) => c.outstanding_balance > 0)
        .reduce((sum, c) => sum + c.outstanding_balance, 0),
    };
  }, [clients]);

  // Handle upgrade to Net 30
  const handleUpgrade = async () => {
    if (!upgradeDialog.client) return;

    const payload: PaymentTermsUpgrade = {
      clientId: upgradeDialog.client.id,
      newTerms: 'net_30',
      creditLimit: upgradeDialog.creditLimit,
      reason: upgradeDialog.reason,
    };

    try {
      await upgradeMutation.mutateAsync(payload);
      setUpgradeDialog({ open: false, client: null, creditLimit: 5000, reason: '' });
    } catch (error) {
      // Error will be shown via mutation error
      console.error('Upgrade failed:', error);
    }
  };

  // Handle downgrade to prepay
  const handleDowngrade = async () => {
    if (!downgradeDialog.client) return;

    const payload: PaymentTermsDowngrade = {
      clientId: downgradeDialog.client.id,
      reason: downgradeDialog.reason,
    };

    try {
      await downgradeMutation.mutateAsync(payload);
      setDowngradeDialog({ open: false, client: null, reason: '' });
    } catch (error) {
      console.error('Downgrade failed:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-400">Loading clients...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard label="Total" value={stats.total} color="blue" />
          <StatCard label="Active" value={stats.active} color="green" />
          <StatCard label="Suspended" value={stats.suspended} color="red" highlight={stats.suspended > 0} />
          <StatCard label="Net 30" value={stats.net30} color="purple" />
          <StatCard label="At Risk" value={stats.atRisk} color="yellow" highlight={stats.atRisk > 0} />
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="text-gray-400 text-xs font-medium mb-1">Outstanding</div>
            <div className="text-xl font-bold text-white">
              <CurrencyWithTooltip amount={stats.outstandingBalance} />
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-gray-800/50 backdrop-blur-xl rounded-xl border border-gray-700/50 p-6">
        <div className="space-y-4">
          {/* Search */}
          <Input
            type="text"
            placeholder="Search by company, contact, email, or postcode..."
            aria-label="Search clients"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-gray-900/50 border-gray-700/50 text-white"
          />

          {/* Filter dropdowns and toggles */}
          <div className="flex flex-wrap gap-3 items-center">
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
              <SelectTrigger className="w-[180px] bg-gray-900/50 border-gray-700/50 text-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={paymentFilter} onValueChange={(value) => setPaymentFilter(value as PaymentFilter)}>
              <SelectTrigger className="w-[180px] bg-gray-900/50 border-gray-700/50 text-white">
                <SelectValue placeholder="Payment Terms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Terms</SelectItem>
                <SelectItem value="prepay">Prepay</SelectItem>
                <SelectItem value="net_30">Net 30</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant={atRiskOnly ? 'default' : 'outline'}
              onClick={() => setAtRiskOnly(!atRiskOnly)}
              className={atRiskOnly ? 'bg-yellow-600 hover:bg-yellow-700' : ''}
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              At Risk ({stats?.atRisk || 0})
            </Button>
          </div>
        </div>
      </div>

      {/* Results count */}
      <div className="text-gray-400 text-sm">
        Showing {filteredClients.length} of {clients?.length || 0} clients
      </div>

      {/* Table */}
      <div className="bg-gray-800/50 backdrop-blur-xl rounded-xl border border-gray-700/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900/50 border-b border-gray-700/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Company</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Contact</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Payment Terms</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Reliability</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Financials</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Bookings</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Stripe</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                    No clients found
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => (
                  <ClientRow
                    key={client.id}
                    client={client}
                    onUpgrade={() =>
                      setUpgradeDialog({ open: true, client, creditLimit: 5000, reason: '' })
                    }
                    onDowngrade={() =>
                      setDowngradeDialog({ open: true, client, reason: '' })
                    }
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upgrade to Net 30 Dialog */}
      <Dialog open={upgradeDialog.open} onOpenChange={(open) => !open && setUpgradeDialog({ ...upgradeDialog, open: false })}>
        <DialogContent className="bg-gray-800 text-white border-gray-700">
          <DialogHeader>
            <DialogTitle>Upgrade to Net 30 Payment Terms</DialogTitle>
            <DialogDescription className="text-gray-400">
              {upgradeDialog.client && (
                <>
                  <div className="mt-4 space-y-2">
                    <p><strong>Client:</strong> {upgradeDialog.client.company_name}</p>
                    <p><strong>Current Terms:</strong> Prepay</p>
                    <p><strong>Reliability Score:</strong>{' '}
                      <ReliabilityBadge score={upgradeDialog.client.payment_reliability_score} />
                    </p>
                    {upgradeDialog.client.payment_reliability_score < 60 && (
                      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mt-3">
                        <div className="flex gap-2 items-start">
                          <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                          <p className="text-yellow-400 text-sm">
                            This client has a low reliability score ({upgradeDialog.client.payment_reliability_score}%). Upgrade with caution.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium mb-2">Credit Limit (GBP)</label>
              <Input
                type="number"
                min={500}
                value={upgradeDialog.creditLimit}
                onChange={(e) =>
                  setUpgradeDialog({ ...upgradeDialog, creditLimit: Number(e.target.value) })
                }
                className="bg-gray-900/50 border-gray-700/50 text-white"
              />
              <p className="text-xs text-gray-400 mt-1">Minimum £500</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Reason for Upgrade</label>
              <Input
                type="text"
                value={upgradeDialog.reason}
                onChange={(e) => setUpgradeDialog({ ...upgradeDialog, reason: e.target.value })}
                placeholder="e.g., Established client with good payment history"
                className="bg-gray-900/50 border-gray-700/50 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUpgradeDialog({ open: false, client: null, creditLimit: 5000, reason: '' })}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpgrade}
              disabled={
                !upgradeDialog.reason ||
                upgradeDialog.creditLimit < 500 ||
                upgradeMutation.isPending
              }
              className="bg-purple-600 hover:bg-purple-700"
            >
              {upgradeMutation.isPending ? 'Upgrading...' : 'Confirm Upgrade'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Downgrade to Prepay Dialog */}
      <Dialog open={downgradeDialog.open} onOpenChange={(open) => !open && setDowngradeDialog({ ...downgradeDialog, open: false })}>
        <DialogContent className="bg-gray-800 text-white border-gray-700">
          <DialogHeader>
            <DialogTitle>Downgrade to Prepay</DialogTitle>
            <DialogDescription className="text-gray-400">
              {downgradeDialog.client && (
                <>
                  <div className="mt-4 space-y-2">
                    <p><strong>Client:</strong> {downgradeDialog.client.company_name}</p>
                    <p><strong>Current Credit Limit:</strong>{' '}
                      <CurrencyWithTooltip amount={downgradeDialog.client.credit_limit} />
                    </p>
                    <p><strong>Outstanding Balance:</strong>{' '}
                      <CurrencyWithTooltip amount={downgradeDialog.client.outstanding_balance} />
                    </p>
                    {downgradeDialog.client.outstanding_balance > 0 && (
                      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mt-3">
                        <div className="flex gap-2 items-start">
                          <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                          <p className="text-yellow-400 text-sm">
                            Outstanding balance of <CurrencyWithTooltip amount={downgradeDialog.client.outstanding_balance} className="text-yellow-400" /> will remain. Client must pay before booking again.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium mb-2">Reason for Downgrade</label>
              <Input
                type="text"
                value={downgradeDialog.reason}
                onChange={(e) => setDowngradeDialog({ ...downgradeDialog, reason: e.target.value })}
                placeholder="e.g., Multiple late payments, exceeded credit limit"
                className="bg-gray-900/50 border-gray-700/50 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDowngradeDialog({ open: false, client: null, reason: '' })}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDowngrade}
              disabled={!downgradeDialog.reason || downgradeMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {downgradeMutation.isPending ? 'Downgrading...' : 'Confirm Downgrade'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    yellow: 'from-yellow-500 to-yellow-600',
    red: 'from-red-500 to-red-600',
    purple: 'from-purple-500 to-purple-600',
    gray: 'from-gray-500 to-gray-600',
  };

  return (
    <div
      className={`group bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border transition-all duration-300 hover:shadow-2xl hover:scale-105 ${
        highlight
          ? 'border-yellow-500/50 ring-2 ring-yellow-500/20 shadow-lg shadow-yellow-500/10'
          : 'border-gray-700/50 hover:border-gray-600/50'
      }`}
    >
      <div className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">{label}</div>
      <div
        className={`text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-br ${colorClasses[color]} transition-transform duration-300 group-hover:scale-110`}
      >
        {value}
      </div>
    </div>
  );
}

/**
 * Reliability Badge Component
 */
function ReliabilityBadge({ score }: { score: number }) {
  let color = 'green';
  let label = 'Excellent';

  if (score < 60) {
    color = 'red';
    label = 'Poor';
  } else if (score < 80) {
    color = 'yellow';
    label = 'Good';
  }

  const colorClasses = {
    green: 'bg-green-500/20 text-green-400 border-green-500/30',
    yellow: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    red: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${colorClasses[color as keyof typeof colorClasses]}`}>
      {score}% {label}
    </span>
  );
}

/**
 * Client Row Component
 */
function ClientRow({
  client,
  onUpgrade,
  onDowngrade,
}: {
  client: ClientWithHistory;
  onUpgrade: () => void;
  onDowngrade: () => void;
}) {
  const [showActions, setShowActions] = useState(false);

  const successRate =
    client.total_bookings > 0
      ? ((client.successful_bookings / client.total_bookings) * 100).toFixed(0)
      : 0;

  const isAtRisk =
    client.late_payments > 2 ||
    (client.payment_terms === 'net_30' &&
      client.outstanding_balance > client.credit_limit * 0.8);

  return (
    <tr className="hover:bg-gray-700/30 transition-all duration-200">
      {/* Company */}
      <td className="px-6 py-4">
        <div>
          <div className="font-medium text-white flex items-center gap-2">
            {client.company_name}
            {isAtRisk && (
              <span title="At risk: late payments or high balance">
                <AlertTriangle className="w-4 h-4 text-yellow-400" />
              </span>
            )}
          </div>
          <div className="text-sm text-gray-400">{client.billing_postcode}</div>
          {client.vat_number && (
            <div className="text-xs text-gray-500">VAT: {client.vat_number}</div>
          )}
        </div>
      </td>

      {/* Contact */}
      <td className="px-6 py-4">
        <div className="text-sm">
          <div className="text-white font-medium">{client.contact_name}</div>
          <div className="text-gray-400">{client.contact_email}</div>
          <div className="text-gray-400">{client.contact_phone}</div>
        </div>
      </td>

      {/* Payment Terms */}
      <td className="px-6 py-4">
        {client.payment_terms === 'net_30' ? (
          <div>
            <span className="px-3 py-1 bg-purple-500/20 text-purple-400 text-sm rounded-full font-medium">
              Net 30
            </span>
            <div className="text-xs text-gray-400 mt-1">
              Limit: <CurrencyWithTooltip amount={client.credit_limit} className="text-xs text-gray-400" />
            </div>
          </div>
        ) : (
          <span className="px-3 py-1 bg-blue-500/20 text-blue-400 text-sm rounded-full font-medium">
            Prepay
          </span>
        )}
      </td>

      {/* Reliability */}
      <td className="px-6 py-4">
        <div>
          <ReliabilityBadge score={client.payment_reliability_score} />
          {client.late_payments > 0 && (
            <div className="text-xs text-red-400 mt-1">
              {client.late_payments} late payment{client.late_payments > 1 ? 's' : ''}
            </div>
          )}
        </div>
      </td>

      {/* Financials */}
      <td className="px-6 py-4">
        <div className="text-sm">
          {client.payment_terms === 'net_30' ? (
            <>
              <div className="text-white">
                Credit: <CurrencyWithTooltip amount={client.credit_limit} />
              </div>
              <div className={client.outstanding_balance > 0 ? 'text-yellow-400' : 'text-gray-400'}>
                Balance: <CurrencyWithTooltip amount={client.outstanding_balance} />
              </div>
            </>
          ) : (
            <div className="text-gray-400 text-xs">Pay on booking</div>
          )}
        </div>
      </td>

      {/* Bookings */}
      <td className="px-6 py-4">
        <div className="text-sm">
          <div className="text-white font-medium">{client.total_bookings} total</div>
          <div className="text-green-400 text-xs">{client.successful_bookings} completed</div>
          {client.cancelled_bookings > 0 && (
            <div className="text-red-400 text-xs">{client.cancelled_bookings} cancelled</div>
          )}
          <div className="text-gray-400 text-xs">{successRate}% success rate</div>
        </div>
      </td>

      {/* Status */}
      <td className="px-6 py-4">
        {client.status === 'active' && (
          <span className="px-3 py-1 bg-green-500/20 text-green-400 text-sm rounded-full font-medium">
            <CheckCircle className="w-3 h-3 inline mr-1" />
            Active
          </span>
        )}
        {client.status === 'suspended' && (
          <div>
            <span className="px-3 py-1 bg-red-500/20 text-red-400 text-sm rounded-full font-medium">
              <AlertTriangle className="w-3 h-3 inline mr-1" />
              Suspended
            </span>
            {client.suspended_reason && (
              <div className="text-xs text-red-400 mt-1">{client.suspended_reason}</div>
            )}
          </div>
        )}
        {client.status === 'closed' && (
          <span className="px-3 py-1 bg-gray-500/20 text-gray-400 text-sm rounded-full font-medium">
            <XCircle className="w-3 h-3 inline mr-1" />
            Closed
          </span>
        )}
      </td>

      {/* Stripe */}
      <td className="px-6 py-4">
        {client.stripe_customer_id ? (
          <div>
            <span className="px-3 py-1 bg-green-500/20 text-green-400 text-sm rounded-full font-medium">
              <CheckCircle className="w-3 h-3 inline mr-1" />
              Connected
            </span>
            {client.default_payment_method_id && (
              <div className="text-xs text-gray-400 mt-1">Card on file</div>
            )}
          </div>
        ) : (
          <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 text-sm rounded-full font-medium">
            <Clock className="w-3 h-3 inline mr-1" />
            Not setup
          </span>
        )}
      </td>

      {/* Actions */}
      <td className="px-6 py-4 text-right relative">
        <button
          onClick={() => setShowActions(!showActions)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <MoreVertical className="w-5 h-5" />
        </button>
        {showActions && (
          <div className="absolute right-6 top-12 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-10 min-w-[200px]">
            {client.payment_terms === 'prepay' && client.status === 'active' && (
              <button
                onClick={() => {
                  onUpgrade();
                  setShowActions(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-800 transition-colors flex items-center gap-2"
              >
                <TrendingUp className="w-4 h-4 text-purple-400" />
                Upgrade to Net 30
              </button>
            )}
            {client.payment_terms === 'net_30' && (
              <button
                onClick={() => {
                  onDowngrade();
                  setShowActions(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-800 transition-colors flex items-center gap-2"
              >
                <TrendingDown className="w-4 h-4 text-red-400" />
                Downgrade to Prepay
              </button>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}
