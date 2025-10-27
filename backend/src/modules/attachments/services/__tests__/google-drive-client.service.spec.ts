import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { GoogleDriveClient } from '../google-drive-client.service';
import { EnvironmentVariableUtil } from 'src/modules/common/utils/environment-variable.util';

/**
 * GoogleDriveClient Tests
 *
 * These tests cover the GoogleDriveClient functionality including:
 * - downloadFile(): Downloads files from Google Drive as in-memory Buffers for email attachments
 * - createClaimFolder(): Creates claim folder structure using environment-specific root folder
 *
 * Requirements:
 * - email-attachments-analysis Task 3.1 - Unit tests for GoogleDriveClient.downloadFile
 * - env-folder-naming Task 6 - Unit tests for environment-based folder creation
 */
describe('GoogleDriveClient', () => {
  let googleDriveClient: GoogleDriveClient;
  let mockAuthService: {
    getUserTokens: Mock;
  };
  let mockTokenDBUtil: {
    getDecryptedTokens: Mock;
  };
  let mockEnvironmentVariableUtil: {
    getVariables: Mock;
  };
  let mockDriveClient: {
    files: {
      get: Mock;
      list: Mock;
      create: Mock;
    };
  };

  const userId = 'user-123';
  const fileId = 'file-456';

  beforeEach(() => {
    mockAuthService = {
      getUserTokens: vi.fn(),
    };

    mockTokenDBUtil = {
      getDecryptedTokens: vi.fn(),
    };

    mockEnvironmentVariableUtil = {
      getVariables: vi.fn().mockReturnValue({
        googleDriveClaimsFolderName: 'Mavericks Claims',
      }),
    };

    mockDriveClient = {
      files: {
        get: vi.fn(),
        list: vi.fn(),
        create: vi.fn(),
      },
    };

    googleDriveClient = new GoogleDriveClient(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
      mockAuthService as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
      mockTokenDBUtil as any,
      mockEnvironmentVariableUtil as unknown as EnvironmentVariableUtil,
    );

    // Mock getDriveClient to return our mock drive client
    vi.spyOn(googleDriveClient as never, 'getDriveClient').mockResolvedValue(
      mockDriveClient as never,
    );
  });

  describe('downloadFile', () => {
    it('should download file as Buffer with correct parameters', async () => {
      const mockFileData = new ArrayBuffer(1024);
      mockDriveClient.files.get.mockResolvedValue({
        data: mockFileData,
      });

      const result = await googleDriveClient.downloadFile(userId, fileId);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBe(1024);
      expect(mockDriveClient.files.get).toHaveBeenCalledWith(
        {
          fileId: 'file-456',
          alt: 'media',
        },
        {
          responseType: 'arraybuffer',
        },
      );
      expect(mockDriveClient.files.get).toHaveBeenCalledTimes(1);
    });

    it('should use alt=media and responseType=arraybuffer', async () => {
      const mockFileData = new ArrayBuffer(512);
      mockDriveClient.files.get.mockResolvedValue({
        data: mockFileData,
      });

      await googleDriveClient.downloadFile(userId, fileId);

      const callArgs = mockDriveClient.files.get.mock.calls[0];
      expect(callArgs[0]).toEqual({
        fileId: 'file-456',
        alt: 'media',
      });
      expect(callArgs[1]).toEqual({
        responseType: 'arraybuffer',
      });
    });

    it('should retry on 503 service unavailable', async () => {
      const serviceUnavailableError = { code: 503 };
      const mockFileData = new ArrayBuffer(256);

      mockDriveClient.files.get
        .mockRejectedValueOnce(serviceUnavailableError)
        .mockRejectedValueOnce(serviceUnavailableError)
        .mockResolvedValueOnce({
          data: mockFileData,
        });

      const result = await googleDriveClient.downloadFile(userId, fileId);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBe(256);
      expect(mockDriveClient.files.get).toHaveBeenCalledTimes(3);
    });

    it('should throw on 404 file not found without retry', async () => {
      const notFoundError = { code: 404 };
      mockDriveClient.files.get.mockRejectedValue(notFoundError);

      await expect(
        googleDriveClient.downloadFile(userId, fileId),
      ).rejects.toThrow(BadRequestException);

      expect(mockDriveClient.files.get).toHaveBeenCalledTimes(1);
    });

    it('should respect maxRetries (3 attempts)', async () => {
      const rateLimitError = { code: 429 };
      mockDriveClient.files.get.mockRejectedValue(rateLimitError);

      await expect(
        googleDriveClient.downloadFile(userId, fileId),
      ).rejects.toThrow();

      expect(mockDriveClient.files.get).toHaveBeenCalledTimes(3);
    });

    it('should retry on 429 rate limit error', async () => {
      const rateLimitError = { code: 429 };
      const mockFileData = new ArrayBuffer(128);

      mockDriveClient.files.get
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce({
          data: mockFileData,
        });

      const result = await googleDriveClient.downloadFile(userId, fileId);

      expect(result).toBeInstanceOf(Buffer);
      expect(mockDriveClient.files.get).toHaveBeenCalledTimes(2);
    });

    it('should retry on 500 internal server error', async () => {
      const serverError = { code: 500 };
      const mockFileData = new ArrayBuffer(64);

      mockDriveClient.files.get
        .mockRejectedValueOnce(serverError)
        .mockResolvedValueOnce({
          data: mockFileData,
        });

      const result = await googleDriveClient.downloadFile(userId, fileId);

      expect(result).toBeInstanceOf(Buffer);
      expect(mockDriveClient.files.get).toHaveBeenCalledTimes(2);
    });

    it('should retry on 502 bad gateway', async () => {
      const badGatewayError = { code: 502 };
      const mockFileData = new ArrayBuffer(32);

      mockDriveClient.files.get
        .mockRejectedValueOnce(badGatewayError)
        .mockResolvedValueOnce({
          data: mockFileData,
        });

      const result = await googleDriveClient.downloadFile(userId, fileId);

      expect(result).toBeInstanceOf(Buffer);
      expect(mockDriveClient.files.get).toHaveBeenCalledTimes(2);
    });

    it('should retry on 504 gateway timeout', async () => {
      const timeoutError = { code: 504 };
      const mockFileData = new ArrayBuffer(16);

      mockDriveClient.files.get
        .mockRejectedValueOnce(timeoutError)
        .mockResolvedValueOnce({
          data: mockFileData,
        });

      const result = await googleDriveClient.downloadFile(userId, fileId);

      expect(result).toBeInstanceOf(Buffer);
      expect(mockDriveClient.files.get).toHaveBeenCalledTimes(2);
    });

    it('should not retry on 401 authentication error', async () => {
      const authError = { code: 401 };
      mockDriveClient.files.get.mockRejectedValue(authError);

      await expect(
        googleDriveClient.downloadFile(userId, fileId),
      ).rejects.toThrow(BadRequestException);

      expect(mockDriveClient.files.get).toHaveBeenCalledTimes(1);
    });

    it('should not retry on 403 forbidden error', async () => {
      const forbiddenError = { code: 403 };
      mockDriveClient.files.get.mockRejectedValue(forbiddenError);

      await expect(
        googleDriveClient.downloadFile(userId, fileId),
      ).rejects.toThrow(BadRequestException);

      expect(mockDriveClient.files.get).toHaveBeenCalledTimes(1);
    });

    it('should handle large files correctly', async () => {
      const largeFileSize = 10 * 1024 * 1024; // 10MB
      const mockFileData = new ArrayBuffer(largeFileSize);
      mockDriveClient.files.get.mockResolvedValue({
        data: mockFileData,
      });

      const result = await googleDriveClient.downloadFile(userId, fileId);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBe(largeFileSize);
    });

    it('should handle empty files', async () => {
      const emptyFileData = new ArrayBuffer(0);
      mockDriveClient.files.get.mockResolvedValue({
        data: emptyFileData,
      });

      const result = await googleDriveClient.downloadFile(userId, fileId);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBe(0);
    });

    it('should convert ArrayBuffer to Buffer correctly', async () => {
      const testData = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]); // "Hello"
      const mockFileData = testData.buffer;
      mockDriveClient.files.get.mockResolvedValue({
        data: mockFileData,
      });

      const result = await googleDriveClient.downloadFile(userId, fileId);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.toString()).toBe('Hello');
    });

    it('should throw InternalServerErrorException on server errors after retries', async () => {
      const serverError = { code: 503 };
      mockDriveClient.files.get.mockRejectedValue(serverError);

      await expect(
        googleDriveClient.downloadFile(userId, fileId),
      ).rejects.toThrow(InternalServerErrorException);

      expect(mockDriveClient.files.get).toHaveBeenCalledTimes(3);
    });

    it('should apply exponential backoff between retries', async () => {
      const retryableError = { code: 503 };
      const mockFileData = new ArrayBuffer(128);

      mockDriveClient.files.get
        .mockRejectedValueOnce(retryableError)
        .mockRejectedValueOnce(retryableError)
        .mockResolvedValueOnce({
          data: mockFileData,
        });

      const startTime = Date.now();
      await googleDriveClient.downloadFile(userId, fileId);
      const duration = Date.now() - startTime;

      // First retry: 1s, second retry: 2s = 3s total minimum
      // Allow some tolerance for execution time
      expect(duration).toBeGreaterThanOrEqual(3000);
      expect(mockDriveClient.files.get).toHaveBeenCalledTimes(3);
    });

    it('should handle multiple concurrent downloads', async () => {
      const mockFileData1 = new ArrayBuffer(100);
      const mockFileData2 = new ArrayBuffer(200);
      const mockFileData3 = new ArrayBuffer(300);

      mockDriveClient.files.get
        .mockResolvedValueOnce({ data: mockFileData1 })
        .mockResolvedValueOnce({ data: mockFileData2 })
        .mockResolvedValueOnce({ data: mockFileData3 });

      const [result1, result2, result3] = await Promise.all([
        googleDriveClient.downloadFile(userId, 'file-1'),
        googleDriveClient.downloadFile(userId, 'file-2'),
        googleDriveClient.downloadFile(userId, 'file-3'),
      ]);

      expect(result1.length).toBe(100);
      expect(result2.length).toBe(200);
      expect(result3.length).toBe(300);
      expect(mockDriveClient.files.get).toHaveBeenCalledTimes(3);
    });
  });

  describe('createClaimFolder', () => {
    /**
     * Test for env-folder-naming requirement 1.3
     * Verifies that createClaimFolder() uses the environment variable value
     * instead of hardcoded 'Mavericks Claims'
     */
    it('should use environment variable for root folder name instead of hardcoded string', async () => {
      const testFolderName = '[test] Mavericks Claims';
      const claimId = 'claim-1';

      // Mock environment variable to return test folder name
      mockEnvironmentVariableUtil.getVariables.mockReturnValue({
        googleDriveClaimsFolderName: testFolderName,
      });

      // Mock Drive API responses
      // First call: search for root folder (not found)
      // Second call: create root folder
      // Third call: search for claim folder (not found)
      // Fourth call: create claim folder
      mockDriveClient.files.list
        .mockResolvedValueOnce({ data: { files: [] } }) // Root folder search
        .mockResolvedValueOnce({ data: { files: [] } }); // Claim folder search

      mockDriveClient.files.create
        .mockResolvedValueOnce({ data: { id: 'root-folder-id' } }) // Root folder creation
        .mockResolvedValueOnce({ data: { id: 'claim-folder-id' } }); // Claim folder creation

      // Spy on private findOrCreateFolder method
      const findOrCreateFolderSpy = vi.spyOn(
        googleDriveClient as never,
        'findOrCreateFolder',
      );

      // Execute the method
      await googleDriveClient.createClaimFolder(userId, claimId);

      // Verify environment variable was called
      expect(mockEnvironmentVariableUtil.getVariables).toHaveBeenCalled();

      // Verify findOrCreateFolder was called with env var value, not hardcoded string
      expect(findOrCreateFolderSpy).toHaveBeenCalledWith(
        userId,
        testFolderName, // Should use '[test] Mavericks Claims', NOT 'Mavericks Claims'
      );

      // Verify it was NOT called with the hardcoded value
      expect(findOrCreateFolderSpy).not.toHaveBeenCalledWith(
        userId,
        'Mavericks Claims',
      );
    });

    it('should use production folder name when environment is configured for production', async () => {
      const prodFolderName = 'Mavericks Claims';
      const claimId = 'claim-2';

      // Mock environment variable for production
      mockEnvironmentVariableUtil.getVariables.mockReturnValue({
        googleDriveClaimsFolderName: prodFolderName,
      });

      // Mock Drive API responses
      mockDriveClient.files.list
        .mockResolvedValueOnce({ data: { files: [] } })
        .mockResolvedValueOnce({ data: { files: [] } });

      mockDriveClient.files.create
        .mockResolvedValueOnce({ data: { id: 'root-folder-id' } })
        .mockResolvedValueOnce({ data: { id: 'claim-folder-id' } });

      // Spy on private findOrCreateFolder method
      const findOrCreateFolderSpy = vi.spyOn(
        googleDriveClient as never,
        'findOrCreateFolder',
      );

      // Execute the method
      await googleDriveClient.createClaimFolder(userId, claimId);

      // Verify correct production folder name was used
      expect(findOrCreateFolderSpy).toHaveBeenCalledWith(
        userId,
        prodFolderName,
      );
    });

    it('should use staging folder name when environment is configured for staging', async () => {
      const stagingFolderName = '[staging] Mavericks Claims';
      const claimId = 'claim-3';

      // Mock environment variable for staging
      mockEnvironmentVariableUtil.getVariables.mockReturnValue({
        googleDriveClaimsFolderName: stagingFolderName,
      });

      // Mock Drive API responses
      mockDriveClient.files.list
        .mockResolvedValueOnce({ data: { files: [] } })
        .mockResolvedValueOnce({ data: { files: [] } });

      mockDriveClient.files.create
        .mockResolvedValueOnce({ data: { id: 'root-folder-id' } })
        .mockResolvedValueOnce({ data: { id: 'claim-folder-id' } });

      // Spy on private findOrCreateFolder method
      const findOrCreateFolderSpy = vi.spyOn(
        googleDriveClient as never,
        'findOrCreateFolder',
      );

      // Execute the method
      await googleDriveClient.createClaimFolder(userId, claimId);

      // Verify correct staging folder name was used
      expect(findOrCreateFolderSpy).toHaveBeenCalledWith(
        userId,
        stagingFolderName,
      );
    });

    it('should create both root and claim folders using environment-specific configuration', async () => {
      const claimId = 'claim-4';
      const configuredFolderName = '[test] Mavericks Claims';

      // Mock environment variable
      mockEnvironmentVariableUtil.getVariables.mockReturnValue({
        googleDriveClaimsFolderName: configuredFolderName,
      });

      // Mock Drive API responses
      mockDriveClient.files.list
        .mockResolvedValueOnce({ data: { files: [] } }) // Root folder search
        .mockResolvedValueOnce({ data: { files: [] } }); // Claim folder search

      mockDriveClient.files.create
        .mockResolvedValueOnce({ data: { id: 'root-folder-id' } }) // Root folder creation
        .mockResolvedValueOnce({ data: { id: 'claim-folder-id' } }); // Claim folder creation

      // Spy on private findOrCreateFolder method
      const findOrCreateFolderSpy = vi.spyOn(
        googleDriveClient as never,
        'findOrCreateFolder',
      );

      // Execute the method
      await googleDriveClient.createClaimFolder(userId, claimId);

      // Test BEHAVIOR: Verify root folder created with environment-specific name
      expect(findOrCreateFolderSpy).toHaveBeenCalledWith(
        userId,
        configuredFolderName,
      );

      // Verify getVariables was called (exact count is implementation detail, not behavior)
      expect(mockEnvironmentVariableUtil.getVariables).toHaveBeenCalled();
    });
  });
});
