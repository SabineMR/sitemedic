/**
 * Staffing Plan Section
 * Phase 34: Quote Submission & Comparison
 * Updated Phase 37: Company Accounts -- Plan 03
 *
 * Section for specifying staffing in the quote:
 * - Toggle between "Named Medics" and "Headcount + Qualifications" modes
 * - Named Medics: Select from company roster via RosterMedicPicker (not free text)
 * - Headcount: Specify quantity per qualification level (e.g., "2x Paramedic, 1x EMT")
 * - At least one entry required for either mode
 *
 * Phase 37 changes:
 * - Named medics flow now uses RosterMedicPicker (real roster data)
 * - Company admin selects medics from active roster instead of typing names
 * - Medic IDs are real roster IDs, not generated UUIDs
 * - Falls back to free-text entry if companyId not available
 * - Headcount + qualifications flow remains UNCHANGED
 */

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useQuoteFormStore } from '@/stores/useQuoteFormStore';
import { RosterMedicPicker } from '@/components/marketplace/roster/RosterMedicPicker';
import { STAFFING_ROLE_LABELS } from '@/lib/marketplace/event-types';
import type { StaffingRole, StaffingRole as StaffingRoleType } from '@/lib/marketplace/event-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Trash2, Plus, AlertTriangle } from 'lucide-react';

interface StaffingPlanSectionProps {
  errors: Record<string, string>;
  companyId?: string;
}

