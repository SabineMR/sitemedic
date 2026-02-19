'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';

interface DateRangeFilterProps {
  onDateRangeChange: (from: string | null, to: string | null) => void;
}

export function DateRangeFilter({ onDateRangeChange }: DateRangeFilterProps) {
  const [from, setFrom] = React.useState<string>('');
  const [to, setTo] = React.useState<string>('');

  const handleFromChange = (value: string) => {
    setFrom(value);
    onDateRangeChange(value || null, to || null);
  };

  const handleToChange = (value: string) => {
    setTo(value);
    onDateRangeChange(from || null, value || null);
  };

  const handleClear = () => {
    setFrom('');
    setTo('');
    onDateRangeChange(null, null);
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2">
        <label htmlFor="date-from" className="text-sm font-medium">
          From
        </label>
        <Input
          id="date-from"
          type="date"
          value={from}
          onChange={(e) => handleFromChange(e.target.value)}
          className="w-[150px]"
        />
      </div>
      <div className="flex items-center gap-2">
        <label htmlFor="date-to" className="text-sm font-medium">
          To
        </label>
        <Input
          id="date-to"
          type="date"
          value={to}
          onChange={(e) => handleToChange(e.target.value)}
          className="w-[150px]"
        />
      </div>
      {(from || to) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          className="h-8 px-2"
          aria-label="Clear date filter"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
