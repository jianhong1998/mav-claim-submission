import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import {
  IClaimMetadata,
  IClaimCreateRequest,
  IClaimResponse,
  IClaimListResponse,
  IClaimUpdateRequest,
  ClaimStatus,
} from '@project/types';

// Multi-claim workflow phases
export const MultiClaimPhase = Object.freeze({
  CREATION: 'creation',
  UPLOAD: 'upload',
  REVIEW: 'review',
} as const);
export type MultiClaimPhase =
  (typeof MultiClaimPhase)[keyof typeof MultiClaimPhase];

// File upload progress tracking
export type FileUploadProgress = {
  claimId: string;
  files: {
    fileName: string;
    progress: number;
    status: 'pending' | 'uploading' | 'completed' | 'failed';
    error?: string;
  }[];
  overallProgress: number;
};

// Hook state interface
export type MultiClaimState = {
  currentPhase: MultiClaimPhase;
  draftClaims: IClaimMetadata[];
  uploadProgress: Record<string, FileUploadProgress>;
  isCreatingClaim: boolean;
  isDeletingClaim: boolean;
  isUpdatingClaim: boolean;
  isMarkingReady: boolean;
};

/**
 * Multi-claim submission hook for managing workflow state and API interactions
 * Coordinates state across creation, upload, and review phases
 */
