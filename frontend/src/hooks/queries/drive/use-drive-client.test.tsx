import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { ReactNode } from 'react';
import {
  useDriveClientState,
  useDriveClientInit,
  useDriveSignIn,
  useDriveSignOut,
  useDriveTokenRefresh,
  useDriveClient,
} from './use-drive-client';
import { DriveClientState } from '@project/types';

// Mock the drive client
vi.mock('@/lib/drive-client', () => ({
  createDriveClient: vi.fn(() => mockDriveClient),
  DriveClient: vi.fn(),
  DriveClientError: class extends Error {
    constructor(
      message: string,
      public code: number,
      public status?: string,
    ) {
      super(message);
      this.name = 'DriveClientError';
    }
  },
}));

// Mock the drive config constants
vi.mock('@/constants/drive-config', () => ({
  DriveApiConfig: {
    SCOPES: ['https://www.googleapis.com/auth/drive.file'],
    DISCOVERY_DOCS: [
      'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
    ],
  },
  DriveErrorCodes: {
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    INTERNAL_ERROR: 500,
  },
}));

// Mock ErrorHandler
vi.mock('../helper/error-handler', () => ({
  ErrorHandler: {
    extractErrorMessage: vi.fn(
      (error: Error) => error.message || 'Something went wrong',
    ),
  },
}));

// Mock constants
vi.mock('@/constants', () => ({
  GeneralErrorMessage: {
    SOMETHING_WENT_WRONG: 'Oops! Something went wrong!',
    NETWORK_ERROR:
      'Loss connection with server! Please try again in a few seconds!',
  },
}));

const mockDriveClient = {
  state: {
    isInitialized: false,
    isSignedIn: false,
    hasAccess: false,
    error: undefined,
  } as DriveClientState,
  initialize: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  refreshToken: vi.fn(),
  getAccessToken: vi.fn(),
};

// Test wrapper component
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  const TestWrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  TestWrapper.displayName = 'TestWrapper';

  return TestWrapper;
};

