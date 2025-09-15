import { apiClient } from './api-client';
import {
  DriveTokenResponse,
  DriveUploadProgress,
  DriveFile,
  DriveFolder,
  DriveUploadOptions,
  DriveCreateFolderOptions,
  DriveApiError,
  DriveOperationResult,
  DriveRetryConfig,
  DriveClientConfig,
  DriveErrorCodes,
  DriveMimeTypes,
} from '@/types/google-drive.types';
import {
  DriveErrorMessages,
  DriveErrorMapping,
  DriveErrorSeverity,
  type DriveErrorSeverityLevel,
} from '@/constants/drive-error-messages';

const GOOGLE_DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const GOOGLE_DRIVE_UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3';

const DEFAULT_RETRY_CONFIG: DriveRetryConfig = {
  maxRetries: 5,
  baseDelay: 1000,
  maxDelay: 30000,
  retryableStatusCodes: [429, 500, 502, 503, 504],
};

interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  state: 'closed' | 'open' | 'half-open';
}

interface DriveClientMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  lastSuccessTime: number;
  lastFailureTime: number;
  consecutiveFailures: number;
  tokenRefreshCount: number;
}

interface HealthCheckResult {
  healthy: boolean;
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: number;
  responseTime?: number;
  error?: string;
}

export class DriveUploadClient {
  private accessToken: string | null = null;
  private tokenExpiry: number | null = null;
  private config: Required<DriveClientConfig> & {
    retryConfig: DriveRetryConfig;
  };
  private circuitBreaker: CircuitBreakerState = {
    failures: 0,
    lastFailureTime: 0,
    state: 'closed',
  };
  private metrics: DriveClientMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    lastSuccessTime: 0,
    lastFailureTime: 0,
    consecutiveFailures: 0,
    tokenRefreshCount: 0,
  };
  private lastHealthCheck: HealthCheckResult | null = null;
  private readonly CIRCUIT_BREAKER_THRESHOLD = 5;
  private readonly CIRCUIT_BREAKER_TIMEOUT = 60000; // 1 minute
  private readonly HEALTH_CHECK_INTERVAL = 300000; // 5 minutes

  constructor(config: DriveClientConfig = {}) {
    this.config = {
      retryConfig: { ...DEFAULT_RETRY_CONFIG, ...(config.retryConfig || {}) },
      timeout: config.timeout || 30000,
      enableDebugLogging: config.enableDebugLogging || false,
    };
  }

  async initialize(): Promise<void> {
    try {
      await this.refreshAccessToken();
      this.recordSuccess();
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  private recordSuccess(responseTime?: number): void {
    this.circuitBreaker.failures = 0;
    this.circuitBreaker.state = 'closed';

    // Update metrics
    this.metrics.totalRequests++;
    this.metrics.successfulRequests++;
    this.metrics.lastSuccessTime = Date.now();
    this.metrics.consecutiveFailures = 0;

    if (responseTime) {
      // Update average response time with exponential moving average
      const alpha = 0.1; // Smoothing factor
      this.metrics.averageResponseTime =
        this.metrics.averageResponseTime === 0
          ? responseTime
          : alpha * responseTime +
            (1 - alpha) * this.metrics.averageResponseTime;
    }
  }

  private recordFailure(): void {
    this.circuitBreaker.failures++;
    this.circuitBreaker.lastFailureTime = Date.now();

    // Update metrics
    this.metrics.totalRequests++;
    this.metrics.failedRequests++;
    this.metrics.lastFailureTime = Date.now();
    this.metrics.consecutiveFailures++;

    if (this.circuitBreaker.failures >= this.CIRCUIT_BREAKER_THRESHOLD) {
      this.circuitBreaker.state = 'open';

      if (this.config.enableDebugLogging) {
        // eslint-disable-next-line no-console
        console.warn('Circuit breaker opened due to consecutive failures');
      }
    }
  }

  private shouldAllowRequest(): boolean {
    const now = Date.now();

    switch (this.circuitBreaker.state) {
      case 'closed':
        return true;

      case 'open':
        if (
          now - this.circuitBreaker.lastFailureTime >
          this.CIRCUIT_BREAKER_TIMEOUT
        ) {
          this.circuitBreaker.state = 'half-open';
          return true;
        }
        return false;

      case 'half-open':
        return true;

      default:
        return true;
    }
  }

  private getCircuitBreakerError(): Error {
    const timeUntilRetry = Math.ceil(
      (this.CIRCUIT_BREAKER_TIMEOUT -
        (Date.now() - this.circuitBreaker.lastFailureTime)) /
        1000,
    );

    return new Error(
      `Google Drive service is temporarily unavailable due to repeated failures. ` +
        `Please try again in ${timeUntilRetry} seconds.`,
    );
  }

  private async refreshAccessToken(): Promise<void> {
    try {
      const tokenResponse =
        await apiClient.get<DriveTokenResponse>('/auth/drive-token');

      if (!tokenResponse.access_token) {
        throw new Error('Invalid token response: missing access_token');
      }

      this.accessToken = tokenResponse.access_token;
      this.tokenExpiry = Date.now() + tokenResponse.expires_in * 1000;

      if (this.config.enableDebugLogging) {
        // eslint-disable-next-line no-console
        console.log('Drive token refreshed successfully');
      }
    } catch (error) {
      if (this.config.enableDebugLogging) {
        // eslint-disable-next-line no-console
        console.error('Token refresh failed:', error);
      }

      // Handle different error scenarios
      const errorMessage = this.extractTokenErrorMessage(error);
      throw new Error(errorMessage);
    }
  }

  private extractTokenErrorMessage(error: unknown): string {
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as {
        response?: { data?: { errorCode?: string; error?: string } };
      };
      const data = axiosError.response?.data;

      if (data?.errorCode) {
        switch (data.errorCode) {
          case 'TOKEN_NOT_FOUND':
            return 'Your Google Drive access has expired. Please sign in again.';
          case 'INSUFFICIENT_SCOPE':
            return 'Google Drive permissions need to be updated. Please sign in again.';
          case 'TOKEN_REFRESH_FAILED':
            return 'Unable to refresh your Google Drive access. Please sign in again.';
          case 'SERVICE_TEMPORARILY_UNAVAILABLE':
            return 'Google Drive service is temporarily unavailable. Please try again in a moment.';
          default:
            return data.error || 'Failed to get Google Drive access.';
        }
      }

      if (data?.error) {
        return data.error;
      }
    }

    if (error instanceof Error) {
      return error.message;
    }

    return 'Failed to get Google Drive access token. Please try again.';
  }

  private async ensureValidToken(): Promise<void> {
    const tokenExpiresIn = this.tokenExpiry ? this.tokenExpiry - Date.now() : 0;

    if (!this.accessToken || tokenExpiresIn < 60000) {
      await this.refreshAccessToken();
    }
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private calculateBackoffDelay(
    attempt: number,
    error?: DriveApiError,
  ): number {
    const { baseDelay, maxDelay } = this.config.retryConfig;

    // Handle rate limiting with exponential backoff + jitter
    if (error?.error.code === DriveErrorCodes.RATE_LIMITED) {
      const retryAfter = this.extractRetryAfterHeader(error);
      if (retryAfter) {
        return Math.min(retryAfter * 1000, maxDelay);
      }
    }

    // Standard exponential backoff with jitter
    const exponentialDelay = baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 0.1 * exponentialDelay; // 10% jitter
    const delay = exponentialDelay + jitter;

    return Math.min(delay, maxDelay);
  }

  private extractRetryAfterHeader(error: DriveApiError): number | null {
    // Check if error details contain retry-after information
    const retryAfterDetail = error.error.details?.find(
      (detail) => detail.reason === 'rateLimitExceeded',
    );

    if (retryAfterDetail?.metadata?.retryAfter) {
      const retryAfter = parseInt(retryAfterDetail.metadata.retryAfter, 10);
      return isNaN(retryAfter) ? null : retryAfter;
    }

    return null;
  }

  private isRetryableError(error: DriveApiError): boolean {
    return this.config.retryConfig.retryableStatusCodes.includes(
      error.error.code,
    );
  }

  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    operationName: string,
  ): Promise<T> {
    // Check circuit breaker
    if (!this.shouldAllowRequest()) {
      throw this.getCircuitBreakerError();
    }

    const { maxRetries } = this.config.retryConfig;
    let lastError: DriveApiError;
    let tokenRefreshAttempted = false;
    const startTime = Date.now();

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();
        const responseTime = Date.now() - startTime;
        this.recordSuccess(responseTime);
        return result;
      } catch (error) {
        lastError = error as DriveApiError;

        // Special handling for non-retryable errors
        if (!this.isRetryableError(lastError)) {
          if (this.config.enableDebugLogging) {
            // eslint-disable-next-line no-console
            console.log(
              `${operationName} failed with non-retryable error:`,
              lastError.error.code,
              lastError.error.message,
            );
          }
          throw lastError;
        }

        // Don't retry if we've exhausted attempts
        if (attempt === maxRetries) {
          if (this.config.enableDebugLogging) {
            // eslint-disable-next-line no-console
            console.log(
              `${operationName} exhausted all ${maxRetries + 1} attempts`,
            );
          }
          throw lastError;
        }

        // Handle token refresh for unauthorized errors (only once per operation)
        if (
          lastError.error.code === DriveErrorCodes.UNAUTHORIZED &&
          !tokenRefreshAttempted
        ) {
          try {
            await this.refreshAccessToken();
            tokenRefreshAttempted = true;
            this.metrics.tokenRefreshCount++;

            if (this.config.enableDebugLogging) {
              // eslint-disable-next-line no-console
              console.log(
                `${operationName} refreshed token, retrying immediately`,
              );
            }

            // Don't increment attempt counter for token refresh
            continue;
          } catch (tokenError) {
            if (this.config.enableDebugLogging) {
              // eslint-disable-next-line no-console
              console.error(
                `${operationName} token refresh failed:`,
                tokenError,
              );
            }
            throw new Error(
              `Authentication failed: ${tokenError instanceof Error ? tokenError.message : 'Unable to refresh access token'}`,
            );
          }
        }

        const delay = this.calculateBackoffDelay(attempt, lastError);

        if (this.config.enableDebugLogging) {
          // eslint-disable-next-line no-console
          console.log(
            `${operationName} attempt ${attempt + 1}/${maxRetries + 1} failed (${lastError.error.code}: ${lastError.error.message}), retrying in ${delay}ms`,
          );
        }

        await this.sleep(delay);
      }
    }

    this.recordFailure();
    throw lastError!;
  }

  private async makeApiRequest<T>(
    url: string,
    options: RequestInit = {},
  ): Promise<T> {
    await this.ensureValidToken();

    const headers = {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorData: DriveApiError;

        try {
          errorData = (await response.json()) as DriveApiError;
        } catch {
          // If we can't parse the error response, create a generic error
          errorData = {
            error: {
              code: response.status,
              message: `HTTP ${response.status}: ${response.statusText}`,
              status: response.statusText,
            },
          };
        }

        // Add response headers to error context for rate limiting info
        if (response.headers.get('retry-after')) {
          if (!errorData.error.details) {
            errorData.error.details = [];
          }
          errorData.error.details.push({
            '@type': 'type.googleapis.com/google.rpc.RetryInfo',
            reason: 'rateLimitExceeded',
            metadata: {
              retryAfter: response.headers.get('retry-after') || '60',
            },
          });
        }

        throw errorData;
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(
          'Request timed out. Please check your internet connection and try again.',
        );
      }

      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error(
          'Network error. Please check your internet connection and try again.',
        );
      }

      throw error;
    }
  }

  async uploadFile(
    file: File,
    options: DriveUploadOptions,
  ): Promise<DriveOperationResult<DriveFile>> {
    try {
      // Validate inputs
      if (!file || file.size === 0) {
        return {
          success: false,
          error: {
            error: {
              code: DriveErrorCodes.BAD_REQUEST,
              message: 'Invalid file: File is empty or not provided',
              status: 'INVALID_ARGUMENT',
            },
          },
        };
      }

      if (file.size > 5 * 1024 * 1024 * 1024 * 1024) {
        // 5TB limit
        return {
          success: false,
          error: {
            error: {
              code: 413,
              message:
                'File is too large. Maximum file size for Google Drive is 5TB.',
              status: 'REQUEST_ENTITY_TOO_LARGE',
            },
          },
        };
      }

      if (!options.fileName || options.fileName.trim() === '') {
        return {
          success: false,
          error: {
            error: {
              code: DriveErrorCodes.BAD_REQUEST,
              message: 'Invalid file name: File name cannot be empty',
              status: 'INVALID_ARGUMENT',
            },
          },
        };
      }

      // Check for invalid characters in filename
      const invalidChars = /[<>:"/\|?*\x00-\x1f]/;
      if (invalidChars.test(options.fileName)) {
        return {
          success: false,
          error: {
            error: {
              code: DriveErrorCodes.BAD_REQUEST,
              message: 'Invalid file name: Contains forbidden characters',
              status: 'INVALID_ARGUMENT',
            },
          },
        };
      }

      const result = await this.retryWithBackoff(async () => {
        return await this.performFileUpload(file, options);
      }, `File upload: ${options.fileName}`);

      return { success: true, data: result };
    } catch (error) {
      if (this.config.enableDebugLogging) {
        // eslint-disable-next-line no-console
        console.error('Upload failed:', error);
      }

      // Handle different error types
      if (error instanceof Error && !('error' in error)) {
        return {
          success: false,
          error: {
            error: {
              code: DriveErrorCodes.INTERNAL_ERROR,
              message: error.message,
              status: 'INTERNAL',
            },
          },
        };
      }

      return {
        success: false,
        error: error as DriveApiError,
      };
    }
  }

  private async performFileUpload(
    file: File,
    options: DriveUploadOptions,
  ): Promise<DriveFile> {
    const boundary = `upload_boundary_${Date.now()}`;
    const delimiter = `\r\n--${boundary}\r\n`;
    const close_delim = `\r\n--${boundary}--`;

    const metadata = {
      name: options.fileName,
      parents: options.parentFolderId ? [options.parentFolderId] : undefined,
      description: options.description,
    };

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      `Content-Type: ${options.mimeType}\r\n\r\n`;

    const fileBuffer = await file.arrayBuffer();
    const totalLength =
      multipartRequestBody.length + fileBuffer.byteLength + close_delim.length;
    const arrayBuffer = new ArrayBuffer(totalLength);
    const uint8Array = new Uint8Array(arrayBuffer);

    const encoder = new TextEncoder();
    let offset = 0;

    uint8Array.set(encoder.encode(multipartRequestBody), offset);
    offset += encoder.encode(multipartRequestBody).length;

    uint8Array.set(new Uint8Array(fileBuffer), offset);
    offset += fileBuffer.byteLength;

    uint8Array.set(encoder.encode(close_delim), offset);

    const url = `${GOOGLE_DRIVE_UPLOAD_BASE}/files?uploadType=multipart`;

    if (options.onProgress) {
      return await this.uploadWithProgress(
        url,
        uint8Array,
        boundary,
        options.onProgress,
      );
    } else {
      return await this.makeApiRequest<DriveFile>(url, {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/related; boundary="${boundary}"`,
        },
        body: uint8Array,
      });
    }
  }

  private async uploadWithProgress(
    url: string,
    data: Uint8Array,
    boundary: string,
    onProgress: (progress: DriveUploadProgress) => void,
  ): Promise<DriveFile> {
    await this.ensureValidToken();

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const startTime = Date.now();

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentage = Math.round((event.loaded / event.total) * 100);
          const elapsed = Date.now() - startTime;
          const speed = (event.loaded / elapsed) * 1000;
          const remaining = event.total - event.loaded;
          const estimatedTimeRemaining =
            remaining > 0 ? Math.ceil(remaining / speed) : 0;

          onProgress({
            loaded: event.loaded,
            total: event.total,
            percentage,
            speed,
            estimatedTimeRemaining,
          });
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText) as DriveFile;
            resolve(response);
          } catch (_error) {
            reject(new Error('Failed to parse response'));
          }
        } else {
          try {
            const errorData = JSON.parse(xhr.responseText) as DriveApiError;

            // Enhance error with upload context
            if (!errorData.error.details) {
              errorData.error.details = [];
            }
            errorData.error.details.push({
              '@type': 'type.googleapis.com/upload.context',
              metadata: {
                operation: 'file_upload',
                status: xhr.status.toString(),
              },
            });

            reject(errorData);
          } catch {
            // Create structured error when JSON parsing fails
            const structuredError: DriveApiError = {
              error: {
                code: xhr.status,
                message: `Upload failed: ${xhr.statusText || 'Unknown error'}`,
                status: xhr.statusText || 'UNKNOWN',
                details: [
                  {
                    '@type': 'type.googleapis.com/upload.context',
                    metadata: {
                      operation: 'file_upload',
                      parseError: 'true',
                    },
                  },
                ],
              },
            };
            reject(structuredError);
          }
        }
      });

      xhr.addEventListener('error', () => {
        reject(
          new Error(
            'Network error during upload. Please check your internet connection and try again.',
          ),
        );
      });

      xhr.addEventListener('timeout', () => {
        reject(
          new Error(
            'Upload timed out. Please try again with a smaller file or check your internet connection.',
          ),
        );
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload was cancelled.'));
      });

      xhr.open('POST', url);
      xhr.setRequestHeader('Authorization', `Bearer ${this.accessToken}`);
      xhr.setRequestHeader(
        'Content-Type',
        `multipart/related; boundary="${boundary}"`,
      );
      xhr.timeout = this.config.timeout;
      xhr.send(
        new Blob([data.buffer as ArrayBuffer], {
          type: `multipart/related; boundary="${boundary}"`,
        }),
      );
    });
  }

  async createFolder(
    options: DriveCreateFolderOptions,
  ): Promise<DriveOperationResult<DriveFolder>> {
    try {
      // Validate folder name
      if (!options.name || options.name.trim() === '') {
        return {
          success: false,
          error: {
            error: {
              code: DriveErrorCodes.BAD_REQUEST,
              message: 'Invalid folder name: Folder name cannot be empty',
              status: 'INVALID_ARGUMENT',
            },
          },
        };
      }

      // Check for invalid characters in folder name
      const invalidChars = /[<>:"/\|?*\x00-\x1f]/;
      if (invalidChars.test(options.name)) {
        return {
          success: false,
          error: {
            error: {
              code: DriveErrorCodes.BAD_REQUEST,
              message: 'Invalid folder name: Contains forbidden characters',
              status: 'INVALID_ARGUMENT',
            },
          },
        };
      }

      const result = await this.retryWithBackoff(async () => {
        const metadata = {
          name: options.name,
          mimeType: DriveMimeTypes.FOLDER,
          parents: options.parentFolderId
            ? [options.parentFolderId]
            : undefined,
          description: options.description,
        };

        const url = `${GOOGLE_DRIVE_API_BASE}/files`;
        return await this.makeApiRequest<DriveFolder>(url, {
          method: 'POST',
          body: JSON.stringify(metadata),
        });
      }, `Create folder: ${options.name}`);

      return { success: true, data: result };
    } catch (error) {
      if (this.config.enableDebugLogging) {
        // eslint-disable-next-line no-console
        console.error('Folder creation failed:', error);
      }

      if (error instanceof Error && !('error' in error)) {
        return {
          success: false,
          error: {
            error: {
              code: DriveErrorCodes.INTERNAL_ERROR,
              message: error.message,
              status: 'INTERNAL',
            },
          },
        };
      }

      return {
        success: false,
        error: error as DriveApiError,
      };
    }
  }

  async getFolderByName(
    name: string,
    parentFolderId?: string,
  ): Promise<DriveOperationResult<DriveFolder | null>> {
    try {
      // Validate input
      if (!name || name.trim() === '') {
        return {
          success: false,
          error: {
            error: {
              code: DriveErrorCodes.BAD_REQUEST,
              message: 'Invalid folder name: Name cannot be empty',
              status: 'INVALID_ARGUMENT',
            },
          },
        };
      }

      const result = await this.retryWithBackoff(async () => {
        // Escape quotes in the folder name for the query
        const escapedName = name.replace(/'/g, "\\'");
        let query = `name='${escapedName}' and mimeType='${DriveMimeTypes.FOLDER}' and trashed=false`;

        if (parentFolderId) {
          query += ` and '${parentFolderId}' in parents`;
        }

        const url = `${GOOGLE_DRIVE_API_BASE}/files?q=${encodeURIComponent(query)}&fields=files(id,name,webViewLink,parents,createdTime,modifiedTime)`;

        const response = await this.makeApiRequest<{ files: DriveFolder[] }>(
          url,
        );

        return response.files.length > 0 ? response.files[0] : null;
      }, `Search folder: ${name}`);

      return { success: true, data: result };
    } catch (error) {
      if (this.config.enableDebugLogging) {
        // eslint-disable-next-line no-console
        console.error('Folder search failed:', error);
      }

      if (error instanceof Error && !('error' in error)) {
        return {
          success: false,
          error: {
            error: {
              code: DriveErrorCodes.INTERNAL_ERROR,
              message: error.message,
              status: 'INTERNAL',
            },
          },
        };
      }

      return {
        success: false,
        error: error as DriveApiError,
      };
    }
  }

  async getOrCreateFolder(
    name: string,
    parentFolderId?: string,
    description?: string,
  ): Promise<DriveOperationResult<DriveFolder>> {
    try {
      // First try to find the existing folder
      const existingFolderResult = await this.getFolderByName(
        name,
        parentFolderId,
      );

      if (!existingFolderResult.success) {
        if (this.config.enableDebugLogging) {
          // eslint-disable-next-line no-console
          console.error(
            'Failed to search for existing folder:',
            existingFolderResult.error,
          );
        }
        return {
          success: false,
          error: existingFolderResult.error,
        };
      }

      // If folder exists, return it
      if (existingFolderResult.data) {
        if (this.config.enableDebugLogging) {
          // eslint-disable-next-line no-console
          console.log(`Found existing folder: ${name}`);
        }
        return { success: true, data: existingFolderResult.data };
      }

      // If folder doesn't exist, create it
      if (this.config.enableDebugLogging) {
        // eslint-disable-next-line no-console
        console.log(`Creating new folder: ${name}`);
      }

      const createResult = await this.createFolder({
        name,
        parentFolderId,
        description,
      });

      if (!createResult.success && this.config.enableDebugLogging) {
        // eslint-disable-next-line no-console
        console.error('Failed to create folder:', createResult.error);
      }

      return createResult;
    } catch (error) {
      if (this.config.enableDebugLogging) {
        // eslint-disable-next-line no-console
        console.error('getOrCreateFolder failed:', error);
      }

      if (error instanceof Error) {
        return {
          success: false,
          error: {
            error: {
              code: DriveErrorCodes.INTERNAL_ERROR,
              message: error.message,
              status: 'INTERNAL',
            },
          },
        };
      }

      return {
        success: false,
        error: error as DriveApiError,
      };
    }
  }

  async getFileMetadata(
    fileId: string,
  ): Promise<DriveOperationResult<DriveFile>> {
    try {
      // Validate input
      if (!fileId || fileId.trim() === '') {
        return {
          success: false,
          error: {
            error: {
              code: DriveErrorCodes.BAD_REQUEST,
              message: 'Invalid file ID: ID cannot be empty',
              status: 'INVALID_ARGUMENT',
            },
          },
        };
      }

      const result = await this.retryWithBackoff(async () => {
        const url = `${GOOGLE_DRIVE_API_BASE}/files/${encodeURIComponent(fileId)}?fields=id,name,mimeType,size,webViewLink,webContentLink,parents,createdTime,modifiedTime`;
        return await this.makeApiRequest<DriveFile>(url);
      }, `Get file metadata: ${fileId}`);

      return { success: true, data: result };
    } catch (error) {
      if (this.config.enableDebugLogging) {
        // eslint-disable-next-line no-console
        console.error('Get file metadata failed:', error);
      }

      if (error instanceof Error && !('error' in error)) {
        return {
          success: false,
          error: {
            error: {
              code: DriveErrorCodes.INTERNAL_ERROR,
              message: error.message,
              status: 'INTERNAL',
            },
          },
        };
      }

      return {
        success: false,
        error: error as DriveApiError,
      };
    }
  }

  getUserFriendlyErrorMessage(error: DriveApiError | Error | unknown): string {
    // Handle regular Error objects
    if (error instanceof Error) {
      // Check for specific authentication errors
      if (
        error.message.includes('Authentication failed') ||
        error.message.includes('sign in again')
      ) {
        return error.message;
      }

      // Check for network/timeout errors
      if (
        error.message.includes('timeout') ||
        error.message.includes('network') ||
        error.message.includes('fetch')
      ) {
        return 'Network connection issue. Please check your internet connection and try again.';
      }

      return error.message;
    }

    // Handle non-DriveApiError objects
    if (!error || typeof error !== 'object' || !('error' in error)) {
      return 'An unexpected error occurred. Please try again.';
    }

    const driveError = error as DriveApiError;
    const code = driveError.error.code;
    const message = driveError.error.message;
    const details = driveError.error.details;

    switch (code) {
      case DriveErrorCodes.QUOTA_EXCEEDED:
        // Check if it's storage quota or API quota
        const quotaType = details?.find((d) => d.reason)?.reason;
        if (quotaType === 'storageQuotaExceeded') {
          return 'Your Google Drive storage is full. Please free up space or upgrade your storage plan to continue uploading files.';
        }
        return 'Google Drive quota exceeded. Please try again later or contact support if this persists.';

      case DriveErrorCodes.RATE_LIMITED:
        const retryAfter = this.extractRetryAfterHeader(driveError);
        if (retryAfter && retryAfter < 120) {
          return `Too many requests. Please wait ${retryAfter} seconds and try again.`;
        }
        return 'Too many requests. Please wait a few minutes and try again.';

      case DriveErrorCodes.NOT_FOUND:
        return 'The file or folder could not be found. It may have been moved or deleted.';

      case DriveErrorCodes.UNAUTHORIZED:
        return 'Your Google Drive access has expired. Please sign in again to continue.';

      case DriveErrorCodes.FORBIDDEN:
        // Check for specific permission issues
        if (message.includes('sharing') || message.includes('permission')) {
          return "You don't have permission to access this location in Google Drive. Please check your permissions.";
        }
        if (message.includes('domain')) {
          return "Access restricted by your organization's policies. Please contact your administrator.";
        }
        return 'Access denied. You may not have the required permissions for this action.';

      case DriveErrorCodes.BAD_REQUEST:
        // Provide more specific messages for common bad request scenarios
        if (message.includes('file size')) {
          return 'File is too large. Maximum file size for Google Drive uploads is 5TB.';
        }
        if (message.includes('invalid') && message.includes('name')) {
          return "Invalid file name. Please check that the file name doesn't contain special characters.";
        }
        if (message.includes('virus')) {
          return 'File was rejected by Google Drive virus scanning. Please scan your file and try again.';
        }
        return `Upload failed due to invalid request: ${message}`;

      case DriveErrorCodes.INTERNAL_ERROR:
        return 'Google Drive is temporarily experiencing issues. Please try again in a few minutes.';

      case 408: // Request Timeout
        return 'Upload timed out. Please check your internet connection and try again with a smaller file if the problem persists.';

      case 413: // Payload Too Large
        return 'File is too large for upload. Please try with a smaller file.';

      case 507: // Insufficient Storage
        return 'Your Google Drive storage is full. Please free up space or upgrade your storage plan.';

      default:
        // Provide context-aware generic messages
        if (code >= 500 && code < 600) {
          return 'Google Drive is temporarily unavailable. Please try again in a few minutes.';
        }
        if (code >= 400 && code < 500) {
          return `Upload failed: ${message}. Please check your file and try again.`;
        }
        return `Upload failed with error ${code}. Please try again or contact support if this persists.`;
    }
  }

  /**
   * Get a user-friendly error message with actionable advice
   */
  getErrorMessageWithAdvice(error: DriveApiError | Error | unknown): {
    message: string;
    advice: readonly string[];
    canRetry: boolean;
    severity: DriveErrorSeverityLevel;
    errorCode?: string;
    retryAfter?: number;
  } {
    const baseMessage = this.getUserFriendlyErrorMessage(error);

    // Handle regular Error objects
    if (error instanceof Error) {
      if (
        error.message.includes('Authentication failed') ||
        error.message.includes('sign in again')
      ) {
        const mapping = DriveErrorMapping[401];
        return {
          message: baseMessage,
          advice: mapping.advice,
          canRetry: mapping.canRetry,
          severity: mapping.severity,
          errorCode: 'AUTHENTICATION_FAILED',
        };
      }

      if (
        error.message.includes('Circuit breaker') ||
        error.message.includes(
          'temporarily unavailable due to repeated failures',
        )
      ) {
        return {
          message: DriveErrorMessages.CIRCUIT_BREAKER_OPEN,
          advice: [
            'Wait a moment before trying again',
            'Check your internet connection',
          ],
          canRetry: true,
          severity: DriveErrorSeverity.MEDIUM,
          errorCode: 'CIRCUIT_BREAKER_OPEN',
          retryAfter: 60,
        };
      }

      if (
        error.message.includes('network') ||
        error.message.includes('timeout')
      ) {
        const mapping = DriveErrorMapping[408];
        return {
          message: DriveErrorMessages.NETWORK_ERROR,
          advice: mapping.advice,
          canRetry: mapping.canRetry,
          severity: mapping.severity,
          errorCode: 'NETWORK_ERROR',
        };
      }

      return {
        message: baseMessage,
        advice: ['Try again in a moment', 'Contact support if this continues'],
        canRetry: true,
        severity: DriveErrorSeverity.MEDIUM,
        errorCode: 'UNKNOWN_ERROR',
      };
    }

    // Handle non-DriveApiError objects
    if (!error || typeof error !== 'object' || !('error' in error)) {
      return {
        message: baseMessage,
        advice: [
          'Try refreshing the page',
          'Contact support if this continues',
        ],
        canRetry: true,
        severity: DriveErrorSeverity.MEDIUM,
        errorCode: 'UNKNOWN_ERROR',
      };
    }

    const driveError = error as DriveApiError;
    const code = driveError.error.code;
    const details = driveError.error.details;

    // Check for specific Google error reasons first
    const googleReason = details?.find((d) => d.reason)?.reason;
    if (googleReason && googleReason in DriveErrorMapping) {
      const mapping =
        DriveErrorMapping[googleReason as keyof typeof DriveErrorMapping];
      const retryAfter =
        googleReason === 'rateLimitExceeded'
          ? (this.extractRetryAfterHeader(driveError) ?? undefined)
          : undefined;

      return {
        message: mapping.message,
        advice: mapping.advice,
        canRetry: mapping.canRetry,
        severity: mapping.severity,
        errorCode: googleReason.toUpperCase(),
        retryAfter,
      };
    }

    // Fallback to HTTP status codes
    if (code in DriveErrorMapping) {
      const mapping = DriveErrorMapping[code as keyof typeof DriveErrorMapping];
      const retryAfter =
        code === DriveErrorCodes.RATE_LIMITED
          ? (this.extractRetryAfterHeader(driveError) ?? undefined)
          : undefined;

      return {
        message: mapping.message,
        advice: mapping.advice,
        canRetry: mapping.canRetry,
        severity: mapping.severity,
        errorCode: code.toString(),
        retryAfter,
      };
    }

    // Generic handling for unknown error codes
    const isServerError = code >= 500 && code < 600;
    const isClientError = code >= 400 && code < 500;

    return {
      message: baseMessage,
      advice: isServerError
        ? [
            'Try again in a few minutes',
            "Check Google's status page for any ongoing issues",
          ]
        : isClientError
          ? [
              'Check your input and try again',
              'Contact support if this error continues',
            ]
          : [
              'Try again in a moment',
              'Contact support if this error continues',
            ],
      canRetry: isServerError,
      severity: isServerError
        ? DriveErrorSeverity.MEDIUM
        : DriveErrorSeverity.HIGH,
      errorCode: code.toString(),
    };
  }

  /**
   * Perform a health check of the Google Drive service
   */
  async performHealthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      // Simple API call to check service availability
      await this.makeApiRequest<{ kind: string }>(
        `${GOOGLE_DRIVE_API_BASE}/about?fields=kind`,
      );

      const responseTime = Date.now() - startTime;
      const result: HealthCheckResult = {
        healthy: true,
        status: responseTime < 2000 ? 'healthy' : 'degraded',
        lastCheck: Date.now(),
        responseTime,
      };

      this.lastHealthCheck = result;
      return result;
    } catch (error) {
      const result: HealthCheckResult = {
        healthy: false,
        status: 'unhealthy',
        lastCheck: Date.now(),
        error: this.getUserFriendlyErrorMessage(error),
      };

      this.lastHealthCheck = result;
      return result;
    }
  }

  /**
   * Get current service metrics and health status
   */
  getServiceStatus(): {
    metrics: DriveClientMetrics;
    circuitBreaker: CircuitBreakerState;
    healthCheck: HealthCheckResult | null;
    recommendations: string[];
  } {
    const now = Date.now();
    const recommendations: string[] = [];

    // Health-based recommendations
    if (this.metrics.consecutiveFailures > 3) {
      recommendations.push(
        'Multiple consecutive failures detected. Check your internet connection.',
      );
    }

    if (this.metrics.averageResponseTime > 5000) {
      recommendations.push(
        'Slow response times detected. Consider checking your network connection.',
      );
    }

    if (this.circuitBreaker.state === 'open') {
      const timeUntilRetry = Math.ceil(
        (this.CIRCUIT_BREAKER_TIMEOUT -
          (now - this.circuitBreaker.lastFailureTime)) /
          1000,
      );
      recommendations.push(
        `Service is temporarily unavailable. Retry in ${timeUntilRetry} seconds.`,
      );
    }

    if (this.metrics.tokenRefreshCount > 5) {
      recommendations.push(
        'Frequent token refreshes detected. Consider re-authenticating.',
      );
    }

    const successRate =
      this.metrics.totalRequests > 0
        ? (this.metrics.successfulRequests / this.metrics.totalRequests) * 100
        : 100;

    if (successRate < 80) {
      recommendations.push(
        'Low success rate detected. Service may be experiencing issues.',
      );
    }

    // Auto health check if needed
    if (
      !this.lastHealthCheck ||
      now - this.lastHealthCheck.lastCheck > this.HEALTH_CHECK_INTERVAL
    ) {
      // Don't await to avoid blocking the call
      this.performHealthCheck().catch(() => {
        // Ignore errors in background health check
      });
    }

    return {
      metrics: { ...this.metrics },
      circuitBreaker: { ...this.circuitBreaker },
      healthCheck: this.lastHealthCheck,
      recommendations,
    };
  }

  /**
   * Reset metrics and circuit breaker (useful for testing or after resolving issues)
   */
  resetServiceStatus(): void {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      lastSuccessTime: 0,
      lastFailureTime: 0,
      consecutiveFailures: 0,
      tokenRefreshCount: 0,
    };

    this.circuitBreaker = {
      failures: 0,
      lastFailureTime: 0,
      state: 'closed',
    };

    this.lastHealthCheck = null;

    if (this.config.enableDebugLogging) {
      // eslint-disable-next-line no-console
      console.log('Drive client service status reset');
    }
  }

  /**
   * Get diagnostic information for troubleshooting
   */
  getDiagnosticInfo(): {
    tokenStatus: 'valid' | 'expired' | 'missing';
    timeToExpiry: number;
    configSummary: {
      maxRetries: number;
      timeout: number;
      circuitBreakerThreshold: number;
    };
    currentState: string;
  } {
    let tokenStatus: 'valid' | 'expired' | 'missing' = 'missing';
    let timeToExpiry = 0;

    if (this.accessToken && this.tokenExpiry) {
      timeToExpiry = this.tokenExpiry - Date.now();
      tokenStatus = timeToExpiry > 0 ? 'valid' : 'expired';
    }

    return {
      tokenStatus,
      timeToExpiry,
      configSummary: {
        maxRetries: this.config.retryConfig.maxRetries,
        timeout: this.config.timeout,
        circuitBreakerThreshold: this.CIRCUIT_BREAKER_THRESHOLD,
      },
      currentState: this.circuitBreaker.state,
    };
  }
}
