'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { IClaimMetadata, IClaimListResponse } from '@project/types';
import { apiClient } from '@/lib/api-client';
import { useEmailSending } from '@/hooks/email/useEmailSending';
import { toast } from 'sonner';
import { AlertCircle, RefreshCw, ArrowLeft, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ReviewSummaryStats } from './review-summary-stats';
import { ClaimReviewItem } from './claim-review-item';
import { ReviewActions } from './review-actions';

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
  const queryClient = useQueryClient();
  const [updatingClaims, setUpdatingClaims] = useState<Set<string>>(new Set());
  const [_emailingSingleClaim, _setEmailingSingleClaim] = useState<
    string | null
  >(null);
  const _emailSendingMutation = useEmailSending();

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

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const totalAmount = draftClaims.reduce(
      (sum, claim) => sum + claim.totalAmount,
      0,
    );
    const totalAttachments = draftClaims.reduce(
      (sum, claim) => sum + (claim.attachments?.length || 0),
      0,
    );
    const claimsWithoutAttachments = draftClaims.filter(
      (claim) => !claim.attachments?.length,
    ).length;

    return {
      totalClaims: draftClaims.length,
      totalAmount,
      totalAttachments,
      claimsWithoutAttachments,
    };
  }, [draftClaims]);

  // Mutation for sending emails and marking claims as ready
  const markReadyAndEmailMutation = useMutation({
    mutationFn: async (claimIds: string[]) => {
      const results = [];

      // Send email for each claim sequentially
      for (const claimId of claimIds) {
        try {
          // Send email (status is updated automatically by email service)
          const emailResult = await apiClient.post('/email/send-claim', {
            claimId,
          });

          results.push({
            claimId,
            success: true,
            emailResult,
          });
        } catch (error) {
          results.push({ claimId, success: false, error });
          throw error; // Stop processing on first failure
        }
      }

      return results;
    },
    onMutate: (claimIds) => {
      setUpdatingClaims(new Set(claimIds));
    },
    onSuccess: async (results) => {
      // Option 2: Await cache invalidation to prevent race conditions before redirect
      await queryClient.invalidateQueries({ queryKey: ['claims'] });
      const successCount = results.filter((r) => r.success).length;
      toast.success(
        `Successfully sent ${successCount} claim email${successCount !== 1 ? 's' : ''} and marked as ready`,
      );
      // Redirect to claims list page after cache is cleared
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    },
    onError: (error, _claimIds) => {
      // Log error for debugging purposes
      // eslint-disable-next-line no-console
      console.error('Failed to send emails and mark claims as ready:', error);
      toast.error(
        'Failed to send emails and mark claims as ready. Please try again.',
      );
    },
    onSettled: () => {
      setUpdatingClaims(new Set());
    },
    retry: false,
  });

  const handleMarkAllReady = useCallback(() => {
    if (draftClaims.length === 0) return;

    const hasClaimsWithoutAttachments = draftClaims.some(
      (claim) => !claim.attachments?.length,
    );

    let confirmMessage = `Are you sure you want to email and submit all ${draftClaims.length} claim${draftClaims.length !== 1 ? 's' : ''} for processing?\n\nThis will:`;
    confirmMessage += `\n• Send email notifications for each claim`;
    confirmMessage += `\n• Mark all claims as sent/submitted`;
    confirmMessage += `\n• Make them ready for processing`;

    if (hasClaimsWithoutAttachments) {
      confirmMessage +=
        '\n\nWarning: Some claims do not have any attachments. These will still be submitted.';
    }

    if (window.confirm(confirmMessage)) {
      const claimIds = draftClaims.map((claim) => claim.id);
      markReadyAndEmailMutation.mutate(claimIds);
    }
  }, [draftClaims, markReadyAndEmailMutation]);

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
        <div className="flex flex-col items-center justify-center p-8 rounded-lg border border-destructive/20 bg-destructive/5">
          <AlertCircle className="w-12 h-12 text-destructive mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            Failed to load claims
          </h3>
          <p className="text-sm text-muted-foreground text-center mb-4">
            Please check your connection and try again.
          </p>
          <Button
            variant="outline"
            onClick={handleRefresh}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <h1 className="text-2xl font-bold">Loading Review...</h1>
        </div>

        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card
              key={i}
              className="animate-pulse"
            >
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                  <div className="h-8 bg-muted rounded w-full"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (draftClaims.length === 0) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Review Claims</h1>
          {onBack && (
            <Button
              variant="outline"
              onClick={onBack}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}
        </div>

        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="text-lg font-semibold text-foreground mt-4">
            No draft claims to review
          </h3>
          <p className="text-sm text-muted-foreground mt-2">
            Create some claims first to review and finalize them.
          </p>
          {onBack && (
            <Button
              className="mt-4"
              onClick={onBack}
            >
              Create Claims
            </Button>
          )}
        </div>
      </div>
    );
  }

  const isAnyClaimUpdating =
    updatingClaims.size > 0 || _emailingSingleClaim !== null;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Review Claims</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isAnyClaimUpdating}
          >
            <RefreshCw
              className={cn('w-4 h-4 mr-2', isLoading && 'animate-spin')}
            />
            Refresh
          </Button>
          {onBack && (
            <Button
              variant="outline"
              onClick={onBack}
              disabled={isAnyClaimUpdating}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}
        </div>
      </div>

      {/* Summary Statistics */}
      <ReviewSummaryStats
        totalClaims={summaryStats.totalClaims}
        totalAmount={summaryStats.totalAmount}
        totalAttachments={summaryStats.totalAttachments}
        claimsWithoutAttachments={summaryStats.claimsWithoutAttachments}
      />

      {/* Warning for claims without attachments */}
      {summaryStats.claimsWithoutAttachments > 0 && (
        <div className="flex items-center gap-2 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
          <div className="text-sm text-yellow-700 dark:text-yellow-300">
            <strong>{summaryStats.claimsWithoutAttachments}</strong> claim
            {summaryStats.claimsWithoutAttachments !== 1 ? 's' : ''}{' '}
            {summaryStats.claimsWithoutAttachments !== 1 ? 'have' : 'has'} no
            attachments. Consider adding supporting documents before finalizing.
          </div>
        </div>
      )}

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
        onSendEmail={handleMarkAllReady}
        isLoading={isAnyClaimUpdating}
        disabled={isAnyClaimUpdating}
      />
    </div>
  );
};
