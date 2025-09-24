import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getQueryKey, QueryGroup, QueryType } from '../queries/keys';
import { apiClient } from '@/lib/api-client';
import { ErrorHandler } from '../queries/helper/error-handler';

interface LogoutResponse {
  success: boolean;
  message: string;
}

export const useLogout = () => {
  const queryClient = useQueryClient();

  return useMutation<LogoutResponse, Error>({
    mutationFn: async () => {
      return await apiClient.post<LogoutResponse>('/auth/logout');
    },
    onSuccess: () => {
      // Invalidate auth status query to trigger refetch
      void queryClient.invalidateQueries({
        queryKey: getQueryKey({
          group: QueryGroup.AUTH,
          type: QueryType.ONE,
          key: 'status',
        }),
      });
    },
    onError: (error) => {
      // Error will be available in mutation.error for UI to handle
      // No need to log here as TanStack Query handles error state
      ErrorHandler.extractErrorMessage(error);
    },
  });
};
