/**
 * Sort & Filter Bar for Quote Comparison
 * Phase 34: Quote Submission & Comparison — Plan 02
 *
 * Compact toolbar with sort dropdown (5 modes) and filter controls
 * (qualification, price range, minimum rating). Collapses filters
 * on mobile behind a toggle button.
 */

'use client';

import { useState } from 'react';
import { STAFFING_ROLE_LABELS, type StaffingRole } from '@/lib/marketplace/event-types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SlidersHorizontal, X } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

export type SortMode = 'best_value' | 'price_low' | 'price_high' | 'rating' | 'recent';

export interface QuoteFilters {
  qualification: string;
  priceMin: string;
  priceMax: string;
  minRating: string;
}

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'best_value', label: 'Best Value' },
  { value: 'price_low', label: 'Lowest Price' },
  { value: 'price_high', label: 'Highest Price' },
  { value: 'rating', label: 'Highest Rating' },
  { value: 'recent', label: 'Most Recent' },
];

const RATING_OPTIONS = [
  { value: '', label: 'Any Rating' },
  { value: '1', label: '1+ Stars' },
  { value: '2', label: '2+ Stars' },
  { value: '3', label: '3+ Stars' },
  { value: '4', label: '4+ Stars' },
  { value: '5', label: '5 Stars' },
];

const QUALIFICATION_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Any Qualification' },
  ...Object.entries(STAFFING_ROLE_LABELS).map(([value, label]) => ({
    value,
    label,
  })),
];

// =============================================================================
// Props
// =============================================================================

interface SortFilterBarProps {
  sortMode: SortMode;
  filters: QuoteFilters;
  onSortChange: (mode: SortMode) => void;
  onFilterChange: (filters: QuoteFilters) => void;
}

// =============================================================================
// Component
// =============================================================================

export default function SortFilterBar({
  sortMode,
  filters,
  onSortChange,
  onFilterChange,
}: SortFilterBarProps) {
  const [showFilters, setShowFilters] = useState(false);

  const hasActiveFilters =
    filters.qualification !== '' ||
    filters.priceMin !== '' ||
    filters.priceMax !== '' ||
    filters.minRating !== '';

  const clearFilters = () => {
    onFilterChange({
      qualification: '',
      priceMin: '',
      priceMax: '',
      minRating: '',
    });
  };

  const updateFilter = (key: keyof QuoteFilters, value: string) => {
    onFilterChange({ ...filters, [key]: value });
  };

  return (
    <div className="space-y-3">
      {/* Top row: sort + filter toggle */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Label htmlFor="sort-select" className="text-sm text-gray-500 whitespace-nowrap">
            Sort by
          </Label>
          <Select value={sortMode} onValueChange={(val) => onSortChange(val as SortMode)}>
            <SelectTrigger id="sort-select" className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          variant={hasActiveFilters ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-1.5"
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden sm:inline">Filters</span>
          {hasActiveFilters && (
            <span className="ml-1 rounded-full bg-white text-blue-600 px-1.5 py-0.5 text-xs font-medium">
              !
            </span>
          )}
        </Button>
      </div>

      {/* Filter panel (collapsible) */}
      {showFilters && (
        <div className="rounded-lg border bg-gray-50 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700">Filter Quotes</span>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-xs">
                <X className="h-3 w-3" />
                Clear all
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Qualification filter */}
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">Qualification</Label>
              <Select
                value={filters.qualification}
                onValueChange={(val) => updateFilter('qualification', val)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Any Qualification" />
                </SelectTrigger>
                <SelectContent>
                  {QUALIFICATION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value || 'any'} value={opt.value || 'any'}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Price min */}
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">Min Price</Label>
              <Input
                type="number"
                placeholder="No min"
                value={filters.priceMin}
                onChange={(e) => updateFilter('priceMin', e.target.value)}
                min={0}
              />
            </div>

            {/* Price max */}
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">Max Price</Label>
              <Input
                type="number"
                placeholder="No max"
                value={filters.priceMax}
                onChange={(e) => updateFilter('priceMax', e.target.value)}
                min={0}
              />
            </div>

            {/* Rating filter */}
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">Min Rating</Label>
              <Select
                value={filters.minRating}
                onValueChange={(val) => updateFilter('minRating', val)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Any Rating" />
                </SelectTrigger>
                <SelectContent>
                  {RATING_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value || 'any-rating'} value={opt.value || 'any-rating'}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
