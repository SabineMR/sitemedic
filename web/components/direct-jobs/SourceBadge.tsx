/**
 * SourceBadge — Visual badge distinguishing marketplace vs direct jobs
 *
 * Phase 34.1: Self-Procured Jobs — Plan 03
 *
 * Renders a small pill badge:
 *   - 'marketplace' => blue (bg-blue-100 text-blue-700)
 *   - 'direct' => green (bg-green-100 text-green-700)
 *
 * Uses SOURCE_LABELS from types.ts for human-readable text.
 */

import { SOURCE_LABELS, type EventSource } from '@/lib/direct-jobs/types';

const SOURCE_COLOURS: Record<EventSource, string> = {
  marketplace: 'bg-blue-100 text-blue-700',
  direct: 'bg-green-100 text-green-700',
};

interface SourceBadgeProps {
  source: EventSource;
  className?: string;
}

export function SourceBadge({ source, className = '' }: SourceBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${SOURCE_COLOURS[source]} ${className}`}
    >
      {SOURCE_LABELS[source]}
    </span>
  );
}
