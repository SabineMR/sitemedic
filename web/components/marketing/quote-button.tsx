'use client';

import { useState } from 'react';
import QuoteBuilder from '@/components/QuoteBuilder';

interface QuoteButtonProps {
  className?: string;
}

export default function QuoteButton({ className = '' }: QuoteButtonProps) {
  const [showQuoteBuilder, setShowQuoteBuilder] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowQuoteBuilder(true)}
        className={`bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-slate-50 transition border-2 border-blue-600 ${className}`}
      >
        Get Quote
      </button>
      {showQuoteBuilder && <QuoteBuilder onClose={() => setShowQuoteBuilder(false)} />}
    </>
  );
}
