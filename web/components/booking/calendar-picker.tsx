'use client';

/**
 * Calendar Picker Component
 * Phase 4.5: Date selection with urgency indicators
 */

import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { getUrgencyPremium } from '@/lib/booking/pricing';

interface CalendarPickerProps {
  selectedDate: Date | undefined;
  onDateSelect: (date: Date) => void;
}

export function CalendarPicker({ selectedDate, onDateSelect }: CalendarPickerProps) {
  // Disable past dates and same-day dates (minimum 1 day advance)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const urgency = selectedDate ? getUrgencyPremium(selectedDate) : null;

  return (
    <div className="space-y-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'w-full justify-start text-left font-normal',
              !selectedDate && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {selectedDate ? format(selectedDate, 'dd MMMM yyyy') : <span>Select shift date</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              if (date) {
                onDateSelect(date);
              }
            }}
            disabled={(date) => date < tomorrow}
            initialFocus
          />
          {selectedDate && urgency && (
            <div className="border-t p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Urgency level:</span>
                <Badge
                  variant={
                    urgency.level === 'standard' ? 'secondary' :
                    urgency.level === 'short_notice' ? 'default' :
                    urgency.level === 'urgent' ? 'destructive' :
                    'destructive'
                  }
                  className={
                    urgency.level === 'standard' ? 'bg-green-500' :
                    urgency.level === 'short_notice' ? 'bg-yellow-500' :
                    urgency.level === 'urgent' ? 'bg-orange-500' :
                    'bg-red-500'
                  }
                >
                  {urgency.label}
                </Badge>
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {selectedDate && urgency && (
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={
              urgency.level === 'standard' ? 'border-green-500 text-green-700' :
              urgency.level === 'short_notice' ? 'border-yellow-500 text-yellow-700' :
              urgency.level === 'urgent' ? 'border-orange-500 text-orange-700' :
              'border-red-500 text-red-700'
            }
          >
            {urgency.label}
          </Badge>
        </div>
      )}
    </div>
  );
}
