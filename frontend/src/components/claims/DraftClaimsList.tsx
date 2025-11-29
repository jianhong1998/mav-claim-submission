'use client';

import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import {
  IClaimMetadata,
  IClaimListResponse,
  IClaimResponse,
} from '@project/types';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { DraftClaimCard } from './draft-claim-card';
import LoadingSkeleton from '@/components/common/skeletons/loading-skeleton';
import EmptyState from '@/components/common/empty-states/empty-state';
import { FileText } from 'lucide-react';
import { getCategoryDisplayName } from '@/lib/claim-utils';
import { formatMonthYear } from '@/lib/format-utils';
import { useConfirmation } from '@/hooks/use-confirmation';

interface DraftClaimsListProps {
  onEditClaim?: (claim: IClaimMetadata) => void;
  className?: string;
}

/**
 * DraftClaimsList component displays a list of draft claims with management actions
 * Following requirements 4.1 and 4.2 for claim list management
 */
export const DraftClaimsList: React.FC<DraftClaimsListProps> = ({
  onEditClaim,
  className,
}) => {
  const queryClient = useQueryClient();
  const [deletingClaim, setDeletingClaim] = useState<string | null>(null);
  const { confirm } = useConfirmation();

  // Query for draft claims using existing GET /claims?status=draft endpoint
  const {
    data: response,
    isLoading,
    error,
  } = useQuery<IClaimListResponse>({
    queryKey: ['claims', 'draft'],
    queryFn: () => apiClient.get<IClaimListResponse>('/claims?status=draft'),
  });

  const draftClaims = response?.claims || [];

  // Mutation for deleting claims
  const deleteMutation = useMutation({
    mutationFn: (claimId: string) =>
      apiClient.delete<IClaimResponse>(`/claims/${claimId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['claims', 'draft'] });
      void queryClient.invalidateQueries({ queryKey: ['claims', 'all'] });
      toast.success('Claim deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete claim');
    },
    onSettled: () => {
      setDeletingClaim(null);
    },
  });

  const handleEditClaim = useCallback(
    (claim: IClaimMetadata) => {
      if (onEditClaim) {
        onEditClaim(claim);
      }
    },
    [onEditClaim],
  );

  const handleDeleteClaim = useCallback(
    async (claim: IClaimMetadata) => {
      const hasAttachments = claim.attachments && claim.attachments.length > 0;

      const confirmed = await confirm({
        title: 'Delete Claim',
        description: (
          <div className="space-y-3">
            <p>
              Are you sure you want to delete the claim &quot;
              {claim.claimName ||
                `${getCategoryDisplayName(claim.category)} - ${formatMonthYear(claim.month, claim.year)}`}
              &quot;?
            </p>
            {hasAttachments && (
              <p className="text-yellow-600 dark:text-yellow-500 text-sm font-medium">
                ⚠️ Warning: This claim has attachments. Files will remain in
                your Google Drive and should be manually removed if no longer
                needed.
              </p>
            )}
          </div>
        ),
        confirmText: 'Delete',
        cancelText: 'Cancel',
        variant: 'destructive',
      });

      if (confirmed) {
        setDeletingClaim(claim.id);
        deleteMutation.mutate(claim.id);
      }
    },
    [confirm, deleteMutation],
  );

  if (error) {
    return (
      <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
        <p className="text-sm text-red-600 dark:text-red-400">
          Failed to load draft claims. Please try again.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <LoadingSkeleton
        variant="claim-list"
        count={3}
      />
    );
  }

  if (draftClaims.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No draft claims"
        description="Create your first claim to get started with your expense submission."
      />
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">
          Draft Claims ({draftClaims.length})
        </h2>
      </div>

      <div className="space-y-3">
        {draftClaims.map((claim) => (
          <DraftClaimCard
            key={claim.id}
            claim={claim}
            onEdit={handleEditClaim}
            onDelete={handleDeleteClaim}
            isDeleting={deletingClaim === claim.id}
            className="relative"
            defaultExpanded={(claim.attachments?.length ?? 0) === 0}
          />
        ))}
      </div>
    </div>
  );
};
