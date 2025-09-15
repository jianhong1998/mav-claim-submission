import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DriveUploadClient } from '../google-drive-client';
import { apiClient } from '../api-client';
import {
  DriveTokenResponse,
  DriveUploadOptions,
  DriveCreateFolderOptions,
  DriveApiError,
  DriveErrorCodes,
} from '@/types/google-drive.types';

// Mock api-client
vi.mock('../api-client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

describe('DriveUploadClient', () => {
  let client: DriveUploadClient;
  let mockApiClient: typeof apiClient;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    client = new DriveUploadClient({
      enableDebugLogging: false,
      timeout: 10000,
    });
    mockApiClient = apiClient as typeof apiClient;
    vi.clearAllMocks();

    // Store original fetch and mock it
    originalFetch = global.fetch;
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
    // Restore original fetch
    global.fetch = originalFetch;
  });

  describe('initialization', () => {
    it('should initialize successfully with valid token', async () => {
      const mockTokenResponse: DriveTokenResponse = {
        access_token: 'mock-access-token',
        expires_in: 3600,
        token_type: 'Bearer',
      };

      vi.mocked(mockApiClient.get).mockResolvedValue(mockTokenResponse);

      await expect(client.initialize()).resolves.toBeUndefined();
      expect(mockApiClient.get).toHaveBeenCalledWith('/auth/drive-token');
    });

    it('should fail initialization with invalid token response', async () => {
      vi.mocked(mockApiClient.get).mockResolvedValue({
        expires_in: 3600,
        token_type: 'Bearer',
        // Missing access_token
      });

      await expect(client.initialize()).rejects.toThrow(
        'Invalid token response: missing access_token',
      );
    });

    it('should handle token refresh errors during initialization', async () => {
      const mockError = {
        response: {
          data: {
            errorCode: 'TOKEN_NOT_FOUND',
            error: 'Token not found',
          },
        },
      };

      vi.mocked(mockApiClient.get).mockRejectedValue(mockError);

      await expect(client.initialize()).rejects.toThrow(
        'Your Google Drive access has expired. Please sign in again.',
      );
    });
  });

  describe('file upload validation', () => {
    beforeEach(async () => {
      // Setup client with valid token
      const mockTokenResponse: DriveTokenResponse = {
        access_token: 'mock-access-token',
        expires_in: 3600,
        token_type: 'Bearer',
      };
      vi.mocked(mockApiClient.get).mockResolvedValue(mockTokenResponse);
      await client.initialize();
    });

    it('should reject empty file', async () => {
      const mockFile = new File([''], 'empty.pdf', {
        type: 'application/pdf',
      });

      const mockOptions: DriveUploadOptions = {
        fileName: 'empty.pdf',
        mimeType: 'application/pdf',
      };

      const result = await client.uploadFile(mockFile, mockOptions);

      expect(result.success).toBe(false);
      expect(result.error?.error.code).toBe(DriveErrorCodes.BAD_REQUEST);
      expect(result.error?.error.message).toContain('File is empty');
    });

    it('should reject file that is too large', async () => {
      // Create a mock file that claims to be larger than 5TB
      const mockFile = {
        size: 5 * 1024 * 1024 * 1024 * 1024 + 1, // 5TB + 1 byte
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
      } as File;

      const mockOptions: DriveUploadOptions = {
        fileName: 'huge.pdf',
        mimeType: 'application/pdf',
      };

      const result = await client.uploadFile(mockFile, mockOptions);

      expect(result.success).toBe(false);
      expect(result.error?.error.code).toBe(413);
      expect(result.error?.error.message).toContain('too large');
    });

    it('should reject invalid file name', async () => {
      const mockFile = new File(['test'], 'test.pdf', {
        type: 'application/pdf',
      });

      const mockOptions: DriveUploadOptions = {
        fileName: 'file<>:"/|?*.pdf',
        mimeType: 'application/pdf',
      };

      const result = await client.uploadFile(mockFile, mockOptions);

      expect(result.success).toBe(false);
      expect(result.error?.error.code).toBe(DriveErrorCodes.BAD_REQUEST);
      expect(result.error?.error.message).toContain('forbidden characters');
    });

    it('should reject empty file name', async () => {
      const mockFile = new File(['test'], 'test.pdf', {
        type: 'application/pdf',
      });

      const mockOptions: DriveUploadOptions = {
        fileName: '',
        mimeType: 'application/pdf',
      };

      const result = await client.uploadFile(mockFile, mockOptions);

      expect(result.success).toBe(false);
      expect(result.error?.error.code).toBe(DriveErrorCodes.BAD_REQUEST);
      expect(result.error?.error.message).toContain('cannot be empty');
    });
  });

  describe('folder operations validation', () => {
    beforeEach(async () => {
      const mockTokenResponse: DriveTokenResponse = {
        access_token: 'mock-access-token',
        expires_in: 3600,
        token_type: 'Bearer',
      };
      vi.mocked(mockApiClient.get).mockResolvedValue(mockTokenResponse);
      await client.initialize();
    });

    it('should reject empty folder name', async () => {
      const mockOptions: DriveCreateFolderOptions = {
        name: '',
      };

      const result = await client.createFolder(mockOptions);

      expect(result.success).toBe(false);
      expect(result.error?.error.code).toBe(DriveErrorCodes.BAD_REQUEST);
      expect(result.error?.error.message).toContain('cannot be empty');
    });

    it('should reject invalid folder name characters', async () => {
      const mockOptions: DriveCreateFolderOptions = {
        name: 'folder<>:"/|?*',
      };

      const result = await client.createFolder(mockOptions);

      expect(result.success).toBe(false);
      expect(result.error?.error.code).toBe(DriveErrorCodes.BAD_REQUEST);
      expect(result.error?.error.message).toContain('forbidden characters');
    });

    it('should reject empty folder name in search', async () => {
      const result = await client.getFolderByName('');

      expect(result.success).toBe(false);
      expect(result.error?.error.code).toBe(DriveErrorCodes.BAD_REQUEST);
      expect(result.error?.error.message).toContain('cannot be empty');
    });

    it('should reject empty file ID in getFileMetadata', async () => {
      const result = await client.getFileMetadata('');

      expect(result.success).toBe(false);
      expect(result.error?.error.code).toBe(DriveErrorCodes.BAD_REQUEST);
      expect(result.error?.error.message).toContain('cannot be empty');
    });
  });

  describe('error handling', () => {
    beforeEach(async () => {
      const mockTokenResponse: DriveTokenResponse = {
        access_token: 'mock-access-token',
        expires_in: 3600,
        token_type: 'Bearer',
      };
      vi.mocked(mockApiClient.get).mockResolvedValue(mockTokenResponse);
      await client.initialize();
    });

    it('should provide user-friendly error messages for quota exceeded', () => {
      const quotaError: DriveApiError = {
        error: {
          code: DriveErrorCodes.QUOTA_EXCEEDED,
          message: 'Quota exceeded',
          status: 'QUOTA_EXCEEDED',
          details: [{ '@type': 'quota', reason: 'storageQuotaExceeded' }],
        },
      };

      const message = client.getUserFriendlyErrorMessage(quotaError);
      expect(message).toContain('Google Drive storage is full');
    });

    it('should provide user-friendly error messages for rate limiting', () => {
      const rateLimitError: DriveApiError = {
        error: {
          code: DriveErrorCodes.RATE_LIMITED,
          message: 'Rate limit exceeded',
          status: 'RATE_LIMITED',
        },
      };

      const message = client.getUserFriendlyErrorMessage(rateLimitError);
      expect(message).toContain('Too many requests');
    });

    it('should provide error advice for retryable errors', () => {
      const rateLimitError: DriveApiError = {
        error: {
          code: DriveErrorCodes.RATE_LIMITED,
          message: 'Rate limit exceeded',
          status: 'RATE_LIMITED',
        },
      };

      const advice = client.getErrorMessageWithAdvice(rateLimitError);
      expect(advice.canRetry).toBe(true);
      expect(advice.severity).toBeDefined();
      expect(
        advice.advice.some((item) => item.toLowerCase().includes('wait')),
      ).toBe(true);
    });

    it('should handle network errors gracefully', () => {
      const networkError = new TypeError('Failed to fetch');
      const message = client.getUserFriendlyErrorMessage(networkError);
      expect(message).toContain('Network connection issue');
    });

    it('should handle authentication errors', () => {
      const authError = new Error('Authentication failed: token expired');
      const advice = client.getErrorMessageWithAdvice(authError);
      expect(advice.message).toContain('Authentication failed');
      expect(advice.errorCode).toBe('AUTHENTICATION_FAILED');
    });

    it('should handle circuit breaker errors', () => {
      const circuitBreakerError = new Error(
        'Google Drive service is temporarily unavailable due to repeated failures. Please try again in 30 seconds.',
      );
      const advice = client.getErrorMessageWithAdvice(circuitBreakerError);
      expect(advice.errorCode).toBe('CIRCUIT_BREAKER_OPEN');
      expect(advice.retryAfter).toBe(60);
    });
  });

  describe('service status and metrics', () => {
    it('should provide service status with metrics', () => {
      const status = client.getServiceStatus();

      expect(status.metrics).toBeDefined();
      expect(status.circuitBreaker).toBeDefined();
      expect(status.recommendations).toBeInstanceOf(Array);
      expect(status.metrics.totalRequests).toBeGreaterThanOrEqual(0);
      expect(status.circuitBreaker.state).toBe('closed');
    });

    it('should provide diagnostic information', () => {
      const diagnostics = client.getDiagnosticInfo();

      expect(diagnostics.tokenStatus).toMatch(/valid|expired|missing/);
      expect(diagnostics.timeToExpiry).toBeGreaterThanOrEqual(0);
      expect(diagnostics.configSummary).toBeDefined();
      expect(diagnostics.currentState).toBeDefined();
    });

    it('should reset service status correctly', () => {
      // Manually trigger some metrics
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (client as any).recordFailure();

      client.resetServiceStatus();
      const status = client.getServiceStatus();

      expect(status.metrics.totalRequests).toBe(0);
      expect(status.metrics.successfulRequests).toBe(0);
      expect(status.metrics.failedRequests).toBe(0);
      expect(status.circuitBreaker.failures).toBe(0);
    });
  });

  describe('health check', () => {
    beforeEach(async () => {
      const mockTokenResponse: DriveTokenResponse = {
        access_token: 'mock-access-token',
        expires_in: 3600,
        token_type: 'Bearer',
      };
      vi.mocked(mockApiClient.get).mockResolvedValue(mockTokenResponse);
      await client.initialize();
    });

    it('should report healthy status when API is responsive', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ kind: 'drive#about' }),
      } as Response);

      const health = await client.performHealthCheck();

      expect(health.healthy).toBe(true);
      expect(health.status).toMatch(/healthy|degraded/);
      expect(health.responseTime).toBeGreaterThanOrEqual(0);
    });

    it('should report unhealthy status on API errors', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockRejectedValueOnce(new Error('Service unavailable'));

      const health = await client.performHealthCheck();

      expect(health.healthy).toBe(false);
      expect(health.status).toBe('unhealthy');
      expect(health.error).toBeDefined();
    });
  });

  describe('token management edge cases', () => {
    it('should handle missing access token during operation', async () => {
      // Initialize without proper token
      const client = new DriveUploadClient();

      const mockFile = new File(['test'], 'test.pdf', {
        type: 'application/pdf',
      });

      const mockOptions: DriveUploadOptions = {
        fileName: 'test.pdf',
        mimeType: 'application/pdf',
      };

      // Should fail due to missing token
      const result = await client.uploadFile(mockFile, mockOptions);
      expect(result.success).toBe(false);
    });

    it('should handle token refresh failure during upload', async () => {
      // Setup client with token that will expire
      const mockTokenResponse: DriveTokenResponse = {
        access_token: 'mock-access-token',
        expires_in: 1, // Will expire quickly
        token_type: 'Bearer',
      };
      vi.mocked(mockApiClient.get).mockResolvedValue(mockTokenResponse);
      await client.initialize();

      // Make token refresh fail
      vi.mocked(mockApiClient.get).mockRejectedValueOnce(
        new Error('Refresh failed'),
      );

      const mockFile = new File(['test'], 'test.pdf', {
        type: 'application/pdf',
      });

      const mockOptions: DriveUploadOptions = {
        fileName: 'test.pdf',
        mimeType: 'application/pdf',
      };

      const result = await client.uploadFile(mockFile, mockOptions);
      expect(result.success).toBe(false);
    });
  });

  describe('configuration and initialization', () => {
    it('should initialize with custom configuration', () => {
      const customClient = new DriveUploadClient({
        timeout: 5000,
        enableDebugLogging: true,
        retryConfig: {
          maxRetries: 3,
          baseDelay: 500,
        },
      });

      const diagnostics = customClient.getDiagnosticInfo();
      expect(diagnostics.configSummary.timeout).toBe(5000);
      expect(diagnostics.configSummary.maxRetries).toBe(3);
    });

    it('should use default configuration when not specified', () => {
      const defaultClient = new DriveUploadClient();
      const diagnostics = defaultClient.getDiagnosticInfo();

      expect(diagnostics.configSummary.timeout).toBe(30000); // Default timeout
      expect(diagnostics.configSummary.maxRetries).toBe(5); // Default max retries
    });

    it('should handle partial configuration override', () => {
      const partialClient = new DriveUploadClient({
        retryConfig: {
          maxRetries: 2, // Override only maxRetries
        },
      });

      const diagnostics = partialClient.getDiagnosticInfo();
      expect(diagnostics.configSummary.maxRetries).toBe(2);
      expect(diagnostics.configSummary.timeout).toBe(30000); // Should use default
    });
  });
});
