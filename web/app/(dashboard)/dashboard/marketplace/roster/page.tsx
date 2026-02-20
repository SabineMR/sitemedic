/**
 * Company Roster Management Page
 * Phase 37: Company Accounts — Plan 02
 *
 * WHY: Company admins need a visual interface to manage their medic team.
 * This page is the primary workflow for building a company's roster,
 * which is required before assigning medics to marketplace quotes.
 *
 * FEATURES:
 * - Fetches current user's marketplace company to get companyId
 * - Status filter tabs: All, Active, Pending, Inactive
 * - Search input for filtering by medic name
 * - Action buttons: "Add Medic" and "Invite Medic" to open modals
 * - Renders RosterList with React Query data
 * - Shows "Register your company first" if no company found
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCompanyRoster } from '@/lib/queries/marketplace/roster';
import { useCompanyRosterStore, type RosterStatusFilter } from '@/stores/useCompanyRosterStore';
import RosterList from '@/components/marketplace/roster/RosterList';
import AddMedicModal from '@/components/marketplace/roster/AddMedicModal';
import InviteMedicModal from '@/components/marketplace/roster/InviteMedicModal';
import { MedicAvailabilityModal } from '@/components/marketplace/roster/MedicAvailabilityModal';
import type { CompanyRosterMedicWithDetails } from '@/lib/marketplace/roster-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserPlus, Mail, Search } from 'lucide-react';
import Link from 'next/link';

export default function RosterPage() {
  // =========================================================================
  // Company detection state
  // =========================================================================
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string>('');
  const [loadingCompany, setLoadingCompany] = useState(true);
  const [noCompany, setNoCompany] = useState(false);

  // =========================================================================
  // Availability modal state
  // =========================================================================
  const [editingMedic, setEditingMedic] = useState<CompanyRosterMedicWithDetails | null>(null);

  const handleEditAvailability = useCallback((medic: CompanyRosterMedicWithDetails) => {
    setEditingMedic(medic);
  }, []);

  // =========================================================================
  // Zustand store for UI state
  // =========================================================================
  const store = useCompanyRosterStore();

  // =========================================================================
  // Fetch current user's company
  // =========================================================================
  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setNoCompany(true);
          setLoadingCompany(false);
          return;
        }

        const { data: company } = await supabase
          .from('marketplace_companies')
          .select('id, company_name')
          .eq('admin_user_id', user.id)
          .single();

        if (!company) {
          setNoCompany(true);
          setLoadingCompany(false);
          return;
        }

        setCompanyId(company.id);
        setCompanyName(company.company_name);
        store.setCompanyId(company.id);
      } catch {
        setNoCompany(true);
      } finally {
        setLoadingCompany(false);
      }
    };

    fetchCompany();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // =========================================================================
  // React Query: fetch roster data
  // =========================================================================
  const statusParam = store.statusFilter === 'all' ? undefined : store.statusFilter;
  const { data, isLoading, error } = useCompanyRoster(companyId ?? undefined, statusParam);

  // Client-side name filtering
  const roster = (data?.roster ?? []).filter((medic) => {
    if (!store.searchTerm) return true;
    const name = (medic.medic_name || '').toLowerCase();
    const email = (medic.medic_email || '').toLowerCase();
    const term = store.searchTerm.toLowerCase();
    return name.includes(term) || email.includes(term);
  });

  // =========================================================================
  // Loading: detecting company
  // =========================================================================
  if (loadingCompany) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="h-10 w-full bg-gray-100 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // =========================================================================
  // No company registered
  // =========================================================================
  if (noCompany) {
    return (
      <div className="text-center py-16">
        <div className="max-w-md mx-auto">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Register your company first
          </h2>
          <p className="text-gray-500 mb-6">
            You need to register a marketplace company before managing a team roster.
          </p>
          <Link href="/dashboard/marketplace/register">
            <Button>Register Company</Button>
          </Link>
        </div>
      </div>
    );
  }

  // =========================================================================
  // Status filter tabs config
  // =========================================================================
  const STATUS_TABS: { value: RosterStatusFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'pending', label: 'Pending' },
    { value: 'inactive', label: 'Inactive' },
  ];

  // =========================================================================
  // Render
  // =========================================================================
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Team Roster</h1>
            <p className="text-sm text-gray-500 mt-0.5">{companyName}</p>
          </div>
          <Badge variant="secondary" className="h-6">
            {roster.length} medic{roster.length !== 1 ? 's' : ''}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
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

      {/* Filters: Status tabs + Search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <Tabs
          value={store.statusFilter}
          onValueChange={(v) => store.setStatusFilter(v as RosterStatusFilter)}
        >
          <TabsList>
            {STATUS_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by name or email..."
            value={store.searchTerm}
            onChange={(e) => store.setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-700">Failed to load roster. Please try again.</p>
        </div>
      )}

      {/* Roster List */}
      <RosterList
        roster={roster}
        isLoading={isLoading}
        companyId={companyId ?? ''}
        onEditAvailability={handleEditAvailability}
      />

      {/* Modals */}
      <AddMedicModal companyId={companyId ?? ''} />
      <InviteMedicModal companyId={companyId ?? ''} />
      <MedicAvailabilityModal
        medicId={editingMedic?.id ?? null}
        medicName={editingMedic?.medic_name || editingMedic?.invitation_email || 'Medic'}
        isOpen={!!editingMedic}
        onClose={() => setEditingMedic(null)}
        companyId={companyId ?? ''}
        currentUnavailableFrom={editingMedic?.unavailable_from}
        currentUnavailableUntil={editingMedic?.unavailable_until}
        currentUnavailableReason={editingMedic?.unavailable_reason}
      />
    </div>
  );
}
