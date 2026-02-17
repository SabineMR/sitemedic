/**
 * What3Words Display Component
 * Phase 09: Read-only display of what3words address with copy and external link
 */

'use client';

import { useState } from 'react';
import { Copy, ExternalLink, Check } from 'lucide-react';
import { formatWhat3Words, getWhat3WordsMapLink } from '@/lib/utils/what3words';

interface What3WordsDisplayProps {
  address: string;
}

export function What3WordsDisplay({ address }: What3WordsDisplayProps) {
  const [copied, setCopied] = useState(false);

  const formatted = formatWhat3Words(address);
  const mapLink = getWhat3WordsMapLink(address);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(formatted);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard write failed silently
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-mono font-semibold text-blue-600">{formatted}</span>

      <button
        onClick={handleCopy}
        aria-label={copied ? 'Copied' : 'Copy what3words address'}
        className="text-slate-400 hover:text-slate-600 transition-colors"
      >
        {copied ? (
          <Check className="h-4 w-4 text-green-500" aria-hidden="true" />
        ) : (
          <Copy className="h-4 w-4" aria-hidden="true" />
        )}
      </button>

      {copied && (
        <span className="text-xs text-green-600">Copied!</span>
      )}

      <a
        href={mapLink}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Open what3words location in map"
        className="text-slate-400 hover:text-blue-600 transition-colors"
      >
        <ExternalLink className="h-4 w-4" aria-hidden="true" />
      </a>
    </div>
  );
}
