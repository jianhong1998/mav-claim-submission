import React, { useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attachmentQueryKeys } from '../queries/keys/key';
import { apiClient } from '@/lib/api-client';
import { IAttachmentListResponse } from '@project/types';
import { ErrorHandler } from '../queries/helper/error-handler';
import { toast } from 'sonner';

/**
 * Enhanced attachment list hook for fetching and managing attachments
 * Follows existing useAuthStatus patterns for performance and error handling
 */
export const useAttachmentList = (claimId: string) => {
  const queryClient = useQueryClient();

  // Memoized error handler
  const handleError = useCallback((error: unknown, operation: string) => {
    const statusCode = ErrorHandler.extractStatusCodeFromError(error);
    const errorMessage = ErrorHandler.extractErrorMessage(error);

    if (statusCode === 404) {
      // Silent handling for 404 - no attachments found is valid state
      return;
    }

    if (statusCode === 'ERR_NETWORK') {
      toast.error('Network error. Please check your connection and try again.');
      return;
    }

    if (statusCode && statusCode >= 500) {
      toast.error(`Server error while ${operation}. Please try again.`);
      return;
    }

    toast.error(`Failed to ${operation}: ${errorMessage}`);
  }, []);

  // Memoized query key
  const queryKey = useMemo(() => attachmentQueryKeys.list(claimId), [claimId]);

  // Memoized query function
  const queryFn = useCallback(async (): Promise<IAttachmentListResponse> => {
    return apiClient.get<IAttachmentListResponse>(
      `/attachments/claim/${claimId}`,
    );
  }, [claimId]);

  // Attachment list query
  const query = useQuery<IAttachmentListResponse>({
    queryKey,
    queryFn,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error) => {
      const statusCode = ErrorHandler.extractStatusCodeFromError(error);
      // Don't retry on 404 or 403
      if (statusCode === 404 || statusCode === 403) {
        return false;
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Delete attachment mutation
  const deleteMutation = useMutation<void, unknown, string>({
    mutationFn: async (attachmentId: string) => {
      await apiClient.delete(`/attachments/${attachmentId}`);
    },
    onSuccess: (_, attachmentId) => {
      // Invalidate and refetch the attachment list
      void queryClient.invalidateQueries({ queryKey });

      // Invalidate claims queries to update attachment counts in claim cards
      void queryClient.invalidateQueries({ queryKey: ['claims'] });

      // Optimistically update the cache
      queryClient.setQueryData<IAttachmentListResponse>(queryKey, (old) => {
        if (!old || !old.attachments) return old;

        return {
          ...old,
          attachments: old.attachments.filter((att) => att.id !== attachmentId),
          total: Math.max((old.total || 0) - 1, 0),
        };
      });

      toast.success('Attachment deleted successfully');
    },
    onError: (error) => {
      handleError(error, 'delete attachment');
    },
  });

  // Refresh attachments function
  const refreshAttachments = useCallback(() => {
    return query.refetch();
  }, [query]);

  // Delete attachment function
  const deleteAttachment = useCallback(
    (attachmentId: string) => {
      return deleteMutation.mutateAsync(attachmentId);
    },
    [deleteMutation],
  );

  // Handle query errors
  React.useEffect(() => {
    if (query.error) {
      handleError(query.error, 'fetch attachments');
    }
  }, [query.error, handleError]);

  // Memoized return value for stable reference
  return useMemo(
    () => ({
      // Data
      attachments: query.data?.attachments || [],
      total: query.data?.total || 0,

      // States
      isLoading: query.isLoading,
      isFetching: query.isFetching,
      isError: query.isError,
      error: query.error,

      // Delete states
      isDeletingAttachment: deleteMutation.isPending,

      // Functions
      refreshAttachments,
      deleteAttachment,

      // Query metadata
      queryKey,
      lastFetched: query.dataUpdatedAt,
      isStale: query.isStale,
    }),
    [
      query.data?.attachments,
      query.data?.total,
      query.isLoading,
      query.isFetching,
      query.isError,
      query.error,
      query.dataUpdatedAt,
      query.isStale,
      deleteMutation.isPending,
      refreshAttachments,
      deleteAttachment,
      queryKey,
    ],
  );
};
