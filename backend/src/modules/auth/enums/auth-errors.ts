/**
 * Authentication Error Codes and Messages
 *
 * Using Object.freeze() pattern for consistent error handling across auth module.
 * Requirements: 1.4 - User-friendly error messages for auth failures
 *
 * Error Scenarios Based on Design Document:
 * - Domain restriction violations
 * - Google OAuth API failures
 * - Token refresh failures
 * - Database connection errors
 * - Invalid JWT tokens
 * - Missing profile information
 * - Session management errors
 */

export const AuthError = Object.freeze({
  // Domain Restriction Errors
  DOMAIN_RESTRICTED: 'DOMAIN_RESTRICTED',
  INVALID_EMAIL_DOMAIN: 'INVALID_EMAIL_DOMAIN',

  // OAuth Flow Errors
  OAUTH_FAILURE: 'OAUTH_FAILURE',
  OAUTH_CALLBACK_FAILED: 'OAUTH_CALLBACK_FAILED',
  GOOGLE_SERVICE_UNAVAILABLE: 'GOOGLE_SERVICE_UNAVAILABLE',
  MISSING_EMAIL_IN_PROFILE: 'MISSING_EMAIL_IN_PROFILE',
  MISSING_PROFILE_DATA: 'MISSING_PROFILE_DATA',

  // Token Management Errors
  TOKEN_REFRESH_FAILED: 'TOKEN_REFRESH_FAILED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_NOT_FOUND: 'TOKEN_NOT_FOUND',
  TOKEN_STORAGE_FAILED: 'TOKEN_STORAGE_FAILED',

  // JWT Errors
  JWT_INVALID: 'JWT_INVALID',
  JWT_EXPIRED: 'JWT_EXPIRED',
  JWT_MALFORMED: 'JWT_MALFORMED',
  JWT_GENERATION_FAILED: 'JWT_GENERATION_FAILED',

  // Session Management Errors
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  SESSION_INVALID: 'SESSION_INVALID',
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',

  // Database and System Errors
  DATABASE_ERROR: 'DATABASE_ERROR',
  USER_CREATION_FAILED: 'USER_CREATION_FAILED',
  USER_NOT_FOUND: 'USER_NOT_FOUND',

  // Generic Auth Errors
  AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  ACCESS_DENIED: 'ACCESS_DENIED',
} as const);

export type AuthError = (typeof AuthError)[keyof typeof AuthError];

/**
 * User-friendly error messages mapped to error codes
 * Requirements: Error messages must be user-friendly and actionable
 */
export const AuthErrorMessage = Object.freeze({
  // Domain Restriction Messages
  [AuthError.DOMAIN_RESTRICTED]:
    'Access restricted to Mavericks Consulting employees. Please use your @mavericks-consulting.com email address.',
  [AuthError.INVALID_EMAIL_DOMAIN]:
    'Invalid email domain. Only @mavericks-consulting.com accounts are allowed.',

  // OAuth Flow Messages
  [AuthError.OAUTH_FAILURE]:
    'Authentication with Google failed. Please try again.',
  [AuthError.OAUTH_CALLBACK_FAILED]:
    'Authentication callback failed. Please try logging in again.',
  [AuthError.GOOGLE_SERVICE_UNAVAILABLE]:
    'Google authentication service is temporarily unavailable. Please try again later.',
  [AuthError.MISSING_EMAIL_IN_PROFILE]:
    'Unable to retrieve email from Google account. Please ensure your Google profile has a valid email address.',
  [AuthError.MISSING_PROFILE_DATA]:
    'Unable to retrieve profile information from Google. Please try again.',

  // Token Management Messages
  [AuthError.TOKEN_REFRESH_FAILED]: 'Session expired. Please log in again.',
  [AuthError.TOKEN_EXPIRED]: 'Your session has expired. Please log in again.',
  [AuthError.INVALID_TOKEN]:
    'Invalid authentication token. Please log in again.',
  [AuthError.TOKEN_NOT_FOUND]:
    'Authentication token not found. Please log in again.',
  [AuthError.TOKEN_STORAGE_FAILED]:
    'Unable to save authentication information. Please try again.',

  // JWT Messages
  [AuthError.JWT_INVALID]: 'Invalid session. Please log in again.',
  [AuthError.JWT_EXPIRED]: 'Your session has expired. Please log in again.',
  [AuthError.JWT_MALFORMED]: 'Invalid session format. Please log in again.',
  [AuthError.JWT_GENERATION_FAILED]:
    'Unable to create session. Please try again.',

  // Session Management Messages
  [AuthError.SESSION_EXPIRED]: 'Your session has expired. Please log in again.',
  [AuthError.SESSION_INVALID]: 'Invalid session. Please log in again.',
  [AuthError.SESSION_NOT_FOUND]: 'No active session found. Please log in.',

  // Database and System Messages
  [AuthError.DATABASE_ERROR]:
    'Service temporarily unavailable. Please try again later.',
  [AuthError.USER_CREATION_FAILED]:
    'Unable to create user account. Please try again.',
  [AuthError.USER_NOT_FOUND]: 'User account not found. Please log in again.',

  // Generic Auth Messages
  [AuthError.AUTHENTICATION_FAILED]:
    'Authentication failed. Please check your credentials and try again.',
  [AuthError.UNAUTHORIZED]:
    'You are not authorized to access this resource. Please log in.',
  [AuthError.ACCESS_DENIED]:
    'Access denied. You do not have permission to perform this action.',
} as const);

