import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { createElement } from 'react';
import { useEmailSending, getEmailSendingState } from '../useEmailSending';
import { apiClient } from '@/lib/api-client';
import {
  IClaimEmailRequest,
  IClaimEmailResponse,
  IClaimMetadata,
  ClaimStatus,
} from '@project/types';
import { ErrorHandler } from '../../queries/helper/error-handler';

// Mock dependencies
vi.mock('@/lib/api-client', () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

vi.mock('../../queries/helper/error-handler', () => ({
  ErrorHandler: {
    extractErrorMessage: vi.fn(),
  },
}));

// Test data
const mockClaimMetadata: IClaimMetadata = {
  id: 'claim-123',
  userId: 'user-123',
  category: 'telco',
  claimName: 'Monthly phone bill',
  month: 1,
  year: 2024,
  totalAmount: 100.5,
  status: ClaimStatus.SENT,
  submissionDate: '2024-01-31T00:00:00Z',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const mockEmailRequest: IClaimEmailRequest = {
  claimId: 'claim-123',
};

const mockSuccessResponse: IClaimEmailResponse = {
  success: true,
  messageId: 'gmail-msg-123',
  claim: mockClaimMetadata,
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
      mutations: {
        retry: false,
        gcTime: 0,
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

describe('useEmailSending Hook Tests', () => {
  const mockPost = apiClient.post as ReturnType<typeof vi.fn>;
  const mockExtractErrorMessage =
    ErrorHandler.extractErrorMessage as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should start with idle state', () => {
      const { result } = renderHook(() => useEmailSending(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isPending).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.data).toBeUndefined();
      expect(result.current.error).toBeNull();
    });
  });

  describe('Successful Email Sending', () => {
    it('should successfully send email and return response with messageId', async () => {
      mockPost.mockResolvedValue(mockSuccessResponse);

      const { result } = renderHook(() => useEmailSending(), {
        wrapper: createWrapper(),
      });

      let response: IClaimEmailResponse;
      await act(async () => {
        response = await result.current.mutateAsync(mockEmailRequest);
      });

      expect(response!).toEqual(mockSuccessResponse);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockSuccessResponse);
      expect(result.current.error).toBeNull();
      expect(mockPost).toHaveBeenCalledWith(
        '/email/send-claim',
        mockEmailRequest,
      );
    });

    it('should handle successful response with updated claim status', async () => {
      const responseWithStatusUpdate: IClaimEmailResponse = {
        success: true,
        messageId: 'gmail-msg-456',
        claim: { ...mockClaimMetadata, status: ClaimStatus.SENT },
      };

      mockPost.mockResolvedValue(responseWithStatusUpdate);

      const { result } = renderHook(() => useEmailSending(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync(mockEmailRequest);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.claim?.status).toBe(ClaimStatus.SENT);
      expect(result.current.data?.messageId).toBe('gmail-msg-456');
    });
  });

  describe('Error Handling', () => {
    it('should handle authentication errors (401)', async () => {
      const authError = new Error('Unauthorized') as Error & {
        response: { status: number };
      };
      authError.response = { status: 401 };
      mockPost.mockRejectedValue(authError);
      mockExtractErrorMessage.mockReturnValue('Authentication required');

      const { result } = renderHook(() => useEmailSending(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync(mockEmailRequest);
        } catch (_error) {
          // Expected to throw
        }
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(authError);
      expect(mockExtractErrorMessage).toHaveBeenCalledWith(authError);
    });

    it('should handle Gmail API errors (403)', async () => {
      const gmailError = new Error(
        'Gmail send permission not granted',
      ) as Error & { response: { status: number } };
      gmailError.response = { status: 403 };
      mockPost.mockRejectedValue(gmailError);
      mockExtractErrorMessage.mockReturnValue(
        'Gmail send permission not granted',
      );

      const { result } = renderHook(() => useEmailSending(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync(mockEmailRequest);
        } catch (_error) {
          // Expected to throw
        }
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(gmailError);
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network Error') as Error & {
        code: string;
      };
      networkError.code = 'ERR_NETWORK';
      mockPost.mockRejectedValue(networkError);
      mockExtractErrorMessage.mockReturnValue('Network connection failed');

      const { result } = renderHook(() => useEmailSending(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync(mockEmailRequest);
        } catch (_error) {
          // Expected to throw
        }
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(networkError);
    });
  });

  describe('Loading States', () => {
    it('should transition from idle to success state', async () => {
      mockPost.mockResolvedValue(mockSuccessResponse);

      const { result } = renderHook(() => useEmailSending(), {
        wrapper: createWrapper(),
      });

      // Initially idle
      expect(result.current.isPending).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(false);

      // Execute mutation
      await act(async () => {
        await result.current.mutateAsync(mockEmailRequest);
      });

      // Should transition to success
      await waitFor(() => {
        expect(result.current.isPending).toBe(false);
        expect(result.current.isSuccess).toBe(true);
        expect(result.current.isError).toBe(false);
      });
    });
  });

  describe('Query Invalidation', () => {
    it('should invalidate relevant queries on success', async () => {
      mockPost.mockResolvedValue(mockSuccessResponse);

      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false, gcTime: 0, staleTime: 0 },
          mutations: { retry: false, gcTime: 0 },
        },
      });

      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const TestWrapper = ({ children }: { children: React.ReactNode }) =>
        createElement(QueryClientProvider, { client: queryClient }, children);

      const { result } = renderHook(() => useEmailSending(), {
        wrapper: TestWrapper,
      });

      await act(async () => {
        await result.current.mutateAsync(mockEmailRequest);
      });

      // Should invalidate attachment queries
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ['attachments', 'list', { claimId: 'claim-123' }],
      });

      // Should invalidate claim queries
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ['claims', 'one', { claimId: 'claim-123' }],
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ['claims', 'list'],
      });
    });
  });

  describe('State Helper Functions', () => {
    it('should extract correct state from mutation via getEmailSendingState helper', async () => {
      mockPost.mockResolvedValue(mockSuccessResponse);

      const { result } = renderHook(() => useEmailSending(), {
        wrapper: createWrapper(),
      });

      // Initial state
      const initialState = getEmailSendingState(result.current);
      expect(initialState).toEqual({
        isLoading: false,
        isError: false,
        isSuccess: false,
        error: null,
        data: undefined,
      });

      // After successful mutation
      await act(async () => {
        await result.current.mutateAsync(mockEmailRequest);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const successState = getEmailSendingState(result.current);
      expect(successState.isSuccess).toBe(true);
      expect(successState.data).toEqual(mockSuccessResponse);
      expect(successState.error).toBeNull();
    });
  });

  describe('API Integration', () => {
    it('should call the correct API endpoint with proper data', async () => {
      mockPost.mockResolvedValue(mockSuccessResponse);

      const { result } = renderHook(() => useEmailSending(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync(mockEmailRequest);
      });

      expect(mockPost).toHaveBeenCalledWith(
        '/email/send-claim',
        mockEmailRequest,
      );
      expect(mockPost).toHaveBeenCalledTimes(1);
    });

    it('should handle different claim IDs correctly', async () => {
      const differentRequest: IClaimEmailRequest = {
        claimId: 'claim-456',
      };

      const differentResponse: IClaimEmailResponse = {
        success: true,
        messageId: 'gmail-msg-789',
        claim: { ...mockClaimMetadata, id: 'claim-456' },
      };

      mockPost.mockResolvedValue(differentResponse);

      const { result } = renderHook(() => useEmailSending(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync(differentRequest);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockPost).toHaveBeenCalledWith(
        '/email/send-claim',
        differentRequest,
      );
      expect(result.current.data?.claim?.id).toBe('claim-456');
    });
  });

  describe('Edge Cases', () => {
    it('should handle response without claim data', async () => {
      const responseWithoutClaim: IClaimEmailResponse = {
        success: true,
        messageId: 'gmail-msg-123',
        // No claim data
      };

      mockPost.mockResolvedValue(responseWithoutClaim);

      const { result } = renderHook(() => useEmailSending(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync(mockEmailRequest);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.messageId).toBe('gmail-msg-123');
      expect(result.current.data?.claim).toBeUndefined();
    });

    it('should handle multiple concurrent requests', async () => {
      mockPost.mockResolvedValue(mockSuccessResponse);

      const { result } = renderHook(() => useEmailSending(), {
        wrapper: createWrapper(),
      });

      // Start multiple requests
      const promises = [
        result.current.mutateAsync({ claimId: 'claim-1' }),
        result.current.mutateAsync({ claimId: 'claim-2' }),
      ];

      await act(async () => {
        await Promise.all(promises);
      });

      // Should call API for each request
      expect(mockPost).toHaveBeenCalledTimes(2);
      expect(mockPost).toHaveBeenCalledWith('/email/send-claim', {
        claimId: 'claim-1',
      });
      expect(mockPost).toHaveBeenCalledWith('/email/send-claim', {
        claimId: 'claim-2',
      });
    });
  });

  describe('Memory Management', () => {
    it('should properly cleanup on unmount', () => {
      const { unmount } = renderHook(() => useEmailSending(), {
        wrapper: createWrapper(),
      });

      // Should not throw on unmount
      expect(() => unmount()).not.toThrow();
    });

    it('should handle multiple hook instances', async () => {
      mockPost.mockResolvedValue(mockSuccessResponse);

      const { result: result1 } = renderHook(() => useEmailSending(), {
        wrapper: createWrapper(),
      });

      const { result: result2 } = renderHook(() => useEmailSending(), {
        wrapper: createWrapper(),
      });

      // Both hooks should be able to send emails independently
      await act(async () => {
        await result1.current.mutateAsync({ claimId: 'claim-1' });
        await result2.current.mutateAsync({ claimId: 'claim-2' });
      });

      await waitFor(() => {
        expect(result1.current.isSuccess).toBe(true);
        expect(result2.current.isSuccess).toBe(true);
      });
    });
  });
});
