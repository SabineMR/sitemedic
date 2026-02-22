'use client';

import { AlertTriangle, ShieldAlert } from 'lucide-react';
import type { IntegrityEventResponse } from '@/lib/queries/marketplace/integrity';

const BAND_STYLES: Record<string, string> = {
  low: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  high: 'bg-red-50 text-red-700 border-red-200',
};

export function IntegrityRiskCard({ integrity }: { integrity: IntegrityEventResponse }) {
  const score = integrity.score;

  return (
    <section className="border rounded-lg p-5">
      <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <ShieldAlert className="h-5 w-5 text-gray-500" />
        Integrity Risk
      </h2>

      {score ? (
        <>
          <div className="flex items-center gap-3 mb-3">
            <span
              className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${BAND_STYLES[score.risk_band] || BAND_STYLES.low}`}
            >
              {score.risk_band.toUpperCase()} RISK
            </span>
            <span className="text-sm text-gray-600">Score: {score.score}</span>
            <span className="text-sm text-gray-500">Signals: {score.contributing_signal_count}</span>
          </div>

          {integrity.signals.length > 0 && (
            <ul className="space-y-2">
              {integrity.signals.slice(0, 5).map((signal) => (
                <li key={signal.id} className="rounded-md bg-gray-50 border border-gray-200 px-3 py-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{signal.signal_type}</span>
                    <span className="text-xs text-gray-500">
                      w{signal.weight} • c{signal.confidence.toFixed(2)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          No integrity risk signals recorded for this event yet.
        </div>
      )}
    </section>
  );
}