export type AuthErrorMessage =
  (typeof AuthErrorMessage)[keyof typeof AuthErrorMessage];

/**
 * HTTP status codes for each error type
 * Used by controllers to return appropriate HTTP response codes
 */
export const AuthErrorStatus = Object.freeze({
  // Domain Restriction - 403 Forbidden
  [AuthError.DOMAIN_RESTRICTED]: 403,
  [AuthError.INVALID_EMAIL_DOMAIN]: 403,

  // OAuth Flow - 401 Unauthorized or 500 Internal Server Error
  [AuthError.OAUTH_FAILURE]: 401,
  [AuthError.OAUTH_CALLBACK_FAILED]: 401,
  [AuthError.GOOGLE_SERVICE_UNAVAILABLE]: 503, // Service Unavailable
  [AuthError.MISSING_EMAIL_IN_PROFILE]: 400, // Bad Request
  [AuthError.MISSING_PROFILE_DATA]: 400,

  // Token Management - 401 Unauthorized
  [AuthError.TOKEN_REFRESH_FAILED]: 401,
  [AuthError.TOKEN_EXPIRED]: 401,
  [AuthError.INVALID_TOKEN]: 401,
  [AuthError.TOKEN_NOT_FOUND]: 401,
  [AuthError.TOKEN_STORAGE_FAILED]: 500,

  // JWT - 401 Unauthorized
  [AuthError.JWT_INVALID]: 401,
  [AuthError.JWT_EXPIRED]: 401,
  [AuthError.JWT_MALFORMED]: 401,
  [AuthError.JWT_GENERATION_FAILED]: 500,

  // Session Management - 401 Unauthorized
  [AuthError.SESSION_EXPIRED]: 401,
  [AuthError.SESSION_INVALID]: 401,
  [AuthError.SESSION_NOT_FOUND]: 401,

  // Database and System - 500 Internal Server Error
  [AuthError.DATABASE_ERROR]: 500,
  [AuthError.USER_CREATION_FAILED]: 500,
  [AuthError.USER_NOT_FOUND]: 404, // Not Found

  // Generic Auth - 401 Unauthorized or 403 Forbidden
  [AuthError.AUTHENTICATION_FAILED]: 401,
  [AuthError.UNAUTHORIZED]: 401,
  [AuthError.ACCESS_DENIED]: 403,
} as const);

export type AuthErrorStatus =
  (typeof AuthErrorStatus)[keyof typeof AuthErrorStatus];

/**
 * Authentication State enumeration using Object.freeze pattern
 * Represents various authentication states in the system
 */
export const AuthenticationState = Object.freeze({
  AUTHENTICATED: 'authenticated',
  UNAUTHENTICATED: 'unauthenticated',
  TOKEN_EXPIRED: 'token_expired',
  DOMAIN_RESTRICTED: 'domain_restricted',
  SESSION_INVALID: 'session_invalid',
  OAUTH_IN_PROGRESS: 'oauth_in_progress',
} as const);

export type AuthenticationState =
  (typeof AuthenticationState)[keyof typeof AuthenticationState];

/**
 * Helper function to get error message by error code
 * @param errorCode - The authentication error code
 * @returns User-friendly error message
 */
export const getAuthErrorMessage = (errorCode: AuthError): string => {
  return (
    AuthErrorMessage[errorCode] ||
    'An unexpected authentication error occurred.'
  );
};

/**
 * Helper function to get HTTP status code by error code
 * @param errorCode - The authentication error code
 * @returns HTTP status code
 */
export const getAuthErrorStatus = (errorCode: AuthError): number => {
  return AuthErrorStatus[errorCode] || 500;
};
