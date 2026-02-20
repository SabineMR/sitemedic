/**
 * Payment Breakdown Section
 * Phase 35: Award Flow & Payment — Plan 02
 *
 * Displays a transparent breakdown of the payment structure:
 * total, subtotal, VAT, deposit due now, and remainder due after event.
 */

interface PaymentBreakdownSectionProps {
  totalPrice: number;
  depositPercent: number;
  depositAmount: number;
  remainderAmount: number;
  subtotal: number;
  vatAmount: number;
}

function formatGBP(amount: number): string {
  return `£${amount.toFixed(2)}`;
}

export default function PaymentBreakdownSection({
  totalPrice,
  depositPercent,
  depositAmount,
  remainderAmount,
  subtotal,
  vatAmount,
}: PaymentBreakdownSectionProps) {
  return (
    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">Subtotal (ex. VAT)</span>
        <span>{formatGBP(subtotal)}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">VAT (20%)</span>
        <span>{formatGBP(vatAmount)}</span>
      </div>
      <div className="flex justify-between font-medium">
        <span>Quote Total (inc. VAT)</span>
        <span>{formatGBP(totalPrice)}</span>
      </div>

      <div className="border-t border-gray-200 my-2" />

      <div className="flex justify-between font-semibold text-primary">
        <span>Deposit Due Now ({depositPercent}%)</span>
        <span>{formatGBP(depositAmount)}</span>
      </div>
      <div className="flex justify-between text-sm text-gray-500">
        <span>Remainder Due After Event</span>
        <span>{formatGBP(remainderAmount)}</span>
      </div>
      <p className="text-xs text-gray-400 mt-1">
        Remainder charged 14 days after event completion
      </p>
    </div>
  );
}
