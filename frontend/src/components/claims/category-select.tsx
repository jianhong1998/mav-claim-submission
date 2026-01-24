'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import type { IClaimCategory } from '@project/types';
import { getCategoryDisplayName } from '@/lib/claim-utils';

export interface CategorySelectProps {
  value: string;
  onChange: (value: string) => void;
  categories: IClaimCategory[];
  disabled?: boolean;
  className?: string;
}

/**
 * CategorySelect component for selecting claim categories
 * Displays category names with monthly limits (if applicable)
 * Compatible with react-hook-form
 */
export const CategorySelect = React.memo<CategorySelectProps>(
  ({ value, onChange, categories, disabled = false, className }) => {
    return (
      <div className={cn('grid gap-2', className)}>
        <FormLabel>
          Category
          <span className="text-destructive">*</span>
        </FormLabel>
        <FormControl>
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className={cn(
              'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors',
              'file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground',
              'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            {categories.map((category) => {
              const displayName = getCategoryDisplayName(
                category.code,
                categories,
              );
              const limit =
                category.limit?.type === 'monthly'
                  ? category.limit.amount
                  : null;
              const optionText = limit
                ? `${displayName} (SGD ${limit} limit)`
                : displayName;

              return (
                <option
                  key={category.uuid}
                  value={category.code}
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