export const useMultiClaim = () => {
  const queryClient = useQueryClient();

  // Local state for workflow phases and upload progress
  const [currentPhase, setCurrentPhase] = useState<MultiClaimPhase>(
    MultiClaimPhase.CREATION,
  );
  const [uploadProgress, setUploadProgress] = useState<
    Record<string, FileUploadProgress>
  >({});

  // Query key for draft claims
  const draftClaimsQueryKey = useMemo(() => ['claims', 'draft'], []);

  // Fetch draft claims
  const {
    data: draftClaimsResponse,
    isLoading: isDraftClaimsLoading,
    error: draftClaimsError,
    refetch: refetchDraftClaims,
  } = useQuery<IClaimListResponse>({
    queryKey: draftClaimsQueryKey,
    queryFn: async () => {
      return apiClient.get<IClaimListResponse>(
        `/claims?status=${ClaimStatus.DRAFT}`,
      );
    },
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: true,
  });

  // Extract draft claims array
  const draftClaims = useMemo(() => {
    return draftClaimsResponse?.claims ?? [];
  }, [draftClaimsResponse]);

  // Create new draft claim mutation
  const createClaimMutation = useMutation<
    IClaimResponse,
    Error,
    IClaimCreateRequest
  >({
    mutationFn: async (claimData) => {
      return apiClient.post<IClaimResponse>('/claims', claimData);
    },
    onSuccess: () => {
      // Invalidate and refetch draft claims to get the new claim
      void queryClient.invalidateQueries({ queryKey: draftClaimsQueryKey });
    },
  });

  // Update draft claim mutation
  const updateClaimMutation = useMutation<
    IClaimResponse,
    Error,
    { id: string; data: IClaimUpdateRequest }
  >({
    mutationFn: async ({ id, data }) => {
      return apiClient.put<IClaimResponse>(`/claims/${id}`, data);
    },
    onSuccess: () => {
      // Invalidate and refetch draft claims to get updated data
      void queryClient.invalidateQueries({ queryKey: draftClaimsQueryKey });
    },
  });

  // Delete draft claim mutation
  const deleteClaimMutation = useMutation<void, Error, string>({
    mutationFn: async (claimId) => {
      return apiClient.delete(`/claims/${claimId}`);
    },
    onSuccess: () => {
      // Invalidate and refetch draft claims
      void queryClient.invalidateQueries({ queryKey: draftClaimsQueryKey });
    },
  });

  // Mark claims as ready mutation (bulk operation)
  const markClaimsReadyMutation = useMutation<void, Error, string[]>({
    mutationFn: async (claimIds) => {
      // Mark each claim as ready individually using existing PUT /claims/:id/status endpoint
      const promises = claimIds.map((claimId) =>
        apiClient.put(`/claims/${claimId}/status`, {
          status: ClaimStatus.SENT,
        }),
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      // Invalidate draft claims query since they're no longer draft
      void queryClient.invalidateQueries({ queryKey: draftClaimsQueryKey });
      // Reset to creation phase for next multi-claim session
      setCurrentPhase(MultiClaimPhase.CREATION);
      setUploadProgress({});
    },
  });

  // Hook functions
  const createClaim = useCallback(
    async (claimData: IClaimCreateRequest) => {
      return createClaimMutation.mutateAsync(claimData);
    },
    [createClaimMutation],
  );

  const updateClaim = useCallback(
    async (claimId: string, claimData: IClaimUpdateRequest) => {
      return updateClaimMutation.mutateAsync({ id: claimId, data: claimData });
    },
    [updateClaimMutation],
  );

  const deleteClaim = useCallback(
    async (claimId: string) => {
      // Also remove upload progress for this claim
      setUploadProgress((prev) => {
        const { [claimId]: _removed, ...rest } = prev;
        return rest;
      });
      return deleteClaimMutation.mutateAsync(claimId);
    },
    [deleteClaimMutation],
  );

  const markAllClaimsReady = useCallback(async () => {
    const claimIds = draftClaims.map((claim) => claim.id);
    return markClaimsReadyMutation.mutateAsync(claimIds);
  }, [markClaimsReadyMutation, draftClaims]);

  // Phase transition functions
  const moveToUploadPhase = useCallback(() => {
    if (draftClaims.length > 0) {
      setCurrentPhase(MultiClaimPhase.UPLOAD);
    }
  }, [draftClaims.length]);

  const moveToReviewPhase = useCallback(() => {
    setCurrentPhase(MultiClaimPhase.REVIEW);
  }, []);

  const resetToCreationPhase = useCallback(() => {
    setCurrentPhase(MultiClaimPhase.CREATION);
    setUploadProgress({});
  }, []);

  // Upload progress management
  const updateUploadProgress = useCallback(
    (claimId: string, progress: FileUploadProgress) => {
      setUploadProgress((prev) => ({
        ...prev,
        [claimId]: progress,
      }));
    },
    [],
  );

  const clearUploadProgress = useCallback((claimId: string) => {
    setUploadProgress((prev) => {
      const { [claimId]: _removed, ...rest } = prev;
      return rest;
    });
  }, []);

  // Computed state
  const state: MultiClaimState = useMemo(
    () => ({
      currentPhase,
      draftClaims,
      uploadProgress,
      isCreatingClaim: createClaimMutation.isPending,
      isDeletingClaim: deleteClaimMutation.isPending,
      isUpdatingClaim: updateClaimMutation.isPending,
      isMarkingReady: markClaimsReadyMutation.isPending,
    }),
    [
      currentPhase,
      draftClaims,
      uploadProgress,
      createClaimMutation.isPending,
      deleteClaimMutation.isPending,
      updateClaimMutation.isPending,
      markClaimsReadyMutation.isPending,
    ],
  );

  // Summary calculations
  const summary = useMemo(() => {
    const totalAmount = draftClaims.reduce(
      (sum, claim) => sum + claim.totalAmount,
      0,
    );
    const claimsWithAttachments = draftClaims.filter(
      (claim) => (claim.attachments?.length ?? 0) > 0,
    ).length;
    const claimsWithoutAttachments = draftClaims.length - claimsWithAttachments;
    const canMarkReady =
      draftClaims.length > 0 && claimsWithoutAttachments === 0;

    return {
      totalAmount,
      claimsWithAttachments,
      claimsWithoutAttachments,
      canMarkReady,
      claimsCount: draftClaims.length,
    };
  }, [draftClaims]);

  // Error handling
  const errors = useMemo(
    () => ({
      draftClaimsError,
      createError: createClaimMutation.error,
      updateError: updateClaimMutation.error,
      deleteError: deleteClaimMutation.error,
      markReadyError: markClaimsReadyMutation.error,
    }),
    [
      draftClaimsError,
      createClaimMutation.error,
      updateClaimMutation.error,
      deleteClaimMutation.error,
      markClaimsReadyMutation.error,
    ],
  );

  // Loading states
  const loading = useMemo(
    () => ({
      isDraftClaimsLoading,
      isCreatingClaim: createClaimMutation.isPending,
      isUpdatingClaim: updateClaimMutation.isPending,
      isDeletingClaim: deleteClaimMutation.isPending,
      isMarkingReady: markClaimsReadyMutation.isPending,
    }),
    [
      isDraftClaimsLoading,
      createClaimMutation.isPending,
      updateClaimMutation.isPending,
      deleteClaimMutation.isPending,
      markClaimsReadyMutation.isPending,
    ],
  );

  return {
    // State
    state,
    summary,
    errors,
    loading,

    // Actions
    createClaim,
    updateClaim,
    deleteClaim,
    markAllClaimsReady,

    // Phase management
    moveToUploadPhase,
    moveToReviewPhase,
    resetToCreationPhase,

    // Upload progress management
    updateUploadProgress,
    clearUploadProgress,

    // Data refetch
    refetchDraftClaims,
  };
};
