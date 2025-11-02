'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Calendar } from 'lucide-react';

export interface MonthYearPickerProps {
  month: number;
  year: number;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * MonthYearPicker component for selecting month and year
 * Provides separate select for month (1-12) and input for year
 * Compatible with react-hook-form
 */
export const MonthYearPicker = React.memo<MonthYearPickerProps>(
  ({
    month,
    year,
    onMonthChange,
    onYearChange,
    disabled = false,
    className,
  }) => {
    return (
      <div className={cn('grid gap-4 md:grid-cols-2', className)}>
        {/* Month Select */}
        <div>
          <FormLabel className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Month
          </FormLabel>
          <FormControl>
            <select
              value={month}
              onChange={(e) => onMonthChange(parseInt(e.target.value))}
              disabled={disabled}
              className={cn(
                'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors',
                'file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground',
                'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
              )}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((monthValue) => (
                <option
                  key={monthValue}
                  value={monthValue}
                >
                  {new Date(0, monthValue - 1).toLocaleString('en-US', {
                    month: 'long',
                  })}
                </option>
              ))}
            </select>
          </FormControl>
          <FormMessage />
        </div>

        {/* Year Input */}
        <div>
          <FormLabel>Year</FormLabel>
          <FormControl>
            <Input
              type="number"
              value={year}
              onChange={(e) =>
                onYearChange(
                  parseInt(e.target.value) || new Date().getFullYear(),
                )
              }
              min="2020"
              max="2100"
              disabled={disabled}
            />
          </FormControl>
          <FormMessage />
        </div>
      </div>
    );
  },
);

MonthYearPicker.displayName = 'MonthYearPicker';
