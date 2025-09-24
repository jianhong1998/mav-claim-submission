import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { ErrorHandler } from '../queries/helper/error-handler';
import { getQueryKey, QueryGroup, QueryType } from '../queries/keys';
import { IClaimEmailRequest, IClaimEmailResponse } from '@project/types';

/**
 * Email sending hook for claim submissions
 *
 * Responsibilities:
 * - Send claim emails via POST /email/send-claim endpoint
 * - Handle authentication and validation errors appropriately
 * - Provide proper loading states and error handling
 * - Invalidate relevant queries on success
 *
 * Requirements: 6.1-6.2 - API integration, 6.7 - structured error responses
 *
 * Design: Follows existing API hook patterns with proper error handling,
 * TypeScript types, and React Query integration for optimal performance
 */
export const useEmailSending = () => {
  const queryClient = useQueryClient();

  return useMutation<IClaimEmailResponse, Error, IClaimEmailRequest>({
    mutationFn: async (
      emailRequest: IClaimEmailRequest,
    ): Promise<IClaimEmailResponse> => {
      // Call the email sending endpoint with 30-second timeout
      return await apiClient.post<IClaimEmailResponse>(
        '/email/send-claim',
        emailRequest,
      );
    },
    onSuccess: (data, variables) => {
      // Invalidate claim-related queries to refresh status
      void queryClient.invalidateQueries({
        queryKey: getQueryKey({
          group: QueryGroup.ATTACHMENTS,
          type: QueryType.LIST,
          key: { claimId: variables.claimId },
        }),
      });

      // Invalidate any claim detail queries if they exist
      // Note: Claims module query keys would be defined there
      // This is a defensive approach in case they exist
      void queryClient.invalidateQueries({
        queryKey: ['claims', 'one', { claimId: variables.claimId }],
      });

      // Invalidate general claims list to show updated status
      void queryClient.invalidateQueries({
        queryKey: ['claims', 'list'],
      });
    },
    onError: (error) => {
      // Extract error message for UI to handle
      // Following existing pattern - let UI components handle display
      ErrorHandler.extractErrorMessage(error);
    },
    // Override default timeout to match API endpoint requirement (30 seconds)
    meta: {
      timeout: 30000,
    },
  });
};

/**
 * Email sending mutation result type for components
 */
export type UseEmailSendingResult = ReturnType<typeof useEmailSending>;

/**
 * Email sending state interface for components
 */
export interface EmailSendingState {
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  error: Error | null;
  data: IClaimEmailResponse | undefined;
}

/**
 * Helper to extract email sending state from mutation
 */
export const getEmailSendingState = (
  mutation: UseEmailSendingResult,
): EmailSendingState => ({
  isLoading: mutation.isPending,
  isError: mutation.isError,
  isSuccess: mutation.isSuccess,
  error: mutation.error,
  data: mutation.data,
});
