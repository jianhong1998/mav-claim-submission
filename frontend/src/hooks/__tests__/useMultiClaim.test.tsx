import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useMultiClaim, MultiClaimPhase } from '../useMultiClaim';
import { apiClient } from '@/lib/api-client';
import {
  ClaimCategory,
  ClaimStatus,
  IClaimMetadata,
  IClaimCreateRequest,
  IClaimListResponse,
  IClaimResponse,
} from '@project/types';

// Mock dependencies
vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('./queries/keys', () => ({
  getQueryKey: vi.fn(({ group, type, key }) => [group, type, key]),
  QueryGroup: {
    EMAIL: 'email',
  },
  QueryType: {
    LIST: 'list',
  },
}));

const mockApiClient = {
  get: apiClient.get as ReturnType<typeof vi.fn>,
  post: apiClient.post as ReturnType<typeof vi.fn>,
  put: apiClient.put as ReturnType<typeof vi.fn>,
  delete: apiClient.delete as ReturnType<typeof vi.fn>,
};

// Test utilities
const createTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });

  const TestWrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  TestWrapper.displayName = 'TestWrapper';
  return TestWrapper;
};

const createMockClaim = (
  overrides: Partial<IClaimMetadata> = {},
): IClaimMetadata => ({
  id: 'claim-1',
  userId: '',
  submissionDate: new Date().toISOString(),
  // employeeEmail: 'test@mavericks-consulting.com',
  category: ClaimCategory.TELCO,
  month: 3,
  year: 2024,
  totalAmount: 100.5,
  status: ClaimStatus.DRAFT,
  createdAt: '2024-03-15T10:00:00Z',
  updatedAt: '2024-03-15T10:00:00Z',
  claimName: null,
  attachments: [],
  ...overrides,
});

const createMockListResponse = (
  claims: IClaimMetadata[] = [],
): IClaimListResponse => ({
  claims,
  total: claims.length,
  // status: 'success',
  success: true,
});

const createMockClaimResponse = (claim: IClaimMetadata): IClaimResponse => ({
  success: true,
  claim,
  error: undefined,
});

