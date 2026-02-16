/**
 * Cash Flow Warning Banner
 *
 * Displays critical warning when cash flow gap exceeds safe threshold.
 * Non-dismissible (financial warnings must persist until resolved).
 */

'use client';

import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { CashFlowWarning as CashFlowWarningType } from '@/lib/queries/admin/revenue';

interface CashFlowWarningProps {
  warning: CashFlowWarningType | null;
}

export function CashFlowWarning({ warning }: CashFlowWarningProps) {
  if (!warning) {
    return null;
  }

  return (
    <Alert variant="destructive" className="border-red-500/50 bg-red-950/50">
      <AlertTriangle className="h-5 w-5" />
      <AlertTitle className="text-lg font-semibold">{warning.title}</AlertTitle>
      <AlertDescription className="mt-2 text-sm">
        {warning.message}
      </AlertDescription>
    </Alert>
  );
}
