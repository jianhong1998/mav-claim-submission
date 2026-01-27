import { useQuery } from '@tanstack/react-query';
import { categoryQueryKeys } from '../queries/keys/key';
import { apiClient } from '@/lib/api-client';
import { ErrorHandler } from '../queries/helper/error-handler';
import type {
  IClaimCategoryListResponse,
  IClaimCategory,
} from '@project/types';

export interface UseCategoriesParams {
  includeDisabled?: boolean;
  includeDeleted?: boolean;
}

/**
 * Maps error to user-friendly message
 */
const getErrorMessage = (error: unknown): string => {
  const statusCode = ErrorHandler.extractStatusCodeFromError(error);

  switch (statusCode) {
    case 401:
      return 'Authentication required to view categories.';
    case 403:
      return 'You do not have permission to view categories.';
    case 404:
      return 'Categories not found.';
    default:
      return 'Failed to load categories. Please try again.';
  }
};

/**
 * Base hook for fetching claim categories with optional filtering
 */
export const useCategories = (params?: UseCategoriesParams) => {
  const query = useQuery<IClaimCategory[]>({
    queryKey: categoryQueryKeys.list(params),
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (params?.includeDisabled) {
        queryParams.append('includeDisabled', 'true');
      }
      if (params?.includeDeleted) {
        queryParams.append('includeDeleted', 'true');
      }

      const queryString = queryParams.toString();
      const endpoint = `/claim-categories${queryString ? `?${queryString}` : ''}`;

      const response =
        await apiClient.get<IClaimCategoryListResponse>(endpoint);
      return response.categories;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - categories don't change frequently
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error) => {
      const statusCode = ErrorHandler.extractStatusCodeFromError(error);
      // Don't retry on 401, 403, 404
      if (statusCode === 401 || statusCode === 403 || statusCode === 404) {
        return false;
      }
      // Retry network errors and server errors up to 3 times
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  return {
    ...query,
    errorMessage: query.error ? getErrorMessage(query.error) : null,
  };
};

/**
 * Convenience hook for fetching categories for selection in forms
 * Only returns enabled categories (default behavior)
 */
export const useCategoriesForSelection = () => {
  return useCategories();
};

/**
 * Convenience hook for fetching all categories including disabled and deleted
 * Useful for display/historical purposes
 */
export const useCategoriesForDisplay = () => {
  return useCategories({
    includeDisabled: true,
    includeDeleted: true,
  });
};