export default function StaffingPlanSection({ errors, companyId: propCompanyId }: StaffingPlanSectionProps) {
  const store = useQuoteFormStore();

  // Detect companyId: use prop if provided, otherwise detect from current user
  const [detectedCompanyId, setDetectedCompanyId] = useState<string | null>(propCompanyId ?? null);
  const [detectingCompany, setDetectingCompany] = useState(!propCompanyId);

  useEffect(() => {
    if (propCompanyId) {
      setDetectedCompanyId(propCompanyId);
      setDetectingCompany(false);
      return;
    }

    const detectCompany = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setDetectingCompany(false);
          return;
        }

        const { data: company } = await supabase
          .from('marketplace_companies')
          .select('id')
          .eq('admin_user_id', user.id)
          .single();

        if (company) {
          setDetectedCompanyId(company.id);
        }
      } catch {
        // No company found -- will fall back to free-text
      } finally {
        setDetectingCompany(false);
      }
    };

    detectCompany();
  }, [propCompanyId]);

  // Effective companyId for roster picker
  const companyId = detectedCompanyId;

  // Form state for headcount entries and fallback free-text entry
  const [newMedicName, setNewMedicName] = useState('');
  const [newMedicQual, setNewMedicQual] = useState<StaffingRoleType>('paramedic');
  const [newHeadcountRole, setNewHeadcountRole] = useState<StaffingRoleType>('paramedic');
  const [newHeadcountQty, setNewHeadcountQty] = useState(1);

  // Already selected medic IDs for exclusion from picker
  const excludeIds = store.namedMedics
    .map((m) => m.medic_id)
    .filter(Boolean);

  // =========================================================================
  // Handlers
  // =========================================================================

  /** Handle medic selection from RosterMedicPicker */
  const handleRosterMedicSelect = (medic: {
    medic_id: string;
    name: string;
    qualification: StaffingRole;
  }) => {
    store.addNamedMedic({
      medic_id: medic.medic_id,
      name: medic.name,
      qualification: medic.qualification,
    });
  };

  /** Fallback: free-text add when no companyId available */
  const handleAddNamedMedicFreeText = () => {
    if (!newMedicName.trim()) return;

    store.addNamedMedic({
      medic_id: crypto.randomUUID(),
      name: newMedicName,
      qualification: newMedicQual,
    });

    setNewMedicName('');
    setNewMedicQual('paramedic');
  };

  const handleAddHeadcountPlan = () => {
    // Check if this role already exists
    const existing = store.headcountPlans.find((p) => p.role === newHeadcountRole);
    if (existing) {
      // Update quantity instead
      store.removeHeadcountPlan(newHeadcountRole);
      store.addHeadcountPlan({
        role: newHeadcountRole,
        quantity: existing.quantity + newHeadcountQty,
      });
    } else {
      store.addHeadcountPlan({
        role: newHeadcountRole,
        quantity: newHeadcountQty,
      });
    }

    setNewHeadcountQty(1);
  };

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <div className="border rounded-lg p-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Staffing Plan</h2>
        <p className="text-sm text-gray-600">
          Specify your team either by naming specific medics or by headcount and qualifications.
        </p>
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant={store.staffingPlanType === 'named_medics' ? 'default' : 'outline'}
          onClick={() => store.setStaffingPlanType('named_medics')}
          className="flex-1"
        >
          Named Medics
        </Button>
        <Button
          type="button"
          variant={store.staffingPlanType === 'headcount_and_quals' ? 'default' : 'outline'}
          onClick={() => store.setStaffingPlanType('headcount_and_quals')}
          className="flex-1"
        >
          Headcount + Qualifications
        </Button>
      </div>

      {/* Named Medics Mode */}
      {store.staffingPlanType === 'named_medics' && (
        <div className="space-y-3">
          {/* Existing Selected Medics */}
          <div className="space-y-2">
            {store.namedMedics.map((medic) => (
              <div key={medic.medic_id} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{medic.name}</div>
                  <div className="text-sm text-gray-600">{STAFFING_ROLE_LABELS[medic.qualification]}</div>
                  {medic.notes && <div className="text-xs text-gray-500 mt-1">{medic.notes}</div>}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => store.removeNamedMedic(medic.medic_id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* Roster-Aware Medic Picker OR Free-Text Fallback */}
          <div className="border-t pt-3">
            {detectingCompany ? (
              <div className="text-sm text-gray-400 text-center py-4">
                Loading roster...
              </div>
            ) : companyId ? (
              /* Roster Picker (Phase 37) */
              <div className="space-y-2">
                <Label className="text-sm">Select from your roster</Label>
                <RosterMedicPicker
                  companyId={companyId}
                  onSelect={handleRosterMedicSelect}
                  excludeIds={excludeIds}
                />
              </div>
            ) : (
              /* Free-Text Fallback (pre-Phase 37 behaviour) */
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-amber-600 text-xs mb-2">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>No company roster found. Using manual entry.</span>
                </div>
                <div>
                  <Label htmlFor="medicName" className="text-sm">
                    Medic Name
                  </Label>
                  <Input
                    id="medicName"
                    type="text"
                    placeholder="e.g., John Smith"
                    value={newMedicName}
                    onChange={(e) => setNewMedicName(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="medicQual" className="text-sm">
                    Qualification
                  </Label>
                  <Select value={newMedicQual} onValueChange={(v) => setNewMedicQual(v as StaffingRoleType)}>
                    <SelectTrigger id="medicQual" className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.entries(STAFFING_ROLE_LABELS) as Array<[StaffingRoleType, string]>).map(
                        ([role, label]) => (
                          <SelectItem key={role} value={role}>
                            {label}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  type="button"
                  onClick={handleAddNamedMedicFreeText}
                  disabled={!newMedicName.trim()}
                  size="sm"
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Medic
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Headcount + Qualifications Mode */}
      {store.staffingPlanType === 'headcount_and_quals' && (
        <div className="space-y-3">
          {/* Existing Headcount Plans */}
          <div className="space-y-2">
            {store.headcountPlans.map((plan) => (
              <div key={plan.role} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{plan.quantity}x {STAFFING_ROLE_LABELS[plan.role]}</div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => store.removeHeadcountPlan(plan.role)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* Add New Headcount Plan */}
          <div className="border-t pt-3 space-y-3">
            <div>
              <Label htmlFor="headcountRole" className="text-sm">
                Qualification Level
              </Label>
              <Select value={newHeadcountRole} onValueChange={(v) => setNewHeadcountRole(v as StaffingRoleType)}>
                <SelectTrigger id="headcountRole" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(STAFFING_ROLE_LABELS) as Array<[StaffingRoleType, string]>).map(
                    ([role, label]) => (
                      <SelectItem key={role} value={role}>
                        {label}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="headcountQty" className="text-sm">
                Quantity
              </Label>
              <Input
                id="headcountQty"
                type="number"
                min="1"
                value={newHeadcountQty}
                onChange={(e) => setNewHeadcountQty(parseInt(e.target.value) || 1)}
                className="mt-1"
              />
            </div>

            <Button type="button" onClick={handleAddHeadcountPlan} size="sm" className="w-full">
              <Plus className="h-4 w-4 mr-1" />
              Add Headcount
            </Button>
          </div>
        </div>
      )}

      {/* Validation Error */}
      {errors.staffing_plan && (
        <div className="text-red-600 text-sm font-medium">{errors.staffing_plan}</div>
      )}
    </div>
  );
}
