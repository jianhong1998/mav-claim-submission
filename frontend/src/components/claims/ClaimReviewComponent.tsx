'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AttachmentList } from '@/components/attachments/AttachmentList';
import {
  IClaimMetadata,
  IClaimListResponse,
  IClaimResponse,
  ClaimCategory,
  ClaimStatus,
} from '@project/types';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import {
  CheckCircle2,
  Calendar,
  DollarSign,
  FileText,
  AlertCircle,
  RefreshCw,
  Edit,
  ArrowLeft,
} from 'lucide-react';

interface ClaimReviewComponentProps {
  onBack?: () => void;
  onEditClaim?: (claim: IClaimMetadata) => void;
  className?: string;
}

/**
 * Gets category display name for UI
 */
const getCategoryDisplayName = (category: ClaimCategory): string => {
  const categoryNames = {
    [ClaimCategory.TELCO]: 'Telecommunications',
    [ClaimCategory.FITNESS]: 'Fitness & Wellness',
    [ClaimCategory.DENTAL]: 'Dental Care',
    [ClaimCategory.SKILL_ENHANCEMENT]: 'Skill Enhancement',
    [ClaimCategory.COMPANY_EVENT]: 'Company Event',
    [ClaimCategory.COMPANY_LUNCH]: 'Company Lunch',
    [ClaimCategory.COMPANY_DINNER]: 'Company Dinner',
    [ClaimCategory.OTHERS]: 'Others',
  };
  return categoryNames[category] || category;
};

/**
 * Formats amount in SGD currency
 */
const formatAmount = (amount: number): string => {
  return new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: 'SGD',
  }).format(amount);
};

/**
 * Formats month/year display
 */
const formatMonthYear = (month: number, year: number): string => {
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

/**
 * Individual claim review item component
 */
interface ClaimReviewItemProps {
  claim: IClaimMetadata;
  onEdit: (claim: IClaimMetadata) => void;
  isUpdating: boolean;
}

const ClaimReviewItem: React.FC<ClaimReviewItemProps> = ({
  claim,
  onEdit,
  isUpdating,
}) => {
  const [showAttachments, setShowAttachments] = useState(false);
  const attachmentCount = claim.attachments?.length || 0;

  const handleEditClick = useCallback(() => {
    onEdit(claim);
  }, [claim, onEdit]);

  return (
    <Card className={cn('relative transition-all', isUpdating && 'opacity-50')}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base">
              {claim.claimName ||
                `${getCategoryDisplayName(claim.category)} Claim`}
            </CardTitle>
            <CardDescription className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatMonthYear(claim.month, claim.year)}
              </span>
              <span className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                {formatAmount(claim.totalAmount)}
              </span>
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {attachmentCount} file{attachmentCount !== 1 ? 's' : ''}
              </span>
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEditClick}
              disabled={isUpdating}
              className="h-8 w-8 p-0"
              title="Edit claim"
            >
              <Edit className="h-4 w-4" />
              <span className="sr-only">Edit claim</span>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div>Category: {getCategoryDisplayName(claim.category)}</div>
          <div>Status: {claim.status}</div>
        </div>

        {attachmentCount > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Attachments</div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAttachments(!showAttachments)}
                className="h-auto p-1 text-xs"
              >
                {showAttachments ? 'Hide' : 'Show'} Details
              </Button>
            </div>

            {showAttachments && (
              <div className="ml-2">
                <AttachmentList
                  claimId={claim.id}
                  showActions={false}
                  className="space-y-2"
                />
              </div>
            )}
          </div>
        )}

        {attachmentCount === 0 && (
          <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <span className="text-sm text-yellow-700 dark:text-yellow-300">
              No attachments uploaded for this claim
            </span>
          </div>
        )}
      </CardContent>

      {isUpdating && (
        <div className="absolute inset-0 bg-background/50 flex items-center justify-center rounded-xl">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            Updating...
          </div>
        </div>
      )}
    </Card>
  );
};

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

  // Mutation for marking claims as ready
  const markReadyMutation = useMutation({
    mutationFn: async (claimIds: string[]) => {
      // Call PUT /claims/:id/status endpoint for each claim individually
      const updatePromises = claimIds.map((claimId) =>
        apiClient.put<IClaimResponse>(`/claims/${claimId}/status`, {
          status: ClaimStatus.SENT,
        }),
      );

      return Promise.all(updatePromises);
    },
    onMutate: (claimIds) => {
      setUpdatingClaims(new Set(claimIds));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['claims'] });
      toast.success('Claims marked as ready successfully');
      // Redirect to claims list page after successful update
      if (typeof window !== 'undefined') {
        window.location.href = '/claims';
      }
    },
    onError: () => {
      toast.error('Failed to mark claims as ready');
    },
    onSettled: () => {
      setUpdatingClaims(new Set());
    },
  });

  const handleMarkAllReady = useCallback(() => {
    if (draftClaims.length === 0) return;

    const hasClaimsWithoutAttachments = draftClaims.some(
      (claim) => !claim.attachments?.length,
    );

    let confirmMessage = `Are you sure you want to mark all ${draftClaims.length} claim${draftClaims.length !== 1 ? 's' : ''} as ready for processing?`;

    if (hasClaimsWithoutAttachments) {
      confirmMessage +=
        '\n\nWarning: Some claims do not have any attachments. These will still be marked as ready.';
    }

    if (window.confirm(confirmMessage)) {
      const claimIds = draftClaims.map((claim) => claim.id);
      markReadyMutation.mutate(claimIds);
    }
  }, [draftClaims, markReadyMutation]);

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

  const isAnyClaimUpdating = updatingClaims.size > 0;

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
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Summary</CardTitle>
          <CardDescription>
            Review your draft claims before marking them as ready
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-blue-500/10 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {summaryStats.totalClaims}
              </div>
              <div className="text-sm text-muted-foreground">Draft Claims</div>
            </div>
            <div className="text-center p-3 bg-green-500/10 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {formatAmount(summaryStats.totalAmount)}
              </div>
              <div className="text-sm text-muted-foreground">Total Amount</div>
            </div>
            <div className="text-center p-3 bg-purple-500/10 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {summaryStats.totalAttachments}
              </div>
              <div className="text-sm text-muted-foreground">Total Files</div>
            </div>
            <div className="text-center p-3 bg-yellow-500/10 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {summaryStats.claimsWithoutAttachments}
              </div>
              <div className="text-sm text-muted-foreground">Without Files</div>
            </div>
          </div>
        </CardContent>
      </Card>

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
      <div className="flex items-center justify-center gap-4 pt-6 border-t">
        <Button
          variant="default"
          size="lg"
          onClick={handleMarkAllReady}
          disabled={isAnyClaimUpdating || draftClaims.length === 0}
          className="min-w-48"
        >
          {isAnyClaimUpdating ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Updating Claims...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Mark All {draftClaims.length} Claim
              {draftClaims.length !== 1 ? 's' : ''} as Ready
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
