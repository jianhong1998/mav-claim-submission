export const DriveApiConfig = Object.freeze({
  SCOPES: ['https://www.googleapis.com/auth/drive.file'],
  DISCOVERY_DOCS: [
    'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
  ],
  API_VERSION: 'v3',
  BASE_URL: 'https://www.googleapis.com/drive/v3',
} as const);
export type DriveApiConfig =
  (typeof DriveApiConfig)[keyof typeof DriveApiConfig];

export const DriveMimeTypes = Object.freeze({
  FOLDER: 'application/vnd.google-apps.folder',
  DOCUMENT: 'application/vnd.google-apps.document',
  SPREADSHEET: 'application/vnd.google-apps.spreadsheet',
  PRESENTATION: 'application/vnd.google-apps.presentation',
  PDF: 'application/pdf',
  IMAGE_JPEG: 'image/jpeg',
  IMAGE_PNG: 'image/png',
  TEXT_PLAIN: 'text/plain',
  APPLICATION_JSON: 'application/json',
} as const);
export type DriveMimeTypes =
  (typeof DriveMimeTypes)[keyof typeof DriveMimeTypes];

export const DrivePermissions = Object.freeze({
  TYPE: {
    ANYONE: 'anyone',
    DOMAIN: 'domain',
    USER: 'user',
  } as const,
  ROLE: {
    READER: 'reader',
    WRITER: 'writer',
    COMMENTER: 'commenter',
  } as const,
} as const);
export type DrivePermissionType =
  (typeof DrivePermissions.TYPE)[keyof typeof DrivePermissions.TYPE];
export type DrivePermissionRole =
  (typeof DrivePermissions.ROLE)[keyof typeof DrivePermissions.ROLE];

export const DriveClientSettings = Object.freeze({
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
  CHUNK_SIZE: 8 * 1024 * 1024, // 8MB chunks for resumable uploads
  TIMEOUT: 30000, // 30 seconds
  RETRY_COUNT: 3,
  RETRY_DELAY: 1000, // 1 second
} as const);
export type DriveClientSettings =
  (typeof DriveClientSettings)[keyof typeof DriveClientSettings];

export const DriveErrorCodes = Object.freeze({
  QUOTA_EXCEEDED: 403,
  RATE_LIMIT: 429,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const);
export type DriveErrorCodes =
  (typeof DriveErrorCodes)[keyof typeof DriveErrorCodes];

export const DriveUploadStatus = Object.freeze({
  PENDING: 'pending',
  IN_PROGRESS: 'in-progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const);
export type DriveUploadStatus =
  (typeof DriveUploadStatus)[keyof typeof DriveUploadStatus];