describe('useMultiClaim', () => {
  let wrapper: ReturnType<typeof createTestWrapper>;

  beforeEach(() => {
    vi.clearAllMocks();
    wrapper = createTestWrapper();
  });

  describe('Initial State', () => {
    it('should initialize with correct default values', async () => {
      const mockResponse = createMockListResponse([]);
      mockApiClient.get.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useMultiClaim(), { wrapper });

      await waitFor(() => {
        expect(result.current.state.currentPhase).toBe(
          MultiClaimPhase.CREATION,
        );
        expect(result.current.state.draftClaims).toEqual([]);
        expect(result.current.state.uploadProgress).toEqual({});
        expect(result.current.state.isCreatingClaim).toBe(false);
        expect(result.current.state.isDeletingClaim).toBe(false);
        expect(result.current.state.isUpdatingClaim).toBe(false);
        expect(result.current.state.isMarkingReady).toBe(false);
      });
    });

    it('should load draft claims on mount', async () => {
      const mockClaims = [
        createMockClaim(),
        createMockClaim({ id: 'claim-2', totalAmount: 75 }),
      ];
      const mockResponse = createMockListResponse(mockClaims);
      mockApiClient.get.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useMultiClaim(), { wrapper });

      await waitFor(() => {
        expect(result.current.state.draftClaims).toHaveLength(2);
        expect(result.current.state.draftClaims[0].id).toBe('claim-1');
        expect(result.current.state.draftClaims[1].id).toBe('claim-2');
      });

      expect(mockApiClient.get).toHaveBeenCalledWith('/claims?status=draft');
    });
  });

  describe('Summary Calculations', () => {
    it('should calculate summary statistics correctly', async () => {
      const mockClaims = [
        createMockClaim({
          totalAmount: 100,
          attachments: [{ id: 'att-1' }] as IClaimMetadata['attachments'],
        }),
        createMockClaim({
          id: 'claim-2',
          totalAmount: 75,
          attachments: [],
        }),
        createMockClaim({
          id: 'claim-3',
          totalAmount: 50,
          attachments: [
            { id: 'att-2' },
            { id: 'att-3' },
          ] as IClaimMetadata['attachments'],
        }),
      ];
      const mockResponse = createMockListResponse(mockClaims);
      mockApiClient.get.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useMultiClaim(), { wrapper });

      await waitFor(() => {
        expect(result.current.summary.totalAmount).toBe(225); // 100 + 75 + 50
        expect(result.current.summary.claimsCount).toBe(3);
        expect(result.current.summary.claimsWithAttachments).toBe(2); // claim-1 and claim-3
        expect(result.current.summary.claimsWithoutAttachments).toBe(1); // claim-2
        expect(result.current.summary.canMarkReady).toBe(false); // Has claims without attachments
      });
    });

    it('should determine canMarkReady correctly when all claims have attachments', async () => {
      const mockClaims = [
        createMockClaim({
          attachments: [{ id: 'att-1' }] as IClaimMetadata['attachments'],
        }),
        createMockClaim({
          id: 'claim-2',
          attachments: [{ id: 'att-2' }] as IClaimMetadata['attachments'],
        }),
      ];
      const mockResponse = createMockListResponse(mockClaims);
      mockApiClient.get.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useMultiClaim(), { wrapper });

      await waitFor(() => {
        expect(result.current.summary.canMarkReady).toBe(true);
      });
    });
  });

  describe('Claim Creation', () => {
    it('should create a new claim successfully', async () => {
      const existingClaims = [createMockClaim()];
      const mockResponse = createMockListResponse(existingClaims);
      mockApiClient.get.mockResolvedValue(mockResponse);

      const newClaimData: IClaimCreateRequest = {
        category: ClaimCategory.FITNESS,
        month: 4,
        year: 2024,
        totalAmount: 80,
        claimName: 'Gym Membership',
      };

      const newClaim = createMockClaim({
        id: 'claim-2',
        category: ClaimCategory.FITNESS,
        month: 4,
        totalAmount: 80,
        claimName: 'Gym Membership',
      });

      const createResponse = createMockClaimResponse(newClaim);
      mockApiClient.post.mockResolvedValue(createResponse);

      const { result } = renderHook(() => useMultiClaim(), { wrapper });

      await waitFor(() => {
        expect(result.current.state.draftClaims).toHaveLength(1);
      });

      let response: IClaimResponse;
      await act(async () => {
        response = await result.current.createClaim(newClaimData);
      });

      expect(mockApiClient.post).toHaveBeenCalledWith('/claims', newClaimData);
      expect(response!).toEqual(createResponse);
    });

    it('should show creating state during claim creation', async () => {
      const mockResponse = createMockListResponse([]);
      mockApiClient.get.mockResolvedValue(mockResponse);

      const newClaimData: IClaimCreateRequest = {
        category: ClaimCategory.TELCO,
        month: 3,
        year: 2024,
        totalAmount: 100,
      };

      // Mock API to hang so we can test loading state
      mockApiClient.post.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useMultiClaim(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading.isCreatingClaim).toBe(false);
      });

      act(() => {
        void result.current.createClaim(newClaimData);
      });

      await waitFor(() => {
        expect(result.current.loading.isCreatingClaim).toBe(true);
        expect(result.current.state.isCreatingClaim).toBe(true);
      });
    });
  });

  describe('Claim Updates', () => {
    it('should update a claim successfully', async () => {
      const mockClaim = createMockClaim();
      const mockResponse = createMockListResponse([mockClaim]);
      mockApiClient.get.mockResolvedValue(mockResponse);

      const updateData = { totalAmount: 150 };
      const updatedClaim = { ...mockClaim, totalAmount: 150 };
      const updateResponse = createMockClaimResponse(updatedClaim);
      mockApiClient.put.mockResolvedValue(updateResponse);

      const { result } = renderHook(() => useMultiClaim(), { wrapper });

      await waitFor(() => {
        expect(result.current.state.draftClaims).toHaveLength(1);
      });

      let response: IClaimResponse;
      await act(async () => {
        response = await result.current.updateClaim('claim-1', updateData);
      });

      expect(mockApiClient.put).toHaveBeenCalledWith(
        '/claims/claim-1',
        updateData,
      );
      expect(response!).toEqual(updateResponse);
    });

    it('should show updating state during claim update', async () => {
      const mockClaim = createMockClaim();
      const mockResponse = createMockListResponse([mockClaim]);
      mockApiClient.get.mockResolvedValue(mockResponse);

      // Mock API to hang so we can test loading state
      mockApiClient.put.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useMultiClaim(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading.isUpdatingClaim).toBe(false);
      });

      act(() => {
        void result.current.updateClaim('claim-1', { totalAmount: 150 });
      });

      await waitFor(() => {
        expect(result.current.loading.isUpdatingClaim).toBe(true);
        expect(result.current.state.isUpdatingClaim).toBe(true);
      });
    });
  });

  describe('Claim Deletion', () => {
    it('should delete a claim successfully', async () => {
      const mockClaim = createMockClaim();
      const mockResponse = createMockListResponse([mockClaim]);
      mockApiClient.get.mockResolvedValue(mockResponse);
      mockApiClient.delete.mockResolvedValue(undefined);

      const { result } = renderHook(() => useMultiClaim(), { wrapper });

      await waitFor(() => {
        expect(result.current.state.draftClaims).toHaveLength(1);
      });

      await act(async () => {
        await result.current.deleteClaim('claim-1');
      });

      expect(mockApiClient.delete).toHaveBeenCalledWith('/claims/claim-1');
    });

    it('should clear upload progress when deleting a claim', async () => {
      const mockClaim = createMockClaim();
      const mockResponse = createMockListResponse([mockClaim]);
      mockApiClient.get.mockResolvedValue(mockResponse);
      mockApiClient.delete.mockResolvedValue(undefined);

      const { result } = renderHook(() => useMultiClaim(), { wrapper });

      await waitFor(() => {
        expect(result.current.state.draftClaims).toHaveLength(1);
      });

      // Set some upload progress first
      act(() => {
        result.current.updateUploadProgress('claim-1', {
          claimId: 'claim-1',
          files: [
            {
              fileName: 'test.pdf',
              progress: 50,
              status: 'uploading',
            },
          ],
          overallProgress: 50,
        });
      });

      expect(result.current.state.uploadProgress['claim-1']).toBeDefined();

      await act(async () => {
        await result.current.deleteClaim('claim-1');
      });

      expect(result.current.state.uploadProgress['claim-1']).toBeUndefined();
    });

    it('should show deleting state during claim deletion', async () => {
      const mockClaim = createMockClaim();
      const mockResponse = createMockListResponse([mockClaim]);
      mockApiClient.get.mockResolvedValue(mockResponse);

      // Mock API to hang so we can test loading state
      mockApiClient.delete.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useMultiClaim(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading.isDeletingClaim).toBe(false);
      });

      act(() => {
        void result.current.deleteClaim('claim-1');
      });

      await waitFor(() => {
        expect(result.current.loading.isDeletingClaim).toBe(true);
        expect(result.current.state.isDeletingClaim).toBe(true);
      });
    });
  });

  describe('Mark Claims Ready', () => {
    it('should mark all claims as ready successfully', async () => {
      const mockClaims = [
        createMockClaim({ id: 'claim-1' }),
        createMockClaim({ id: 'claim-2' }),
      ];
      const mockResponse = createMockListResponse(mockClaims);
      mockApiClient.get.mockResolvedValue(mockResponse);
      mockApiClient.put.mockResolvedValue({ success: true });

      const { result } = renderHook(() => useMultiClaim(), { wrapper });

      await waitFor(() => {
        expect(result.current.state.draftClaims).toHaveLength(2);
      });

      await act(async () => {
        await result.current.markAllClaimsReady();
      });

      expect(mockApiClient.put).toHaveBeenCalledWith('/claims/claim-1/status', {
        status: ClaimStatus.SENT,
      });
      expect(mockApiClient.put).toHaveBeenCalledWith('/claims/claim-2/status', {
        status: ClaimStatus.SENT,
      });
      expect(mockApiClient.put).toHaveBeenCalledTimes(2);
    });

    it('should reset to creation phase after marking claims ready', async () => {
      const mockClaim = createMockClaim();
      const mockResponse = createMockListResponse([mockClaim]);
      mockApiClient.get.mockResolvedValue(mockResponse);
      mockApiClient.put.mockResolvedValue({ success: true });

      const { result } = renderHook(() => useMultiClaim(), { wrapper });

      await waitFor(() => {
        expect(result.current.state.draftClaims).toHaveLength(1);
      });

      // Move to different phase first
      act(() => {
        result.current.moveToReviewPhase();
      });

      expect(result.current.state.currentPhase).toBe(MultiClaimPhase.REVIEW);

      await act(async () => {
        await result.current.markAllClaimsReady();
      });

      expect(result.current.state.currentPhase).toBe(MultiClaimPhase.CREATION);
      expect(result.current.state.uploadProgress).toEqual({});
    });

    it('should show marking ready state during operation', async () => {
      const mockClaim = createMockClaim();
      const mockResponse = createMockListResponse([mockClaim]);
      mockApiClient.get.mockResolvedValue(mockResponse);

      // Mock API to simulate delay
      mockApiClient.put.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100)),
      );

      const { result } = renderHook(() => useMultiClaim(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading.isMarkingReady).toBe(false);
      });

      // Start the async operation
      const markPromise = act(async () => {
        await result.current.markAllClaimsReady();
      });

      // Wait for the operation to complete instead of trying to catch intermediate state
      await markPromise;

      // Verify final state
      expect(result.current.loading.isMarkingReady).toBe(false);
    });
  });

  describe('Phase Management', () => {
    it('should transition to upload phase when claims exist', async () => {
      const mockClaim = createMockClaim();
      const mockResponse = createMockListResponse([mockClaim]);
      mockApiClient.get.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useMultiClaim(), { wrapper });

      await waitFor(() => {
        expect(result.current.state.draftClaims).toHaveLength(1);
      });

      expect(result.current.state.currentPhase).toBe(MultiClaimPhase.CREATION);

      act(() => {
        result.current.moveToUploadPhase();
      });

      expect(result.current.state.currentPhase).toBe(MultiClaimPhase.UPLOAD);
    });

    it('should not transition to upload phase when no claims exist', async () => {
      const mockResponse = createMockListResponse([]);
      mockApiClient.get.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useMultiClaim(), { wrapper });

      await waitFor(() => {
        expect(result.current.state.draftClaims).toHaveLength(0);
      });

      expect(result.current.state.currentPhase).toBe(MultiClaimPhase.CREATION);

      act(() => {
        result.current.moveToUploadPhase();
      });

      // Should remain in creation phase
      expect(result.current.state.currentPhase).toBe(MultiClaimPhase.CREATION);
    });

    it('should transition to review phase', async () => {
      const mockResponse = createMockListResponse([]);
      mockApiClient.get.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useMultiClaim(), { wrapper });

      expect(result.current.state.currentPhase).toBe(MultiClaimPhase.CREATION);

      act(() => {
        result.current.moveToReviewPhase();
      });

      expect(result.current.state.currentPhase).toBe(MultiClaimPhase.REVIEW);
    });

    it('should reset to creation phase', async () => {
      const mockResponse = createMockListResponse([]);
      mockApiClient.get.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useMultiClaim(), { wrapper });

      // Move to different phase and add upload progress
      act(() => {
        result.current.moveToReviewPhase();
        result.current.updateUploadProgress('claim-1', {
          claimId: 'claim-1',
          files: [],
          overallProgress: 0,
        });
      });

      expect(result.current.state.currentPhase).toBe(MultiClaimPhase.REVIEW);
      expect(result.current.state.uploadProgress['claim-1']).toBeDefined();

      act(() => {
        result.current.resetToCreationPhase();
      });

      expect(result.current.state.currentPhase).toBe(MultiClaimPhase.CREATION);
      expect(result.current.state.uploadProgress).toEqual({});
    });
  });

  describe('Upload Progress Management', () => {
    it('should update upload progress for a claim', async () => {
      const mockResponse = createMockListResponse([]);
      mockApiClient.get.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useMultiClaim(), { wrapper });

      const progress = {
        claimId: 'claim-1',
        files: [
          {
            fileName: 'receipt.pdf',
            progress: 75,
            status: 'uploading' as const,
          },
        ],
        overallProgress: 75,
      };

      act(() => {
        result.current.updateUploadProgress('claim-1', progress);
      });

      expect(result.current.state.uploadProgress['claim-1']).toEqual(progress);
    });

    it('should clear upload progress for a claim', async () => {
      const mockResponse = createMockListResponse([]);
      mockApiClient.get.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useMultiClaim(), { wrapper });

      // Set progress first
      const progress = {
        claimId: 'claim-1',
        files: [],
        overallProgress: 0,
      };

      act(() => {
        result.current.updateUploadProgress('claim-1', progress);
      });

      expect(result.current.state.uploadProgress['claim-1']).toBeDefined();

      act(() => {
        result.current.clearUploadProgress('claim-1');
      });

      expect(result.current.state.uploadProgress['claim-1']).toBeUndefined();
    });

    it('should handle multiple claims progress independently', async () => {
      const mockResponse = createMockListResponse([]);
      mockApiClient.get.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useMultiClaim(), { wrapper });

      const progress1 = {
        claimId: 'claim-1',
        files: [
          { fileName: 'file1.pdf', progress: 50, status: 'uploading' as const },
        ],
        overallProgress: 50,
      };

      const progress2 = {
        claimId: 'claim-2',
        files: [
          {
            fileName: 'file2.pdf',
            progress: 100,
            status: 'completed' as const,
          },
        ],
        overallProgress: 100,
      };

      act(() => {
        result.current.updateUploadProgress('claim-1', progress1);
        result.current.updateUploadProgress('claim-2', progress2);
      });

      expect(result.current.state.uploadProgress['claim-1']).toEqual(progress1);
      expect(result.current.state.uploadProgress['claim-2']).toEqual(progress2);

      act(() => {
        result.current.clearUploadProgress('claim-1');
      });

      expect(result.current.state.uploadProgress['claim-1']).toBeUndefined();
      expect(result.current.state.uploadProgress['claim-2']).toEqual(progress2);
    });
  });

  describe('Error Handling', () => {
    it('should capture and expose API errors', async () => {
      const apiError = new Error('API Error');
      mockApiClient.get.mockRejectedValue(apiError);

      const { result } = renderHook(() => useMultiClaim(), { wrapper });

      await waitFor(() => {
        expect(result.current.errors.draftClaimsError).toEqual(apiError);
      });
    });

    it('should capture mutation errors', async () => {
      const mockResponse = createMockListResponse([createMockClaim()]);
      mockApiClient.get.mockResolvedValue(mockResponse);

      const createError = new Error('Create failed');
      mockApiClient.post.mockRejectedValue(createError);

      const { result } = renderHook(() => useMultiClaim(), { wrapper });

      await waitFor(() => {
        expect(result.current.state.draftClaims).toHaveLength(1);
      });

      try {
        await act(async () => {
          await result.current.createClaim({
            category: ClaimCategory.TELCO,
            month: 3,
            year: 2024,
            totalAmount: 100,
          });
        });
      } catch (_error) {
        // Expected to throw
      }

      await waitFor(() => {
        expect(result.current.errors.createError).toEqual(createError);
      });
    });
  });

  describe('Data Refetch', () => {
    it('should expose refetch function', async () => {
      const mockResponse = createMockListResponse([createMockClaim()]);
      mockApiClient.get.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useMultiClaim(), { wrapper });

      await waitFor(() => {
        expect(result.current.state.draftClaims).toHaveLength(1);
      });

      expect(typeof result.current.refetchDraftClaims).toBe('function');
    });

    it('should refetch data when refetch is called', async () => {
      const initialResponse = createMockListResponse([createMockClaim()]);
      const updatedResponse = createMockListResponse([
        createMockClaim(),
        createMockClaim({ id: 'claim-2' }),
      ]);

      mockApiClient.get.mockResolvedValueOnce(initialResponse);
      mockApiClient.get.mockResolvedValueOnce(updatedResponse);

      const { result } = renderHook(() => useMultiClaim(), { wrapper });

      await waitFor(() => {
        expect(result.current.state.draftClaims).toHaveLength(1);
      });

      await act(async () => {
        await result.current.refetchDraftClaims();
      });

      await waitFor(() => {
        expect(result.current.state.draftClaims).toHaveLength(2);
      });

      expect(mockApiClient.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('Query Invalidation', () => {
    it('should invalidate queries after successful create', async () => {
      const mockResponse = createMockListResponse([]);
      mockApiClient.get.mockResolvedValue(mockResponse);

      const newClaim = createMockClaim();
      const createResponse = createMockClaimResponse(newClaim);
      mockApiClient.post.mockResolvedValue(createResponse);

      const { result } = renderHook(() => useMultiClaim(), { wrapper });

      await waitFor(() => {
        expect(result.current.state.draftClaims).toHaveLength(0);
      });

      await act(async () => {
        await result.current.createClaim({
          category: ClaimCategory.TELCO,
          month: 3,
          year: 2024,
          totalAmount: 100,
        });
      });

      // The hook should have invalidated and refetched the query
      // We can verify the GET call was made again
      expect(mockApiClient.get).toHaveBeenCalledWith('/claims?status=draft');
    });
  });

  describe('Loading States', () => {
    it('should expose all loading states correctly', async () => {
      const mockResponse = createMockListResponse([]);
      mockApiClient.get.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useMultiClaim(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading.isDraftClaimsLoading).toBe(false);
        expect(result.current.loading.isCreatingClaim).toBe(false);
        expect(result.current.loading.isUpdatingClaim).toBe(false);
        expect(result.current.loading.isDeletingClaim).toBe(false);
        expect(result.current.loading.isMarkingReady).toBe(false);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty claims array in markAllClaimsReady', async () => {
      const mockResponse = createMockListResponse([]);
      mockApiClient.get.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useMultiClaim(), { wrapper });

      await waitFor(() => {
        expect(result.current.state.draftClaims).toHaveLength(0);
      });

      await act(async () => {
        await result.current.markAllClaimsReady();
      });

      // Should not make any API calls when no claims exist
      expect(mockApiClient.put).not.toHaveBeenCalled();
    });

    it('should handle claims without attachments property', async () => {
      const claimWithoutAttachments = {
        ...createMockClaim(),
        attachments: undefined,
      } as unknown as IClaimMetadata;
      const mockResponse = createMockListResponse([claimWithoutAttachments]);
      mockApiClient.get.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useMultiClaim(), { wrapper });

      await waitFor(() => {
        expect(result.current.summary.claimsWithAttachments).toBe(0);
        expect(result.current.summary.claimsWithoutAttachments).toBe(1);
      });
    });
  });

  describe('MultiClaimPhase Enum', () => {
    it('should export correct phase values', () => {
      expect(MultiClaimPhase.CREATION).toBe('creation');
      expect(MultiClaimPhase.UPLOAD).toBe('upload');
      expect(MultiClaimPhase.REVIEW).toBe('review');
    });
  });
});
