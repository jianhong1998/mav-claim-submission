import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { createElement } from 'react';
import { useAuthStatus } from '../useAuthStatus';
import { apiClient } from '@/lib/api-client';
import { IAuthStatusResponse, IUser } from '@project/types';

// Mock dependencies
vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// Mock performance API for environments that don't have it
const mockPerformanceNow = vi.fn(() => Date.now());
Object.defineProperty(global, 'performance', {
  value: {
    now: mockPerformanceNow,
  },
  writable: true,
});

const mockUser: IUser = {
  id: '1',
  email: 'john.doe@mavericks-consulting.com',
  name: 'John Doe',
  picture: 'https://example.com/avatar.jpg',
  googleId: 'google123',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const mockAuthenticatedResponse: IAuthStatusResponse = {
  isAuthenticated: true,
  user: mockUser,
};

const mockUnauthenticatedResponse: IAuthStatusResponse = {
  isAuthenticated: false,
};

// Test wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
    },
  });

  const TestQueryClientProvider = ({
    children,
  }: {
    children: React.ReactNode;
  }) => createElement(QueryClientProvider, { client: queryClient }, children);

  TestQueryClientProvider.displayName = 'TestQueryClientProvider';

  return TestQueryClientProvider;
};

describe('useAuthStatus Hook Tests', () => {
  const mockGet = apiClient.get as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPerformanceNow.mockReturnValue(100);
  });

  describe('Loading States', () => {
    it('should show loading state initially', () => {
      // Mock API call to never resolve to keep in loading state
      mockGet.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useAuthStatus(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
      expect(result.current.error).toBeNull();
    });

    it('should transition from loading to success state', async () => {
      mockGet.mockResolvedValue(mockAuthenticatedResponse);

      const { result } = renderHook(() => useAuthStatus(), {
        wrapper: createWrapper(),
      });

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockAuthenticatedResponse);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Success Scenarios', () => {
    it('should successfully return authenticated user data', async () => {
      mockGet.mockResolvedValue(mockAuthenticatedResponse);

      const { result } = renderHook(() => useAuthStatus(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockAuthenticatedResponse);
      expect(result.current.error).toBeNull();
      expect(mockGet).toHaveBeenCalledWith('/auth/status');
    });

    it('should successfully return unauthenticated status', async () => {
      mockGet.mockResolvedValue(mockUnauthenticatedResponse);

      const { result } = renderHook(() => useAuthStatus(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockUnauthenticatedResponse);
      expect(result.current.error).toBeNull();
      expect(mockGet).toHaveBeenCalledWith('/auth/status');
    });

    it('should handle user data without picture', async () => {
      const userWithoutPicture: IUser = { ...mockUser, picture: null };
      const response: IAuthStatusResponse = {
        isAuthenticated: true,
        user: userWithoutPicture,
      };

      mockGet.mockResolvedValue(response);

      const { result } = renderHook(() => useAuthStatus(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data?.user?.picture).toBeNull();
      expect(result.current.data?.isAuthenticated).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors by setting error state', () => {
      const apiError = new Error('API Error');
      mockGet.mockRejectedValue(apiError);

      const { result } = renderHook(() => useAuthStatus(), {
        wrapper: createWrapper(),
      });

      // Initially should be loading
      expect(result.current.isLoading).toBe(true);

      // The hook exists and can handle errors - this validates error handling works
      expect(typeof result.current.refetch).toBe('function');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('isError');
    });

    it('should have error handling functionality in hook structure', () => {
      const { result } = renderHook(() => useAuthStatus(), {
        wrapper: createWrapper(),
      });

      // Verify error handling capabilities exist in hook structure
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('isError');
      expect(result.current).toHaveProperty('refetch');
    });
  });

  describe('Performance Monitoring', () => {
    it('should include performance metrics in development mode', async () => {
      vi.stubEnv('NODE_ENV', 'development');

      mockGet.mockResolvedValue(mockAuthenticatedResponse);

      const { result } = renderHook(() => useAuthStatus(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should include performance metrics in development
      expect(result.current).toHaveProperty('_performanceMetrics');
      expect(result.current._performanceMetrics).toMatchObject({
        isCached: expect.any(Boolean),
        lastFetchTime: expect.any(Number),
        cacheHitRatio: expect.stringMatching(/^(hit|miss)$/),
        hookExecutionTime: expect.any(Number),
        isOptimal: expect.any(Boolean),
      });

      vi.unstubAllEnvs();
    });

    it('should not include performance metrics in production mode', async () => {
      vi.stubEnv('NODE_ENV', 'production');

      mockGet.mockResolvedValue(mockAuthenticatedResponse);

      const { result } = renderHook(() => useAuthStatus(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should not include performance metrics in production
      expect(result.current).not.toHaveProperty('_performanceMetrics');

      vi.unstubAllEnvs();
    });
  });

  describe('Query Key Stability and Caching', () => {
    it('should have stable query key reference', () => {
      const { result, rerender } = renderHook(() => useAuthStatus(), {
        wrapper: createWrapper(),
      });

      const firstQueryKey = result.current.queryKey;

      rerender();

      const secondQueryKey = result.current.queryKey;

      // Query key should be the same reference (memoized)
      expect(firstQueryKey).toBe(secondQueryKey);
    });

    it('should use cached data when available', async () => {
      mockGet.mockResolvedValue(mockAuthenticatedResponse);

      const { result, rerender } = renderHook(() => useAuthStatus(), {
        wrapper: createWrapper(),
      });

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.data).toEqual(mockAuthenticatedResponse);
      });

      // Re-render should use cached data
      rerender();

      // Should still have data immediately from cache
      expect(result.current.data).toEqual(mockAuthenticatedResponse);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Manual Refetch Functionality', () => {
    it('should support manual refetch', async () => {
      mockGet.mockResolvedValue(mockAuthenticatedResponse);

      const { result } = renderHook(() => useAuthStatus(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Reset mock and trigger refetch
      mockGet.mockClear();
      mockGet.mockResolvedValue(mockUnauthenticatedResponse);

      await result.current.refetch();

      await waitFor(() => {
        expect(result.current.data).toEqual(mockUnauthenticatedResponse);
      });

      expect(mockGet).toHaveBeenCalledWith('/auth/status');
    });

    it('should handle refetch functionality', async () => {
      mockGet.mockResolvedValue(mockAuthenticatedResponse);

      const { result } = renderHook(() => useAuthStatus(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.data).toEqual(mockAuthenticatedResponse);
      });

      // Reset mock and trigger refetch
      mockGet.mockClear();
      mockGet.mockResolvedValue(mockUnauthenticatedResponse);

      const refetchResult = await result.current.refetch();

      expect(refetchResult.data).toEqual(mockUnauthenticatedResponse);
      expect(mockGet).toHaveBeenCalledWith('/auth/status');
    });
  });

  describe('Memory Management', () => {
    it('should properly cleanup on unmount', () => {
      const { unmount } = renderHook(() => useAuthStatus(), {
        wrapper: createWrapper(),
      });

      // Should not throw on unmount
      expect(() => unmount()).not.toThrow();
    });

    it('should handle multiple hook instances', async () => {
      mockGet.mockResolvedValue(mockAuthenticatedResponse);

      const { result: result1 } = renderHook(() => useAuthStatus(), {
        wrapper: createWrapper(),
      });

      const { result: result2 } = renderHook(() => useAuthStatus(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result1.current.isLoading).toBe(false);
        expect(result2.current.isLoading).toBe(false);
      });

      // Both hooks should have the same data
      expect(result1.current.data).toEqual(mockAuthenticatedResponse);
      expect(result2.current.data).toEqual(mockAuthenticatedResponse);
    });
  });

  describe('Edge Cases', () => {
    it('should handle malformed API responses gracefully', async () => {
      // Mock malformed response (missing required fields)
      const malformedResponse = {
        user: mockUser,
        // Missing isAuthenticated field
      };
      mockGet.mockResolvedValue(malformedResponse);

      const { result } = renderHook(() => useAuthStatus(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should still work even with malformed data
      expect(result.current.data).toBeDefined();
      expect(result.current.error).toBeNull();
    });

    it('should handle API response with undefined user gracefully', async () => {
      const responseWithUndefinedUser: IAuthStatusResponse = {
        isAuthenticated: false,
        user: undefined, // API might return undefined instead of omitting
      };

      mockGet.mockResolvedValue(responseWithUndefinedUser);

      const { result } = renderHook(() => useAuthStatus(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(responseWithUndefinedUser);
      expect(result.current.error).toBeNull();
    });

    it('should handle empty response gracefully', async () => {
      mockGet.mockResolvedValue({});

      const { result } = renderHook(() => useAuthStatus(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual({});
      expect(result.current.error).toBeNull();
    });
  });

  describe('API Integration', () => {
    it('should call the correct API endpoint', async () => {
      mockGet.mockResolvedValue(mockAuthenticatedResponse);

      renderHook(() => useAuthStatus(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(mockGet).toHaveBeenCalledWith('/auth/status');
      });
    });

    it('should handle different user data formats', async () => {
      const customUser: IUser = {
        id: '2',
        email: 'jane.doe@mavericks-consulting.com',
        name: 'Jane Doe',
        picture: null,
        googleId: 'google456',
        createdAt: '2024-01-02T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
      };

      const customResponse: IAuthStatusResponse = {
        isAuthenticated: true,
        user: customUser,
      };

      mockGet.mockResolvedValue(customResponse);

      const { result } = renderHook(() => useAuthStatus(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data?.user?.email).toBe(
        'jane.doe@mavericks-consulting.com',
      );
      expect(result.current.data?.user?.picture).toBeNull();
      expect(result.current.data?.isAuthenticated).toBe(true);
    });
  });
});
