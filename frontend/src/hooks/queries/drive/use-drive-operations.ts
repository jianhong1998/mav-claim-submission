import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getQueryKey, QueryGroup, QueryType } from '../keys';
import { useDriveClient } from './use-drive-client';
import { ErrorHandler } from '../helper/error-handler';
import { DriveFileItem, DrivePermission } from '@project/types';
import { handleDriveApiError } from '@/lib/drive-client';

interface CreateFolderParams {
  folderName: string;
  parentFolderId?: string;
  description?: string;
}

interface UpdatePermissionsParams {
  fileId: string;
  permission: DrivePermission;
}

interface FileMetadataParams {
  fileId: string;
}

interface FolderContentsParams {
  folderId?: string; // If undefined, gets root folder contents
  includeSubfolders?: boolean;
}

// Helper function to make authenticated Google Drive API calls
const makeDriveApiCall = async <T>(
  client: { getAccessToken: () => Promise<string | null> },
  apiCall: (accessToken: string) => Promise<T>,
): Promise<T> => {
  const accessToken = await client.getAccessToken();
  if (!accessToken) {
    throw new Error('No access token available');
  }
  return await apiCall(accessToken);
};

// Create folder using Google Drive API
const createFolderOnDrive = async (
  params: CreateFolderParams,
  client: { getAccessToken: () => Promise<string | null> },
): Promise<DriveFileItem> => {
  return makeDriveApiCall(client, async (accessToken: string) => {
    const metadata = {
      name: params.folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: params.parentFolderId ? [params.parentFolderId] : undefined,
      description: params.description,
    };

    const response = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metadata),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to create folder: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    return {
      id: data.id,
      name: data.name,
      mimeType: data.mimeType,
      parents: data.parents,
      createdTime: data.createdTime,
      modifiedTime: data.modifiedTime,
      webViewLink: data.webViewLink,
    };
  });
};

// Get file metadata using Google Drive API
const getFileMetadata = async (
  params: FileMetadataParams,
  client: { getAccessToken: () => Promise<string | null> },
): Promise<DriveFileItem> => {
  return makeDriveApiCall(client, async (accessToken: string) => {
    const fields =
      'id,name,mimeType,size,parents,createdTime,modifiedTime,webViewLink,thumbnailLink';
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${params.fileId}?fields=${fields}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('File not found');
      }
      throw new Error(
        `Failed to get file metadata: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    return {
      id: data.id,
      name: data.name,
      mimeType: data.mimeType,
      size: data.size ? parseInt(data.size as string) : undefined,
      parents: data.parents,
      createdTime: data.createdTime,
      modifiedTime: data.modifiedTime,
      webViewLink: data.webViewLink,
      thumbnailLink: data.thumbnailLink,
    };
  });
};

// Get folder contents using Google Drive API
const getFolderContents = async (
  params: FolderContentsParams,
  client: { getAccessToken: () => Promise<string | null> },
): Promise<{ files: DriveFileItem[]; folders: DriveFileItem[] }> => {
  return makeDriveApiCall(client, async (accessToken: string) => {
    const parentQuery = params.folderId
      ? `'${params.folderId}' in parents`
      : "'root' in parents";
    const query = `${parentQuery} and trashed=false`;
    const fields =
      'files(id,name,mimeType,size,parents,createdTime,modifiedTime,webViewLink,thumbnailLink)';

    const url = new URL('https://www.googleapis.com/drive/v3/files');
    url.searchParams.append('q', query);
    url.searchParams.append('fields', fields);
    url.searchParams.append('orderBy', 'folder,name');

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to get folder contents: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    const items: DriveFileItem[] = data.files || [];

    // Separate files and folders
    const folders = items.filter(
      (item) => item.mimeType === 'application/vnd.google-apps.folder',
    );
    const files = items.filter(
      (item) => item.mimeType !== 'application/vnd.google-apps.folder',
    );

    return { files, folders };
  });
};

// Update file permissions using Google Drive API
const updateFilePermissions = async (
  params: UpdatePermissionsParams,
  client: { getAccessToken: () => Promise<string | null> },
): Promise<{ permissionId: string }> => {
  return makeDriveApiCall(client, async (accessToken: string) => {
    const permissionData = {
      type: params.permission.type,
      role: params.permission.role,
      emailAddress: params.permission.emailAddress,
    };

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${params.fileId}/permissions`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(permissionData),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Failed to update permissions: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    return { permissionId: data.id };
  });
};

// Hook for creating folders
export const useDriveCreateFolder = () => {
  const queryClient = useQueryClient();
  const { client, hasAccess, isSignedIn } = useDriveClient();

  return useMutation<DriveFileItem, Error, CreateFolderParams>({
    mutationFn: async (params: CreateFolderParams) => {
      if (!client) {
        throw new Error('Drive client not initialized');
      }

      if (!isSignedIn || !hasAccess) {
        throw new Error('Drive access required. Please sign in.');
      }

      if (!params.folderName || !params.folderName.trim()) {
        throw new Error('Folder name is required');
      }

      if (params.folderName.length > 255) {
        throw new Error('Folder name must be 255 characters or less');
      }

      try {
        return await createFolderOnDrive(params, client);
      } catch (error) {
        const driveError = handleDriveApiError(error);
        throw new Error(driveError.message);
      }
    },
    onSuccess: (folderInfo, variables) => {
      // Folder created successfully

      // Invalidate folder contents queries that might need updating
      void queryClient.invalidateQueries({
        queryKey: [QueryGroup.DRIVE, QueryType.LIST],
      });

      // If we created in a specific parent, invalidate that parent's contents
      if (variables.parentFolderId) {
        void queryClient.invalidateQueries({
          queryKey: getQueryKey({
            group: QueryGroup.DRIVE,
            type: QueryType.LIST,
            key: { folderId: variables.parentFolderId },
          }),
        });
      }
    },
    onError: (error) => {
      const _errorMessage = ErrorHandler.extractErrorMessage(error);
      // Drive folder creation failed
    },
  });
};

