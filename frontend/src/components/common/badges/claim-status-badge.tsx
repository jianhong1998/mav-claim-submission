/**
 * ClaimStatusBadge Component
 * Reusable status badge for consistent claim status display across the application
 */

import React from 'react';
import { ClaimStatus } from '@project/types';
import { getClaimStatusConfig } from '@/lib/claim-utils';
import { cn } from '@/lib/utils';

export interface ClaimStatusBadgeProps {
  /**
   * Claim status to display
   */
  status: ClaimStatus;

  /**
   * Badge size variant
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Whether to display status icon
   * @default true
   */
  showIcon?: boolean;

  /**
   * Additional CSS classes
   */
  className?: string;
}

const ClaimStatusBadge = React.memo<ClaimStatusBadgeProps>(
  ({ status, size = 'md', showIcon = true, className }) => {
    const config = getClaimStatusConfig(status);
    const Icon = config.icon;

    const sizeClasses = {
      sm: 'text-xs px-2 py-0.5',
      md: 'text-sm px-3 py-1',
      lg: 'text-base px-4 py-1.5',
    };

    const iconSizes = {
      sm: 12,
      md: 14,
      lg: 16,
    };

    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full font-medium border',
          config.color,
          config.bgColor,
          config.borderColor,
          sizeClasses[size],
          className,
        )}
        aria-label={`Status: ${config.label}`}
      >
        {showIcon && <Icon size={iconSizes[size]} />}
        <span>{config.label}</span>
      </span>
    );
  },
);

ClaimStatusBadge.displayName = 'ClaimStatusBadge';

export default ClaimStatusBadge;
