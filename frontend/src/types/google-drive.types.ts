export interface DriveTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

export interface DriveUploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  speed?: number;
  estimatedTimeRemaining?: number;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  webViewLink?: string;
  webContentLink?: string;
  parents?: string[];
  createdTime?: string;
  modifiedTime?: string;
}

export interface DriveFolder {
  id: string;
  name: string;
  webViewLink?: string;
  parents?: string[];
  createdTime?: string;
  modifiedTime?: string;
}

export interface DriveUploadOptions {
  fileName: string;
  mimeType: string;
  parentFolderId?: string;
  description?: string;
  onProgress?: (progress: DriveUploadProgress) => void;
}

export interface DriveCreateFolderOptions {
  name: string;
  parentFolderId?: string;
  description?: string;
}

export interface DriveApiError {
  error: {
    code: number;
    message: string;
    status: string;
    details?: Array<{
      '@type': string;
      reason?: string;
      domain?: string;
      metadata?: Record<string, string>;
    }>;
  };
}

export interface DriveOperationResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: DriveApiError;
}

export interface DriveRetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  retryableStatusCodes: number[];
}

export interface DriveClientConfig {
  retryConfig?: Partial<DriveRetryConfig>;
  timeout?: number;
  enableDebugLogging?: boolean;
}

export const DriveErrorCodes = Object.freeze({
  QUOTA_EXCEEDED: 403,
  RATE_LIMITED: 429,
  NOT_FOUND: 404,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  INTERNAL_ERROR: 500,
  BAD_REQUEST: 400,
} as const);

export type DriveErrorCode =
  (typeof DriveErrorCodes)[keyof typeof DriveErrorCodes];

export const DriveMimeTypes = Object.freeze({
  FOLDER: 'application/vnd.google-apps.folder',
  PDF: 'application/pdf',
  JPEG: 'image/jpeg',
  PNG: 'image/png',
} as const);

export type DriveMimeType =
  (typeof DriveMimeTypes)[keyof typeof DriveMimeTypes];
