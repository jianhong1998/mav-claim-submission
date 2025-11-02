'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { ClaimCategory } from '@project/types';
import { getCategoryDisplayName, MONTHLY_LIMITS } from '@/lib/claim-utils';

export interface CategorySelectProps {
  value: ClaimCategory;
  onChange: (value: ClaimCategory) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * CategorySelect component for selecting claim categories
 * Displays category names with monthly limits (if applicable)
 * Compatible with react-hook-form
 */
export const CategorySelect = React.memo<CategorySelectProps>(
  ({ value, onChange, disabled = false, className }) => {
    return (
      <div className={className}>
        <FormLabel>Category</FormLabel>
        <FormControl>
          <select
            value={value}
            onChange={(e) => onChange(e.target.value as ClaimCategory)}
            disabled={disabled}
            className={cn(
              'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors',
              'file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground',
              'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            {Object.values(ClaimCategory).map((category) => {
              const displayName = getCategoryDisplayName(category);
              const limit =
                MONTHLY_LIMITS[category as keyof typeof MONTHLY_LIMITS];
              const optionText = limit
                ? `${displayName} (SGD ${limit} limit)`
                : displayName;

              return (
                <option
                  key={category}
                  value={category}
                >
                  {optionText}
                </option>
              );
            })}
          </select>
        </FormControl>
        <FormMessage />
      </div>
    );
  },
);

CategorySelect.displayName = 'CategorySelect';
