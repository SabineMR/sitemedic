/**
 * RosterMedicPicker Component
 * Phase 37: Company Accounts -- Plan 03
 *
 * Reusable picker for selecting roster medics when building a staffing plan
 * in quote submission. Renders inline in the form (not a full-screen modal).
 *
 * FEATURES:
 * - Fetches active roster medics via useCompanyRoster hook
 * - Filters out already-selected medics (excludeIds)
 * - Optional qualification filter (requiredQualification)
 * - Availability indicator: green dot = available, amber dot = unavailable
 * - Clicking a medic calls onSelect with their id, name, and qualification
 * - Empty state when no matching medics available
 */

'use client';

import { useMemo } from 'react';
import { useCompanyRoster } from '@/lib/queries/marketplace/roster';
import { STAFFING_ROLE_LABELS } from '@/lib/marketplace/event-types';
import type { StaffingRole } from '@/lib/marketplace/event-types';
import type { CompanyRosterMedicWithDetails } from '@/lib/marketplace/roster-types';
import { Badge } from '@/components/ui/badge';
import { Loader2, UserPlus, Users } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

interface RosterMedicPickerProps {
  companyId: string;
  onSelect: (medic: {
    medic_id: string;
    name: string;
    qualification: StaffingRole;
  }) => void;
  excludeIds?: string[];
  requiredQualification?: StaffingRole;
}

// =============================================================================
// Component
// =============================================================================

export function RosterMedicPicker({
  companyId,
  onSelect,
  excludeIds = [],
  requiredQualification,
}: RosterMedicPickerProps) {
  // Fetch active roster medics
  const { data, isLoading } = useCompanyRoster(companyId, 'active');

  // Filter medics based on exclusions and qualification
  const filteredMedics = useMemo(() => {
    if (!data?.roster) return [];

    return data.roster.filter((medic: CompanyRosterMedicWithDetails) => {
      // Exclude already-selected medics
      if (medic.medic_id && excludeIds.includes(medic.medic_id)) {
        return false;
      }

      // Must have a linked medic account (not pending invitations)
      if (!medic.medic_id) {
        return false;
      }

      // Filter by required qualification if specified
      if (requiredQualification && medic.qualifications) {
        return medic.qualifications.includes(requiredQualification);
      }

      return true;
    });
  }, [data?.roster, excludeIds, requiredQualification]);

  // Determine primary qualification for a medic
  const getPrimaryQualification = (medic: CompanyRosterMedicWithDetails): StaffingRole => {
    if (requiredQualification && medic.qualifications?.includes(requiredQualification)) {
      return requiredQualification;
    }
    if (medic.qualifications && medic.qualifications.length > 0) {
      return medic.qualifications[0] as StaffingRole;
    }
    return 'other';
  };

  // =========================================================================
  // Loading State
  // =========================================================================
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6 text-gray-400">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        <span className="text-sm">Loading roster...</span>
      </div>
    );
  }

  // =========================================================================
  // Empty State
  // =========================================================================
  if (filteredMedics.length === 0) {
    const allExcluded =
      data?.roster &&
      data.roster.filter((m) => m.medic_id).length > 0 &&
      filteredMedics.length === 0;

    return (
      <div className="text-center py-6 border rounded-lg bg-gray-50">
        <Users className="h-8 w-8 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500">
          {allExcluded && excludeIds.length > 0
            ? 'All medics already assigned'
            : requiredQualification
              ? `No available medics with ${STAFFING_ROLE_LABELS[requiredQualification]} qualification`
              : 'No available medics in your roster'}
        </p>
      </div>
    );
  }

  // =========================================================================
  // Render Medic List
  // =========================================================================
  return (
    <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
      {filteredMedics.map((medic) => {
        const primaryQual = getPrimaryQualification(medic);
        const medicName = medic.medic_name || 'Team Member';

        return (
          <button
            key={medic.id}
            type="button"
            onClick={() =>
              onSelect({
                medic_id: medic.medic_id!,
                name: medicName,
                qualification: primaryQual,
              })
            }
            className="w-full flex items-center gap-3 p-3 text-left hover:bg-blue-50 transition-colors"
          >
            {/* Availability Indicator */}
            <span
              className={`flex-shrink-0 h-2.5 w-2.5 rounded-full ${
                medic.available ? 'bg-green-500' : 'bg-amber-500'
              }`}
              title={
                medic.available
                  ? 'Available'
                  : `Unavailable${
                      medic.unavailable_from
                        ? ` from ${medic.unavailable_from}`
                        : ''
                    }${
                      medic.unavailable_until
                        ? ` until ${medic.unavailable_until}`
                        : ''
                    }`
              }
            />

            {/* Medic Info */}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 text-sm truncate">
                {medicName}
              </p>
              {medic.title && (
                <p className="text-xs text-gray-500 truncate">{medic.title}</p>
              )}
            </div>

            {/* Qualification Badges */}
            <div className="flex gap-1 flex-shrink-0">
              {medic.qualifications?.slice(0, 2).map((qual) => (
                <Badge
                  key={qual}
                  variant="secondary"
                  className="text-xs whitespace-nowrap"
                >
                  {STAFFING_ROLE_LABELS[qual as StaffingRole] ?? qual}
                </Badge>
              ))}
            </div>

            {/* Select Icon */}
            <UserPlus className="h-4 w-4 text-blue-500 flex-shrink-0" />
          </button>
        );
      })}
    </div>
  );
}
