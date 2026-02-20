/**
 * EditQuoteDialog — Dialog for Editing a Submitted Quote In Place
 * Phase 34: Quote Submission & Comparison — Plan 03
 *
 * Opens as a modal with the same form structure as QuoteSubmissionForm:
 * - Pricing breakdown (4 fixed categories + custom line items)
 * - Staffing plan (named medics or headcount + qualifications)
 * - Cover letter
 * - Availability confirmation
 *
 * Uses LOCAL useState (not Zustand store) to avoid state conflicts with
 * the create flow. Initialized from existing quote data.
 *
 * On save: PATCH /api/marketplace/quotes/[id]/update
 * Validates with quoteSubmissionSchema and minimum rates before submit.
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Trash2, Plus, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { quoteSubmissionSchema } from '@/lib/marketplace/quote-schemas';
import { validateAgainstMinimumRates, MINIMUM_RATES_PER_HOUR } from '@/lib/marketplace/minimum-rates';
import { STAFFING_ROLE_LABELS } from '@/lib/marketplace/event-types';
import type { StaffingRole } from '@/lib/marketplace/event-types';
import type { QuoteLineItem, StaffingPlanItem, HeadcountPlan, StaffingPlanType } from '@/lib/marketplace/quote-types';
import type { MyQuoteCardData } from './MyQuoteCard';

// =============================================================================
// Types
// =============================================================================

interface EditQuoteDialogProps {
  quote: MyQuoteCardData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  eventDurationHours?: number;
}

// =============================================================================
// Component
// =============================================================================

export default function EditQuoteDialog({
  quote,
  open,
  onOpenChange,
  onSaved,
  eventDurationHours = 8,
}: EditQuoteDialogProps) {
  // ---------------------------------------------------------------------------
  // Local form state (not Zustand, to avoid conflicts with create flow)
  // ---------------------------------------------------------------------------

  const [staffCost, setStaffCost] = useState(0);
  const [equipmentCost, setEquipmentCost] = useState(0);
  const [transportCost, setTransportCost] = useState(0);
  const [consumablesCost, setConsumablesCost] = useState(0);
  const [customLineItems, setCustomLineItems] = useState<QuoteLineItem[]>([]);
  const [staffingPlanType, setStaffingPlanType] = useState<StaffingPlanType>('headcount_and_quals');
  const [namedMedics, setNamedMedics] = useState<StaffingPlanItem[]>([]);
  const [headcountPlans, setHeadcountPlans] = useState<HeadcountPlan[]>([]);
  const [coverLetter, setCoverLetter] = useState('');
  const [availabilityConfirmed, setAvailabilityConfirmed] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rateViolations, setRateViolations] = useState<any[]>([]);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // New line item fields
  const [newLineLabel, setNewLineLabel] = useState('');
  const [newLineQty, setNewLineQty] = useState(1);
  const [newLinePrice, setNewLinePrice] = useState(0);

  // New medic fields
  const [newMedicName, setNewMedicName] = useState('');
  const [newMedicQual, setNewMedicQual] = useState<StaffingRole>('paramedic');

  // New headcount fields
  const [newHcRole, setNewHcRole] = useState<StaffingRole>('paramedic');
  const [newHcQty, setNewHcQty] = useState(1);

  // ---------------------------------------------------------------------------
  // Initialize from quote data when dialog opens
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (quote && open) {
      const pb = quote.pricing_breakdown;
      setStaffCost(pb?.staff_cost ?? pb?.staffCost ?? 0);
      setEquipmentCost(pb?.equipment_cost ?? pb?.equipmentCost ?? 0);
      setTransportCost(pb?.transport_cost ?? pb?.transportCost ?? 0);
      setConsumablesCost(pb?.consumables_cost ?? pb?.consumablesCost ?? 0);
      setCustomLineItems(pb?.custom_line_items ?? pb?.customLineItems ?? []);

      const sp = quote.staffing_plan;
      setStaffingPlanType(sp?.type ?? 'headcount_and_quals');
      setNamedMedics(sp?.named_medics ?? []);
      setHeadcountPlans(sp?.headcount_plans ?? []);

      setCoverLetter(quote.cover_letter ?? '');
      setAvailabilityConfirmed(quote.availability_confirmed ?? true);
      setRateViolations([]);
      setValidationErrors({});
    }
  }, [quote, open]);

  // ---------------------------------------------------------------------------
  // Calculated total
  // ---------------------------------------------------------------------------

  const fixedTotal = staffCost + equipmentCost + transportCost + consumablesCost;
  const customTotal = customLineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const totalPrice = fixedTotal + customTotal;

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleAddCustomLine = () => {
    if (!newLineLabel.trim()) return;
    setCustomLineItems([
      ...customLineItems,
      { id: crypto.randomUUID(), label: newLineLabel, quantity: newLineQty, unitPrice: newLinePrice },
    ]);
    setNewLineLabel('');
    setNewLineQty(1);
    setNewLinePrice(0);
  };

  const handleRemoveCustomLine = (lineId: string) => {
    setCustomLineItems(customLineItems.filter((item) => item.id !== lineId));
  };

  const handleAddNamedMedic = () => {
    if (!newMedicName.trim()) return;
    setNamedMedics([
      ...namedMedics,
      { medic_id: crypto.randomUUID(), name: newMedicName, qualification: newMedicQual },
    ]);
    setNewMedicName('');
    setNewMedicQual('paramedic');
  };

  const handleRemoveNamedMedic = (medicId: string) => {
    setNamedMedics(namedMedics.filter((m) => m.medic_id !== medicId));
  };

  const handleAddHeadcount = () => {
    const existing = headcountPlans.find((p) => p.role === newHcRole);
    if (existing) {
      setHeadcountPlans(
        headcountPlans.map((p) =>
          p.role === newHcRole ? { ...p, quantity: p.quantity + newHcQty } : p
        )
      );
    } else {
      setHeadcountPlans([...headcountPlans, { role: newHcRole, quantity: newHcQty }]);
    }
    setNewHcQty(1);
  };

  const handleRemoveHeadcount = (role: StaffingRole) => {
    setHeadcountPlans(headcountPlans.filter((p) => p.role !== role));
  };

  // ---------------------------------------------------------------------------
  // Save handler
  // ---------------------------------------------------------------------------

  const handleSave = async () => {
    if (!quote) return;

    setValidationErrors({});
    setRateViolations([]);

    // Build payload
    const payload = {
      event_id: quote.event_id,
      pricing_breakdown: {
        staffCost,
        equipmentCost,
        transportCost,
        consumablesCost,
        customLineItems,
      },
      staffing_plan: {
        type: staffingPlanType,
        ...(staffingPlanType === 'named_medics'
          ? { named_medics: namedMedics }
          : { headcount_plans: headcountPlans }),
      },
      cover_letter: coverLetter || null,
      availability_confirmed: availabilityConfirmed,
    };

    // 1. Schema validation
    const schemaResult = quoteSubmissionSchema.safeParse(payload);
    if (!schemaResult.success) {
      const newErrors: Record<string, string> = {};
      schemaResult.error.issues.forEach((err) => {
        newErrors[err.path.join('.')] = err.message;
      });
      setValidationErrors(newErrors);
      toast.error('Please fix the errors below');
      return;
    }

    // 2. Minimum rate validation
    const staffingForValidation =
      staffingPlanType === 'headcount_and_quals'
        ? headcountPlans
        : namedMedics.map((m) => ({ role: m.qualification, quantity: 1 }));

    const rateResult = validateAgainstMinimumRates(
      totalPrice,
      staffingForValidation as any,
      eventDurationHours
    );

    if (!rateResult.isValid) {
      setRateViolations(rateResult.violations);
      toast.error('Quote is below minimum rate guidelines');
      return;
    }

    // 3. Submit PATCH
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/marketplace/quotes/${quote.id}/update`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to update quote');
      }

      toast.success('Quote updated');
      onOpenChange(false);
      onSaved();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update quote';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (!quote) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Quote</DialogTitle>
          <DialogDescription>
            Update your quote for &quot;{quote.marketplace_events.event_name}&quot;. The client will see a &quot;Revised&quot; badge.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Rate Violations */}
          {rateViolations.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-semibold mb-1">Below minimum rate guidelines:</div>
                <ul className="list-disc list-inside text-sm">
                  {rateViolations.map((v: any, i: number) => (
                    <li key={i}>
                      {v.role}: Quoted {'\u00A3'}{v.quotedRate.toFixed(2)}/hr, minimum {'\u00A3'}{v.minimumRate}/hr
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* ================================================================= */}
          {/* Pricing Breakdown */}
          {/* ================================================================= */}
          <section className="space-y-4">
            <h3 className="font-semibold text-sm text-gray-900">Itemised Pricing</h3>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Staff Cost', value: staffCost, setter: setStaffCost },
                { label: 'Equipment Cost', value: equipmentCost, setter: setEquipmentCost },
                { label: 'Transport Cost', value: transportCost, setter: setTransportCost },
                { label: 'Consumables Cost', value: consumablesCost, setter: setConsumablesCost },
              ].map(({ label, value, setter }) => (
                <div key={label}>
                  <Label className="text-xs">{label}</Label>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-gray-500 text-sm">{'\u00A3'}</span>
                    <Input
                      type="number"
                      step="0.01"
                      value={value}
                      onChange={(e) => setter(parseFloat(e.target.value) || 0)}
                      className="h-9"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Custom Line Items */}
            {customLineItems.length > 0 && (
              <div className="space-y-2">
                {customLineItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm">
                    <div className="flex-1">
                      <span className="font-medium">{item.label}</span>
                      <span className="text-gray-500 ml-2">
                        {item.quantity} x {'\u00A3'}{item.unitPrice.toFixed(2)} = {'\u00A3'}{(item.quantity * item.unitPrice).toFixed(2)}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveCustomLine(item.id)}
                      className="text-red-600 hover:text-red-700 h-7 w-7 p-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Add custom line */}
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Label className="text-xs">Item</Label>
                <Input
                  value={newLineLabel}
                  onChange={(e) => setNewLineLabel(e.target.value)}
                  placeholder="e.g. Specialist vehicle"
                  className="h-9 mt-1"
                />
              </div>
              <div className="w-16">
                <Label className="text-xs">Qty</Label>
                <Input
                  type="number"
                  min="1"
                  value={newLineQty}
                  onChange={(e) => setNewLineQty(parseInt(e.target.value) || 1)}
                  className="h-9 mt-1"
                />
              </div>
              <div className="w-24">
                <Label className="text-xs">Price</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newLinePrice}
                  onChange={(e) => setNewLinePrice(parseFloat(e.target.value) || 0)}
                  className="h-9 mt-1"
                />
              </div>
              <Button
                type="button"
                size="sm"
                onClick={handleAddCustomLine}
                disabled={!newLineLabel.trim()}
                className="h-9"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Total */}
            <div className="flex justify-between items-center bg-gray-50 p-3 rounded font-semibold">
              <span>Total:</span>
              <span className="text-blue-600 text-lg">{'\u00A3'}{totalPrice.toFixed(2)}</span>
            </div>
          </section>

          {/* ================================================================= */}
          {/* Staffing Plan */}
          {/* ================================================================= */}
          <section className="space-y-4">
            <h3 className="font-semibold text-sm text-gray-900">Staffing Plan</h3>

            <div className="flex gap-2">
              <Button
                type="button"
                variant={staffingPlanType === 'named_medics' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStaffingPlanType('named_medics')}
                className="flex-1"
              >
                Named Medics
              </Button>
              <Button
                type="button"
                variant={staffingPlanType === 'headcount_and_quals' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStaffingPlanType('headcount_and_quals')}
                className="flex-1"
              >
                Headcount + Quals
              </Button>
            </div>

            {/* Named Medics Mode */}
            {staffingPlanType === 'named_medics' && (
              <div className="space-y-2">
                {namedMedics.map((medic) => (
                  <div key={medic.medic_id} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm">
                    <div className="flex-1">
                      <span className="font-medium">{medic.name}</span>
                      <span className="text-gray-500 ml-2">{STAFFING_ROLE_LABELS[medic.qualification]}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveNamedMedic(medic.medic_id)}
                      className="text-red-600 hover:text-red-700 h-7 w-7 p-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Label className="text-xs">Medic Name</Label>
                    <Input
                      value={newMedicName}
                      onChange={(e) => setNewMedicName(e.target.value)}
                      placeholder="e.g. John Smith"
                      className="h-9 mt-1"
                    />
                  </div>
                  <div className="w-36">
                    <Label className="text-xs">Qualification</Label>
                    <Select value={newMedicQual} onValueChange={(v) => setNewMedicQual(v as StaffingRole)}>
                      <SelectTrigger className="h-9 mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.entries(STAFFING_ROLE_LABELS) as Array<[StaffingRole, string]>).map(
                          ([role, label]) => (
                            <SelectItem key={role} value={role}>{label}</SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddNamedMedic}
                    disabled={!newMedicName.trim()}
                    className="h-9"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}

            {/* Headcount Mode */}
            {staffingPlanType === 'headcount_and_quals' && (
              <div className="space-y-2">
                {headcountPlans.map((plan) => (
                  <div key={plan.role} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm">
                    <div className="flex-1 font-medium">
                      {plan.quantity}x {STAFFING_ROLE_LABELS[plan.role]}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveHeadcount(plan.role)}
                      className="text-red-600 hover:text-red-700 h-7 w-7 p-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Label className="text-xs">Role</Label>
                    <Select value={newHcRole} onValueChange={(v) => setNewHcRole(v as StaffingRole)}>
                      <SelectTrigger className="h-9 mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.entries(STAFFING_ROLE_LABELS) as Array<[StaffingRole, string]>).map(
                          ([role, label]) => (
                            <SelectItem key={role} value={role}>{label}</SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-20">
                    <Label className="text-xs">Qty</Label>
                    <Input
                      type="number"
                      min="1"
                      value={newHcQty}
                      onChange={(e) => setNewHcQty(parseInt(e.target.value) || 1)}
                      className="h-9 mt-1"
                    />
                  </div>
                  <Button type="button" size="sm" onClick={handleAddHeadcount} className="h-9">
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}

            {validationErrors.staffing_plan && (
              <p className="text-red-600 text-xs">{validationErrors.staffing_plan}</p>
            )}
          </section>

          {/* ================================================================= */}
          {/* Cover Letter */}
          {/* ================================================================= */}
          <section className="space-y-2">
            <h3 className="font-semibold text-sm text-gray-900">Cover Letter (Optional)</h3>
            <Textarea
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value.slice(0, 5000))}
              placeholder="Tell the client why you're the best choice..."
              className="min-h-[80px]"
            />
            <p className="text-xs text-gray-500">{coverLetter.length} / 5000 characters</p>
          </section>

          {/* ================================================================= */}
          {/* Availability */}
          {/* ================================================================= */}
          <label className="flex items-start gap-3 p-3 bg-gray-50 rounded">
            <input
              type="checkbox"
              checked={availabilityConfirmed}
              onChange={(e) => setAvailabilityConfirmed(e.target.checked)}
              className="mt-0.5"
            />
            <span className="text-sm">
              I confirm my team is available for this event
              {validationErrors.availability_confirmed && (
                <span className="block text-red-600 text-xs mt-1">{validationErrors.availability_confirmed}</span>
              )}
            </span>
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSubmitting || !availabilityConfirmed || rateViolations.length > 0}
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
