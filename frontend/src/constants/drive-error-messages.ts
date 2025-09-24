/**
 * Comprehensive Google Drive error messages for user-friendly error handling
 * Requirements: Enhanced error handling with actionable user advice
 */

export const DriveErrorMessages = Object.freeze({
  // Authentication errors
  TOKEN_EXPIRED:
    'Your Google Drive access has expired. Please sign in again to continue.',
  TOKEN_INVALID: 'Your Google Drive access is invalid. Please sign in again.',
  INSUFFICIENT_PERMISSIONS:
    'Insufficient Google Drive permissions. Please re-authenticate with full Drive access.',
  AUTHENTICATION_REQUIRED:
    'Google Drive authentication required. Please sign in to continue.',

  // Network and connectivity errors
  NETWORK_ERROR:
    'Network connection issue. Please check your internet connection and try again.',
  TIMEOUT_ERROR:
    'The request timed out. Please check your internet connection and try again.',
  SERVICE_UNAVAILABLE:
    'Google Drive is temporarily unavailable. Please try again in a few minutes.',
  CONNECTION_FAILED:
    'Failed to connect to Google Drive. Please check your internet connection.',

  // File and upload errors
  FILE_TOO_LARGE:
    'File is too large. Maximum file size for Google Drive is 5TB.',
  FILE_EMPTY: 'Cannot upload empty file. Please select a valid file.',
  INVALID_FILE_NAME:
    'Invalid file name. Please remove special characters and try again.',
  INVALID_FILE_TYPE: 'File type not supported. Please select a different file.',
  UPLOAD_FAILED: 'File upload failed. Please try again.',
  UPLOAD_INTERRUPTED: 'Upload was interrupted. Please try again.',

  // Quota and storage errors
  STORAGE_QUOTA_EXCEEDED:
    'Your Google Drive storage is full. Please free up space or upgrade your storage plan.',
  API_QUOTA_EXCEEDED:
    'Too many requests to Google Drive. Please wait a moment and try again.',
  RATE_LIMITED: 'Request rate limit exceeded. Please wait before trying again.',

  // Folder and file management errors
  FOLDER_NOT_FOUND:
    'The folder could not be found. It may have been moved or deleted.',
  FILE_NOT_FOUND:
    'The file could not be found. It may have been moved or deleted.',
  FOLDER_CREATION_FAILED: 'Failed to create folder. Please try again.',
  INVALID_FOLDER_NAME:
    'Invalid folder name. Please remove special characters and try again.',
  FOLDER_ACCESS_DENIED:
    'Access denied to folder. Please check your permissions.',

  // Permission and access errors
  ACCESS_DENIED: 'Access denied. You may not have the required permissions.',
  FORBIDDEN_BY_POLICY:
    "Action blocked by your organization's policies. Please contact your administrator.",
  SHARING_RESTRICTED:
    "File sharing is restricted by your organization's policies.",

  // Generic and fallback errors
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
  SERVICE_ERROR: 'Google Drive service error. Please try again later.',
  CIRCUIT_BREAKER_OPEN:
    'Google Drive service is temporarily unavailable due to repeated failures. Please try again in a moment.',
} as const);

export type DriveErrorMessage =
  (typeof DriveErrorMessages)[keyof typeof DriveErrorMessages];

/**
 * Error advice for helping users resolve issues
 */
export const DriveErrorAdvice = Object.freeze({
  // Authentication advice
  REAUTH: [
    'Sign out and sign back in to refresh your authentication',
    "Make sure you're using your @mavericks-consulting.com account",
  ],
  TOKEN_REFRESH: [
    'Click the sign in button to re-authenticate',
    'Ensure you grant full Google Drive access permissions',
  ],

  // Storage and quota advice
  FREE_SPACE: [
    'Delete some files from your Google Drive to free up space',
    'Empty your Google Drive trash folder',
    'Consider upgrading your Google storage plan',
  ],
  REDUCE_USAGE: [
    'Wait a few minutes before trying again',
    'Avoid uploading multiple large files simultaneously',
    'Try uploading smaller files',
  ],

  // File and upload advice
  FILE_ISSUES: [
    'Check that your file is not corrupted or password protected',
    'Try with a different file format',
    "Ensure the file name doesn't contain special characters",
  ],
  NETWORK_ISSUES: [
    'Check your internet connection',
    'Try again in a moment',
    'Switch to a more stable network if possible',
  ],

  // Permission advice
  PERMISSION_ISSUES: [
    'Contact your system administrator if this is a company account',
    'Check that you have the necessary permissions in Google Drive',
    "Verify your organization's file sharing policies",
  ],

  // General advice
  RETRY: ['Try again in a moment', 'Refresh the page if the problem persists'],
  CONTACT_SUPPORT: [
    'Contact support if this error continues',
    'Provide the exact error message when contacting support',
  ],
} as const);

/**
 * Error severity levels for UI feedback
 */
