/**
 * Add Medic Modal Component
 * Phase 37: Company Accounts — Plan 02
 *
 * WHY: Company admins need to add existing SiteMedic medics directly to their roster.
 * This modal provides search functionality to find medics by name, then adds them
 * to the roster via POST /api/marketplace/roster.
 *
 * FEATURES:
 * - Search input that queries medics by name (Supabase ILIKE on first_name/last_name)
 * - Display search results as a selectable list with name, qualification, email
 * - Optional title and qualifications override fields
 * - POST to /api/marketplace/roster on submit
 * - Toast feedback and React Query cache invalidation on success
 */

'use client';

import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useCompanyRosterStore } from '@/stores/useCompanyRosterStore';
import { STAFFING_ROLE_LABELS } from '@/lib/marketplace/event-types';
import type { StaffingRole } from '@/lib/marketplace/event-types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, UserPlus, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface AddMedicModalProps {
  companyId: string;
}

interface MedicSearchResult {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  qualification: string | null;
}

export default function AddMedicModal({ companyId }: AddMedicModalProps) {
  const store = useCompanyRosterStore();
  const queryClient = useQueryClient();

  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<MedicSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Selection state
  const [selectedMedic, setSelectedMedic] = useState<MedicSearchResult | null>(null);
  const [title, setTitle] = useState('');
  const [selectedQualifications, setSelectedQualifications] = useState<string[]>([]);

  // Submit state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // =========================================================================
  // Search medics by name
  // =========================================================================
  const handleSearch = useCallback(async (term: string) => {
    setSearchTerm(term);

    if (term.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('medics')
        .select('id, first_name, last_name, email, qualification')
        .or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%`)
        .limit(10);

      if (error) {
        console.error('[AddMedicModal] Search error:', error);
        setSearchResults([]);
        return;
      }

      setSearchResults(data || []);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // =========================================================================
  // Toggle qualification selection
  // =========================================================================
  const toggleQualification = (qual: string) => {
    setSelectedQualifications((prev) =>
      prev.includes(qual) ? prev.filter((q) => q !== qual) : [...prev, qual]
    );
  };

  // =========================================================================
  // Submit: add medic to roster
  // =========================================================================
  const handleSubmit = async () => {
    if (!selectedMedic) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/marketplace/roster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          medicId: selectedMedic.id,
          title: title || null,
          qualifications: selectedQualifications.length > 0 ? selectedQualifications : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add medic');
      }

      const medicName = `${selectedMedic.first_name || ''} ${selectedMedic.last_name || ''}`.trim();
      toast.success(`${medicName || 'Medic'} added to roster`);
      queryClient.invalidateQueries({ queryKey: ['company-roster'] });
      handleClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add medic';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // =========================================================================
  // Close and reset
  // =========================================================================
  const handleClose = () => {
    store.closeAddModal();
    setSearchTerm('');
    setSearchResults([]);
    setSelectedMedic(null);
    setTitle('');
    setSelectedQualifications([]);
  };

  // =========================================================================
  // Render
  // =========================================================================
  return (
    <Dialog open={store.addModalOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Medic to Roster</DialogTitle>
          <DialogDescription>
            Search for an existing SiteMedic medic and add them directly to your team roster.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search input */}
          {!selectedMedic && (
            <div>
              <Label htmlFor="medicSearch" className="text-sm">
                Search by name
              </Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="medicSearch"
                  placeholder="Start typing a medic's name..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-9"
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* Search results */}
          {!selectedMedic && searchResults.length > 0 && (
            <div className="border rounded-lg max-h-60 overflow-y-auto divide-y">
              {searchResults.map((medic) => {
                const name = `${medic.first_name || ''} ${medic.last_name || ''}`.trim();
                return (
                  <button
                    key={medic.id}
                    type="button"
                    onClick={() => setSelectedMedic(medic)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <p className="font-medium text-gray-900 text-sm">{name || 'Unknown'}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {medic.qualification && (
                        <span className="text-xs text-gray-500">
                          {STAFFING_ROLE_LABELS[medic.qualification as StaffingRole] || medic.qualification}
                        </span>
                      )}
                      {medic.email && (
                        <span className="text-xs text-gray-400">{medic.email}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* No results */}
          {!selectedMedic && searchTerm.length >= 2 && !isSearching && searchResults.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-3">
              No medics found. Try a different name or invite them by email.
            </p>
          )}

          {/* Searching indicator */}
          {isSearching && (
            <div className="flex items-center justify-center gap-2 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              <span className="text-sm text-gray-500">Searching...</span>
            </div>
          )}

          {/* Selected medic details */}
          {selectedMedic && (
            <>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      {`${selectedMedic.first_name || ''} ${selectedMedic.last_name || ''}`.trim()}
                    </p>
                    {selectedMedic.qualification && (
                      <p className="text-sm text-gray-500">
                        {STAFFING_ROLE_LABELS[selectedMedic.qualification as StaffingRole] || selectedMedic.qualification}
                      </p>
                    )}
                    {selectedMedic.email && (
                      <p className="text-xs text-gray-400 mt-0.5">{selectedMedic.email}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedMedic(null)}
                    className="text-gray-500"
                  >
                    Change
                  </Button>
                </div>
              </div>

              {/* Optional: Title */}
              <div>
                <Label htmlFor="medicTitle" className="text-sm">
                  Title / Role (optional)
                </Label>
                <Input
                  id="medicTitle"
                  placeholder="e.g., Senior Paramedic, Team Lead"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1"
                />
              </div>

              {/* Optional: Qualifications */}
              <div>
                <Label className="text-sm">
                  Qualifications (optional)
                </Label>
                <p className="text-xs text-gray-500 mt-0.5 mb-2">
                  Override or supplement the medic's default qualifications for this roster.
                </p>
                <div className="flex flex-wrap gap-2">
                  {(Object.entries(STAFFING_ROLE_LABELS) as Array<[string, string]>).map(
                    ([role, label]) => {
                      const isSelected = selectedQualifications.includes(role);
                      return (
                        <button
                          key={role}
                          type="button"
                          onClick={() => toggleQualification(role)}
                          className="inline-block"
                        >
                          <Badge
                            variant={isSelected ? 'default' : 'outline'}
                            className={`cursor-pointer transition-colors ${
                              isSelected ? '' : 'hover:bg-gray-50'
                            }`}
                          >
                            {isSelected && <Check className="h-3 w-3 mr-1" />}
                            {label}
                          </Badge>
                        </button>
                      );
                    }
                  )}
                </div>
              </div>

              {/* Submit button */}
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-1.5" />
                    Add to Roster
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
