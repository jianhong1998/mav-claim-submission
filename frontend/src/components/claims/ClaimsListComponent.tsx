'use client';

import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { IClaimListResponse } from '@project/types';
import { apiClient } from '@/lib/api-client';
import { FileText, RefreshCw, AlertTriangle } from 'lucide-react';
import ClaimCard from './claim-card';
import LoadingSkeleton from '@/components/common/skeletons/loading-skeleton';
import EmptyState from '@/components/common/empty-states/empty-state';

interface ClaimsListComponentProps {
  className?: string;
  /**
   * Override default retry configuration for testing
   * @internal This prop is used for testing purposes only
   */
  retryConfig?: {
    retry?: number | boolean;
    retryDelay?: (attemptIndex: number) => number;
  };
}

/**
 * ClaimsListComponent displays all user claims with proper loading states
 * Following requirements 1.1 and 1.3 for authenticated claim viewing
 */
export const ClaimsListComponent: React.FC<ClaimsListComponentProps> = ({
  className,
  retryConfig,
}) => {
  const queryClient = useQueryClient();

  // Query for all claims using GET /claims endpoint
  // Option 1: Force fresh data on mount to prevent stale cache issues
  const {
    data: response,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery<IClaimListResponse>({
    queryKey: ['claims', 'all'],
    queryFn: () => apiClient.get<IClaimListResponse>('/claims'),
    retry: retryConfig?.retry ?? 3,
    retryDelay:
      retryConfig?.retryDelay ??
      ((attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)),
    staleTime: 0, // Always consider data stale
    refetchOnMount: 'always', // Always refetch on component mount
  });

  const claims = response?.claims || [];

  // Sort claims by creation date (newest first) as per requirement 1.3
  const sortedClaims = claims.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const handleStatusChange = () => {
    // Invalidate claims query to refresh data
    void queryClient.invalidateQueries({ queryKey: ['claims', 'all'] });
  };

  if (error) {
    return (
      <Alert
        variant="destructive"
        className="max-w-2xl"
      >
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Failed to Load Claims</AlertTitle>
        <AlertDescription className="mt-2">
          <p className="mb-4">
            We&apos;re having trouble loading your claims right now. This could
            be due to a network issue or server problem.
          </p>
          <Button
            onClick={() => refetch()}
            disabled={isRefetching}
            variant="outline"
            size="sm"
            className="min-h-[44px] touch-manipulation"
          >
            {isRefetching ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Retrying...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </>
            )}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <LoadingSkeleton
        variant="claim-card"
        count={3}
      />
    );
  }

  if (sortedClaims.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="Ready to submit your first claim?"
        description="Start building your expense history by creating your first claim. Track telecommunications, fitness, dental, and other eligible expenses with ease."
      />
    );
  }

  return (
    <section
      className={cn('space-y-4', className)}
      aria-labelledby="claims-heading"
    >
      <header className="flex items-center justify-between">
        <h2
          id="claims-heading"
          className="text-lg font-semibold text-foreground"
        >
          All Claims ({sortedClaims.length})
        </h2>
      </header>

      <div
        className="space-y-3"
        role="list"
        aria-label="Claims list"
      >
        {sortedClaims.map((claim) => (
          <ClaimCard
            key={claim.id}
            claim={claim}
            onStatusChange={handleStatusChange}
          />
        ))}
      </div>
    </section>
  );
};
