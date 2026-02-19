'use client';

/**
 * Payout Summary Component
 * Phase 06.5-02: Admin dashboard for weekly payout management
 *
 * Displays:
 * - Weekly payout summary (total medics, amount, platform fees)
 * - Medic breakdown with hours, payout, Stripe status
 * - Issues: missing Stripe accounts, incomplete onboarding
 * - Manual payout trigger with dry-run preview
 */

import { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface TimesheetDetail {
  id: string;
  site_name: string;
  shift_date: string;
  hours: number;
  payout: number;
}

interface MedicPayout {
  medic_id: string;
  medic_name: string;
  email: string;
  timesheet_count: number;
  total_hours: number;
  total_payout: number;
  stripe_account_id: string | null;
  stripe_onboarding_complete: boolean;
  timesheets: TimesheetDetail[];
}

interface PayoutSummaryData {
  medics: MedicPayout[];
  totals: {
    medicCount: number;
    totalPayouts: number;
    totalPlatformFees: number;
    totalRevenue: number;
  };
}

export default function PayoutSummary() {
  const [data, setData] = useState<PayoutSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedMedics, setSelectedMedics] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<any>(null);
  const [confirmingPayout, setConfirmingPayout] = useState(false);

  useEffect(() => {
    fetchWeeklySummary();
  }, []);

  async function fetchWeeklySummary() {
    try {
      setLoading(true);
      const response = await fetch('/api/payouts/calculate-weekly');
      if (!response.ok) {
        throw new Error('Failed to fetch payout summary');
      }
      const data = await response.json();
      setData(data);

      // Pre-select all medics with valid Stripe accounts
      const validMedics = new Set<string>(
        data.medics
          .filter(
            (m: MedicPayout) => m.stripe_account_id && m.stripe_onboarding_complete
          )
          .map((m: MedicPayout) => m.medic_id)
      );
      setSelectedMedics(validMedics);
    } catch (error) {
      console.error('Error fetching weekly summary:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleProcessPayouts(dryRun: boolean = false) {
    if (selectedMedics.size === 0) {
      toast.error('No medics selected');
      return;
    }

    if (!dryRun && !confirmingPayout) {
      setConfirmingPayout(true);
      return;
    }
    setConfirmingPayout(false);

    try {
      setProcessing(true);
      setResult(null);

      // Collect all timesheet IDs from selected medics
      const timesheetIds: string[] = [];
      data?.medics.forEach((medic) => {
        if (selectedMedics.has(medic.medic_id)) {
          medic.timesheets.forEach((t) => timesheetIds.push(t.id));
        }
      });

      const response = await fetch('/api/payouts/process-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timesheetIds, dryRun }),
      });

      const result = await response.json();
      setResult(result);

      if (!dryRun && response.ok) {
        // Refresh data after successful processing
        setTimeout(fetchWeeklySummary, 1000);
      }
    } catch (error: unknown) {
      console.error('Error processing payouts:', error);
      setResult({ error: error instanceof Error ? error.message : 'An unexpected error occurred' });
    } finally {
      setProcessing(false);
    }
  }

  function toggleMedicSelection(medicId: string) {
    const newSelection = new Set(selectedMedics);
    if (newSelection.has(medicId)) {
      newSelection.delete(medicId);
    } else {
      newSelection.add(medicId);
    }
    setSelectedMedics(newSelection);
  }

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse">Loading payout summary...</div>
      </div>
    );
  }

  if (!data || data.medics.length === 0) {
    return (
      <div className="p-4">
        <h2 className="text-xl font-bold mb-4">Weekly Payout Summary</h2>
        <p className="text-gray-600">No admin-approved timesheets ready for payout.</p>
      </div>
    );
  }

  const medicsWithIssues = data.medics.filter(
    (m: MedicPayout) => !m.stripe_account_id || !m.stripe_onboarding_complete
  );

  const selectedTotal = data.medics
    .filter((m) => selectedMedics.has(m.medic_id))
    .reduce((sum, m) => sum + m.total_payout, 0);

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Weekly Payout Summary</h2>
        <p className="text-gray-600">Admin-approved timesheets from last 7 days</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Total Medics</div>
          <div className="text-2xl font-bold">{data.totals.medicCount}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Total Payouts</div>
          <div className="text-2xl font-bold">£{data.totals.totalPayouts.toFixed(2)}</div>
          <div className="text-xs text-gray-500">60% to medics</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Platform Fees</div>
          <div className="text-2xl font-bold">
            £{data.totals.totalPlatformFees.toFixed(2)}
          </div>
          <div className="text-xs text-gray-500">40% platform</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Total Revenue</div>
          <div className="text-2xl font-bold">£{data.totals.totalRevenue.toFixed(2)}</div>
        </div>
      </div>

      {/* Issues Alert */}
      {medicsWithIssues.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-900 mb-2">
            ⚠️ {medicsWithIssues.length} Medic(s) with Stripe Issues
          </h3>
          <ul className="space-y-1 text-sm">
            {medicsWithIssues.map((medic) => (
              <li key={medic.medic_id} className="text-yellow-800">
                <strong>{medic.medic_name}</strong>:{' '}
                {!medic.stripe_account_id
                  ? 'Missing Stripe account'
                  : 'Onboarding incomplete'}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => handleProcessPayouts(true)}
          disabled={processing || selectedMedics.size === 0}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded disabled:opacity-50"
        >
          {processing ? 'Processing...' : 'Preview Payouts (Dry Run)'}
        </button>
        <button
          onClick={() => handleProcessPayouts(false)}
          onBlur={() => setConfirmingPayout(false)}
          disabled={processing || selectedMedics.size === 0}
          className={`px-4 py-2 text-white rounded disabled:opacity-50 ${confirmingPayout ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
        >
          {processing ? 'Processing...' : confirmingPayout ? `Confirm — Process ${selectedMedics.size} Payouts?` : `Process ${selectedMedics.size} Payouts`}
        </button>
        <div className="flex-1 text-right self-center">
          <span className="text-sm text-gray-600">
            Selected: £{selectedTotal.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Result Display */}
      {result && (
        <div
          className={`p-4 rounded-lg ${
            result.error
              ? 'bg-red-50 border border-red-200'
              : 'bg-green-50 border border-green-200'
          }`}
        >
          {result.error ? (
            <div>
              <h3 className="font-semibold text-red-900 mb-2">Error</h3>
              <p className="text-red-800">{result.error}</p>
              {result.validationErrors && (
                <ul className="mt-2 text-sm space-y-1">
                  {result.validationErrors.map((err: string, i: number) => (
                    <li key={i} className="text-red-700">
                      • {err}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : result.dryRun ? (
            <div>
              <h3 className="font-semibold text-green-900 mb-2">Dry Run Success</h3>
              <p className="text-green-800">
                ✅ Validated {result.timesheetsValidated} timesheets
              </p>
              <p className="text-green-800">
                Total payout: £{result.totalPayout.toFixed(2)}
              </p>
              <p className="text-sm text-green-700 mt-2">{result.message}</p>
            </div>
          ) : (
            <div>
              <h3 className="font-semibold text-green-900 mb-2">Payout Complete</h3>
              <p className="text-green-800">
                ✅ Successful: {result.success} / {result.success + result.failed}
              </p>
              {result.failed > 0 && (
                <div className="mt-2">
                  <p className="text-red-800">❌ Failed: {result.failed}</p>
                  <ul className="text-sm space-y-1 mt-1">
                    {result.errors.map((err: any, i: number) => (
                      <li key={i} className="text-red-700">
                        • Timesheet {err.timesheetId}: {err.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Medic Breakdown Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                <input
                  type="checkbox"
                  checked={selectedMedics.size === data.medics.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedMedics(new Set(data.medics.map((m) => m.medic_id)));
                    } else {
                      setSelectedMedics(new Set());
                    }
                  }}
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Medic
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Timesheets
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Hours
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Payout
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Stripe Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.medics.map((medic) => (
              <tr key={medic.medic_id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedMedics.has(medic.medic_id)}
                    onChange={() => toggleMedicSelection(medic.medic_id)}
                    disabled={
                      !medic.stripe_account_id || !medic.stripe_onboarding_complete
                    }
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium">{medic.medic_name}</div>
                  <div className="text-xs text-gray-500">{medic.email}</div>
                </td>
                <td className="px-4 py-3 text-sm">{medic.timesheet_count}</td>
                <td className="px-4 py-3 text-sm">{medic.total_hours.toFixed(2)}</td>
                <td className="px-4 py-3 text-sm font-medium">
                  £{medic.total_payout.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-sm">
                  {medic.stripe_account_id && medic.stripe_onboarding_complete ? (
                    <span className="text-green-600">✅ Ready</span>
                  ) : !medic.stripe_account_id ? (
                    <span className="text-red-600">❌ No account</span>
                  ) : (
                    <span className="text-yellow-600">⚠️ Incomplete</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
