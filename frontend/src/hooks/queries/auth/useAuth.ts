import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getQueryKey, QueryGroup, QueryType } from '../keys';
import { apiClient } from '@/lib/api-client';
import { IAuthResponse, IAuthStatusResponse } from '@project/types';

export const useAuthStatus = () => {
  return useQuery<IAuthStatusResponse>({
    queryKey: getQueryKey({
      group: QueryGroup.AUTH,
      type: QueryType.ONE,
      key: 'status',
    }),
    queryFn: async () => {
      return await apiClient.get<IAuthStatusResponse>('/auth/status');
    },
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useAuthProfile = () => {
  return useQuery<IAuthResponse>({
    queryKey: getQueryKey({
      group: QueryGroup.AUTH,
      type: QueryType.ONE,
      key: 'profile',
    }),
    queryFn: async () => {
      return await apiClient.get<IAuthResponse>('/auth/profile');
    },
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useLogout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return await apiClient.post<{ message: string }>('/auth/logout');
    },
    onSuccess: () => {
      // Clear all auth-related queries from cache
      queryClient.removeQueries({
        queryKey: [QueryGroup.AUTH],
      });

      // Optionally redirect to login page or home
      // window.location.href = '/';
    },
    onError: (error) => {
      console.error('Logout failed:', error);
    },
  });
};

export const useRefreshToken = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return await apiClient.post<IAuthResponse>('/auth/refresh');
    },
    onSuccess: (data) => {
      // Update the auth queries with new data
      queryClient.setQueryData(
        getQueryKey({
          group: QueryGroup.AUTH,
          type: QueryType.ONE,
          key: 'status',
        }),
        {
          isAuthenticated: data.isAuthenticated,
          user: data.user,
        },
      );

      queryClient.setQueryData(
        getQueryKey({
          group: QueryGroup.AUTH,
          type: QueryType.ONE,
          key: 'profile',
        }),
        data,
      );
    },
    onError: (error) => {
      console.error('Token refresh failed:', error);
      // Clear auth data on refresh failure
      queryClient.removeQueries({
        queryKey: [QueryGroup.AUTH],
      });
    },
  });
};

// Custom hook that combines auth status and provides convenience methods
export const useAuth = () => {
  const {
    data: authStatus,
    isLoading: isStatusLoading,
    error: statusError,
  } = useAuthStatus();
  const {
    data: profile,
    isLoading: isProfileLoading,
    error: profileError,
  } = useAuthProfile();
  const logoutMutation = useLogout();
  const refreshMutation = useRefreshToken();

  const isAuthenticated = authStatus?.isAuthenticated ?? false;
  const user = authStatus?.user ?? profile?.user ?? null;
  const isLoading = isStatusLoading || isProfileLoading;
  const error = statusError || profileError;

  const logout = async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const refreshToken = async () => {
    try {
      return await refreshMutation.mutateAsync();
    } catch (error) {
      console.error('Token refresh error:', error);
      throw error;
    }
  };

  return {
    // Auth state
    isAuthenticated,
    user,
    isLoading,
    error,

    // Actions
    logout,
    refreshToken,

    // Mutation states
    isLoggingOut: logoutMutation.isPending,
    isRefreshing: refreshMutation.isPending,

    // Raw query data for advanced use cases
    authStatus,
    profile,
  };
};