describe('use-drive-client hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock client state
    mockDriveClient.state = {
      isInitialized: false,
      isSignedIn: false,
      hasAccess: false,
      error: undefined,
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('useDriveClientState', () => {
    it('should fetch drive client state successfully', async () => {
      const expectedState: DriveClientState = {
        isInitialized: true,
        isSignedIn: true,
        hasAccess: true,
        error: undefined,
      };
      mockDriveClient.state = expectedState;

      const { result } = renderHook(() => useDriveClientState(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(expectedState);
    });

    it('should handle error state in client', async () => {
      const errorState: DriveClientState = {
        isInitialized: false,
        isSignedIn: false,
        hasAccess: false,
        error: 'Initialization failed',
      };
      mockDriveClient.state = errorState;

      const { result } = renderHook(() => useDriveClientState(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(errorState);
    });
  });

  describe('useDriveClientInit', () => {
    it('should call initialize successfully', async () => {
      const mockResult = { success: true };
      mockDriveClient.initialize.mockResolvedValue(mockResult);

      const { result } = renderHook(() => useDriveClientInit(), {
        wrapper: createWrapper(),
      });

      let response: { success: boolean } = { success: false };
      await act(async () => {
        response = await result.current.mutateAsync();
      });

      expect(response).toEqual(mockResult);
      expect(mockDriveClient.initialize).toHaveBeenCalledTimes(1);
    });

    it('should handle initialization rejection', async () => {
      const error = new Error('Network error');
      mockDriveClient.initialize.mockRejectedValue(error);

      const { result } = renderHook(() => useDriveClientInit(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await expect(result.current.mutateAsync()).rejects.toThrow(
          'Network error',
        );
      });

      expect(mockDriveClient.initialize).toHaveBeenCalledTimes(1);
    });
  });

  describe('useDriveSignIn', () => {
    it('should call signIn successfully', async () => {
      const mockResult = { success: true };
      mockDriveClient.signIn.mockResolvedValue(mockResult);

      const { result } = renderHook(() => useDriveSignIn(), {
        wrapper: createWrapper(),
      });

      let response: { success: boolean } = { success: false };
      await act(async () => {
        response = await result.current.mutateAsync();
      });

      expect(response).toEqual(mockResult);
      expect(mockDriveClient.signIn).toHaveBeenCalledTimes(1);
    });
  });

  describe('useDriveSignOut', () => {
    it('should call signOut successfully', async () => {
      const mockResult = { success: true };
      mockDriveClient.signOut.mockResolvedValue(mockResult);

      const { result } = renderHook(() => useDriveSignOut(), {
        wrapper: createWrapper(),
      });

      let response: { success: boolean } = { success: false };
      await act(async () => {
        response = await result.current.mutateAsync();
      });

      expect(response).toEqual(mockResult);
      expect(mockDriveClient.signOut).toHaveBeenCalledTimes(1);
    });
  });

  describe('useDriveTokenRefresh', () => {
    it('should refresh token successfully', async () => {
      const mockResult = { success: true, data: 'new-access-token' };
      mockDriveClient.refreshToken.mockResolvedValue(mockResult);

      const { result } = renderHook(() => useDriveTokenRefresh(), {
        wrapper: createWrapper(),
      });

      let response: string = '';
      await act(async () => {
        response = await result.current.mutateAsync();
      });

      expect(response).toBe('new-access-token');
      expect(mockDriveClient.refreshToken).toHaveBeenCalledTimes(1);
    });

    it('should handle token refresh failure', async () => {
      const mockError = {
        success: false,
        error: {
          code: 401,
          message: 'Token refresh failed',
          status: 'TOKEN_REFRESH_FAILED',
        },
      };
      mockDriveClient.refreshToken.mockResolvedValue(mockError);

      const { result } = renderHook(() => useDriveTokenRefresh(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await expect(result.current.mutateAsync()).rejects.toThrow(
          'Token refresh failed',
        );
      });

      expect(mockDriveClient.refreshToken).toHaveBeenCalledTimes(1);
    });
  });

  describe('useDriveClient', () => {
    it('should return combined client state and actions', async () => {
      const mockState: DriveClientState = {
        isInitialized: true,
        isSignedIn: true,
        hasAccess: true,
        error: undefined,
      };
      mockDriveClient.state = mockState;

      const { result } = renderHook(() => useDriveClient(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
        expect(result.current.isSignedIn).toBe(true);
        expect(result.current.hasAccess).toBe(true);
        expect(result.current.error).toBeUndefined();
      });

      // Check that actions are available
      expect(typeof result.current.initialize).toBe('function');
      expect(typeof result.current.signIn).toBe('function');
      expect(typeof result.current.signOut).toBe('function');
      expect(typeof result.current.refreshToken).toBe('function');
      expect(typeof result.current.getAccessToken).toBe('function');
    });

    it('should handle initialize action', async () => {
      mockDriveClient.initialize.mockResolvedValue({ success: true });

      const { result } = renderHook(() => useDriveClient(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.initialize();
      });

      expect(mockDriveClient.initialize).toHaveBeenCalledTimes(1);
    });

    it('should handle signIn action', async () => {
      mockDriveClient.signIn.mockResolvedValue({ success: true });

      const { result } = renderHook(() => useDriveClient(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.signIn();
      });

      expect(mockDriveClient.signIn).toHaveBeenCalledTimes(1);
    });

    it('should handle signOut action', async () => {
      mockDriveClient.signOut.mockResolvedValue({ success: true });

      const { result } = renderHook(() => useDriveClient(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.signOut();
      });

      expect(mockDriveClient.signOut).toHaveBeenCalledTimes(1);
    });

    it('should handle getAccessToken action', async () => {
      mockDriveClient.getAccessToken.mockResolvedValue('current-token');

      const { result } = renderHook(() => useDriveClient(), {
        wrapper: createWrapper(),
      });

      let token: string | null = null;
      await act(async () => {
        token = await result.current.getAccessToken();
      });

      expect(token).toBe('current-token');
      expect(mockDriveClient.getAccessToken).toHaveBeenCalledTimes(1);
    });

    it('should handle refreshToken with successful response', async () => {
      mockDriveClient.refreshToken.mockResolvedValue({
        success: true,
        data: 'new-token',
      });

      const { result } = renderHook(() => useDriveClient(), {
        wrapper: createWrapper(),
      });

      let token: string | null = null;
      await act(async () => {
        token = await result.current.refreshToken();
      });

      expect(token).toBe('new-token');
      expect(mockDriveClient.refreshToken).toHaveBeenCalledTimes(1);
    });

    it('should return null for failed token operations', async () => {
      mockDriveClient.refreshToken.mockRejectedValue(
        new Error('Token refresh failed'),
      );
      mockDriveClient.getAccessToken.mockRejectedValue(
        new Error('Get token failed'),
      );

      const { result } = renderHook(() => useDriveClient(), {
        wrapper: createWrapper(),
      });

      let refreshToken: string | null = 'initial';
      let accessToken: string | null = 'initial';

      await act(async () => {
        refreshToken = await result.current.refreshToken();
        accessToken = await result.current.getAccessToken();
      });

      expect(refreshToken).toBeNull();
      expect(accessToken).toBeNull();
    });

    it('should show loading state during operations', async () => {
      mockDriveClient.initialize.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ success: true }), 50),
          ),
      );

      const { result } = renderHook(() => useDriveClient(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.initialize().catch(() => {
          // Handle error silently for test
        });
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 1000 },
      );
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete authentication flow', async () => {
      mockDriveClient.initialize.mockResolvedValue({ success: true });
      mockDriveClient.signIn.mockResolvedValue({ success: true });

      const { result } = renderHook(() => useDriveClient(), {
        wrapper: createWrapper(),
      });

      // Initialize first
      await act(async () => {
        await result.current.initialize();
      });

      // Then sign in
      await act(async () => {
        await result.current.signIn();
      });

      expect(mockDriveClient.initialize).toHaveBeenCalledTimes(1);
      expect(mockDriveClient.signIn).toHaveBeenCalledTimes(1);
    });

    it('should handle initialization failure with error result', async () => {
      const mockError = {
        success: false,
        error: {
          code: 500,
          message: 'Failed to load Google API',
          status: 'INITIALIZATION_FAILED',
        },
      };
      mockDriveClient.initialize.mockResolvedValue(mockError);

      const { result } = renderHook(() => useDriveClient(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await expect(result.current.initialize()).rejects.toThrow(
          'Failed to load Google API',
        );
      });

      expect(mockDriveClient.initialize).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error handling scenarios', () => {
    it('should handle Google Drive API authentication failures', async () => {
      const mockError = {
        success: false,
        error: {
          code: 401,
          message: 'Authentication failed',
          status: 'SIGN_IN_FAILED',
        },
      };
      mockDriveClient.signIn.mockResolvedValue(mockError);

      const { result } = renderHook(() => useDriveSignIn(), {
        wrapper: createWrapper(),
      });

      let response: {
        success: boolean;
        error?: { code: number; message: string; status?: string };
      } = {
        success: false,
      };
      await act(async () => {
        response = await result.current.mutateAsync();
      });

      expect(response).toEqual(mockError);
      expect(mockDriveClient.signIn).toHaveBeenCalledTimes(1);
    });

    it('should handle insufficient permissions scenario', async () => {
      const mockError = {
        success: false,
        error: {
          code: 403,
          message: 'Insufficient permissions',
          status: 'SIGN_IN_FAILED',
        },
      };
      mockDriveClient.signIn.mockResolvedValue(mockError);

      const { result } = renderHook(() => useDriveSignIn(), {
        wrapper: createWrapper(),
      });

      let response: {
        success: boolean;
        error?: { code: number; message: string; status?: string };
      } = {
        success: false,
      };
      await act(async () => {
        response = await result.current.mutateAsync();
      });

      expect(response).toEqual(mockError);
      expect(mockDriveClient.signIn).toHaveBeenCalledTimes(1);
    });
  });
});
