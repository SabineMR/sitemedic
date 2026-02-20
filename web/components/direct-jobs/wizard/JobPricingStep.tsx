'use client';

/**
 * Step 5: Pricing
 * Phase 34.1: Self-Procured Jobs — Plan 02
 *
 * Collects the agreed price, deposit percentage, and pricing notes.
 * Unique to direct jobs — marketplace events use budget ranges instead.
 */

import { useDirectJobStore } from '@/stores/useDirectJobStore';

interface Props {
  errors?: Record<string, string[] | undefined>;
}

export default function JobPricingStep({ errors }: Props) {
  const store = useDirectJobStore();

  const depositAmount = store.agreed_price
    ? (store.agreed_price * store.deposit_percent / 100).toFixed(2)
    : '0.00';

  const remainderAmount = store.agreed_price
    ? (store.agreed_price - (store.agreed_price * store.deposit_percent / 100)).toFixed(2)
    : '0.00';

  return (
    <div className="space-y-6">
      {/* Agreed Price */}
      <div>
        <label htmlFor="agreed_price" className="block text-sm font-medium text-gray-700 mb-1">
          Agreed Price (GBP) <span className="text-red-500">*</span>
        </label>
        <div className="relative max-w-xs">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
            &pound;
          </span>
          <input
            id="agreed_price"
            type="number"
            value={store.agreed_price ?? ''}
            onChange={(e) => store.updateField('agreed_price', e.target.value ? parseFloat(e.target.value) : null)}
            className="w-full rounded-md border border-gray-300 pl-7 pr-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="e.g. 2500.00"
            min={1}
            step="0.01"
          />
        </div>
        {errors?.agreed_price && (
          <p className="mt-1 text-sm text-red-600">{errors.agreed_price[0]}</p>
        )}
        <p className="mt-1 text-xs text-gray-400">
          The total price agreed with your client for this job
        </p>
      </div>

      {/* Deposit Percentage */}
      <div>
        <label htmlFor="deposit_percent" className="block text-sm font-medium text-gray-700 mb-1">
          Deposit Percentage
        </label>
        <div className="flex items-center gap-3 max-w-xs">
          <input
            id="deposit_percent"
            type="number"
            value={store.deposit_percent}
            onChange={(e) => store.updateField('deposit_percent', Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
            className="w-24 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            min={0}
            max={100}
          />
          <span className="text-sm text-gray-500">%</span>
        </div>
        {errors?.deposit_percent && (
          <p className="mt-1 text-sm text-red-600">{errors.deposit_percent[0]}</p>
        )}
      </div>

      {/* Breakdown */}
      {store.agreed_price && store.agreed_price > 0 && (
        <div className="rounded-md bg-blue-50 border border-blue-200 p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Payment Breakdown</h4>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-blue-700">Agreed Price</dt>
              <dd className="font-medium text-blue-900">&pound;{store.agreed_price.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-blue-700">Deposit ({store.deposit_percent}%)</dt>
              <dd className="text-blue-900">&pound;{parseFloat(depositAmount).toLocaleString('en-GB', { minimumFractionDigits: 2 })}</dd>
            </div>
            <div className="flex justify-between border-t border-blue-200 pt-1">
              <dt className="text-blue-700">Remainder</dt>
              <dd className="text-blue-900">&pound;{parseFloat(remainderAmount).toLocaleString('en-GB', { minimumFractionDigits: 2 })}</dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-blue-600">
            Direct jobs have 0% platform commission -- you keep the full amount.
          </p>
        </div>
      )}

      {/* Notes */}
      <div>
        <label htmlFor="pricing_notes" className="block text-sm font-medium text-gray-700 mb-1">
          Pricing Notes
        </label>
        <textarea
          id="pricing_notes"
          value={store.notes}
          onChange={(e) => store.updateField('notes', e.target.value)}
          rows={3}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          placeholder="Any notes about payment terms, invoicing, etc."
        />
      </div>
    </div>
  );
}
