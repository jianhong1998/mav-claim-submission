import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { AuthController } from '../../../auth/controllers/auth.controller';
import { UserEntity } from '../../../user/entities/user.entity';
import { OAuthTokenEntity } from '../../entities/oauth-token.entity';

/**
 * Google Drive Token Service Tests
 *
 * These tests cover the Google Drive token management functionality
 * implemented in AuthController.getDriveToken() method, testing
 * token validation, refresh logic, and error handling scenarios.
 */
describe('Google Drive Token Service', () => {
  let authController: AuthController;
  let mockAuthService: {
    getUserTokens: Mock;
    refreshTokens: Mock;
  };
  let mockTokenDBUtil: {
    getDecryptedTokens: Mock;
  };
  let mockLogger: {
    warn: Mock;
    log: Mock;
    error: Mock;
  };

  const mockUser: UserEntity = {
    id: 'user-123',
    googleId: 'google-123',
    email: 'test@mavericks-consulting.com',
    name: 'Test User',
    picture: 'https://example.com/picture.jpg',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as UserEntity;

  beforeEach(() => {
    mockAuthService = {
      getUserTokens: vi.fn(),
      refreshTokens: vi.fn(),
    };

    mockTokenDBUtil = {
      getDecryptedTokens: vi.fn(),
    };

    mockLogger = {
      warn: vi.fn(),
      log: vi.fn(),
      error: vi.fn(),
    };

    authController = new AuthController(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
      mockAuthService as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
      mockTokenDBUtil as any,
    );

    // Mock the logger - accessing private property for testing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    (authController as any).logger = mockLogger;
  });

  describe('getDriveToken', () => {
    it('should return valid token when user has valid Google Drive access', async () => {
      const mockTokenEntity: Partial<OAuthTokenEntity> = {
        id: 'token-123',
        userId: 'user-123',
        provider: 'google',
        scope: 'profile email gmail.send drive.file',
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockDecryptedTokens = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      };

      mockAuthService.getUserTokens.mockResolvedValue(mockTokenEntity);
      mockTokenDBUtil.getDecryptedTokens.mockResolvedValue(mockDecryptedTokens);

      const result = await authController.getDriveToken(mockUser);

      expect(result.success).toBe(true);
      expect(result.access_token).toBe('mock-access-token');
      expect(result.expires_in).toBeGreaterThan(0);
      expect(result.token_type).toBe('Bearer');
      expect(mockAuthService.getUserTokens).toHaveBeenCalledWith('user-123');
      expect(mockTokenDBUtil.getDecryptedTokens).toHaveBeenCalledWith(
        mockTokenEntity,
      );
    });

    it('should return error when no tokens found for user', async () => {
      mockAuthService.getUserTokens.mockResolvedValue(null);

      const result = await authController.getDriveToken(mockUser);

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'No valid Google Drive tokens found. Please re-authenticate with Google.',
      );
      expect(result.errorCode).toBe('TOKEN_NOT_FOUND');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'No valid Google Drive tokens found for user: user-123',
      );
    });

    it('should return error when user has insufficient scope', async () => {
      const mockTokenEntity: Partial<OAuthTokenEntity> = {
        id: 'token-123',
        userId: 'user-123',
        provider: 'google',
        scope: 'profile email', // Missing drive.file scope
        expiresAt: new Date(Date.now() + 3600000),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockAuthService.getUserTokens.mockResolvedValue(mockTokenEntity);

      const result = await authController.getDriveToken(mockUser);

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'Insufficient permissions. Google Drive access required. Please re-authenticate.',
      );
      expect(result.errorCode).toBe('INSUFFICIENT_SCOPE');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Insufficient Google Drive scope for user: user-123, scope: profile email',
      );
    });

    it('should refresh token when expiring soon and return new token', async () => {
      const expiringSoonTime = new Date(Date.now() + 240000); // 4 minutes from now
      const mockTokenEntity: Partial<OAuthTokenEntity> = {
        id: 'token-123',
        userId: 'user-123',
        provider: 'google',
        scope: 'profile email gmail.send drive.file',
        expiresAt: expiringSoonTime,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const refreshedTokenEntity: Partial<OAuthTokenEntity> = {
        ...mockTokenEntity,
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
      };

      const mockDecryptedTokens = {
        accessToken: 'refreshed-access-token',
        refreshToken: 'mock-refresh-token',
      };

      mockAuthService.getUserTokens
        .mockResolvedValueOnce(mockTokenEntity)
        .mockResolvedValueOnce(refreshedTokenEntity);
      mockAuthService.refreshTokens.mockResolvedValue(true);
      mockTokenDBUtil.getDecryptedTokens.mockResolvedValue(mockDecryptedTokens);

      const result = await authController.getDriveToken(mockUser);

      expect(result.success).toBe(true);
      expect(result.access_token).toBe('refreshed-access-token');
      expect(result.expires_in).toBeGreaterThan(3000); // Should be close to 1 hour
      expect(mockAuthService.refreshTokens).toHaveBeenCalledWith('user-123');
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Token expiring soon for user: user-123, attempting refresh',
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Drive token refreshed and retrieved successfully for user: user-123',
      );
    });

    it('should return error when token refresh fails', async () => {
      const expiringSoonTime = new Date(Date.now() + 240000); // 4 minutes from now
      const mockTokenEntity: Partial<OAuthTokenEntity> = {
        id: 'token-123',
        userId: 'user-123',
        provider: 'google',
        scope: 'profile email gmail.send drive.file',
        expiresAt: expiringSoonTime,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockAuthService.getUserTokens.mockResolvedValue(mockTokenEntity);
      mockAuthService.refreshTokens.mockResolvedValue(false);

      const result = await authController.getDriveToken(mockUser);

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'Access token expired and refresh failed. Please re-authenticate with Google.',
      );
      expect(result.errorCode).toBe('TOKEN_REFRESH_FAILED');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Token refresh failed for user: user-123',
      );
    });

    it('should return error when refreshed token cannot be retrieved', async () => {
      const expiringSoonTime = new Date(Date.now() + 240000);
      const mockTokenEntity: Partial<OAuthTokenEntity> = {
        id: 'token-123',
        userId: 'user-123',
        provider: 'google',
        scope: 'profile email gmail.send drive.file',
        expiresAt: expiringSoonTime,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockAuthService.getUserTokens
        .mockResolvedValueOnce(mockTokenEntity)
        .mockResolvedValueOnce(null); // Refreshed token not found
      mockAuthService.refreshTokens.mockResolvedValue(true);

      const result = await authController.getDriveToken(mockUser);

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'Token refresh succeeded but could not retrieve new token. Please try again.',
      );
      expect(result.errorCode).toBe('TOKEN_REFRESH_RETRIEVAL_FAILED');
    });

    it('should handle BadRequestException', async () => {
      const badRequestError = new BadRequestException('Invalid request');
      mockAuthService.getUserTokens.mockRejectedValue(badRequestError);

      const result = await authController.getDriveToken(mockUser);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid request');
      expect(result.errorCode).toBe('BAD_REQUEST');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to get Drive token for user user-123:',
        badRequestError,
      );
    });

    it('should handle timeout errors with service unavailable response', async () => {
      const timeoutError = new Error('Connection timeout');
      mockAuthService.getUserTokens.mockRejectedValue(timeoutError);

      const result = await authController.getDriveToken(mockUser);

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'Temporary service unavailable. Please try again in a moment.',
      );
      expect(result.errorCode).toBe('SERVICE_TEMPORARILY_UNAVAILABLE');
      expect(result.retryAfter).toBe(30);
    });

    it('should handle connection errors with service unavailable response', async () => {
      const connectionError = new Error('Database connection failed');
      mockAuthService.getUserTokens.mockRejectedValue(connectionError);

      const result = await authController.getDriveToken(mockUser);

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'Temporary service unavailable. Please try again in a moment.',
      );
      expect(result.errorCode).toBe('SERVICE_TEMPORARILY_UNAVAILABLE');
      expect(result.retryAfter).toBe(30);
    });

    it('should handle generic errors', async () => {
      const genericError = new Error('Something unexpected happened');
      mockAuthService.getUserTokens.mockRejectedValue(genericError);

      const result = await authController.getDriveToken(mockUser);

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'Unable to retrieve Google Drive access token. Please try again or re-authenticate.',
      );
      expect(result.errorCode).toBe('INTERNAL_ERROR');
    });

    it('should handle non-Error objects', async () => {
      const nonErrorObject = 'String error';
      mockAuthService.getUserTokens.mockRejectedValue(nonErrorObject);

      const result = await authController.getDriveToken(mockUser);

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'Unable to retrieve Google Drive access token. Please try again or re-authenticate.',
      );
      expect(result.errorCode).toBe('INTERNAL_ERROR');
    });

    it('should calculate correct expires_in for tokens', async () => {
      const futureTime = new Date(Date.now() + 1800000); // 30 minutes from now
      const mockTokenEntity: Partial<OAuthTokenEntity> = {
        id: 'token-123',
        userId: 'user-123',
        provider: 'google',
        scope: 'profile email gmail.send drive.file',
        expiresAt: futureTime,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockDecryptedTokens = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      };

      mockAuthService.getUserTokens.mockResolvedValue(mockTokenEntity);
      mockTokenDBUtil.getDecryptedTokens.mockResolvedValue(mockDecryptedTokens);

      const result = await authController.getDriveToken(mockUser);

      expect(result.success).toBe(true);
      expect(result.expires_in).toBeGreaterThan(1700); // Should be close to 30 minutes
      expect(result.expires_in).toBeLessThanOrEqual(1800);
    });

    it('should verify scope contains drive.file exactly', async () => {
      const mockTokenEntity: Partial<OAuthTokenEntity> = {
        id: 'token-123',
        userId: 'user-123',
        provider: 'google',
        scope: 'profile email gmail.send drive.readonly', // Missing drive.file
        expiresAt: new Date(Date.now() + 3600000),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockAuthService.getUserTokens.mockResolvedValue(mockTokenEntity);

      const result = await authController.getDriveToken(mockUser);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INSUFFICIENT_SCOPE');
    });

    it('should log successful token retrieval', async () => {
      const mockTokenEntity: Partial<OAuthTokenEntity> = {
        id: 'token-123',
        userId: 'user-123',
        provider: 'google',
        scope: 'profile email gmail.send drive.file',
        expiresAt: new Date(Date.now() + 3600000),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockDecryptedTokens = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      };

      mockAuthService.getUserTokens.mockResolvedValue(mockTokenEntity);
      mockTokenDBUtil.getDecryptedTokens.mockResolvedValue(mockDecryptedTokens);

      await authController.getDriveToken(mockUser);

      expect(mockLogger.log).toHaveBeenCalledWith(
        'Drive token retrieved successfully for user: user-123',
      );
    });
  });

  describe('edge cases and boundary conditions', () => {
    it('should handle token expiring at exactly 5 minutes', async () => {
      const lessThanFiveMinutes = new Date(Date.now() + 299999); // Just under 5 minutes
      const mockTokenEntity: Partial<OAuthTokenEntity> = {
        id: 'token-123',
        userId: 'user-123',
        provider: 'google',
        scope: 'profile email gmail.send drive.file',
        expiresAt: lessThanFiveMinutes,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const refreshedTokenEntity: Partial<OAuthTokenEntity> = {
        ...mockTokenEntity,
        expiresAt: new Date(Date.now() + 3600000),
      };

      const mockDecryptedTokens = {
        accessToken: 'refreshed-access-token',
        refreshToken: 'mock-refresh-token',
      };

      mockAuthService.getUserTokens
        .mockResolvedValueOnce(mockTokenEntity)
        .mockResolvedValueOnce(refreshedTokenEntity);
      mockAuthService.refreshTokens.mockResolvedValue(true);
      mockTokenDBUtil.getDecryptedTokens.mockResolvedValue(mockDecryptedTokens);

      const result = await authController.getDriveToken(mockUser);

      expect(result.success).toBe(true);
      expect(mockAuthService.refreshTokens).toHaveBeenCalled();
    });

    it('should not refresh token when expiring in more than 5 minutes', async () => {
      const moreThanFiveMinutes = new Date(Date.now() + 300001); // 5 minutes + 1ms
      const mockTokenEntity: Partial<OAuthTokenEntity> = {
        id: 'token-123',
        userId: 'user-123',
        provider: 'google',
        scope: 'profile email gmail.send drive.file',
        expiresAt: moreThanFiveMinutes,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockDecryptedTokens = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      };

      mockAuthService.getUserTokens.mockResolvedValue(mockTokenEntity);
      mockTokenDBUtil.getDecryptedTokens.mockResolvedValue(mockDecryptedTokens);

      const result = await authController.getDriveToken(mockUser);

      expect(result.success).toBe(true);
      expect(mockAuthService.refreshTokens).not.toHaveBeenCalled();
    });

    it('should handle empty scope string', async () => {
      const mockTokenEntity: Partial<OAuthTokenEntity> = {
        id: 'token-123',
        userId: 'user-123',
        provider: 'google',
        scope: '', // Empty scope
        expiresAt: new Date(Date.now() + 3600000),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockAuthService.getUserTokens.mockResolvedValue(mockTokenEntity);

      const result = await authController.getDriveToken(mockUser);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INSUFFICIENT_SCOPE');
    });

    it('should handle scope with partial match', async () => {
      const mockTokenEntity: Partial<OAuthTokenEntity> = {
        id: 'token-123',
        userId: 'user-123',
        provider: 'google',
        scope: 'profile email drive.fil', // Partial match should fail
        expiresAt: new Date(Date.now() + 3600000),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockAuthService.getUserTokens.mockResolvedValue(mockTokenEntity);

      const result = await authController.getDriveToken(mockUser);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INSUFFICIENT_SCOPE');
    });
  });

  describe('token decryption edge cases', () => {
    it('should handle token decryption failure', async () => {
      const mockTokenEntity: Partial<OAuthTokenEntity> = {
        id: 'token-123',
        userId: 'user-123',
        provider: 'google',
        scope: 'profile email gmail.send drive.file',
        expiresAt: new Date(Date.now() + 3600000),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockAuthService.getUserTokens.mockResolvedValue(mockTokenEntity);
      mockTokenDBUtil.getDecryptedTokens.mockRejectedValue(
        new Error('Decryption failed'),
      );

      const result = await authController.getDriveToken(mockUser);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INTERNAL_ERROR');
    });

    it('should handle missing decrypted access token', async () => {
      const mockTokenEntity: Partial<OAuthTokenEntity> = {
        id: 'token-123',
        userId: 'user-123',
        provider: 'google',
        scope: 'profile email gmail.send drive.file',
        expiresAt: new Date(Date.now() + 3600000),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockDecryptedTokens = {
        accessToken: '', // Empty access token
        refreshToken: 'mock-refresh-token',
      };

      mockAuthService.getUserTokens.mockResolvedValue(mockTokenEntity);
      mockTokenDBUtil.getDecryptedTokens.mockResolvedValue(mockDecryptedTokens);

      const result = await authController.getDriveToken(mockUser);

      expect(result.success).toBe(true);
      expect(result.access_token).toBe(''); // Should still return the empty token
    });
  });
});
