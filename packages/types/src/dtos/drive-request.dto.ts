export type IDriveUploadRequest = {
  fileName: string;
  parentFolderId?: string;
  description?: string;
};

export type IDriveOperationRequest = {
  operation: 'create-folder' | 'get-metadata' | 'update-permissions';
  parentFolderId?: string;
  folderName?: string;
};

export type IDriveFolderCreateRequest = {
  folderName: string;
  parentFolderId?: string;
};

export type IDrivePermissionUpdateRequest = {
  fileId: string;
  permissionType: 'anyone' | 'domain' | 'user';
  role: 'reader' | 'writer' | 'commenter';
};