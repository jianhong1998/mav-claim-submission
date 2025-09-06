export type IDriveUploadResponse = {
  success: boolean;
  fileId?: string;
  fileName?: string;
  webViewLink?: string;
  error?: string;
};

export type IDriveFileMetadata = {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  webViewLink?: string;
  webContentLink?: string;
  parents?: string[];
  createdTime: string;
  modifiedTime: string;
};

export type IDriveFolderCreateResponse = {
  success: boolean;
  folderId?: string;
  folderName?: string;
  webViewLink?: string;
  error?: string;
};

export type IDrivePermissionResponse = {
  success: boolean;
  fileId?: string;
  permissionId?: string;
  error?: string;
};

export type IDriveOperationResponse = {
  success: boolean;
  data?: any;
  error?: string;
};

export type IDriveAccessResponse = {
  hasAccess: boolean;
  email?: string;
  error?: string;
};