import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { attachmentQueryKeys } from '../queries/keys/key';
import { apiClient } from '@/lib/api-client';
import {
  IAttachmentUploadResponse,
  AttachmentMimeType,
  AttachmentStatus,
  IAttachmentValidation,
} from '@project/types';
import { ErrorHandler } from '../queries/helper/error-handler';
import { toast } from 'sonner';
import { DriveUploadClient } from '@/lib/google-drive-client';
import {
  DriveUploadProgress,
  DriveFile,
  DriveApiError,
} from '@/types/google-drive.types';

/**
 * File validation constants
 */
const FILE_VALIDATION = Object.freeze({
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  MIN_SIZE: 1024, // 1KB
  ALLOWED_TYPES: [
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/jpg',
  ] as const,
  MAX_FILENAME_LENGTH: 255,
} as const);

/**
 * Upload progress state interface
 */
interface UploadProgress {
  progress: number;
  status: AttachmentStatus;
  uploadedBytes: number;
  totalBytes: number;
  estimatedTimeRemaining?: number;
}

/**
 * Client-side upload workflow state
 */
interface ClientUploadState {
  phase: 'token' | 'drive' | 'metadata' | 'complete' | 'error';
  driveFileId?: string;
  driveUrl?: string;
  error?: string;
}

/**
 * Hook state interface for upload tracking
 */
interface UseAttachmentUploadState {
  currentUploads: Map<string, UploadProgress>;
  uploadHistory: Array<{
    fileName: string;
    status: AttachmentStatus;
    timestamp: number;
    error?: string;
  }>;
}

/**
 * Validates file before upload according to business rules
 */
const validateFile = (file: File): IAttachmentValidation => {
  const errors: string[] = [];

  // Check file size
  if (file.size > FILE_VALIDATION.MAX_SIZE) {
    errors.push(
      `File size exceeds maximum of ${FILE_VALIDATION.MAX_SIZE / (1024 * 1024)}MB`,
    );
  }

  if (file.size < FILE_VALIDATION.MIN_SIZE) {
    errors.push(
      `File size must be at least ${FILE_VALIDATION.MIN_SIZE / 1024}KB`,
    );
  }

  // Check file type
  if (!FILE_VALIDATION.ALLOWED_TYPES.includes(file.type as never)) {
    errors.push(
      `File type ${file.type} is not supported. Allowed types: PDF, PNG, JPEG`,
    );
  }

  // Check filename length
  if (file.name.length > FILE_VALIDATION.MAX_FILENAME_LENGTH) {
    errors.push(
      `Filename exceeds maximum length of ${FILE_VALIDATION.MAX_FILENAME_LENGTH} characters`,
    );
  }

  // Check for valid mimetype enum
  const mimeType = Object.values(AttachmentMimeType).find(
    (type) => type === file.type,
  );

  return {
    isValid: errors.length === 0,
    fileName: file.name,
    fileSize: file.size,
    mimeType: mimeType as AttachmentMimeType,
    errors: errors.length > 0 ? errors : undefined,
  };
};

/**
 * Maps Google Drive progress to our progress interface
 */
const mapDriveProgress = (
  driveProgress: DriveUploadProgress,
): UploadProgress => ({
  progress: driveProgress.percentage,
  status:
    driveProgress.percentage < 100
      ? AttachmentStatus.PENDING
      : AttachmentStatus.UPLOADED,
  uploadedBytes: driveProgress.loaded,
  totalBytes: driveProgress.total,
  estimatedTimeRemaining: driveProgress.estimatedTimeRemaining,
});

/**
 * Creates a singleton Drive client instance
 */
const createDriveClient = (() => {
  let driveClient: DriveUploadClient | null = null;

  const factory = () => {
    if (!driveClient) {
      driveClient = new DriveUploadClient({ enableDebugLogging: false });
    }
    return driveClient;
  };

  // Add reset function for testing
  factory.reset = () => {
    driveClient = null;
  };

  return factory;
})();

// Export for testing
export { createDriveClient };

/**
 * Enhanced attachment upload hook with comprehensive progress tracking and validation
 * Follows existing useAuthStatus patterns for performance and error handling
 */
