/**
 * LoadingSkeleton Component
 * Reusable loading skeleton for consistent loading states across the application
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface LoadingSkeletonProps {
  /**
   * Skeleton variant for different layouts
   */
  variant: 'claim-card' | 'claim-list' | 'attachment-list' | 'form';

  /**
   * Number of skeleton items to render
   * @default 3
   */
  count?: number;

  /**
   * Additional CSS classes
   */
  className?: string;
}

const ClaimCardSkeleton = () => (
  <Card className="animate-pulse">
    <CardContent className="p-6">
      <div className="space-y-3">
        <div className="h-4 bg-muted rounded w-3/4"></div>
        <div className="h-3 bg-muted rounded w-1/2"></div>
        <div className="flex gap-2">
          <div className="h-8 bg-muted rounded w-16"></div>
          <div className="h-8 bg-muted rounded w-16"></div>
        </div>
      </div>
    </CardContent>
  </Card>
);

const ClaimListSkeleton = () => (
  <div className="animate-pulse space-y-2 p-4 border rounded-lg">
    <div className="h-4 bg-muted rounded w-2/3"></div>
    <div className="h-3 bg-muted rounded w-1/3"></div>
    <div className="h-3 bg-muted rounded w-1/2"></div>
  </div>
);

const AttachmentListSkeleton = () => (
  <div className="animate-pulse flex items-center gap-3 p-3 border rounded-lg">
    <div className="h-10 w-10 bg-muted rounded-full"></div>
    <div className="flex-1 space-y-2">
      <div className="h-3 bg-muted rounded w-1/2"></div>
      <div className="h-2 bg-muted rounded w-1/4"></div>
    </div>
    <div className="h-8 w-8 bg-muted rounded"></div>
  </div>
);

const FormSkeleton = () => (
  <div className="animate-pulse space-y-4">
    <div className="space-y-2">
      <div className="h-3 bg-muted rounded w-24"></div>
      <div className="h-10 bg-muted rounded"></div>
    </div>
    <div className="space-y-2">
      <div className="h-3 bg-muted rounded w-32"></div>
      <div className="h-10 bg-muted rounded"></div>
    </div>
    <div className="space-y-2">
      <div className="h-3 bg-muted rounded w-28"></div>
      <div className="h-24 bg-muted rounded"></div>
    </div>
  </div>
);

const LoadingSkeleton = React.memo<LoadingSkeletonProps>(
  ({ variant, count = 3, className }) => {
    const skeletonComponents = {
      'claim-card': ClaimCardSkeleton,
      'claim-list': ClaimListSkeleton,
      'attachment-list': AttachmentListSkeleton,
      form: FormSkeleton,
    };

    const SkeletonComponent = skeletonComponents[variant];

    return (
      <div className={cn('space-y-4', className)}>
        {Array.from({ length: count }).map((_, index) => (
          <SkeletonComponent key={index} />
        ))}
      </div>
    );
  },
);

LoadingSkeleton.displayName = 'LoadingSkeleton';

export default LoadingSkeleton;
