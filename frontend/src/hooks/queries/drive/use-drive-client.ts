import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getQueryKey, QueryGroup, QueryType } from '../keys';
import {
  createDriveClient,
  DriveClient,
  DriveClientError,
} from '@/lib/drive-client';
import { ErrorHandler } from '../helper/error-handler';
import { DriveClientState } from '@project/types';

interface UseDriveClientState extends DriveClientState {
  isLoading: boolean;
  client?: DriveClient;
  error?: string;
}

interface UseDriveClientActions {
  initialize: () => Promise<void>;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshToken: () => Promise<string | null>;
  getAccessToken: () => Promise<string | null>;
}

let globalDriveClient: DriveClient | null = null;

const getDriveClient = (): DriveClient => {
  if (!globalDriveClient) {
    globalDriveClient = createDriveClient();
  }
  return globalDriveClient;
};

export const useDriveClientState = () => {
  return useQuery<DriveClientState>({
    queryKey: getQueryKey({
      group: QueryGroup.DRIVE,
      type: QueryType.ONE,
      key: 'client-state',
    }),
    queryFn: async () => {
      const client = getDriveClient();
      return client.state;
    },
    staleTime: 1000 * 30, // 30 seconds - relatively fresh for auth state
    refetchInterval: 1000 * 60, // Re-check every minute if component is active
    retry: false,
  });
};

export const useDriveClientInit = () => {
  const queryClient = useQueryClient();

  return useMutation<
    {
      success: boolean;
      error?: { message: string; code: number; status?: string };
    },
    Error
  >({
    mutationFn: async () => {
      const client = getDriveClient();
      return await client.initialize();
    },
    onSuccess: (result) => {
      if (result.success) {
        // Invalidate the client state to refresh it
        void queryClient.invalidateQueries({
          queryKey: getQueryKey({
            group: QueryGroup.DRIVE,
            type: QueryType.ONE,
            key: 'client-state',
          }),
        });
      }
    },
    onError: (_error) => {
      // Drive client initialization failed
    },
  });
};

export const useDriveSignIn = () => {
  const queryClient = useQueryClient();

  return useMutation<
    {
      success: boolean;
      data?: unknown;
      error?: { message: string; code: number; status?: string };
    },
    Error
  >({
    mutationFn: async () => {
      const client = getDriveClient();
      return await client.signIn();
    },
    onSuccess: (result) => {
      if (result.success) {
        // Invalidate the client state to refresh auth status
        void queryClient.invalidateQueries({
          queryKey: getQueryKey({
            group: QueryGroup.DRIVE,
            type: QueryType.ONE,
            key: 'client-state',
          }),
        });
      }
    },
    onError: (_error) => {
      // Drive sign-in failed
    },
  });
};

export const useDriveSignOut = () => {
  const queryClient = useQueryClient();

  return useMutation<
    {
      success: boolean;
      error?: { message: string; code: number; status?: string };
    },
    Error
  >({
    mutationFn: async () => {
      const client = getDriveClient();
      return await client.signOut();
    },
    onSuccess: (result) => {
      if (result.success) {
        // Clear all Drive-related queries when signing out
        queryClient.removeQueries({
          queryKey: [QueryGroup.DRIVE],
        });
      }
    },
    onError: (_error) => {
      // Drive sign-out failed
    },
  });
};

export const useDriveTokenRefresh = () => {
  const queryClient = useQueryClient();

  return useMutation<string, Error>({
    mutationFn: async () => {
      const client = getDriveClient();
      const result = await client.refreshToken();

      if (!result.success) {
        throw new DriveClientError(
          result.error?.message || 'Token refresh failed',
          result.error?.code || 500,
          result.error?.status,
        );
      }

      return result.data || '';
    },
    onSuccess: () => {
      // Refresh client state after token refresh
      void queryClient.invalidateQueries({
        queryKey: getQueryKey({
          group: QueryGroup.DRIVE,
          type: QueryType.ONE,
          key: 'client-state',
        }),
      });
    },
    onError: (_error) => {
      // Drive token refresh failed
      // Clear auth-related queries on token refresh failure
      void queryClient.removeQueries({
        queryKey: [QueryGroup.DRIVE],
      });
    },
  });
};

export const useDriveClient = (): UseDriveClientState &
  UseDriveClientActions => {
  const {
    data: clientState,
    isLoading,
    error: queryError,
  } = useDriveClientState();

  const initMutation = useDriveClientInit();
  const signInMutation = useDriveSignIn();
  const signOutMutation = useDriveSignOut();
  const refreshTokenMutation = useDriveTokenRefresh();

  const error = queryError
    ? ErrorHandler.extractErrorMessage(queryError)
    : clientState?.error || undefined;

  const initialize = async () => {
    try {
      const result = await initMutation.mutateAsync();
      if (!result.success) {
        throw new DriveClientError(
          result.error?.message || 'Initialization failed',
          result.error?.code || 500,
          result.error?.status,
        );
      }
    } catch (error) {
      // Drive client initialization error
      throw error;
    }
  };

  const signIn = async () => {
    try {
      const result = await signInMutation.mutateAsync();
      if (!result.success) {
        throw new DriveClientError(
          result.error?.message || 'Sign-in failed',
          result.error?.code || 500,
          result.error?.status,
        );
      }
    } catch (error) {
      // Drive sign-in error
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const result = await signOutMutation.mutateAsync();
      if (!result.success) {
        throw new DriveClientError(
          result.error?.message || 'Sign-out failed',
          result.error?.code || 500,
          result.error?.status,
        );
      }
    } catch (error) {
      // Drive sign-out error
      throw error;
    }
  };

  const refreshToken = async (): Promise<string | null> => {
    try {
      return await refreshTokenMutation.mutateAsync();
    } catch (_error) {
      // Drive token refresh error
      return null;
    }
  };

  const getAccessToken = async (): Promise<string | null> => {
    try {
      const client = getDriveClient();
      return await client.getAccessToken();
    } catch (_error) {
      // Failed to get access token
      return null;
    }
  };

  return {
    // State from the client
    isInitialized: clientState?.isInitialized ?? false,
    isSignedIn: clientState?.isSignedIn ?? false,
    hasAccess: clientState?.hasAccess ?? false,
    isLoading:
      isLoading ||
      initMutation.isPending ||
      signInMutation.isPending ||
      signOutMutation.isPending ||
      refreshTokenMutation.isPending,
    error,
    client: globalDriveClient || undefined,

    // Actions
    initialize,
    signIn,
    signOut,
    refreshToken,
    getAccessToken,
  };
};