export const useAttachmentUpload = (claimId: string) => {
  const queryClient = useQueryClient();

  // Internal state for tracking uploads
  const [uploadState, setUploadState] = useState<UseAttachmentUploadState>({
    currentUploads: new Map(),
    uploadHistory: [],
  });

  // Memoized error handler to prevent recreation
  const handleUploadError = useCallback((error: unknown, fileName: string) => {
    const statusCode = ErrorHandler.extractStatusCodeFromError(error);
    const errorMessage = ErrorHandler.extractErrorMessage(error);

    // Update upload state with error
    setUploadState((prev) => ({
      ...prev,
      currentUploads: new Map(prev.currentUploads),
      uploadHistory: [
        ...prev.uploadHistory,
        {
          fileName,
          status: AttachmentStatus.FAILED,
          timestamp: Date.now(),
          error: errorMessage,
        },
      ],
    }));

    // Handle specific error cases
    if (statusCode === 413) {
      toast.error('File too large. Maximum size is 10MB.');
      return;
    }

    if (statusCode === 415) {
      toast.error(
        'File type not supported. Please use PDF, PNG, or JPEG files.',
      );
      return;
    }

    if (statusCode === 400) {
      toast.error(`Upload failed: ${errorMessage}`);
      return;
    }

    if (statusCode === 'ERR_NETWORK') {
      toast.error('Network error. Please check your connection and try again.');
      return;
    }

    // Generic error handling
    toast.error(`Upload failed for ${fileName}: ${errorMessage}`);
  }, []);

  // Memoized client-side upload mutation
  const uploadMutation = useMutation<
    IAttachmentUploadResponse,
    unknown,
    { file: File; onProgress?: (progress: UploadProgress) => void }
  >({
    mutationFn: async ({ file, onProgress }) => {
      // Validate file first
      const validation = validateFile(file);
      if (!validation.isValid) {
        throw new Error(
          validation.errors?.join(', ') || 'File validation failed',
        );
      }

      const fileName = file.name;
      const uploadState: ClientUploadState = { phase: 'token' };

      try {
        // Phase 1: Initialize Drive client and get token
        uploadState.phase = 'token';
        const driveClient = createDriveClient();
        await driveClient.initialize();

        // Phase 2: Ensure folder structure exists
        uploadState.phase = 'drive';

        // Create/get "Mavericks Claims" root folder
        const claimsFolderResult =
          await driveClient.getOrCreateFolder('Mavericks Claims');
        if (!claimsFolderResult.success || !claimsFolderResult.data) {
          throw new Error(
            driveClient.getUserFriendlyErrorMessage(claimsFolderResult.error!),
          );
        }

        // Create/get claim-specific subfolder
        const claimFolderResult = await driveClient.getOrCreateFolder(
          claimId,
          claimsFolderResult.data.id,
        );
        if (!claimFolderResult.success || !claimFolderResult.data) {
          throw new Error(
            driveClient.getUserFriendlyErrorMessage(claimFolderResult.error!),
          );
        }

        // Phase 3: Upload to correct folder
        const driveResult = await driveClient.uploadFile(file, {
          fileName: file.name,
          mimeType: validation.mimeType!,
          parentFolderId: claimFolderResult.data.id,
          onProgress: (driveProgress) => {
            const progress = mapDriveProgress(driveProgress);
            setUploadState((prev) => ({
              ...prev,
              currentUploads: new Map(
                prev.currentUploads.set(fileName, progress),
              ),
            }));
            onProgress?.(progress);
          },
        });

        if (!driveResult.success || !driveResult.data) {
          throw new Error(
            driveClient.getUserFriendlyErrorMessage(
              driveResult.error as DriveApiError,
            ),
          );
        }

        const driveFile = driveResult.data as DriveFile;
        uploadState.driveFileId = driveFile.id;
        uploadState.driveUrl =
          driveFile.webViewLink ||
          `https://drive.google.com/file/d/${driveFile.id}/view`;

        // Phase 4: Store metadata in backend
        uploadState.phase = 'metadata';
        const metadataResponse =
          await apiClient.post<IAttachmentUploadResponse>(
            '/attachments/metadata',
            {
              claimId,
              originalFilename: file.name,
              storedFilename: driveFile.name,
              googleDriveFileId: driveFile.id,
              googleDriveUrl:
                driveFile.webViewLink ||
                `https://drive.google.com/file/d/${driveFile.id}/view`,
              fileSize: file.size,
              mimeType: validation.mimeType!,
            },
          );

        // Phase 5: Complete
        uploadState.phase = 'complete';

        // Update state with success
        setUploadState((prev) => ({
          ...prev,
          uploadHistory: [
            ...prev.uploadHistory,
            {
              fileName,
              status: AttachmentStatus.UPLOADED,
              timestamp: Date.now(),
            },
          ],
        }));

        return metadataResponse;
      } catch (error) {
        uploadState.phase = 'error';
        uploadState.error =
          error instanceof Error ? error.message : 'Upload failed';

        // Update progress with failed status
        setUploadState((prev) => ({
          ...prev,
          currentUploads: new Map(
            prev.currentUploads.set(fileName, {
              progress: 0,
              status: AttachmentStatus.FAILED,
              uploadedBytes: 0,
              totalBytes: file.size,
            }),
          ),
        }));

        throw error;
      }
    },
    onError: (error, { file }) => {
      handleUploadError(error, file.name);
    },
    onSuccess: (data, { file }) => {
      // Invalidate attachment queries to refresh lists
      void queryClient.invalidateQueries({
        queryKey: attachmentQueryKeys.list(claimId),
      });

      // Remove from current uploads on success
      setUploadState((prev) => {
        const newMap = new Map(prev.currentUploads);
        newMap.delete(file.name);
        return {
          ...prev,
          currentUploads: newMap,
        };
      });

      if (data.success) {
        toast.success(`${file.name} uploaded successfully`);
      }
    },
  });

  // Memoized upload function
  const uploadFile = useCallback(
    (
      file: File,
      options?: { onProgress?: (progress: UploadProgress) => void },
    ) => {
      return uploadMutation.mutateAsync({
        file,
        onProgress: options?.onProgress,
      });
    },
    [uploadMutation],
  );

  // Memoized batch upload function
  const uploadFiles = useCallback(
    async (
      files: File[],
      options?: {
        onProgress?: (fileName: string, progress: UploadProgress) => void;
      },
    ) => {
      const uploadPromises = files.map((file) =>
        uploadFile(file, {
          onProgress: options?.onProgress
            ? (progress) => options.onProgress!(file.name, progress)
            : undefined,
        }),
      );

      return Promise.allSettled(uploadPromises);
    },
    [uploadFile],
  );

  // Memoized file validation function
  const validateFiles = useCallback(
    (
      files: File[],
    ): { valid: File[]; invalid: Array<{ file: File; errors: string[] }> } => {
      const valid: File[] = [];
      const invalid: Array<{ file: File; errors: string[] }> = [];

      files.forEach((file) => {
        const validation = validateFile(file);
        if (validation.isValid) {
          valid.push(file);
        } else {
          invalid.push({ file, errors: validation.errors || [] });
        }
      });

      return { valid, invalid };
    },
    [],
  );

  // Clear upload history
  const clearHistory = useCallback(() => {
    setUploadState((prev) => ({
      ...prev,
      uploadHistory: [],
    }));
  }, []);

  // Get progress for specific file
  const getFileProgress = useCallback(
    (fileName: string): UploadProgress | null => {
      return uploadState.currentUploads.get(fileName) || null;
    },
    [uploadState.currentUploads],
  );

  // Memoized return value to ensure stable reference
  return useMemo(
    () => ({
      // Core upload functions
      uploadFile,
      uploadFiles,
      validateFiles,

      // State and progress tracking
      isUploading: uploadMutation.isPending,
      currentUploads: Array.from(uploadState.currentUploads.entries()).map(
        ([fileName, progress]) => ({
          fileName,
          ...progress,
        }),
      ),
      uploadHistory: uploadState.uploadHistory,
      getFileProgress,

      // Utility functions
      clearHistory,

      // Mutation state
      error: uploadMutation.error,
      isError: uploadMutation.isError,
      isSuccess: uploadMutation.isSuccess,

      // File validation constants (exposed for components)
      maxFileSize: FILE_VALIDATION.MAX_SIZE,
      allowedTypes: FILE_VALIDATION.ALLOWED_TYPES,
      maxFilenameLength: FILE_VALIDATION.MAX_FILENAME_LENGTH,
    }),
    [
      uploadFile,
      uploadFiles,
      validateFiles,
      uploadMutation.isPending,
      uploadMutation.error,
      uploadMutation.isError,
      uploadMutation.isSuccess,
      uploadState.currentUploads,
      uploadState.uploadHistory,
      getFileProgress,
      clearHistory,
    ],
  );
};
