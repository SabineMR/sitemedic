/**
 * Roster List Component
 * Phase 37: Company Accounts — Plan 02
 *
 * WHY: Renders the grid of roster medic cards with loading and empty states.
 * This is the main content area of the roster management page.
 *
 * FEATURES:
 * - Grid layout: 1 col mobile, 2 on md, 3 on lg
 * - Loading state with skeleton cards
 * - Empty state with call-to-action buttons
 * - Maps roster data to RosterMedicCard components
 */

'use client';

import type { CompanyRosterMedicWithDetails } from '@/lib/marketplace/roster-types';
import RosterMedicCard from '@/components/marketplace/roster/RosterMedicCard';
import { useCompanyRosterStore } from '@/stores/useCompanyRosterStore';
import { Button } from '@/components/ui/button';
import { UserPlus, Mail } from 'lucide-react';

interface RosterListProps {
  roster: CompanyRosterMedicWithDetails[];
  isLoading: boolean;
  companyId: string;
}

export default function RosterList({ roster, isLoading, companyId }: RosterListProps) {
  const store = useCompanyRosterStore();

  // =========================================================================
  // Loading state: 3 skeleton cards
  // =========================================================================
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="border rounded-lg p-5 space-y-3 animate-pulse"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-gray-200 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-32 bg-gray-200 rounded" />
                <div className="h-3 w-24 bg-gray-100 rounded" />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="h-5 w-16 bg-gray-100 rounded-full" />
              <div className="h-5 w-20 bg-gray-100 rounded-full" />
            </div>
            <div className="h-8 w-full bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  // =========================================================================
  // Empty state
  // =========================================================================
  if (roster.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
        <p className="text-gray-500 mb-4">
          No medics on your roster yet. Add team members to start quoting.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button
            onClick={() => store.openAddModal()}
            size="sm"
          >
            <UserPlus className="h-4 w-4 mr-1.5" />
            Add Medic
          </Button>
          <Button
            onClick={() => store.openInviteModal()}
            variant="outline"
            size="sm"
          >
            <Mail className="h-4 w-4 mr-1.5" />
            Invite Medic
          </Button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // Roster grid
  // =========================================================================
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {roster.map((medic) => (
        <RosterMedicCard
          key={medic.id}
          medic={medic}
          companyId={companyId}
        />
      ))}
    </div>
  );
}
