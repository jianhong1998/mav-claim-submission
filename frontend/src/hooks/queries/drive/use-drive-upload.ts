import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getQueryKey, QueryGroup, QueryType } from '../keys';
import { useDriveClient } from './use-drive-client';
import { ErrorHandler } from '../helper/error-handler';
import {
  DriveUploadRequest,
  DriveUploadProgress,
  DriveFileItem,
  DriveApiError,
} from '@project/types';
import { handleDriveApiError } from '@/lib/drive-client';

interface UploadProgressCallback {
  (progress: DriveUploadProgress): void;
}

interface DriveUploadOptions {
  onProgress?: UploadProgressCallback;
  onSuccess?: (fileInfo: DriveFileItem) => void;
  onError?: (error: DriveApiError) => void;
}

interface DriveUploadParams extends DriveUploadRequest {
  options?: DriveUploadOptions;
}

// Upload function using Google Drive API directly
const uploadFileToGoogleDrive = async (
  params: DriveUploadParams,
  driveClient: { getAccessToken: () => Promise<string | null> },
): Promise<DriveFileItem> => {
  const { file, fileName, parentFolderId, description, options } = params;

  // File content is already an ArrayBuffer
  const fileContent = file.content;

  const metadata = {
    name: fileName || file.name,
    parents: parentFolderId ? [parentFolderId] : undefined,
    description,
  };

  // Create form data for multipart upload
  const form = new FormData();
  form.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' }),
  );
  form.append('file', new Blob([fileContent], { type: file.mimeType }));

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Progress tracking
    if (options?.onProgress) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress: DriveUploadProgress = {
            loaded: event.loaded,
            total: event.total,
            percentage: Math.round((event.loaded * 100) / event.total),
          };
          options.onProgress!(progress);
        }
      });
    }

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          const fileInfo: DriveFileItem = {
            id: response.id,
            name: response.name,
            mimeType: file.mimeType,
            size: file.size,
            webViewLink: response.webViewLink,
            parents: response.parents,
            createdTime: response.createdTime || new Date().toISOString(),
            modifiedTime: response.modifiedTime || new Date().toISOString(),
          };
          resolve(fileInfo);
        } catch (_parseError) {
          reject(new Error('Failed to parse upload response'));
        }
      } else {
        reject(new Error(`Upload failed with status: ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Upload request failed'));
    });

    // Get access token for authentication
    driveClient
      .getAccessToken()
      .then((token: string | null) => {
        if (!token) {
          reject(new Error('No access token available'));
          return;
        }

        xhr.open(
          'POST',
          'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        );
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.send(form);
      })
      .catch(reject);
  });
};

export const useDriveUpload = () => {
  const queryClient = useQueryClient();
  const { client, hasAccess, isSignedIn } = useDriveClient();

  return useMutation<DriveFileItem, Error, DriveUploadParams>({
    mutationFn: async (params: DriveUploadParams) => {
      // Validate client access
      if (!client) {
        throw new Error('Drive client not initialized');
      }

      if (!isSignedIn || !hasAccess) {
        throw new Error('Drive access required. Please sign in.');
      }

      // Validate file data
      if (!params.file) {
        throw new Error('File data is required');
      }

      if (!params.file.content) {
        throw new Error('File content is required');
      }

      if (!params.file.name || !params.file.name.trim()) {
        throw new Error('File name is required');
      }

      if (!params.file.mimeType) {
        throw new Error('File MIME type is required');
      }

      if (params.file.size <= 0) {
        throw new Error('File must have valid size');
      }

      // Validate file name
      const fileName = params.fileName || params.file.name;
      if (fileName.length > 255) {
        throw new Error('File name must be 255 characters or less');
      }

      // Check file size limits (100MB for now)
      const maxFileSize = 100 * 1024 * 1024; // 100MB
      if (params.file.size > maxFileSize) {
        throw new Error('File size must be less than 100MB');
      }

      try {
        const result = await uploadFileToGoogleDrive(params, client);

        // Call success callback if provided
        if (params.options?.onSuccess) {
          params.options.onSuccess(result);
        }

        return result;
      } catch (error) {
        const driveError = handleDriveApiError(error);

        // Call error callback if provided
        if (params.options?.onError) {
          params.options.onError(driveError);
        }

        throw new Error(driveError.message);
      }
    },
    onSuccess: (fileInfo) => {
      // File uploaded successfully

      // Invalidate any drive-related queries that might need refreshing
      void queryClient.invalidateQueries({
        queryKey: [QueryGroup.DRIVE],
      });

      // Update specific file metadata cache if we're tracking files
      queryClient.setQueryData(
        getQueryKey({
          group: QueryGroup.DRIVE,
          type: QueryType.ONE,
          key: { fileId: fileInfo.id },
        }),
        fileInfo,
      );
    },
    onError: (_error) => {
      // Drive upload failed

      // Invalidate client state in case there's an auth issue
      void queryClient.invalidateQueries({
        queryKey: getQueryKey({
          group: QueryGroup.DRIVE,
          type: QueryType.ONE,
          key: 'client-state',
        }),
      });
    },
  });
};

// Convenience hook for multiple file uploads
export const useDriveMultiUpload = () => {
  const queryClient = useQueryClient();
  const singleUpload = useDriveUpload();

  interface MultiUploadParams {
    files: DriveUploadParams[];
    concurrency?: number; // Number of simultaneous uploads
  }

  interface MultiUploadResult {
    successful: DriveFileItem[];
    failed: { file: DriveUploadParams; error: string }[];
  }

  return useMutation<MultiUploadResult, Error, MultiUploadParams>({
    mutationFn: async (params: MultiUploadParams) => {
      const { files, concurrency = 3 } = params;

      if (!files || files.length === 0) {
        throw new Error('No files provided for upload');
      }

      const successful: DriveFileItem[] = [];
      const failed: { file: DriveUploadParams; error: string }[] = [];

      // Process files in batches based on concurrency
      for (let i = 0; i < files.length; i += concurrency) {
        const batch = files.slice(i, i + concurrency);

        const batchPromises = batch.map(async (file) => {
          try {
            const result = await singleUpload.mutateAsync(file);
            successful.push(result);
            return { success: true, result };
          } catch (error) {
            const errorMessage = ErrorHandler.extractErrorMessage(error);
            failed.push({ file, error: errorMessage });
            return { success: false, error: errorMessage };
          }
        });

        // Wait for current batch to complete before processing next
        await Promise.allSettled(batchPromises);
      }

      return { successful, failed };
    },
    onSuccess: (_result) => {
      // Multi-upload completed

      // Invalidate drive queries
      void queryClient.invalidateQueries({
        queryKey: [QueryGroup.DRIVE],
      });
    },
    onError: (_error) => {
      // Multi-upload failed
    },
  });
};
