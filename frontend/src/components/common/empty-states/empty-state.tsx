/**
 * EmptyState Component
 * Reusable empty state for consistent "no data" displays across the application
 */

import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface EmptyStateAction {
  /**
   * Action button label
   */
  label: string;

  /**
   * Action button click handler
   */
  onClick: () => void;
}

export interface EmptyStateProps {
  /**
   * Icon component to display
   */
  icon: LucideIcon;

  /**
   * Empty state title
   */
  title: string;

  /**
   * Empty state description
   */
  description: string;

  /**
   * Optional action button
   */
  action?: EmptyStateAction;

  /**
   * Additional CSS classes
   */
  className?: string;
}

const EmptyState = React.memo<EmptyStateProps>(
  ({ icon: Icon, title, description, action, className }) => {
    return (
      <div className={cn('text-center py-12 max-w-md mx-auto', className)}>
        <Icon className="mx-auto h-12 w-12 text-muted-foreground/50" />
        <h3 className="text-lg font-semibold text-foreground mt-4">{title}</h3>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          {description}
        </p>
        {action && (
          <Button
            onClick={action.onClick}
            className="mt-6"
          >
            {action.label}
          </Button>
        )}
      </div>
    );
  },
);

EmptyState.displayName = 'EmptyState';

export default EmptyState;
