import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { getQueryKey, QueryGroup, QueryType } from '../queries/keys';
import { apiClient } from '@/lib/api-client';
import { ErrorHandler } from '../queries/helper/error-handler';

/**
 * User profile data with email preferences
 */
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  picture: string | null;
  googleId: string;
  emailPreferences: Array<{
    id: string;
    type: 'cc' | 'bcc';
    emailAddress: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Hook for fetching user profile data
 * Handles authentication errors and redirects appropriately
 */
export const useUserProfile = (userId: string | undefined) => {
  const router = useRouter();

  // Memoized query key to prevent recreation on every render
  const queryKey = useMemo(
    () =>
      getQueryKey({
        group: QueryGroup.USER,
        type: QueryType.ONE,
        key: { userId },
      }),
    [userId],
  );

  // Memoized query function
  const queryFn = useCallback(async (): Promise<UserProfile> => {
    if (!userId) {
      throw new Error('User ID is required');
    }
    return apiClient.get<UserProfile>(`/users/${userId}`);
  }, [userId]);

  const query = useQuery<UserProfile>({
    queryKey,
    queryFn,
    enabled: !!userId, // Only fetch when userId is available
    staleTime: 5 * 60 * 1000, // 5 minutes
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

  // Handle authentication errors
  const errorMessage = useMemo(() => {
    if (!query.error) return null;

    const statusCode = ErrorHandler.extractStatusCodeFromError(query.error);

    switch (statusCode) {
      case 401:
        // Unauthorized - redirect to login
        void router.push('/login');
        return null;
      case 403:
        return 'You do not have permission to view this profile.';
      case 404:
        return 'User profile not found.';
      default:
        return 'Failed to load profile data. Please try again.';
    }
  }, [query.error, router]);

  return useMemo(
    () => ({
      ...query,
      errorMessage,
    }),
    [query, errorMessage],
  );
};
