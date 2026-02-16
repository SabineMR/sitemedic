'use client';

/**
 * Payment Terms Selector Component
 *
 * Displays payment term options with live GBP amount breakdown.
 * Filters available options based on client payment eligibility (prepay vs net_30).
 * Validates custom payment amounts sum to total.
 */

import { useState, useEffect } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  PaymentTerms,
  PaymentSchedule,
  PAYMENT_TERMS_OPTIONS,
  calculatePaymentSchedule,
  getPaymentTermsOptions,
  formatGBP,
} from '@/lib/contracts/payment-schedules';

interface PaymentTermsSelectProps {
  total: number;
  clientPaymentTerms: 'prepay' | 'net_30';
  onSelect: (terms: PaymentTerms, schedule: PaymentSchedule) => void;
  initialTerms?: PaymentTerms;
}

export function PaymentTermsSelect({
  total,
  clientPaymentTerms,
  onSelect,
  initialTerms = 'full_prepay',
}: PaymentTermsSelectProps) {
  const [selectedTerms, setSelectedTerms] = useState<PaymentTerms>(initialTerms);

  // Custom amounts state (only used when 'custom' selected)
  const [customUpfront, setCustomUpfront] = useState<number>(0);
  const [customCompletion, setCustomCompletion] = useState<number>(0);
  const [customNet30, setCustomNet30] = useState<number>(0);
  const [customError, setCustomError] = useState<string | null>(null);

  // Get available options based on client eligibility
  const availableOptions = getPaymentTermsOptions(clientPaymentTerms);

  // Calculate schedule for current selection
  const getSchedule = (): PaymentSchedule | null => {
    try {
      if (selectedTerms === 'custom') {
        return calculatePaymentSchedule(
          total,
          'custom',
          customUpfront,
          customCompletion,
          customNet30
        );
      } else {
        return calculatePaymentSchedule(total, selectedTerms);
      }
    } catch (error) {
      if (selectedTerms === 'custom') {
        setCustomError(error instanceof Error ? error.message : 'Invalid custom amounts');
      }
      return null;
    }
  };

  // Notify parent when selection or custom amounts change
  useEffect(() => {
    const schedule = getSchedule();
    if (schedule) {
      setCustomError(null);
      onSelect(selectedTerms, schedule);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTerms, customUpfront, customCompletion, customNet30, total]);

  const handleTermsChange = (value: string) => {
    setSelectedTerms(value as PaymentTerms);
    setCustomError(null);

    // Initialize custom amounts when selecting custom
    if (value === 'custom') {
      setCustomUpfront(0);
      setCustomCompletion(0);
      setCustomNet30(0);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-base font-semibold">Payment Terms</Label>
        <p className="text-sm text-muted-foreground mt-1">
          Select payment schedule for this contract
        </p>
      </div>

      <RadioGroup value={selectedTerms} onValueChange={handleTermsChange}>
        {availableOptions.map((option) => {
          const schedule = option.value !== 'custom'
            ? calculatePaymentSchedule(total, option.value)
            : null;

          return (
            <div
              key={option.value}
              className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
            >
              <RadioGroupItem value={option.value} id={option.value} className="mt-1" />
              <div className="flex-1 space-y-2">
                <Label
                  htmlFor={option.value}
                  className="font-medium cursor-pointer text-base"
                >
                  {option.label}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {option.description}
                </p>

                {schedule && (
                  <div className="text-sm space-y-1 pt-1 border-t">
                    {schedule.upfrontAmount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Upon signing:</span>
                        <span className="font-medium">{formatGBP(schedule.upfrontAmount)}</span>
                      </div>
                    )}
                    {schedule.completionAmount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Upon completion:</span>
                        <span className="font-medium">{formatGBP(schedule.completionAmount)}</span>
                      </div>
                    )}
                    {schedule.net30Amount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Net 30 days:</span>
                        <span className="font-medium">{formatGBP(schedule.net30Amount)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </RadioGroup>

      {/* Custom amounts input (only shown when custom selected) */}
      {selectedTerms === 'custom' && (
        <div className="border rounded-lg p-4 space-y-4 bg-accent/20">
          <p className="text-sm font-medium">Custom Payment Amounts</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="custom-upfront" className="text-sm">
                Upfront Amount (£)
              </Label>
              <Input
                id="custom-upfront"
                type="number"
                step="0.01"
                min="0"
                value={customUpfront}
                onChange={(e) => setCustomUpfront(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom-completion" className="text-sm">
                Upon Completion (£)
              </Label>
              <Input
                id="custom-completion"
                type="number"
                step="0.01"
                min="0"
                value={customCompletion}
                onChange={(e) => setCustomCompletion(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom-net30" className="text-sm">
                Net 30 Days (£)
              </Label>
              <Input
                id="custom-net30"
                type="number"
                step="0.01"
                min="0"
                value={customNet30}
                onChange={(e) => setCustomNet30(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="flex justify-between items-center text-sm pt-2 border-t">
            <span className="text-muted-foreground">Total custom amounts:</span>
            <span className="font-semibold">
              {formatGBP(customUpfront + customCompletion + customNet30)}
            </span>
          </div>

          <div className="flex justify-between items-center text-sm font-medium">
            <span>Expected total:</span>
            <span>{formatGBP(total)}</span>
          </div>

          {customError && (
            <Alert variant="destructive">
              <AlertDescription>{customError}</AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Info box for prepay clients */}
      {clientPaymentTerms === 'prepay' && (
        <Alert className="bg-amber-50 border-amber-200">
          <AlertDescription className="text-amber-800">
            This client is on prepay terms. Net 30 options require upgrading to Net 30 status.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
