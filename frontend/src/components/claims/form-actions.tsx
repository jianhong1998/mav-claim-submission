'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FormActionsProps {
  isSubmitting?: boolean;
  disabled?: boolean;
  submitLabel?: string;
  submittingLabel?: string;
  className?: string;
}

/**
 * FormActions component for form submission buttons
 * Displays submit button with loading state
 * Compatible with react-hook-form
 */
export const FormActions = React.memo<FormActionsProps>(
  ({
    isSubmitting = false,
    disabled = false,
    submitLabel = 'Add to Draft List',
    submittingLabel = 'Creating...',
    className,
  }) => {
    return (
      <div className={cn('flex justify-end pt-4', className)}>
        <Button
          type="submit"
          disabled={isSubmitting || disabled}
          className="min-w-32"
        >
          {isSubmitting ? (
            <>
              <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
              {submittingLabel}
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              {submitLabel}
            </>
          )}
        </Button>
      </div>
    );
  },
);

FormActions.displayName = 'FormActions';
