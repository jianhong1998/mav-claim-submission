export interface DriveConfig {
  clientId: string;
  scope: string[];
  discoveryDocs: string[];
  apiKey?: string;
}

export interface DriveFileData {
  content: ArrayBuffer;
  name: string;
  mimeType: string;
  size: number;
}

export interface DriveUploadRequest {
  file: DriveFileData;
  fileName: string;
  parentFolderId?: string;
  description?: string;
}

export interface DriveClientState {
  isInitialized: boolean;
  isSignedIn: boolean;
  hasAccess: boolean;
  error?: string;
}

export interface DriveUploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface DrivePermission {
  type: 'anyone' | 'domain' | 'user';
  role: 'reader' | 'writer' | 'commenter';
  emailAddress?: string;
}

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  webViewLink?: string;
  thumbnailLink?: string;
  parents?: string[];
  createdTime: string;
  modifiedTime: string;
}

export interface DriveFolderStructure {
  id: string;
  name: string;
  children: DriveFolderStructure[];
  files: DriveFileItem[];
}

export interface DriveApiError {
  code: number;
  message: string;
  status: string;
}

export type DriveOperation = 'upload' | 'create-folder' | 'get-metadata' | 'update-permissions' | 'delete-file';

export interface DriveOperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: DriveApiError;
}