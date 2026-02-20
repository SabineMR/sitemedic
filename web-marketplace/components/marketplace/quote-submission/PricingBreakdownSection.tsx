/**
 * Pricing Breakdown Section
 * Phase 34: Quote Submission & Comparison
 *
 * Section for the pricing portion of the quote form:
 * - 4 fixed categories: Staff Cost, Equipment Cost, Transport Cost, Consumables Cost
 * - Dynamic custom line items (add/remove buttons)
 * - Running total at bottom
 * - Displays minimum rate guidelines per qualification level
 */

'use client';

import { useState } from 'react';
import { useQuoteFormStore } from '@/stores/useQuoteFormStore';
import { MINIMUM_RATES_PER_HOUR, getMinimumRateForRole } from '@/lib/marketplace/minimum-rates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Trash2, Plus, Info } from 'lucide-react';

interface PricingBreakdownSectionProps {
  errors: Record<string, string>;
}

export default function PricingBreakdownSection({ errors }: PricingBreakdownSectionProps) {
  const store = useQuoteFormStore();
  const [newLineItemLabel, setNewLineItemLabel] = useState('');
  const [newLineItemQuantity, setNewLineItemQuantity] = useState(1);
  const [newLineItemUnitPrice, setNewLineItemUnitPrice] = useState(0);

  // =========================================================================
  // Helpers
  // =========================================================================

  const calculateTotal = () => {
    const fixedTotal =
      store.staffCost +
      store.equipmentCost +
      store.transportCost +
      store.consumablesCost;

    const customTotal = store.customLineItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );

    return fixedTotal + customTotal;
  };

  const handleAddCustomLineItem = () => {
    if (!newLineItemLabel.trim()) return;

    store.addCustomLineItem({
      label: newLineItemLabel,
      quantity: newLineItemQuantity,
      unitPrice: newLineItemUnitPrice,
    });

    setNewLineItemLabel('');
    setNewLineItemQuantity(1);
    setNewLineItemUnitPrice(0);
  };

  const totalPrice = calculateTotal();

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <div className="border rounded-lg p-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Itemised Pricing</h2>
        <p className="text-sm text-gray-600">
          Break down your costs by category. You can also add custom line items.
        </p>
      </div>

      {/* Minimum Rates Info */}
      <Alert variant="default" className="border-blue-200 bg-blue-50">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-sm text-blue-900">
          <div className="font-semibold mb-1">Minimum Guideline Rates (per hour):</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {Object.entries(MINIMUM_RATES_PER_HOUR).map(([role, rate]) => (
              <div key={role}>
                <span className="capitalize">{role}:</span> £{rate}/hr
              </div>
            ))}
          </div>
        </AlertDescription>
      </Alert>

      {/* Fixed Categories */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { key: 'staffCost', label: 'Staff Cost', value: store.staffCost },
          { key: 'equipmentCost', label: 'Equipment Cost', value: store.equipmentCost },
          { key: 'transportCost', label: 'Transport Cost', value: store.transportCost },
          { key: 'consumablesCost', label: 'Consumables Cost', value: store.consumablesCost },
        ].map(({ key, label, value }) => (
          <div key={key}>
            <Label htmlFor={key} className="text-sm">
              {label}
            </Label>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-gray-500">£</span>
              <Input
                id={key}
                type="number"
                step="0.01"
                value={value}
                onChange={(e) => {
                  const categoryKey = key.replace('Cost', '') as any;
                  store.updatePricing({
                    [key]: parseFloat(e.target.value) || 0,
                  });
                }}
                className="flex-1"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Custom Line Items */}
      <div>
        <h3 className="font-semibold text-sm mb-3">Custom Line Items</h3>

        {/* Existing Line Items */}
        <div className="space-y-2 mb-4">
          {store.customLineItems.map((item) => (
            <div key={item.id} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <div className="font-sm font-medium">{item.label}</div>
                <div className="text-xs text-gray-600">
                  {item.quantity} × £{item.unitPrice.toFixed(2)} = £{(item.quantity * item.unitPrice).toFixed(2)}
                  {item.notes && <div className="text-xs text-gray-500 mt-1">{item.notes}</div>}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => store.removeCustomLineItem(item.id)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        {/* Add New Line Item */}
        <div className="border-t pt-3 space-y-3">
          <div>
            <Label htmlFor="lineItemLabel" className="text-sm">
              Item Description
            </Label>
            <Input
              id="lineItemLabel"
              type="text"
              placeholder="e.g., Specialist vehicle, Overnight accommodation"
              value={newLineItemLabel}
              onChange={(e) => setNewLineItemLabel(e.target.value)}
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label htmlFor="lineItemQuantity" className="text-sm">
                Qty
              </Label>
              <Input
                id="lineItemQuantity"
                type="number"
                min="1"
                value={newLineItemQuantity}
                onChange={(e) => setNewLineItemQuantity(parseInt(e.target.value) || 1)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="lineItemUnitPrice" className="text-sm">
                Unit Price (£)
              </Label>
              <Input
                id="lineItemUnitPrice"
                type="number"
                step="0.01"
                value={newLineItemUnitPrice}
                onChange={(e) => setNewLineItemUnitPrice(parseFloat(e.target.value) || 0)}
                className="mt-1"
              />
            </div>

            <div className="flex items-end">
              <Button
                type="button"
                onClick={handleAddCustomLineItem}
                disabled={!newLineItemLabel.trim()}
                size="sm"
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Running Total */}
      <div className="border-t pt-4 bg-gray-50 p-3 rounded-lg">
        <div className="flex justify-between items-center text-lg font-semibold">
          <span>Total Quote Price:</span>
          <span className="text-2xl text-blue-600">£{totalPrice.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
