import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { createElement } from 'react';
import {
  useCategories,
  useCategoriesForSelection,
  useCategoriesForDisplay,
} from '../useCategories';
import { apiClient } from '@/lib/api-client';
import type {
  IClaimCategory,
  IClaimCategoryListResponse,
} from '@project/types';

// Mock dependencies
vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

const mockCategories: IClaimCategory[] = [
  {
    uuid: '1',
    code: 'telco',
    name: 'Telecommunications',
    limit: { type: 'monthly', amount: 150 },
  },
  {
    uuid: '2',
    code: 'fitness',
    name: 'Fitness & Wellness',
    limit: { type: 'monthly', amount: 50 },
  },
  {
    uuid: '3',
    code: 'dental',
    name: 'Dental Care',
    limit: { type: 'yearly', amount: 300 },
  },
];

const mockCategoriesResponse: IClaimCategoryListResponse = {
  success: true,
  categories: mockCategories,
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

describe('useCategories Hook Tests', () => {
  const mockGet = apiClient.get as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useCategories (base hook)', () => {
    it('should fetch categories without params', async () => {
      mockGet.mockResolvedValue(mockCategoriesResponse);

      const { result } = renderHook(() => useCategories(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockCategories);
      expect(result.current.error).toBeNull();
      expect(mockGet).toHaveBeenCalledWith('/claim-categories');
    });

    it('should fetch categories with includeDisabled param', async () => {
      mockGet.mockResolvedValue(mockCategoriesResponse);

      const { result } = renderHook(
        () => useCategories({ includeDisabled: true }),
        {
          wrapper: createWrapper(),
        },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockCategories);
      expect(mockGet).toHaveBeenCalledWith(
        '/claim-categories?includeDisabled=true',
      );
    });

    it('should fetch categories with includeDeleted param', async () => {
      mockGet.mockResolvedValue(mockCategoriesResponse);

      const { result } = renderHook(
        () => useCategories({ includeDeleted: true }),
        {
          wrapper: createWrapper(),
        },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockCategories);
      expect(mockGet).toHaveBeenCalledWith(
        '/claim-categories?includeDeleted=true',
      );
    });

    it('should fetch categories with both params', async () => {
      mockGet.mockResolvedValue(mockCategoriesResponse);

      const { result } = renderHook(
        () => useCategories({ includeDisabled: true, includeDeleted: true }),
        {
          wrapper: createWrapper(),
        },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockCategories);
      expect(mockGet).toHaveBeenCalledWith(
        '/claim-categories?includeDisabled=true&includeDeleted=true',
      );
    });

    it('should show loading state initially', () => {
      mockGet.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useCategories(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
      expect(result.current.error).toBeNull();
    });

    it('should handle API errors', async () => {
      const apiError = new Error('API Error');
      mockGet.mockRejectedValue(apiError);

      const { result } = renderHook(() => useCategories(), {
        wrapper: createWrapper(),
      });

      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('isError');
      expect(result.current).toHaveProperty('refetch');
    });

    it('should set errorMessage for 401 error', async () => {
      mockGet.mockRejectedValue({ response: { status: 401 } });

      const { result } = renderHook(() => useCategories(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.errorMessage).toBe(
          'Authentication required to view categories.',
        );
      });
    });

    it('should set errorMessage for 403 error', async () => {
      mockGet.mockRejectedValue({ response: { status: 403 } });

      const { result } = renderHook(() => useCategories(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.errorMessage).toBe(
          'You do not have permission to view categories.',
        );
      });
    });

    it('should set errorMessage for 404 error', async () => {
      mockGet.mockRejectedValue({ response: { status: 404 } });

      const { result } = renderHook(() => useCategories(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.errorMessage).toBe('Categories not found.');
      });
    });

    it('should set generic errorMessage for other errors', async () => {
      mockGet.mockRejectedValue({ response: { status: 500 } });

      const { result } = renderHook(() => useCategories(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.errorMessage).toBe(
          'Failed to load categories. Please try again.',
        );
      });
    });
  });

  describe('useCategoriesForSelection', () => {
    it('should fetch only enabled categories', async () => {
      mockGet.mockResolvedValue(mockCategoriesResponse);

      const { result } = renderHook(() => useCategoriesForSelection(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockCategories);
      expect(mockGet).toHaveBeenCalledWith('/claim-categories');
    });

    it('should not include disabled or deleted categories', async () => {
      mockGet.mockResolvedValue(mockCategoriesResponse);

      const { result } = renderHook(() => useCategoriesForSelection(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should call API without any includeDisabled/includeDeleted params
      expect(mockGet).toHaveBeenCalledWith('/claim-categories');
      expect(mockGet).not.toHaveBeenCalledWith(
        expect.stringContaining('includeDisabled'),
      );
      expect(mockGet).not.toHaveBeenCalledWith(
        expect.stringContaining('includeDeleted'),
      );
    });
  });

  describe('useCategoriesForDisplay', () => {
    it('should fetch all categories including disabled and deleted', async () => {
      mockGet.mockResolvedValue(mockCategoriesResponse);

      const { result } = renderHook(() => useCategoriesForDisplay(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockCategories);
      expect(mockGet).toHaveBeenCalledWith(
        '/claim-categories?includeDisabled=true&includeDeleted=true',
      );
    });

    it('should include both disabled and deleted params', async () => {
      mockGet.mockResolvedValue(mockCategoriesResponse);

      const { result } = renderHook(() => useCategoriesForDisplay(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const callUrl = mockGet.mock.calls[0][0] as string;
      expect(callUrl).toContain('includeDisabled=true');
      expect(callUrl).toContain('includeDeleted=true');
    });
  });

  describe('Caching and Performance', () => {
    it('should use cached data on rerender', async () => {
      mockGet.mockResolvedValue(mockCategoriesResponse);

      const { result, rerender } = renderHook(() => useCategories(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.data).toEqual(mockCategories);
      });

      // Re-render should use cached data
      rerender();

      expect(result.current.data).toEqual(mockCategories);
      expect(result.current.isLoading).toBe(false);
    });

    it('should support manual refetch', async () => {
      mockGet.mockResolvedValue(mockCategoriesResponse);

      const { result } = renderHook(() => useCategories(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockGet.mockClear();
      mockGet.mockResolvedValue(mockCategoriesResponse);

      await result.current.refetch();

      expect(mockGet).toHaveBeenCalledWith('/claim-categories');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty categories array', async () => {
      mockGet.mockResolvedValue({ success: true, categories: [] });

      const { result } = renderHook(() => useCategories(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual([]);
    });

    it('should handle categories with no limits', async () => {
      const categoriesWithNoLimit: IClaimCategory[] = [
        {
          uuid: '4',
          code: 'others',
          name: 'Others',
          limit: null,
        },
      ];

      mockGet.mockResolvedValue({
        success: true,
        categories: categoriesWithNoLimit,
      });

      const { result } = renderHook(() => useCategories(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(categoriesWithNoLimit);
      expect(result.current.data?.[0].limit).toBeNull();
    });
  });
});
