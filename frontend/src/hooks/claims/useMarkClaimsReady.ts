import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { IClaimMetadata } from '@project/types';

export const useMarkClaimsReady = () => {
  const queryClient = useQueryClient();
  const [updatingClaims, setUpdatingClaims] = useState<Set<string>>(new Set());

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

  const handleMarkAllReady = useCallback(
    (draftClaims: IClaimMetadata[]) => {
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
    },
    [markReadyAndEmailMutation],
  );

  return {
    updatingClaims,
    handleMarkAllReady,
    isAnyClaimUpdating: updatingClaims.size > 0,
  };
};
