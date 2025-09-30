import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { GoogleDriveClient } from '../google-drive-client.service';

/**
 * GoogleDriveClient Tests - downloadFile() method
 *
 * These tests cover the downloadFile() functionality that downloads files
 * from Google Drive as in-memory Buffers for email attachments.
 *
 * Requirement: email-attachments-analysis Task 3.1 - Unit tests for GoogleDriveClient.downloadFile
 */
describe('GoogleDriveClient', () => {
  let googleDriveClient: GoogleDriveClient;
  let mockAuthService: {
    getUserTokens: Mock;
  };
  let mockTokenDBUtil: {
    getDecryptedTokens: Mock;
  };
  let mockDriveClient: {
    files: {
      get: Mock;
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

    mockDriveClient = {
      files: {
        get: vi.fn(),
      },
    };

    googleDriveClient = new GoogleDriveClient(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
      mockAuthService as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
      mockTokenDBUtil as any,
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
});
