import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { IPreviewEmailResponse } from '@project/types';

/**
 * Email preview hook for claim email previews
 *
 * Responsibilities:
 * - Fetch email preview via GET /claims/:id/preview endpoint
 * - Provide loading state and error handling
 * - Disable caching for fresh preview data
 * - Only fetch when claimId is provided
 *
 * Requirements: Requirement 5 (Loading State), Requirement 6 (Error Handling)
 *
 * Design: Simple React Query hook with no caching and conditional fetching
 */
export const useEmailPreview = (claimId: string | null) => {
  return useQuery<IPreviewEmailResponse>({
    queryKey: ['claims', 'preview', claimId],
    queryFn: async (): Promise<IPreviewEmailResponse> => {
      if (!claimId) {
        throw new Error('Claim ID is required');
      }
      return await apiClient.get<IPreviewEmailResponse>(
        `/claims/${claimId}/preview`,
      );
    },
    // Disable caching - always fetch fresh preview
    staleTime: 0,
    gcTime: 0,
    // Disable auto-retry to fail fast on errors
    retry: false,
    // Only fetch when claimId is not null
    enabled: claimId !== null,
  });
};

/**
 * Email preview query result type for components
 */
export type UseEmailPreviewResult = ReturnType<typeof useEmailPreview>;
