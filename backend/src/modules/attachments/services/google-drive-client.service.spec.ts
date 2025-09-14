/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  GoogleDriveClient,
  DriveUploadOptions,
  DriveFileInfo,
} from './google-drive-client.service';
import { AuthService } from 'src/modules/auth/services/auth.service';
import { TokenDBUtil } from 'src/modules/auth/utils/token-db.util';
import { google } from 'googleapis';

// Mock googleapis
vi.mock('googleapis', () => ({
  google: {
    drive: vi.fn(),
    auth: {
      OAuth2: vi.fn(),
    },
  },
}));

// Mock external dependencies
const mockAuthService = {
  getUserTokens: vi.fn(),
};

const mockTokenDBUtil = {
  getDecryptedTokens: vi.fn(),
};

const mockDriveAPI = {
  files: {
    create: vi.fn(),
    list: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  },
  permissions: {
    create: vi.fn(),
  },
};

const mockOAuth2Client = {
  setCredentials: vi.fn(),
};

describe('GoogleDriveClient', () => {
  let googleDriveClient: GoogleDriveClient;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock Google APIs
    (google.drive as any).mockReturnValue(mockDriveAPI);
    (google.auth.OAuth2 as any).mockReturnValue(mockOAuth2Client);

    // Create service instance with mocked dependencies
    googleDriveClient = new GoogleDriveClient(
      mockAuthService as any,
      mockTokenDBUtil as any,
    );
  });

  const mockTokenEntity = {
    id: 'token-123',
    userId: 'user-123',
    accessToken: 'encrypted_access_token',
    refreshToken: 'encrypted_refresh_token',
    expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
  };

  const mockDecryptedTokens = {
    accessToken: 'decrypted_access_token',
    refreshToken: 'decrypted_refresh_token',
  };

  const mockUploadOptions: DriveUploadOptions = {
    fileName: 'test-file.pdf',
    mimeType: 'application/pdf',
    fileBuffer: Buffer.from('mock file content'),
    folderId: 'folder-123',
  };

  const mockDriveFileResponse: DriveFileInfo = {
    id: 'drive-file-123',
    name: 'test-file.pdf',
    webViewLink: 'https://drive.google.com/file/d/drive-file-123/view',
    size: '1024',
  };

  describe('File Upload Operations', () => {
    beforeEach(() => {
      mockAuthService.getUserTokens.mockResolvedValue(mockTokenEntity);
      mockTokenDBUtil.getDecryptedTokens.mockResolvedValue(mockDecryptedTokens);
    });

    it('should successfully upload file to Google Drive', async () => {
      mockDriveAPI.files.create.mockResolvedValue({
        data: mockDriveFileResponse,
      });
      mockDriveAPI.permissions.create.mockResolvedValue(undefined);

      const result = await googleDriveClient.uploadFile(
        'user-123',
        mockUploadOptions,
      );

      expect(result).toMatchObject({
        id: 'drive-file-123',
        name: 'test-file.pdf',
        webViewLink: 'https://drive.google.com/file/d/drive-file-123/view',
        size: '1024',
      });
      expect(result.uploadedAt).toBeInstanceOf(Date);

      // Verify Drive API calls
      expect(mockDriveAPI.files.create).toHaveBeenCalledWith({
        requestBody: {
          name: 'test-file.pdf',
          parents: ['folder-123'],
        },
        media: {
          mimeType: 'application/pdf',
          body: mockUploadOptions.fileBuffer,
        },
        fields: 'id,name,webViewLink,size',
      });

      expect(mockDriveAPI.permissions.create).toHaveBeenCalledWith({
        fileId: 'drive-file-123',
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });
    });

    it('should upload file without parent folder', async () => {
      const optionsWithoutFolder = {
        ...mockUploadOptions,
        folderId: undefined,
      };

      mockDriveAPI.files.create.mockResolvedValue({
        data: mockDriveFileResponse,
      });
      mockDriveAPI.permissions.create.mockResolvedValue(undefined);

      await googleDriveClient.uploadFile('user-123', optionsWithoutFolder);

      expect(mockDriveAPI.files.create).toHaveBeenCalledWith({
        requestBody: {
          name: 'test-file.pdf',
          parents: undefined,
        },
        media: {
          mimeType: 'application/pdf',
          body: mockUploadOptions.fileBuffer,
        },
        fields: 'id,name,webViewLink,size',
      });
    });

    it('should handle file upload errors', async () => {
      mockDriveAPI.files.create.mockRejectedValue(new Error('Drive API error'));

      await expect(
        googleDriveClient.uploadFile('user-123', mockUploadOptions),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should retry on retryable errors', async () => {
      // First call fails with retryable error, second succeeds
      mockDriveAPI.files.create
        .mockRejectedValueOnce({ code: 429 }) // Rate limit
        .mockResolvedValue({ data: mockDriveFileResponse });
      mockDriveAPI.permissions.create.mockResolvedValue(undefined);

      const result = await googleDriveClient.uploadFile(
        'user-123',
        mockUploadOptions,
      );

      expect(result.id).toBe('drive-file-123');
      expect(mockDriveAPI.files.create).toHaveBeenCalledTimes(2);
    });

    it('should not retry on non-retryable errors', async () => {
      mockDriveAPI.files.create.mockRejectedValue({ code: 400 }); // Bad request

      await expect(
        googleDriveClient.uploadFile('user-123', mockUploadOptions),
      ).rejects.toThrow();

      expect(mockDriveAPI.files.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('Folder Management', () => {
    beforeEach(() => {
      mockAuthService.getUserTokens.mockResolvedValue(mockTokenEntity);
      mockTokenDBUtil.getDecryptedTokens.mockResolvedValue(mockDecryptedTokens);
    });

    it('should create claim folder structure successfully', async () => {
      // Mock finding existing Mavericks Claims folder
      mockDriveAPI.files.list
        .mockResolvedValueOnce({
          data: {
            files: [{ id: 'mavericks-folder-123', name: 'Mavericks Claims' }],
          },
        })
        // Mock not finding existing claim folder
        .mockResolvedValueOnce({
          data: { files: [] },
        });

      // Mock creating new claim folder
      mockDriveAPI.files.create.mockResolvedValue({
        data: { id: 'claim-folder-123', name: 'claim-456' },
      });

      const result = await googleDriveClient.createClaimFolder(
        'user-123',
        'claim-456',
      );

      expect(result).toBe('claim-folder-123');

      // Verify search for Mavericks Claims folder
      expect(mockDriveAPI.files.list).toHaveBeenCalledWith({
        q: "name='Mavericks Claims' and mimeType='application/vnd.google-apps.folder' and trashed=false",
        fields: 'files(id,name)',
      });

      // Verify search for claim folder
      expect(mockDriveAPI.files.list).toHaveBeenCalledWith({
        q: "name='claim-456' and parents in 'mavericks-folder-123' and mimeType='application/vnd.google-apps.folder' and trashed=false",
        fields: 'files(id,name)',
      });

      // Verify claim folder creation
      expect(mockDriveAPI.files.create).toHaveBeenCalledWith({
        requestBody: {
          name: 'claim-456',
          mimeType: 'application/vnd.google-apps.folder',
          parents: ['mavericks-folder-123'],
        },
        fields: 'id,name',
      });
    });

    it('should use existing claim folder if found', async () => {
      // Mock finding existing Mavericks Claims folder
      mockDriveAPI.files.list
        .mockResolvedValueOnce({
          data: {
            files: [{ id: 'mavericks-folder-123', name: 'Mavericks Claims' }],
          },
        })
        // Mock finding existing claim folder
        .mockResolvedValueOnce({
          data: { files: [{ id: 'existing-claim-folder', name: 'claim-456' }] },
        });

      const result = await googleDriveClient.createClaimFolder(
        'user-123',
        'claim-456',
      );

      expect(result).toBe('existing-claim-folder');
      expect(mockDriveAPI.files.create).not.toHaveBeenCalled();
    });

    it('should create both parent and claim folders if neither exist', async () => {
      // Mock not finding any existing folders
      mockDriveAPI.files.list
        .mockResolvedValueOnce({ data: { files: [] } }) // No Mavericks Claims folder
        .mockResolvedValueOnce({ data: { files: [] } }); // No claim folder

      // Mock creating both folders
      mockDriveAPI.files.create
        .mockResolvedValueOnce({
          data: { id: 'new-mavericks-folder', name: 'Mavericks Claims' },
        })
        .mockResolvedValueOnce({
          data: { id: 'new-claim-folder', name: 'claim-456' },
        });

      const result = await googleDriveClient.createClaimFolder(
        'user-123',
        'claim-456',
      );

      expect(result).toBe('new-claim-folder');
      expect(mockDriveAPI.files.create).toHaveBeenCalledTimes(2);
    });

    it('should handle folder creation errors', async () => {
      mockDriveAPI.files.list.mockRejectedValue(new Error('API error'));

      await expect(
        googleDriveClient.createClaimFolder('user-123', 'claim-456'),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('File Operations', () => {
    beforeEach(() => {
      mockAuthService.getUserTokens.mockResolvedValue(mockTokenEntity);
      mockTokenDBUtil.getDecryptedTokens.mockResolvedValue(mockDecryptedTokens);
    });

    it('should get file information successfully', async () => {
      mockDriveAPI.files.get.mockResolvedValue({
        data: mockDriveFileResponse,
      });

      const result = await googleDriveClient.getFileInfo(
        'user-123',
        'drive-file-123',
      );

      expect(result).toEqual(mockDriveFileResponse);
      expect(mockDriveAPI.files.get).toHaveBeenCalledWith({
        fileId: 'drive-file-123',
        fields: 'id,name,webViewLink,size',
      });
    });

    it('should return null for non-existent file', async () => {
      mockDriveAPI.files.get.mockRejectedValue({ code: 404 });

      const result = await googleDriveClient.getFileInfo(
        'user-123',
        'non-existent',
      );

      expect(result).toBeNull();
    });

    it('should delete file successfully', async () => {
      mockDriveAPI.files.delete.mockResolvedValue(undefined);

      await expect(
        googleDriveClient.deleteFile('user-123', 'drive-file-123'),
      ).resolves.not.toThrow();

      expect(mockDriveAPI.files.delete).toHaveBeenCalledWith({
        fileId: 'drive-file-123',
      });
    });

    it('should handle deletion of non-existent file gracefully', async () => {
      mockDriveAPI.files.delete.mockRejectedValue({ code: 404 });

      await expect(
        googleDriveClient.deleteFile('user-123', 'non-existent'),
      ).resolves.not.toThrow();
    });

    it('should set file permissions successfully', async () => {
      mockDriveAPI.permissions.create.mockResolvedValue(undefined);

      await expect(
        googleDriveClient.setFilePermissions('user-123', 'drive-file-123'),
      ).resolves.not.toThrow();

      expect(mockDriveAPI.permissions.create).toHaveBeenCalledWith({
        fileId: 'drive-file-123',
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });
    });
  });

  describe('Token Management', () => {
    it('should handle missing user tokens', async () => {
      mockAuthService.getUserTokens.mockResolvedValue(null);

      await expect(
        googleDriveClient.uploadFile('user-123', mockUploadOptions),
      ).rejects.toThrow(BadRequestException);
    });

    it('should properly set up OAuth2 client', async () => {
      mockAuthService.getUserTokens.mockResolvedValue(mockTokenEntity);
      mockTokenDBUtil.getDecryptedTokens.mockResolvedValue(mockDecryptedTokens);
      mockDriveAPI.files.create.mockResolvedValue({
        data: mockDriveFileResponse,
      });
      mockDriveAPI.permissions.create.mockResolvedValue(undefined);

      await googleDriveClient.uploadFile('user-123', mockUploadOptions);

      expect(google.auth.OAuth2).toHaveBeenCalledWith(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
      );

      expect(mockOAuth2Client.setCredentials).toHaveBeenCalledWith({
        access_token: 'decrypted_access_token',
        refresh_token: 'decrypted_refresh_token',
      });

      expect(google.drive).toHaveBeenCalledWith({
        version: 'v3',
        auth: mockOAuth2Client,
      });
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockAuthService.getUserTokens.mockResolvedValue(mockTokenEntity);
      mockTokenDBUtil.getDecryptedTokens.mockResolvedValue(mockDecryptedTokens);
    });

    it('should handle authentication errors', async () => {
      mockDriveAPI.files.create.mockRejectedValue({ code: 401 });

      await expect(
        googleDriveClient.uploadFile('user-123', mockUploadOptions),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle permission errors', async () => {
      mockDriveAPI.files.create.mockRejectedValue({
        code: 403,
        message: 'insufficientPermissions',
      });

      await expect(
        googleDriveClient.uploadFile('user-123', mockUploadOptions),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle quota exceeded errors', async () => {
      mockDriveAPI.files.create.mockRejectedValue({
        code: 403,
        message: 'quotaExceeded',
      });

      await expect(
        googleDriveClient.uploadFile('user-123', mockUploadOptions),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle rate limiting errors', async () => {
      mockDriveAPI.files.create.mockRejectedValue({ code: 429 });

      await expect(
        googleDriveClient.uploadFile('user-123', mockUploadOptions),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle server errors', async () => {
      mockDriveAPI.files.create.mockRejectedValue({ code: 500 });

      await expect(
        googleDriveClient.uploadFile('user-123', mockUploadOptions),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should handle unknown errors gracefully', async () => {
      mockDriveAPI.files.create.mockRejectedValue(new Error('Unknown error'));

      await expect(
        googleDriveClient.uploadFile('user-123', mockUploadOptions),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('Retry Logic', () => {
    beforeEach(() => {
      mockAuthService.getUserTokens.mockResolvedValue(mockTokenEntity);
      mockTokenDBUtil.getDecryptedTokens.mockResolvedValue(mockDecryptedTokens);
    });

    it('should retry with exponential backoff on retryable errors', async () => {
      const startTime = Date.now();

      // Mock retryable errors followed by success
      mockDriveAPI.files.create
        .mockRejectedValueOnce({ code: 429 }) // Rate limit
        .mockRejectedValueOnce({ code: 503 }) // Service unavailable
        .mockResolvedValue({ data: mockDriveFileResponse });
      mockDriveAPI.permissions.create.mockResolvedValue(undefined);

      const result = await googleDriveClient.uploadFile(
        'user-123',
        mockUploadOptions,
      );

      const endTime = Date.now();
      const elapsedTime = endTime - startTime;

      expect(result.id).toBe('drive-file-123');
      expect(mockDriveAPI.files.create).toHaveBeenCalledTimes(3);

      // Should have some delay due to exponential backoff (at least 1s + 2s = 3s)
      expect(elapsedTime).toBeGreaterThan(2000);
    });

    it('should give up after max retries', async () => {
      // Mock consistent retryable errors
      mockDriveAPI.files.create.mockRejectedValue({ code: 429 });

      await expect(
        googleDriveClient.uploadFile('user-123', mockUploadOptions),
      ).rejects.toThrow();

      // Should retry 3 times (initial + 2 retries)
      expect(mockDriveAPI.files.create).toHaveBeenCalledTimes(3);
    });

    it('should not retry non-retryable errors', async () => {
      mockDriveAPI.files.create.mockRejectedValue({ code: 400 }); // Bad request

      await expect(
        googleDriveClient.uploadFile('user-123', mockUploadOptions),
      ).rejects.toThrow();

      expect(mockDriveAPI.files.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('Utility Methods', () => {
    it('should correctly identify retryable error codes', async () => {
      mockAuthService.getUserTokens.mockResolvedValue(mockTokenEntity);
      mockTokenDBUtil.getDecryptedTokens.mockResolvedValue(mockDecryptedTokens);

      const retryableCodes = [429, 500, 502, 503, 504];

      // Test each retryable code individually with proper mock reset
      for (const code of retryableCodes) {
        vi.clearAllMocks();
        mockAuthService.getUserTokens.mockResolvedValue(mockTokenEntity);
        mockTokenDBUtil.getDecryptedTokens.mockResolvedValue(
          mockDecryptedTokens,
        );

        mockDriveAPI.files.create
          .mockRejectedValueOnce({ code })
          .mockResolvedValue({ data: mockDriveFileResponse });
        mockDriveAPI.permissions.create.mockResolvedValue(undefined);

        const result = await googleDriveClient.uploadFile(
          'user-123',
          mockUploadOptions,
        );
        expect(result.id).toBe('drive-file-123');
      }
    }, 10000);

    it('should not retry non-retryable error codes', async () => {
      mockAuthService.getUserTokens.mockResolvedValue(mockTokenEntity);
      mockTokenDBUtil.getDecryptedTokens.mockResolvedValue(mockDecryptedTokens);

      const nonRetryableCodes = [400, 401, 403, 404];

      // Test each non-retryable code individually
      for (const code of nonRetryableCodes) {
        vi.clearAllMocks();
        mockAuthService.getUserTokens.mockResolvedValue(mockTokenEntity);
        mockTokenDBUtil.getDecryptedTokens.mockResolvedValue(
          mockDecryptedTokens,
        );

        mockDriveAPI.files.create.mockRejectedValue({ code });

        await expect(
          googleDriveClient.uploadFile('user-123', mockUploadOptions),
        ).rejects.toThrow();
      }
    });

    it('should handle malformed error objects safely', async () => {
      mockAuthService.getUserTokens.mockResolvedValue(mockTokenEntity);
      mockTokenDBUtil.getDecryptedTokens.mockResolvedValue(mockDecryptedTokens);

      // Test various malformed error objects
      const malformedErrors = [
        null,
        undefined,
        'string error',
        { message: 'no code' },
        { code: 'non-numeric' },
        { code: null },
      ];

      for (const error of malformedErrors) {
        mockDriveAPI.files.create.mockRejectedValue(error);

        await expect(
          googleDriveClient.uploadFile('user-123', mockUploadOptions),
        ).rejects.toThrow(InternalServerErrorException);
      }
    });
  });
});