// Hook for getting file metadata
export const useDriveFileMetadata = (params: FileMetadataParams) => {
  const { client, hasAccess, isSignedIn } = useDriveClient();

  return useQuery<DriveFileItem>({
    queryKey: getQueryKey({
      group: QueryGroup.DRIVE,
      type: QueryType.ONE,
      key: { fileId: params.fileId },
    }),
    queryFn: async () => {
      if (!client) {
        throw new Error('Drive client not initialized');
      }

      if (!isSignedIn || !hasAccess) {
        throw new Error('Drive access required. Please sign in.');
      }

      if (!params.fileId) {
        throw new Error('File ID is required');
      }

      try {
        return await getFileMetadata(params, client);
      } catch (error) {
        const driveError = handleDriveApiError(error);
        throw new Error(driveError.message);
      }
    },
    enabled: Boolean(client && isSignedIn && hasAccess && params.fileId),
    staleTime: 1000 * 60 * 5, // 5 minutes - metadata doesn't change frequently
    retry: 2,
  });
};

// Hook for getting folder contents
export const useDriveFolderContents = (params: FolderContentsParams) => {
  const { client, hasAccess, isSignedIn } = useDriveClient();

  return useQuery<{ files: DriveFileItem[]; folders: DriveFileItem[] }>({
    queryKey: getQueryKey({
      group: QueryGroup.DRIVE,
      type: QueryType.LIST,
      key: {
        folderId: params.folderId || 'root',
        includeSubfolders: params.includeSubfolders || false,
      },
    }),
    queryFn: async () => {
      if (!client) {
        throw new Error('Drive client not initialized');
      }

      if (!isSignedIn || !hasAccess) {
        throw new Error('Drive access required. Please sign in.');
      }

      try {
        return await getFolderContents(params, client);
      } catch (error) {
        const driveError = handleDriveApiError(error);
        throw new Error(driveError.message);
      }
    },
    enabled: Boolean(client && isSignedIn && hasAccess),
    staleTime: 1000 * 60 * 2, // 2 minutes - folder contents can change
    retry: 2,
  });
};

// Hook for updating file permissions
export const useDriveUpdatePermissions = () => {
  const queryClient = useQueryClient();
  const { client, hasAccess, isSignedIn } = useDriveClient();

  return useMutation<{ permissionId: string }, Error, UpdatePermissionsParams>({
    mutationFn: async (params: UpdatePermissionsParams) => {
      if (!client) {
        throw new Error('Drive client not initialized');
      }

      if (!isSignedIn || !hasAccess) {
        throw new Error('Drive access required. Please sign in.');
      }

      if (!params.fileId) {
        throw new Error('File ID is required');
      }

      if (!params.permission.type || !params.permission.role) {
        throw new Error('Permission type and role are required');
      }

      if (
        params.permission.type === 'user' &&
        !params.permission.emailAddress
      ) {
        throw new Error('Email address is required for user permissions');
      }

      try {
        return await updateFilePermissions(params, client);
      } catch (error) {
        const driveError = handleDriveApiError(error);
        throw new Error(driveError.message);
      }
    },
    onSuccess: (result, variables) => {
      // Permissions updated successfully

      // Invalidate the file metadata to refresh permissions info
      void queryClient.invalidateQueries({
        queryKey: getQueryKey({
          group: QueryGroup.DRIVE,
          type: QueryType.ONE,
          key: { fileId: variables.fileId },
        }),
      });
    },
    onError: (error) => {
      const _errorMessage = ErrorHandler.extractErrorMessage(error);
      // Drive permission update failed
    },
  });
};

// Main operations hook that combines all operations
export const useDriveOperations = () => {
  const createFolderMutation = useDriveCreateFolder();
  const updatePermissionsMutation = useDriveUpdatePermissions();

  const createFolder = async (params: CreateFolderParams) => {
    try {
      return await createFolderMutation.mutateAsync(params);
    } catch (error) {
      // Create folder error
      throw error;
    }
  };

  const updatePermissions = async (params: UpdatePermissionsParams) => {
    try {
      return await updatePermissionsMutation.mutateAsync(params);
    } catch (error) {
      // Update permissions error
      throw error;
    }
  };

  const shareFileWithAnyone = async (fileId: string) => {
    return updatePermissions({
      fileId,
      permission: {
        type: 'anyone',
        role: 'reader',
      },
    });
  };

  const shareFileWithUser = async (
    fileId: string,
    emailAddress: string,
    role: 'reader' | 'writer' | 'commenter' = 'reader',
  ) => {
    return updatePermissions({
      fileId,
      permission: {
        type: 'user',
        role,
        emailAddress,
      },
    });
  };

  return {
    // Folder operations
    createFolder,
    isCreatingFolder: createFolderMutation.isPending,
    createFolderError: createFolderMutation.error,

    // Permission operations
    updatePermissions,
    shareFileWithAnyone,
    shareFileWithUser,
    isUpdatingPermissions: updatePermissionsMutation.isPending,
    permissionError: updatePermissionsMutation.error,
  };
};
