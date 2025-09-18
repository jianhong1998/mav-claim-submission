import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  GoogleDriveClient,
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

    // Mock environment variables
    process.env.GOOGLE_CLIENT_ID = 'test-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
    process.env.GOOGLE_REDIRECT_URI = 'test-redirect-uri';

    // Mock Google APIs
    vi.mocked(google.drive).mockReturnValue(mockDriveAPI as never);
    vi.mocked(google.auth.OAuth2).mockReturnValue(mockOAuth2Client as never);

    // Create service instance with mocked dependencies
    googleDriveClient = new GoogleDriveClient(
      mockAuthService as AuthService,
      mockTokenDBUtil as TokenDBUtil,
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

  const mockDriveFileResponse: DriveFileInfo = {
    id: 'drive-file-123',
    name: 'test-file.pdf',
    webViewLink: 'https://drive.google.com/file/d/drive-file-123/view',
    size: '1024',
  };

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
        // Mock finding no existing claim folder
        .mockResolvedValueOnce({
          data: { files: [] },
        });

      // Mock creating new claim folder
      mockDriveAPI.files.create.mockResolvedValue({
        data: { id: 'claim-folder-123', name: 'claim-123' },
      });

      const result = await googleDriveClient.createClaimFolder(
        'user-123',
        'claim-123',
      );

      expect(result).toBe('claim-folder-123');

      // Verify folder search
      expect(mockDriveAPI.files.list).toHaveBeenCalledWith({
        q: "name='Mavericks Claims' and mimeType='application/vnd.google-apps.folder' and trashed=false",
        fields: 'files(id,name)',
      });

      // Verify claim folder creation
      expect(mockDriveAPI.files.create).toHaveBeenCalledWith({
        requestBody: {
          name: 'claim-123',
          mimeType: 'application/vnd.google-apps.folder',
          parents: ['mavericks-folder-123'],
        },
        fields: 'id,name',
      });
    });

    it('should create parent folder if not exists', async () => {
      // Mock no existing Mavericks Claims folder
      mockDriveAPI.files.list
        .mockResolvedValueOnce({ data: { files: [] } })
        // Mock no existing claim folder
        .mockResolvedValueOnce({ data: { files: [] } });

      // Mock creating both folders
      mockDriveAPI.files.create
        .mockResolvedValueOnce({
          data: { id: 'mavericks-folder-123', name: 'Mavericks Claims' },
        })
        .mockResolvedValueOnce({
          data: { id: 'claim-folder-123', name: 'claim-123' },
        });

      const result = await googleDriveClient.createClaimFolder(
        'user-123',
        'claim-123',
      );

      expect(result).toBe('claim-folder-123');
      expect(mockDriveAPI.files.create).toHaveBeenCalledTimes(2);
    });

    it('should handle folder creation errors', async () => {
      mockAuthService.getUserTokens.mockResolvedValue(mockTokenEntity);
      mockTokenDBUtil.getDecryptedTokens.mockResolvedValue(mockDecryptedTokens);
      mockDriveAPI.files.list.mockRejectedValue(new Error('Drive API error'));

      await expect(
        googleDriveClient.createClaimFolder('user-123', 'claim-123'),
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
        'non-existent-file',
      );

      expect(result).toBeNull();
    });

    it('should handle file info errors', async () => {
      mockDriveAPI.files.get.mockRejectedValue(new Error('Drive API error'));

      await expect(
        googleDriveClient.getFileInfo('user-123', 'drive-file-123'),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should delete file successfully', async () => {
      mockDriveAPI.files.delete.mockResolvedValue(undefined);

      await googleDriveClient.deleteFile('user-123', 'drive-file-123');

      expect(mockDriveAPI.files.delete).toHaveBeenCalledWith({
        fileId: 'drive-file-123',
      });
    });

    it('should handle file deletion for non-existent file', async () => {
      mockDriveAPI.files.delete.mockRejectedValue({ code: 404 });

      // Should not throw for 404 errors
      await expect(
        googleDriveClient.deleteFile('user-123', 'non-existent-file'),
      ).resolves.toBeUndefined();
    });

    it('should handle file deletion errors', async () => {
      mockDriveAPI.files.delete.mockRejectedValue(new Error('Drive API error'));

      await expect(
        googleDriveClient.deleteFile('user-123', 'drive-file-123'),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should set file permissions successfully', async () => {
      mockDriveAPI.permissions.create.mockResolvedValue(undefined);

      await googleDriveClient.setFilePermissions('user-123', 'drive-file-123');

      expect(mockDriveAPI.permissions.create).toHaveBeenCalledWith({
        fileId: 'drive-file-123',
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });
    });

    it('should handle permission setting errors', async () => {
      mockDriveAPI.permissions.create.mockRejectedValue(
        new Error('Permission error'),
      );

      await expect(
        googleDriveClient.setFilePermissions('user-123', 'drive-file-123'),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('Authentication and Token Management', () => {
    it('should handle invalid tokens', async () => {
      mockAuthService.getUserTokens.mockResolvedValue(null);

      await expect(
        googleDriveClient.createClaimFolder('user-123', 'claim-123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle decryption errors', async () => {
      mockAuthService.getUserTokens.mockResolvedValue(mockTokenEntity);
      mockTokenDBUtil.getDecryptedTokens.mockRejectedValue(
        new Error('Decryption failed'),
      );

      await expect(
        googleDriveClient.createClaimFolder('user-123', 'claim-123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should set up OAuth2 client correctly', async () => {
      mockAuthService.getUserTokens.mockResolvedValue(mockTokenEntity);
      mockTokenDBUtil.getDecryptedTokens.mockResolvedValue(mockDecryptedTokens);
      mockDriveAPI.files.list.mockResolvedValue({ data: { files: [] } });
      mockDriveAPI.files.create.mockResolvedValue({
        data: { id: 'folder-123', name: 'test' },
      });

      await googleDriveClient.createClaimFolder('user-123', 'claim-123');

      expect(google.auth.OAuth2).toHaveBeenCalledWith(
        'test-client-id',
        'test-client-secret',
        'test-redirect-uri',
      );
      expect(mockOAuth2Client.setCredentials).toHaveBeenCalledWith({
        access_token: 'decrypted_access_token',
        refresh_token: 'decrypted_refresh_token',
      });
    });
  });
});
