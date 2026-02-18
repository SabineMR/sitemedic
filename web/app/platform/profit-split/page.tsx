/**
 * Profit Split Dashboard — Platform Admin
 *
 * Shows combined profit from ASG medic bookings + SiteMedic subscriptions,
 * split 4 ways: Sabine / Kai / Operational / Reserve.
 * Each partner card shows source-labeled breakdown (ASG + SiteMedic amounts).
 */

'use client';

import { useState } from 'react';
import {
  PieChart,
  TrendingUp,
  Building2,
  Stethoscope,
  Monitor,
  ArrowDownRight,
  Users,
  CreditCard,
  Car,
  UserPlus,
  Banknote,
} from 'lucide-react';
import {
  useProfitSplit,
  type ProfitTimeRange,
} from '@/lib/queries/platform/profit-split';

const TIME_RANGE_OPTIONS: { value: ProfitTimeRange; label: string }[] = [
  { value: 'last_4_weeks', label: '4 Weeks' },
  { value: 'last_12_weeks', label: '12 Weeks' },
  { value: 'last_52_weeks', label: '52 Weeks' },
];

function formatGBP(amount: number): string {
  return `£${amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function ProfitSplitPage() {
  const [timeRange, setTimeRange] = useState<ProfitTimeRange>('last_12_weeks');
  const { data, isLoading, error } = useProfitSplit(timeRange);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white text-lg font-medium">Loading profit data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-900/30 border border-red-700/50 rounded-2xl p-6">
          <p className="text-red-300">Failed to load profit split data</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { asg, sitemedic, combined } = data;

  const partners: { name: string; key: 'sabine' | 'kai' | 'operational' | 'reserve'; color: string; bgColor: string }[] = [
    { name: 'Sabine', key: 'sabine', color: 'text-pink-400', bgColor: 'bg-pink-600/20' },
    { name: 'Kai', key: 'kai', color: 'text-blue-400', bgColor: 'bg-blue-600/20' },
    { name: 'Operational', key: 'operational', color: 'text-amber-400', bgColor: 'bg-amber-600/20' },
    { name: 'Reserve', key: 'reserve', color: 'text-emerald-400', bgColor: 'bg-emerald-600/20' },
  ];

  return (
    <div className="p-8 space-y-8">
      {/* Header + Time Range */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-purple-600/20 rounded-xl flex items-center justify-center">
              <PieChart className="w-6 h-6 text-purple-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">Profit Split</h1>
          </div>
          <p className="text-purple-300">
            Combined profit from ASG bookings &amp; SiteMedic subscriptions
          </p>
        </div>

        <div className="flex gap-2 bg-purple-800/30 p-1 rounded-xl border border-purple-700/50">
          {TIME_RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTimeRange(opt.value)}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                timeRange === opt.value
                  ? 'bg-purple-600 text-white'
                  : 'text-purple-300 hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Section A: Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryCard
          icon={<TrendingUp className="w-6 h-6 text-green-400" />}
          iconBg="bg-green-600/20"
          label="Total Net Profit"
          value={formatGBP(combined.netProfit)}
        />
        <SummaryCard
          icon={<Stethoscope className="w-6 h-6 text-purple-400" />}
          iconBg="bg-purple-600/20"
          label="ASG Net Profit"
          value={formatGBP(asg.netProfit)}
          sub={`${asg.bookingCount} bookings`}
        />
        <SummaryCard
          icon={<Monitor className="w-6 h-6 text-blue-400" />}
          iconBg="bg-blue-600/20"
          label="SiteMedic Net Profit"
          value={formatGBP(sitemedic.netProfit)}
          sub="Monthly subscriptions"
        />
        <SummaryCard
          icon={<Building2 className="w-6 h-6 text-amber-400" />}
          iconBg="bg-amber-600/20"
          label="Active Subscriptions"
          value={String(sitemedic.totalActiveSubscriptions)}
          sub={`${sitemedic.tierCounts.length} tier${sitemedic.tierCounts.length !== 1 ? 's' : ''}`}
        />
      </div>

      {/* Section B: Partner Cards (2x2) */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-purple-400" />
          4-Way Split
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {partners.map((p) => (
            <div
              key={p.key}
              className="bg-purple-800/30 backdrop-blur-sm border border-purple-700/50 rounded-2xl p-6 hover:border-purple-600/50 transition-all duration-200"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 ${p.bgColor} rounded-xl flex items-center justify-center`}>
                  <span className={`font-bold text-lg ${p.color}`}>
                    {p.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{p.name}</h3>
                  <p className="text-purple-400 text-sm">25% share</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-2xl font-bold text-white">
                    {formatGBP(combined.split[p.key])}
                  </p>
                  <p className="text-purple-400 text-xs">Total</p>
                </div>
              </div>

              <div className="space-y-2 border-t border-purple-700/50 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-purple-300 text-sm flex items-center gap-2">
                    <Stethoscope className="w-4 h-4" /> From ASG
                  </span>
                  <span className="text-white font-medium">
                    {formatGBP(asg.split[p.key])}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-purple-300 text-sm flex items-center gap-2">
                    <Monitor className="w-4 h-4" /> From SiteMedic
                  </span>
                  <span className="text-white font-medium">
                    {formatGBP(sitemedic.split[p.key])}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section C + D: Breakdowns side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ASG Breakdown */}
        <div className="bg-purple-800/30 backdrop-blur-sm border border-purple-700/50 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-purple-400" />
            ASG Booking Breakdown
          </h2>

          <div className="space-y-4">
            <BreakdownRow
              label="Gross Booking Revenue"
              value={formatGBP(asg.grossRevenue)}
              icon={<Banknote className="w-4 h-4" />}
              positive
            />
            <BreakdownRow
              label="Medic Pay"
              value={`-${formatGBP(asg.totalMedicPay)}`}
              icon={<ArrowDownRight className="w-4 h-4" />}
            />
            <BreakdownRow
              label="Referral Commissions"
              value={`-${formatGBP(asg.totalReferralCommissions)}`}
              icon={<UserPlus className="w-4 h-4" />}
            />
            <BreakdownRow
              label="Mileage Reimbursements"
              value={`-${formatGBP(asg.totalMileageReimbursements)}`}
              icon={<Car className="w-4 h-4" />}
            />

            <div className="border-t border-purple-700/50 pt-4">
              <div className="flex justify-between items-center">
                <span className="text-white font-bold">Net Profit</span>
                <span className={`text-lg font-bold ${asg.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatGBP(asg.netProfit)}
                </span>
              </div>
            </div>

            <div className="border-t border-purple-700/50 pt-4 space-y-2">
              <p className="text-purple-400 text-xs font-medium uppercase tracking-wider">4-Way Split</p>
              {partners.map((p) => (
                <div key={p.key} className="flex justify-between items-center">
                  <span className={`text-sm ${p.color}`}>{p.name}</span>
                  <span className="text-white text-sm font-medium">{formatGBP(asg.split[p.key])}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* SiteMedic Breakdown */}
        <div className="bg-purple-800/30 backdrop-blur-sm border border-purple-700/50 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Monitor className="w-5 h-5 text-blue-400" />
            SiteMedic Subscription Breakdown
          </h2>

          <div className="space-y-4">
            {/* Tier rows */}
            {sitemedic.tierCounts.length > 0 ? (
              sitemedic.tierCounts.map((tc) => (
                <div
                  key={tc.tier}
                  className="flex justify-between items-center bg-purple-900/30 rounded-xl px-4 py-3"
                >
                  <div>
                    <span className="text-white font-medium">{capitalize(tc.tier)}</span>
                    <span className="text-purple-400 text-sm ml-2">
                      {tc.count} org{tc.count !== 1 ? 's' : ''} x {formatGBP(tc.monthlyPrice)}/mo
                    </span>
                  </div>
                  <span className="text-green-400 font-medium">{formatGBP(tc.revenue)}</span>
                </div>
              ))
            ) : (
              <div className="text-purple-400 text-sm text-center py-4">
                No active subscriptions
              </div>
            )}

            <BreakdownRow
              label="Gross Subscription Revenue"
              value={formatGBP(sitemedic.grossRevenue)}
              icon={<Banknote className="w-4 h-4" />}
              positive
            />
            <BreakdownRow
              label="Stripe Fees (~2.9% + £0.30)"
              value={`-${formatGBP(sitemedic.stripeFees)}`}
              icon={<CreditCard className="w-4 h-4" />}
            />

            <div className="border-t border-purple-700/50 pt-4">
              <div className="flex justify-between items-center">
                <span className="text-white font-bold">Net Profit</span>
                <span className={`text-lg font-bold ${sitemedic.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatGBP(sitemedic.netProfit)}
                </span>
              </div>
            </div>

            <div className="border-t border-purple-700/50 pt-4 space-y-2">
              <p className="text-purple-400 text-xs font-medium uppercase tracking-wider">4-Way Split</p>
              {partners.map((p) => (
                <div key={p.key} className="flex justify-between items-center">
                  <span className={`text-sm ${p.color}`}>{p.name}</span>
                  <span className="text-white text-sm font-medium">{formatGBP(sitemedic.split[p.key])}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Info note about subscription timing */}
      <div className="bg-purple-900/20 border border-purple-700/30 rounded-xl px-4 py-3 text-purple-400 text-sm">
        Note: ASG booking data is filtered by the selected time range. SiteMedic subscription
        data shows the current monthly snapshot (not time-filtered).
      </div>
    </div>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function SummaryCard({
  icon,
  iconBg,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="bg-purple-800/30 backdrop-blur-sm border border-purple-700/50 rounded-2xl p-6">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 ${iconBg} rounded-xl flex items-center justify-center`}>
          {icon}
        </div>
        <div>
          <p className="text-purple-300 text-sm font-medium">{label}</p>
          <p className="text-3xl font-bold text-white">{value}</p>
          {sub && <p className="text-purple-400 text-xs mt-0.5">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

function BreakdownRow({
  label,
  value,
  icon,
  positive,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  positive?: boolean;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-purple-300 text-sm flex items-center gap-2">
        {icon} {label}
      </span>
      <span className={`font-medium ${positive ? 'text-green-400' : 'text-red-300'}`}>
        {value}
      </span>
    </div>
  );
}