export const DriveErrorSeverity = Object.freeze({
  LOW: 'low', // Temporary issues, automatic retry possible
  MEDIUM: 'medium', // Requires user action but recoverable
  HIGH: 'high', // Requires significant user action (re-auth, policy changes)
  CRITICAL: 'critical', // System-level issues, contact support
} as const);

export type DriveErrorSeverityLevel =
  (typeof DriveErrorSeverity)[keyof typeof DriveErrorSeverity];

/**
 * Mapping of error codes to user-friendly messages and advice
 */
export const DriveErrorMapping = Object.freeze({
  // HTTP status codes
  400: {
    message: DriveErrorMessages.INVALID_FILE_NAME,
    advice: DriveErrorAdvice.FILE_ISSUES,
    severity: DriveErrorSeverity.MEDIUM,
    canRetry: true,
  },
  401: {
    message: DriveErrorMessages.TOKEN_EXPIRED,
    advice: DriveErrorAdvice.REAUTH,
    severity: DriveErrorSeverity.HIGH,
    canRetry: false,
  },
  403: {
    message: DriveErrorMessages.ACCESS_DENIED,
    advice: DriveErrorAdvice.PERMISSION_ISSUES,
    severity: DriveErrorSeverity.HIGH,
    canRetry: false,
  },
  404: {
    message: DriveErrorMessages.FILE_NOT_FOUND,
    advice: DriveErrorAdvice.RETRY,
    severity: DriveErrorSeverity.MEDIUM,
    canRetry: true,
  },
  408: {
    message: DriveErrorMessages.TIMEOUT_ERROR,
    advice: DriveErrorAdvice.NETWORK_ISSUES,
    severity: DriveErrorSeverity.MEDIUM,
    canRetry: true,
  },
  413: {
    message: DriveErrorMessages.FILE_TOO_LARGE,
    advice: DriveErrorAdvice.FILE_ISSUES,
    severity: DriveErrorSeverity.MEDIUM,
    canRetry: false,
  },
  429: {
    message: DriveErrorMessages.RATE_LIMITED,
    advice: DriveErrorAdvice.REDUCE_USAGE,
    severity: DriveErrorSeverity.LOW,
    canRetry: true,
  },
  500: {
    message: DriveErrorMessages.SERVICE_ERROR,
    advice: DriveErrorAdvice.RETRY,
    severity: DriveErrorSeverity.MEDIUM,
    canRetry: true,
  },
  502: {
    message: DriveErrorMessages.SERVICE_UNAVAILABLE,
    advice: DriveErrorAdvice.RETRY,
    severity: DriveErrorSeverity.MEDIUM,
    canRetry: true,
  },
  503: {
    message: DriveErrorMessages.SERVICE_UNAVAILABLE,
    advice: DriveErrorAdvice.RETRY,
    severity: DriveErrorSeverity.MEDIUM,
    canRetry: true,
  },
  504: {
    message: DriveErrorMessages.TIMEOUT_ERROR,
    advice: DriveErrorAdvice.NETWORK_ISSUES,
    severity: DriveErrorSeverity.MEDIUM,
    canRetry: true,
  },
  507: {
    message: DriveErrorMessages.STORAGE_QUOTA_EXCEEDED,
    advice: DriveErrorAdvice.FREE_SPACE,
    severity: DriveErrorSeverity.HIGH,
    canRetry: true,
  },

  // Google Drive specific error reasons
  storageQuotaExceeded: {
    message: DriveErrorMessages.STORAGE_QUOTA_EXCEEDED,
    advice: DriveErrorAdvice.FREE_SPACE,
    severity: DriveErrorSeverity.HIGH,
    canRetry: true,
  },
  rateLimitExceeded: {
    message: DriveErrorMessages.API_QUOTA_EXCEEDED,
    advice: DriveErrorAdvice.REDUCE_USAGE,
    severity: DriveErrorSeverity.LOW,
    canRetry: true,
  },
  userRateLimitExceeded: {
    message: DriveErrorMessages.RATE_LIMITED,
    advice: DriveErrorAdvice.REDUCE_USAGE,
    severity: DriveErrorSeverity.LOW,
    canRetry: true,
  },
  sharingRateLimitExceeded: {
    message: DriveErrorMessages.RATE_LIMITED,
    advice: DriveErrorAdvice.REDUCE_USAGE,
    severity: DriveErrorSeverity.LOW,
    canRetry: true,
  },
  appNotAuthorizedToFile: {
    message: DriveErrorMessages.ACCESS_DENIED,
    advice: DriveErrorAdvice.PERMISSION_ISSUES,
    severity: DriveErrorSeverity.HIGH,
    canRetry: false,
  },
  insufficientFilePermissions: {
    message: DriveErrorMessages.ACCESS_DENIED,
    advice: DriveErrorAdvice.PERMISSION_ISSUES,
    severity: DriveErrorSeverity.HIGH,
    canRetry: false,
  },
  domainPolicy: {
    message: DriveErrorMessages.FORBIDDEN_BY_POLICY,
    advice: DriveErrorAdvice.PERMISSION_ISSUES,
    severity: DriveErrorSeverity.HIGH,
    canRetry: false,
  },
} as const);
