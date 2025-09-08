import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  UnauthorizedException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { DriveService } from './drive.service';
import { TokenService } from '../../auth/services/token.service';
import { EnvironmentVariableUtil } from '../../common/utils/environment-variable.util';
import { LoggerUtil } from '../../common/utils/logger.util';
import { DriveUtils } from '../../common/utils/drive-utils';
import { google } from 'googleapis';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock googleapis
vi.mock('googleapis');
const mockGoogle = google as unknown as {
  auth: { OAuth2: ReturnType<typeof vi.fn> };
  drive: ReturnType<typeof vi.fn>;
};

// Mock drive utils
vi.mock('../../common/utils/drive-utils');
const MockDriveUtils = DriveUtils as unknown as {
  validateUploadParams: ReturnType<typeof vi.fn>;
  validateFolderName: ReturnType<typeof vi.fn>;
  createFileMetadata: ReturnType<typeof vi.fn>;
  createFolderMetadata: ReturnType<typeof vi.fn>;
  mapFileMetadataResponse: ReturnType<typeof vi.fn>;
  mapDriveApiError: ReturnType<typeof vi.fn>;
  shouldRetryError: ReturnType<typeof vi.fn>;
  calculateRetryDelay: ReturnType<typeof vi.fn>;
};

describe('DriveService', () => {
  let service: DriveService;
  let tokenService: {
    getValidTokenForUser: ReturnType<typeof vi.fn>;
    updateToken: ReturnType<typeof vi.fn>;
  };
  let environmentVariableUtil: {
    getVariables: ReturnType<typeof vi.fn>;
  };
  let _loggerUtil: {
    createLogger: ReturnType<typeof vi.fn>;
  };

  const mockTokens = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
  };

  const mockEnvironmentVariables = {
    googleClientId: 'test-client-id',
    googleClientSecret: 'test-client-secret',
    googleRedirectUri: 'http://localhost:3001/auth/google/callback',
  };

  const mockDriveAPI = {
    files: {
      create: vi.fn(),
      get: vi.fn(),
    },
    permissions: {
      create: vi.fn(),
    },
    about: {
      get: vi.fn(),
    },
  };

  const mockOAuth2Client = {
    setCredentials: vi.fn(),
    refreshAccessToken: vi.fn(),
  };

  const mockLogger = {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  };

  beforeEach(async () => {
    const mockTokenService = {
      getValidTokenForUser: vi.fn(),
      updateToken: vi.fn(),
    };

    const mockEnvironmentVariableUtil = {
      getVariables: vi.fn(),
    };

    const mockLoggerUtil = {
      createLogger: vi.fn(),
    };

    // Mock Google OAuth2 and Drive API
    mockGoogle.auth.OAuth2 = vi.fn().mockImplementation(() => mockOAuth2Client);
    mockGoogle.drive = vi.fn().mockReturnValue(mockDriveAPI);

    // Mock environment variables
    mockEnvironmentVariableUtil.getVariables.mockReturnValue(
      mockEnvironmentVariables,
    );

    // Mock logger utility
    mockLoggerUtil.createLogger.mockReturnValue(mockLogger);

    // Mock DriveUtils methods
    MockDriveUtils.validateUploadParams.mockImplementation(() => {});
    MockDriveUtils.validateFolderName.mockImplementation(() => {});
    MockDriveUtils.createFileMetadata.mockReturnValue({
      name: 'test-file.txt',
    });
    MockDriveUtils.createFolderMetadata.mockReturnValue({
      name: 'test-folder',
      mimeType: 'application/vnd.google-apps.folder',
    });
    MockDriveUtils.mapFileMetadataResponse.mockImplementation(
      (data: {
        id?: string | null;
        name?: string | null;
        mimeType?: string | null;
        size?: string | null;
        webViewLink?: string | null;
        webContentLink?: string | null;
        parents?: string[] | null;
        createdTime?: string | null;
        modifiedTime?: string | null;
      }) => ({
        id: data.id!,
        name: data.name!,
        mimeType: data.mimeType!,
        size: data.size ? parseInt(data.size, 10) : undefined,
        webViewLink: data.webViewLink || undefined,
        webContentLink: data.webContentLink || undefined,
        parents: data.parents || undefined,
        createdTime: data.createdTime!,
        modifiedTime: data.modifiedTime!,
      }),
    );
    MockDriveUtils.mapDriveApiError.mockReturnValue({
      code: 500,
      message: 'Unknown error',
    });
    MockDriveUtils.shouldRetryError.mockReturnValue(false);
    MockDriveUtils.calculateRetryDelay.mockReturnValue(1000);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DriveService,
        {
          provide: TokenService,
          useValue: mockTokenService,
        },
        {
          provide: EnvironmentVariableUtil,
          useValue: mockEnvironmentVariableUtil,
        },
        {
          provide: LoggerUtil,
          useValue: mockLoggerUtil,
        },
      ],
    }).compile();

    service = module.get<DriveService>(DriveService);
    tokenService = module.get(TokenService);
    environmentVariableUtil = module.get(EnvironmentVariableUtil);
    _loggerUtil = module.get(LoggerUtil);

    // Mock logger to avoid console output in tests
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize OAuth2 client with environment variables', () => {
      expect(environmentVariableUtil.getVariables).toHaveBeenCalled();
      expect(mockGoogle.auth.OAuth2).toHaveBeenCalledWith(
        mockEnvironmentVariables.googleClientId,
        mockEnvironmentVariables.googleClientSecret,
        mockEnvironmentVariables.googleRedirectUri,
      );
    });
  });

  describe('uploadFile', () => {
    const mockUploadParams = {
      userId: 'user-1',
      fileName: 'test-file.txt',
      mimeType: 'text/plain',
      fileBuffer: Buffer.from('test content'),
      parentFolderId: 'parent-folder-id',
      description: 'Test file description',
    };

    it('should upload file successfully', async () => {
      tokenService.getValidTokenForUser.mockResolvedValue(mockTokens);
      mockDriveAPI.files.create.mockResolvedValue({
        data: {
          id: 'file-id-123',
          name: 'test-file.txt',
          webViewLink: 'https://drive.google.com/file/d/file-id-123/view',
        },
      });

      const result = await service.uploadFile(mockUploadParams);

      expect(tokenService.getValidTokenForUser).toHaveBeenCalledWith('user-1');
      expect(mockOAuth2Client.setCredentials).toHaveBeenCalledWith({
        access_token: mockTokens.accessToken,
        refresh_token: mockTokens.refreshToken,
      });
      expect(MockDriveUtils.validateUploadParams).toHaveBeenCalledWith(
        expect.objectContaining({
          fileName: mockUploadParams.fileName,
          mimeType: mockUploadParams.mimeType,
          fileSize: mockUploadParams.fileBuffer.length,
        }),
      );
      expect(MockDriveUtils.createFileMetadata).toHaveBeenCalledWith({
        name: mockUploadParams.fileName,
        parents: [mockUploadParams.parentFolderId],
        description: mockUploadParams.description,
      });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const createCallArgs = mockDriveAPI.files.create.mock.calls[0][0];
      expect(createCallArgs).toEqual(
        expect.objectContaining({
          requestBody: { name: 'test-file.txt' },
          fields: 'id,name,webViewLink',
        }),
      );
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(createCallArgs.media).toEqual(
        expect.objectContaining({
          mimeType: mockUploadParams.mimeType,
        }),
      );
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(createCallArgs.media.body).toBeDefined();
      expect(result).toEqual({
        success: true,
        fileId: 'file-id-123',
        fileName: 'test-file.txt',
        webViewLink: 'https://drive.google.com/file/d/file-id-123/view',
      });
    });

    it('should throw UnauthorizedException when user has no valid tokens', async () => {
      tokenService.getValidTokenForUser.mockResolvedValue(null);

      await expect(service.uploadFile(mockUploadParams)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should handle validation errors from DriveUtils', async () => {
      MockDriveUtils.validateUploadParams.mockImplementation(() => {
        throw new BadRequestException('Invalid file parameters');
      });

      await expect(service.uploadFile(mockUploadParams)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle Drive API 403 error', async () => {
      tokenService.getValidTokenForUser.mockResolvedValue(mockTokens);
      mockDriveAPI.files.create.mockRejectedValue({ code: 403 });
      MockDriveUtils.mapDriveApiError.mockReturnValue({
        code: 403,
        message: 'Insufficient permissions',
      });

      await expect(service.uploadFile(mockUploadParams)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should handle Drive API 429 error', async () => {
      tokenService.getValidTokenForUser.mockResolvedValue(mockTokens);
      mockDriveAPI.files.create.mockRejectedValue({ code: 429 });
      MockDriveUtils.mapDriveApiError.mockReturnValue({
        code: 429,
        message: 'Rate limit exceeded',
      });

      await expect(service.uploadFile(mockUploadParams)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should return error response for generic API errors', async () => {
      tokenService.getValidTokenForUser.mockResolvedValue(mockTokens);
      mockDriveAPI.files.create.mockRejectedValue(
        new Error('Generic Drive error'),
      );

      const result = await service.uploadFile(mockUploadParams);

      expect(result).toEqual({
        success: false,
        error: 'Generic Drive error',
      });
    });
  });

  describe('createFolder', () => {
    const mockFolderParams = {
      userId: 'user-1',
      folderName: 'Test Folder',
      parentFolderId: 'parent-folder-id',
    };

    it('should create folder successfully', async () => {
      tokenService.getValidTokenForUser.mockResolvedValue(mockTokens);
      mockDriveAPI.files.create.mockResolvedValue({
        data: {
          id: 'folder-id-123',
          name: 'Test Folder',
          webViewLink: 'https://drive.google.com/drive/folders/folder-id-123',
        },
      });

      const result = await service.createFolder(mockFolderParams);

      expect(tokenService.getValidTokenForUser).toHaveBeenCalledWith('user-1');
      expect(MockDriveUtils.validateFolderName).toHaveBeenCalledWith(
        mockFolderParams.folderName,
      );
      expect(MockDriveUtils.createFolderMetadata).toHaveBeenCalledWith({
        name: mockFolderParams.folderName,
        parents: [mockFolderParams.parentFolderId],
      });
      expect(result).toEqual({
        success: true,
        folderId: 'folder-id-123',
        folderName: 'Test Folder',
        webViewLink: 'https://drive.google.com/drive/folders/folder-id-123',
      });
    });

    it('should throw UnauthorizedException when user has no valid tokens', async () => {
      tokenService.getValidTokenForUser.mockResolvedValue(null);

      await expect(service.createFolder(mockFolderParams)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should handle validation errors from DriveUtils', async () => {
      MockDriveUtils.validateFolderName.mockImplementation(() => {
        throw new BadRequestException('Invalid folder name');
      });

      await expect(service.createFolder(mockFolderParams)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getFileMetadata', () => {
    const mockMetadataParams = {
      userId: 'user-1',
      fileId: 'file-id-123',
    };

    it('should get file metadata successfully', async () => {
      tokenService.getValidTokenForUser.mockResolvedValue(mockTokens);
      mockDriveAPI.files.get.mockResolvedValue({
        data: {
          id: 'file-id-123',
          name: 'test-file.txt',
          mimeType: 'text/plain',
          size: '1024',
          webViewLink: 'https://drive.google.com/file/d/file-id-123/view',
          webContentLink:
            'https://drive.google.com/uc?id=file-id-123&export=download',
          parents: ['parent-folder-id'],
          createdTime: '2023-01-01T00:00:00.000Z',
          modifiedTime: '2023-01-02T00:00:00.000Z',
        },
      });

      const result = await service.getFileMetadata(mockMetadataParams);

      expect(tokenService.getValidTokenForUser).toHaveBeenCalledWith('user-1');
      expect(mockDriveAPI.files.get).toHaveBeenCalledWith({
        fileId: 'file-id-123',
        fields:
          'id,name,mimeType,size,parents,createdTime,modifiedTime,webViewLink,webContentLink',
      });
      expect(result).toEqual({
        id: 'file-id-123',
        name: 'test-file.txt',
        mimeType: 'text/plain',
        size: 1024,
        webViewLink: 'https://drive.google.com/file/d/file-id-123/view',
        webContentLink:
          'https://drive.google.com/uc?id=file-id-123&export=download',
        parents: ['parent-folder-id'],
        createdTime: '2023-01-01T00:00:00.000Z',
        modifiedTime: '2023-01-02T00:00:00.000Z',
      });
    });

    it('should throw UnauthorizedException when user has no valid tokens', async () => {
      tokenService.getValidTokenForUser.mockResolvedValue(null);

      await expect(service.getFileMetadata(mockMetadataParams)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw BadRequestException when file not found', async () => {
      tokenService.getValidTokenForUser.mockResolvedValue(mockTokens);
      mockDriveAPI.files.get.mockResolvedValue({ data: null });

      await expect(service.getFileMetadata(mockMetadataParams)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('updateFilePermissions', () => {
    const mockPermissionParams = {
      userId: 'user-1',
      fileId: 'file-id-123',
      permissionType: 'anyone' as const,
      role: 'reader' as const,
      emailAddress: 'user@example.com',
    };

    it('should update file permissions successfully', async () => {
      tokenService.getValidTokenForUser.mockResolvedValue(mockTokens);
      mockDriveAPI.permissions.create.mockResolvedValue({
        data: { id: 'permission-id-123' },
      });

      const result = await service.updateFilePermissions(mockPermissionParams);

      expect(tokenService.getValidTokenForUser).toHaveBeenCalledWith('user-1');
      expect(mockDriveAPI.permissions.create).toHaveBeenCalledWith({
        fileId: 'file-id-123',
        requestBody: {
          type: 'anyone',
          role: 'reader',
          emailAddress: 'user@example.com',
        },
        fields: 'id',
      });
      expect(result).toEqual({
        success: true,
        fileId: 'file-id-123',
        permissionId: 'permission-id-123',
      });
    });

    it('should throw UnauthorizedException when user has no valid tokens', async () => {
      tokenService.getValidTokenForUser.mockResolvedValue(null);

      await expect(
        service.updateFilePermissions(mockPermissionParams),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException for generic API errors', async () => {
      tokenService.getValidTokenForUser.mockResolvedValue(mockTokens);
      mockDriveAPI.permissions.create.mockRejectedValue(
        new Error('Permission update failed'),
      );
      MockDriveUtils.mapDriveApiError.mockReturnValue({
        code: 400,
        message: 'Permission update failed',
      });

      await expect(
        service.updateFilePermissions(mockPermissionParams),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('refreshUserToken', () => {
    it('should refresh user token successfully', async () => {
      const mockCredentials = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expiry_date: Date.now() + 3600000,
      };

      tokenService.getValidTokenForUser.mockResolvedValue(mockTokens);
      mockOAuth2Client.refreshAccessToken.mockResolvedValue({
        credentials: mockCredentials,
      });
      tokenService.updateToken.mockResolvedValue({});

      const result = await service.refreshUserToken('user-1');

      expect(tokenService.getValidTokenForUser).toHaveBeenCalledWith('user-1');
      expect(mockOAuth2Client.setCredentials).toHaveBeenCalledWith({
        access_token: mockTokens.accessToken,
        refresh_token: mockTokens.refreshToken,
      });
      expect(mockOAuth2Client.refreshAccessToken).toHaveBeenCalled();
      expect(tokenService.updateToken).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          provider: 'google',
          accessToken: mockCredentials.access_token,
          refreshToken: mockCredentials.refresh_token,
          expiresAt: new Date(mockCredentials.expiry_date),
          scope: 'https://www.googleapis.com/auth/drive.file',
        }),
      );
      expect(result).toBe(true);
    });

    it('should return false when user has no valid tokens', async () => {
      tokenService.getValidTokenForUser.mockResolvedValue(null);

      const result = await service.refreshUserToken('user-1');

      expect(result).toBe(false);
    });

    it('should return false when token refresh fails', async () => {
      tokenService.getValidTokenForUser.mockResolvedValue(mockTokens);
      mockOAuth2Client.refreshAccessToken.mockRejectedValue(
        new Error('Refresh failed'),
      );

      const result = await service.refreshUserToken('user-1');

      expect(result).toBe(false);
    });

    it('should return false when refreshed credentials are incomplete', async () => {
      tokenService.getValidTokenForUser.mockResolvedValue(mockTokens);
      mockOAuth2Client.refreshAccessToken.mockResolvedValue({
        credentials: { access_token: null },
      });

      const result = await service.refreshUserToken('user-1');

      expect(result).toBe(false);
    });

    it('should use original refresh token when new one not provided', async () => {
      const mockCredentials = {
        access_token: 'new-access-token',
        refresh_token: null,
        expiry_date: Date.now() + 3600000,
      };

      tokenService.getValidTokenForUser.mockResolvedValue(mockTokens);
      mockOAuth2Client.refreshAccessToken.mockResolvedValue({
        credentials: mockCredentials,
      });
      tokenService.updateToken.mockResolvedValue({});

      await service.refreshUserToken('user-1');

      expect(tokenService.updateToken).toHaveBeenCalledWith(
        expect.objectContaining({
          refreshToken: mockTokens.refreshToken,
        }),
      );
    });
  });

  describe('checkDriveAccess', () => {
    it('should return true when Drive access is valid', async () => {
      tokenService.getValidTokenForUser.mockResolvedValue(mockTokens);
      mockDriveAPI.about.get.mockResolvedValue({
        data: {
          user: { emailAddress: 'user@example.com' },
        },
      });

      const result = await service.checkDriveAccess('user-1');

      expect(tokenService.getValidTokenForUser).toHaveBeenCalledWith('user-1');
      expect(mockOAuth2Client.setCredentials).toHaveBeenCalledWith({
        access_token: mockTokens.accessToken,
        refresh_token: mockTokens.refreshToken,
      });
      expect(mockDriveAPI.about.get).toHaveBeenCalledWith({
        fields: 'user',
      });
      expect(result).toEqual({
        hasAccess: true,
        email: 'user@example.com',
      });
    });

    it('should return false when user has no valid tokens', async () => {
      tokenService.getValidTokenForUser.mockResolvedValue(null);

      const result = await service.checkDriveAccess('user-1');

      expect(result).toEqual({
        hasAccess: false,
        error: 'No valid tokens found. Please re-authenticate.',
      });
    });

    it('should try to refresh token on 401 error', async () => {
      tokenService.getValidTokenForUser.mockResolvedValue(mockTokens);
      mockDriveAPI.about.get
        .mockRejectedValueOnce({ code: 401 })
        .mockResolvedValueOnce({
          data: { user: { emailAddress: 'user@example.com' } },
        });
      MockDriveUtils.mapDriveApiError.mockReturnValue({
        code: 401,
        message: 'Unauthorized',
      });
      const refreshTokenSpy = vi
        .spyOn(service, 'refreshUserToken')
        .mockResolvedValue(true);

      const result = await service.checkDriveAccess('user-1');

      expect(refreshTokenSpy).toHaveBeenCalledWith('user-1');
      expect(result).toEqual({
        hasAccess: true,
        email: 'user@example.com',
      });
    });

    it('should return false for non-401 API errors', async () => {
      tokenService.getValidTokenForUser.mockResolvedValue(mockTokens);
      mockDriveAPI.about.get.mockRejectedValue({ code: 403 });
      MockDriveUtils.mapDriveApiError.mockReturnValue({
        code: 403,
        message: 'Forbidden',
      });

      const result = await service.checkDriveAccess('user-1');

      expect(result).toEqual({
        hasAccess: false,
        error: 'Drive access check failed',
      });
    });

    it('should return false when token refresh fails on 401 error', async () => {
      tokenService.getValidTokenForUser.mockResolvedValue(mockTokens);
      mockDriveAPI.about.get.mockRejectedValue({ code: 401 });
      MockDriveUtils.mapDriveApiError.mockReturnValue({
        code: 401,
        message: 'Unauthorized',
      });
      const _refreshTokenSpy = vi
        .spyOn(service, 'refreshUserToken')
        .mockResolvedValue(false);

      const result = await service.checkDriveAccess('user-1');

      expect(result).toEqual({
        hasAccess: false,
        error: 'Token expired and refresh failed. Please re-authenticate.',
      });
    });
  });

  describe('executeWithRetry', () => {
    it('should execute operation successfully without retry', async () => {
      const mockOperation = vi.fn().mockResolvedValue('success');

      // Access private method through bracket notation
      const result = await service['executeWithRetry'](mockOperation);

      expect(mockOperation).toHaveBeenCalledTimes(1);
      expect(result).toBe('success');
    });

    it('should retry on retryable errors', async () => {
      MockDriveUtils.shouldRetryError.mockReturnValue(true);
      MockDriveUtils.calculateRetryDelay.mockReturnValue(10); // Short delay for testing

      const mockOperation = vi
        .fn()
        .mockRejectedValueOnce(new Error('Retryable error'))
        .mockResolvedValueOnce('success');

      const result = await service['executeWithRetry'](mockOperation, 2);

      expect(mockOperation).toHaveBeenCalledTimes(2);
      expect(MockDriveUtils.shouldRetryError).toHaveBeenCalledWith(
        expect.any(Error),
      );
      expect(result).toBe('success');
    });

    it('should not retry on non-retryable errors', async () => {
      MockDriveUtils.shouldRetryError.mockReturnValue(false);
      const mockOperation = vi.fn().mockRejectedValue(new Error('Fatal error'));

      await expect(
        service['executeWithRetry'](mockOperation, 2),
      ).rejects.toThrow('Fatal error');

      expect(mockOperation).toHaveBeenCalledTimes(1);
      expect(MockDriveUtils.shouldRetryError).toHaveBeenCalledWith(
        expect.any(Error),
      );
    });

    it('should throw last error after max retries exceeded', async () => {
      MockDriveUtils.shouldRetryError.mockReturnValue(true);
      MockDriveUtils.calculateRetryDelay.mockReturnValue(10);

      const mockOperation = vi
        .fn()
        .mockRejectedValue(new Error('Persistent error'));

      await expect(
        service['executeWithRetry'](mockOperation, 2),
      ).rejects.toThrow('Persistent error');

      expect(mockOperation).toHaveBeenCalledTimes(2);
    });
  });

  describe('handleDriveApiError', () => {
    it('should throw UnauthorizedException for 401 errors', () => {
      MockDriveUtils.mapDriveApiError.mockReturnValue({
        code: 401,
        message: 'Unauthorized',
      });

      expect(() => {
        service['handleDriveApiError'](new Error('401 error'));
      }).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for 403 errors', () => {
      MockDriveUtils.mapDriveApiError.mockReturnValue({
        code: 403,
        message: 'Forbidden',
      });

      expect(() => {
        service['handleDriveApiError'](new Error('403 error'));
      }).toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException for 404 errors', () => {
      MockDriveUtils.mapDriveApiError.mockReturnValue({
        code: 404,
        message: 'Not found',
      });

      expect(() => {
        service['handleDriveApiError'](new Error('404 error'));
      }).toThrow(BadRequestException);
    });

    it('should throw InternalServerErrorException for 429 errors', () => {
      MockDriveUtils.mapDriveApiError.mockReturnValue({
        code: 429,
        message: 'Rate limit exceeded',
      });

      expect(() => {
        service['handleDriveApiError'](new Error('429 error'));
      }).toThrow(InternalServerErrorException);
    });

    it('should throw InternalServerErrorException for 5xx errors', () => {
      MockDriveUtils.mapDriveApiError.mockReturnValue({
        code: 500,
        message: 'Internal server error',
      });

      expect(() => {
        service['handleDriveApiError'](new Error('500 error'));
      }).toThrow(InternalServerErrorException);
    });

    it('should throw BadRequestException for other errors', () => {
      MockDriveUtils.mapDriveApiError.mockReturnValue({
        code: 400,
        message: 'Bad request',
      });

      expect(() => {
        service['handleDriveApiError'](new Error('400 error'));
      }).toThrow(BadRequestException);
    });
  });
});
