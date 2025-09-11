import React, { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getQueryKey, QueryGroup, QueryType } from '../queries/keys';
import { apiClient } from '@/lib/api-client';
import { IAuthStatusResponse } from '@project/types';
import { ErrorHandler } from '../queries/helper/error-handler';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

/**
 * Performance monitoring for authentication status checks
 * Logs to console in development when checks exceed 100ms threshold
 */
const monitorPerformance = (startTime: number, operation: string) => {
  if (process.env.NODE_ENV === 'development') {
    const duration = performance.now() - startTime;
    if (duration > 100) {
      // eslint-disable-next-line no-console
      console.warn(
        `⚠️ Auth ${operation} took ${duration.toFixed(2)}ms (target: <100ms)`,
        {
          duration,
          operation,
          timestamp: new Date().toISOString(),
        },
      );
    } else {
      // eslint-disable-next-line no-console
      console.log(
        `✅ Auth ${operation} completed in ${duration.toFixed(2)}ms`,
        {
          duration,
          operation,
          timestamp: new Date().toISOString(),
        },
      );
    }
  }
};

/**
 * Authentication error messages for OAuth failures
 */
const AUTH_ERROR_MESSAGES = Object.freeze({
  DOMAIN_RESTRICTION:
    'Access denied: Only @mavericks-consulting.com accounts are allowed',
  NETWORK_ERROR: 'Connection failed. Please check your network and try again.',
  GENERIC_AUTH_ERROR: 'Authentication failed. Please try again.',
} as const);

/**
 * Detects if an error is related to domain restriction based on status code and message
 * Optimized for performance with early returns
 */
const isDomainRestrictionError = (error: unknown): boolean => {
  const statusCode = ErrorHandler.extractStatusCodeFromError(error);

  // Early return for non-403 errors to avoid expensive string operations
  if (statusCode !== 403) {
    return false;
  }

  const errorMessage = ErrorHandler.extractErrorMessage(error).toLowerCase();

  return (
    errorMessage.includes('domain') ||
    errorMessage.includes('mavericks-consulting.com') ||
    errorMessage.includes('access denied')
  );
};

/**
 * Enhanced auth status hook with comprehensive OAuth error handling
 * Optimized for 100ms response time requirement
 */
export const useAuthStatus = () => {
  const router = useRouter();

  // Memoized error handler to prevent recreating function on every render
  const handleAuthError = useCallback(
    (error: unknown) => {
      const statusCode = ErrorHandler.extractStatusCodeFromError(error);

      // Handle domain restriction errors
      if (isDomainRestrictionError(error)) {
        toast.error(AUTH_ERROR_MESSAGES.DOMAIN_RESTRICTION);
        // Redirect to login page with error parameter for consistency
        router.push('/login?error=domain_not_allowed');
        return;
      }

      // Handle network errors
      if (statusCode === 'ERR_NETWORK') {
        toast.error(AUTH_ERROR_MESSAGES.NETWORK_ERROR);
        return;
      }

      // Handle other authentication failures silently for status checks
      // This prevents spam when the user is legitimately not authenticated
      if (statusCode === 401 || statusCode === 403) {
        // Silent failure - user is just not authenticated
        return;
      }

      // Handle unexpected server errors
      if (statusCode && statusCode >= 500) {
        toast.error(AUTH_ERROR_MESSAGES.GENERIC_AUTH_ERROR);
        return;
      }

      // For all other errors, use the extracted message or fallback
      const errorMessage = ErrorHandler.extractErrorMessage(error);
      if (errorMessage !== 'Oops! Something went wrong!') {
        toast.error(errorMessage);
      }
    },
    [router],
  );

  // Memoized query key to prevent recreation on every render
  const queryKey = useMemo(
    () =>
      getQueryKey({
        group: QueryGroup.AUTH,
        type: QueryType.ONE,
        key: 'status',
      }),
    [],
  );

  // Memoized query function for optimal performance with monitoring
  const queryFn = useCallback(async (): Promise<IAuthStatusResponse> => {
    const startTime = performance.now();
    try {
      const result = await apiClient.get<IAuthStatusResponse>('/auth/status');
      monitorPerformance(startTime, 'status check');
      return result;
    } catch (error) {
      monitorPerformance(startTime, 'status check (failed)');
      throw error;
    }
  }, []);

  // Memoized retry function to prevent recreation
  const retryFn = useCallback((failureCount: number, error: unknown) => {
    // Don't retry domain restriction errors or 401/403
    if (
      isDomainRestrictionError(error) ||
      ErrorHandler.extractStatusCodeFromError(error) === 401 ||
      ErrorHandler.extractStatusCodeFromError(error) === 403
    ) {
      return false;
    }

    // Retry network errors and server errors up to 3 times
    return failureCount < 3;
  }, []);

  // Memoized retry delay function
  const retryDelayFn = useCallback(
    (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
    [],
  );

  // Memoized refetch interval function
  const refetchIntervalFn = useCallback(
    (query: { state: { error?: unknown } }) => {
      // Background retry every 30 seconds if there's an error (for network issues)
      if (query.state.error) {
        const statusCode = ErrorHandler.extractStatusCodeFromError(
          query.state.error,
        );
        // Only auto-retry network errors, not auth failures
        if (statusCode === 'ERR_NETWORK' || (statusCode && statusCode >= 500)) {
          return 30000; // 30 seconds
        }
      }
      return false; // No automatic refetch if no error or if auth error
    },
    [],
  );

  const query = useQuery<IAuthStatusResponse>({
    queryKey,
    queryFn,
    retry: retryFn,
    retryDelay: retryDelayFn,
    // Optimized for 100ms requirement: reduce stale time for faster cache checks
    staleTime: 30 * 1000, // 30 seconds (reduced from 5 minutes)
    // Optimize garbage collection time for faster subsequent requests
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: true,
    refetchInterval: refetchIntervalFn,
    // Enable network mode optimization for faster responses
    networkMode: 'online',
    // Optimize refetch behavior
    refetchOnMount: 'always',
  });

  // Memoized error effect to prevent unnecessary re-runs
  React.useEffect(() => {
    if (query.error) {
      handleAuthError(query.error);
    }
  }, [query.error, handleAuthError]);

  // Memoized return value to ensure stable reference for consumers
  return useMemo(() => {
    const hookStartTime = performance.now();

    const result = {
      ...query,
      // Add performance markers for monitoring (development only)
      ...(process.env.NODE_ENV === 'development' && {
        _performanceMetrics: {
          isCached: !query.isFetching && !!query.data,
          lastFetchTime: query.dataUpdatedAt,
          cacheHitRatio: query.isStale ? 'miss' : 'hit',
          hookExecutionTime: performance.now() - hookStartTime,
          isOptimal: performance.now() - hookStartTime < 10, // Hook execution should be <10ms
        },
      }),
    };

    // Monitor hook execution time in development
    if (process.env.NODE_ENV === 'development') {
      const hookDuration = performance.now() - hookStartTime;
      if (hookDuration > 10) {
        // eslint-disable-next-line no-console
        console.warn(
          `⚠️ useAuthStatus hook execution took ${hookDuration.toFixed(2)}ms (target: <10ms)`,
        );
      }
    }

    return result;
  }, [query]);
};
