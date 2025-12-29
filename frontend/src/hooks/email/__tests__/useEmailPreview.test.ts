import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { createElement } from 'react';
import { useEmailPreview } from '../useEmailPreview';
import { apiClient } from '@/lib/api-client';
import { IPreviewEmailResponse } from '@project/types';

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

const mockPreviewResponse: IPreviewEmailResponse = {
  subject: 'Claim Submission - Telco Expenses',
  htmlBody: '<html><body><h1>Your Claim</h1></body></html>',
  recipients: ['hr@mavericks-consulting.com'],
  cc: ['finance@mavericks-consulting.com'],
  bcc: [],
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
  Wrapper.displayName = 'TestQueryClientWrapper';
  return Wrapper;
};

describe('useEmailPreview', () => {
  const mockGet = apiClient.get as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch preview for valid claim ID', async () => {
    mockGet.mockResolvedValue(mockPreviewResponse);

    const { result } = renderHook(() => useEmailPreview('claim-123'), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockGet).toHaveBeenCalledWith('/claims/claim-123/preview');
    expect(result.current.data).toEqual(mockPreviewResponse);
  });

  it('should not fetch when claimId is null', async () => {
    const { result } = renderHook(() => useEmailPreview(null), {
      wrapper: createWrapper(),
    });

    // Give it time to potentially trigger a fetch
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockGet).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it('should expose error on fetch failure', async () => {
    const error = new Error('Failed to fetch preview');
    mockGet.mockRejectedValue(error);

    const { result } = renderHook(() => useEmailPreview('claim-123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(error);
    expect(result.current.data).toBeUndefined();
  });

  it('should allow manual refetch', async () => {
    mockGet.mockResolvedValue(mockPreviewResponse);

    const { result } = renderHook(() => useEmailPreview('claim-123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledTimes(1);

    await result.current.refetch();

    expect(mockGet).toHaveBeenCalledTimes(2);
  });

  it('should start fetching when claimId changes from null to valid', async () => {
    mockGet.mockResolvedValue(mockPreviewResponse);

    const { result, rerender } = renderHook(
      ({ claimId }: { claimId: string | null }) => useEmailPreview(claimId),
      {
        wrapper: createWrapper(),
        initialProps: { claimId: null as string | null },
      },
    );

    expect(mockGet).not.toHaveBeenCalled();

    rerender({ claimId: 'claim-123' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockGet).toHaveBeenCalledWith('/claims/claim-123/preview');
  });
});
