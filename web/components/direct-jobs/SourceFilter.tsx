/**
 * SourceFilter — Dropdown to filter jobs by source (All / Marketplace / Direct)
 *
 * Phase 34.1: Self-Procured Jobs — Plan 03
 *
 * Controlled component: accepts value + onChange props.
 * Value of '' means "All" (no filter applied).
 */

import type { EventSource } from '@/lib/direct-jobs/types';
import { SOURCE_LABELS } from '@/lib/direct-jobs/types';

interface SourceFilterProps {
  value: string;
  onChange: (value: EventSource | '') => void;
  className?: string;
}

export function SourceFilter({ value, onChange, className = '' }: SourceFilterProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as EventSource | '')}
      className={`rounded-md border border-gray-300 px-3 py-2 text-sm ${className}`}
    >
      <option value="">All Sources</option>
      {Object.entries(SOURCE_LABELS).map(([key, label]) => (
        <option key={key} value={key}>
          {label}
        </option>
      ))}
    </select>
  );
}
