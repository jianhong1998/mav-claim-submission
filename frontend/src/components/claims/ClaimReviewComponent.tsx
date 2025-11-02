'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { IClaimMetadata, IClaimListResponse } from '@project/types';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { ReviewSummaryStats } from './review-summary-stats';
import { ClaimReviewItem } from './claim-review-item';
import { ReviewActions } from './review-actions';
import { ClaimReviewErrorState } from './claim-review-error-state';
import { ClaimReviewLoadingState } from './claim-review-loading-state';
import { ClaimReviewEmptyState } from './claim-review-empty-state';
import { ClaimReviewHeader } from './claim-review-header';
import { ClaimReviewWarning } from './claim-review-warning';
import { useClaimReviewSummary } from '@/hooks/claims/useClaimReviewSummary';
import { useMarkClaimsReady } from '@/hooks/claims/useMarkClaimsReady';

interface ClaimReviewComponentProps {
  onBack?: () => void;
  onEditClaim?: (claim: IClaimMetadata) => void;
  className?: string;
}

/**
 * ClaimReviewComponent provides comprehensive review interface for draft claims
 * Following requirements 5.1 and 5.2 for final review and ready marking functionality
 */
export const ClaimReviewComponent: React.FC<ClaimReviewComponentProps> = ({
  onBack,
  onEditClaim,
  className,
}) => {
  const [_emailingSingleClaim, _setEmailingSingleClaim] = useState<
    string | null
  >(null);

  // Query for draft claims
  const {
    data: response,
    isLoading,
    error,
    refetch,
  } = useQuery<IClaimListResponse>({
    queryKey: ['claims', 'draft'],
    queryFn: () => apiClient.get<IClaimListResponse>('/claims?status=draft'),
  });

  const draftClaims = useMemo(() => response?.claims || [], [response?.claims]);

  // Calculate summary statistics using custom hook
  const summaryStats = useClaimReviewSummary(draftClaims);

  // Handle marking claims as ready and sending emails
  const { updatingClaims, handleMarkAllReady, isAnyClaimUpdating } =
    useMarkClaimsReady();

  const handleEditClaim = useCallback(
    (claim: IClaimMetadata) => {
      onEditClaim?.(claim);
    },
    [onEditClaim],
  );

  const handleRefresh = useCallback(() => {
    void refetch();
    toast.info('Refreshing claims...');
  }, [refetch]);

  if (error) {
    return (
      <div className={cn('space-y-4', className)}>
        <ClaimReviewErrorState onRefresh={handleRefresh} />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        <ClaimReviewLoadingState />
      </div>
    );
  }

  if (draftClaims.length === 0) {
    return (
      <div className={cn('space-y-4', className)}>
        <ClaimReviewEmptyState onBack={onBack} />
      </div>
    );
  }

  const isAnyUpdating = isAnyClaimUpdating || _emailingSingleClaim !== null;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <ClaimReviewHeader
        onRefresh={handleRefresh}
        onBack={onBack}
        isLoading={isLoading}
        disabled={isAnyUpdating}
      />

      {/* Summary Statistics */}
      <ReviewSummaryStats
        totalClaims={summaryStats.totalClaims}
        totalAmount={summaryStats.totalAmount}
        totalAttachments={summaryStats.totalAttachments}
        claimsWithoutAttachments={summaryStats.claimsWithoutAttachments}
      />

      {/* Warning for claims without attachments */}
      <ClaimReviewWarning
        claimsWithoutAttachments={summaryStats.claimsWithoutAttachments}
      />

      {/* Claims List */}
      <div className="space-y-4">
        {draftClaims.map((claim) => (
          <ClaimReviewItem
            key={claim.id}
            claim={claim}
            onEdit={handleEditClaim}
            isUpdating={updatingClaims.has(claim.id)}
          />
        ))}
      </div>

      {/* Action Buttons */}
      <ReviewActions
        claimCount={draftClaims.length}
        onSendEmail={() => handleMarkAllReady(draftClaims)}
        isLoading={isAnyUpdating}
        disabled={isAnyUpdating}
      />
    </div>
  );
};
