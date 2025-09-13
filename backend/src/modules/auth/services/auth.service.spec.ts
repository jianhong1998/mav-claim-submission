/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { UnauthorizedException } from '@nestjs/common';
import {
  vi,
  describe,
  it,
  expect,
  beforeEach,
  Mock,
  MockInstance,
} from 'vitest';
import * as jwt from 'jsonwebtoken';
import { google } from 'googleapis';
import { AuthService, GoogleProfile, GoogleTokens } from './auth.service';
import { JWTPayload, TokenService } from './token.service';
import { UserDBUtil } from 'src/modules/user/utils/user-db.util';
import { TokenDBUtil } from '../utils/token-db.util';
import { type EncryptedToken } from '../utils/token-encryption.util';
import { UserEntity } from 'src/modules/user/entities/user.entity';
import { OAuthTokenEntity } from '../entities/oauth-token.entity';

// Mock Google APIs
vi.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: vi.fn(),
    },
  },
}));

// Mock JWT
vi.mock('jsonwebtoken', () => ({
  sign: vi.fn(),
  verify: vi.fn(),
}));

describe('AuthService', () => {
  let authService: AuthService;
  let mockUserDBUtil: {
    getOne: Mock;
    create: Mock;
  };
  let mockTokenDBUtil: {
    getOne: Mock;
    create: Mock;
    delete: Mock;
    hardDelete: Mock;
    getDecryptedTokens: Mock;
    findByUserIdWithDecryptedTokens: Mock;
  };
  let mockTokenService: {
    generateJWT: Mock;
    validateJWT: Mock;
  };
  let mockOAuth2Client: {
    setCredentials: Mock;
    refreshAccessToken: Mock;
  };

  const mockGoogleProfile: GoogleProfile = {
    id: 'google-123',
    emails: [{ value: 'test@mavericks-consulting.com', verified: true }],
    name: { familyName: 'Doe', givenName: 'John' },
    photos: [{ value: 'https://example.com/photo.jpg' }],
  };

  const mockGoogleTokens: GoogleTokens = {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
    scope: 'profile email gmail.send drive.file',
  };

  const mockUserEntity: UserEntity = {
    id: 'user-123',
    email: 'test@mavericks-consulting.com',
    name: 'John Doe',
    picture: 'https://example.com/photo.jpg',
    googleId: 'google-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as UserEntity;

  const mockEncryptedAccessToken: EncryptedToken = {
    data: 'encrypted-access-token-data',
    iv: 'mock-iv-123',
    salt: 'mock-salt-456',
  };

  const mockEncryptedRefreshToken: EncryptedToken = {
    data: 'encrypted-refresh-token-data',
    iv: 'mock-iv-789',
    salt: 'mock-salt-abc',
  };

  const mockOAuthTokenEntity = {
    id: 'token-123',
    userId: 'user-123',
    provider: 'google',
    accessToken: mockEncryptedAccessToken,
    refreshToken: mockEncryptedRefreshToken,
    expiresAt: new Date(Date.now() + 3600 * 1000),
    scope: 'profile email gmail.send drive.file',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  } as OAuthTokenEntity;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Setup utility mocks
    mockUserDBUtil = {
      getOne: vi.fn(),
      create: vi.fn(),
    };

    mockTokenDBUtil = {
      getOne: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      hardDelete: vi.fn(),
      getDecryptedTokens: vi.fn().mockResolvedValue({
        accessToken: 'decrypted-access-token',
        refreshToken: 'decrypted-refresh-token',
      }),
      findByUserIdWithDecryptedTokens: vi.fn(),
    };

    mockTokenService = {
      generateJWT: vi.fn().mockReturnValue('mock-jwt-token'),
      validateJWT: vi.fn(),
    };

    // Setup OAuth2Client mock
    mockOAuth2Client = {
      setCredentials: vi.fn(),
      refreshAccessToken: vi.fn(),
    };

    (google.auth.OAuth2 as unknown as MockInstance).mockImplementation(
      () => mockOAuth2Client,
    );

    // Setup JWT mocks
    (jwt.sign as Mock).mockReturnValue('mock-jwt-token');
    (jwt.verify as Mock).mockReturnValue({
      userId: 'user-123',
      email: 'test@mavericks-consulting.com',
    } as JWTPayload);

    // Instantiate AuthService directly with mocked dependencies
    authService = new AuthService(
      mockUserDBUtil as unknown as UserDBUtil,
      mockTokenDBUtil as unknown as TokenDBUtil,
      mockTokenService as unknown as TokenService,
    );

    // Mock logger to avoid console output during tests
    vi.spyOn(authService['logger'], 'log').mockImplementation(() => {});
    vi.spyOn(authService['logger'], 'warn').mockImplementation(() => {});
    vi.spyOn(authService['logger'], 'error').mockImplementation(() => {});
    vi.spyOn(authService['logger'], 'debug').mockImplementation(() => {});
  });

  describe('handleOAuthCallback', () => {
    describe('OAuth Token Handling - Requirement 2.1', () => {
      it('should handle OAuth callback with valid Google profile for existing user', async () => {
        mockUserDBUtil.getOne.mockResolvedValue(mockUserEntity);
        mockTokenDBUtil.delete.mockResolvedValue([]);
        mockTokenDBUtil.create.mockResolvedValue(mockOAuthTokenEntity);

        const result = await authService.handleOAuthCallback(
          mockGoogleProfile,
          mockGoogleTokens,
        );

        expect(mockUserDBUtil.getOne).toHaveBeenCalledWith({
          criteria: { email: 'test@mavericks-consulting.com' },
        });
        expect(mockTokenDBUtil.hardDelete).toHaveBeenCalledWith({
          criteria: { userId: 'user-123', provider: 'google' },
        });
        expect(mockTokenDBUtil.create).toHaveBeenCalledWith({
          creationData: {
            userId: 'user-123',
            provider: 'google',
            accessToken: 'mock-access-token',
            refreshToken: 'mock-refresh-token',
            expiresAt: expect.any(Date),
            scope: 'profile email gmail.send drive.file',
          },
        });
        expect(mockTokenService.generateJWT).toHaveBeenCalledWith(
          mockUserEntity,
        );
        expect(result).toEqual({
          user: mockUserEntity,
          jwt: 'mock-jwt-token',
        });
      });

      it('should create new user when user does not exist', async () => {
        mockUserDBUtil.getOne.mockResolvedValue(null);
        mockUserDBUtil.create.mockResolvedValue(mockUserEntity);
        mockTokenDBUtil.delete.mockResolvedValue([]);
        mockTokenDBUtil.create.mockResolvedValue(mockOAuthTokenEntity);

        const result = await authService.handleOAuthCallback(
          mockGoogleProfile,
          mockGoogleTokens,
        );

        expect(mockUserDBUtil.create).toHaveBeenCalledWith({
          creationData: {
            email: 'test@mavericks-consulting.com',
            name: 'John Doe',
            picture: 'https://example.com/photo.jpg',
            googleId: 'google-123',
          },
        });
        expect(result.user).toEqual(mockUserEntity);
      });

      it('should handle profile without picture', async () => {
        const profileWithoutPhoto: GoogleProfile = {
          ...mockGoogleProfile,
          photos: [],
        };
        mockUserDBUtil.getOne.mockResolvedValue(null);
        mockUserDBUtil.create.mockResolvedValue({
          ...mockUserEntity,
          picture: null,
        });
        mockTokenDBUtil.delete.mockResolvedValue([]);
        mockTokenDBUtil.create.mockResolvedValue(mockOAuthTokenEntity);

        await authService.handleOAuthCallback(
          profileWithoutPhoto,
          mockGoogleTokens,
        );

        expect(mockUserDBUtil.create).toHaveBeenCalledWith({
          creationData: {
            email: 'test@mavericks-consulting.com',
            name: 'John Doe',
            picture: undefined,
            googleId: 'google-123',
          },
        });
      });

      it('should throw UnauthorizedException when no email in profile', async () => {
        const profileWithoutEmail: GoogleProfile = {
          ...mockGoogleProfile,
          emails: [],
        };

        await expect(
          authService.handleOAuthCallback(
            profileWithoutEmail,
            mockGoogleTokens,
          ),
        ).rejects.toThrow(UnauthorizedException);
      });

      it('should throw UnauthorizedException for non-Mavericks domain', async () => {
        const profileWithWrongDomain: GoogleProfile = {
          ...mockGoogleProfile,
          emails: [{ value: 'test@gmail.com', verified: true }],
        };

        await expect(
          authService.handleOAuthCallback(
            profileWithWrongDomain,
            mockGoogleTokens,
          ),
        ).rejects.toThrow(
          'Access denied: Only @mavericks-consulting.com accounts are allowed',
        );
      });

      it('should handle database errors gracefully', async () => {
        mockUserDBUtil.getOne.mockRejectedValue(new Error('Database error'));

        await expect(
          authService.handleOAuthCallback(mockGoogleProfile, mockGoogleTokens),
        ).rejects.toThrow('Database error');
      });
    });
  });

  describe('validateSession', () => {
    describe('Session Validation - Requirement 2.1', () => {
      it('should validate session with valid JWT token', async () => {
        mockTokenService.validateJWT.mockResolvedValue(mockUserEntity);

        const result = await authService.validateSession('valid-jwt-token');

        expect(mockTokenService.validateJWT).toHaveBeenCalledWith(
          'valid-jwt-token',
        );
        expect(result).toEqual(mockUserEntity);
      });

      it('should return null for invalid JWT token', async () => {
        mockTokenService.validateJWT.mockResolvedValue(null);

        const result = await authService.validateSession('invalid-jwt-token');

        expect(mockTokenService.validateJWT).toHaveBeenCalledWith(
          'invalid-jwt-token',
        );
        expect(result).toBeNull();
      });

      it('should return null when JWT payload lacks userId', async () => {
        mockTokenService.validateJWT.mockResolvedValue(null);

        const result = await authService.validateSession('jwt-without-userid');

        expect(mockTokenService.validateJWT).toHaveBeenCalledWith(
          'jwt-without-userid',
        );
        expect(result).toBeNull();
      });

      it('should return null when user not found in database', async () => {
        mockTokenService.validateJWT.mockResolvedValue(null);

        const result = await authService.validateSession('valid-jwt-token');

        expect(mockTokenService.validateJWT).toHaveBeenCalledWith(
          'valid-jwt-token',
        );
        expect(result).toBeNull();
      });

      it('should handle expired JWT tokens', async () => {
        mockTokenService.validateJWT.mockResolvedValue(null);

        const result = await authService.validateSession('expired-jwt-token');

        expect(mockTokenService.validateJWT).toHaveBeenCalledWith(
          'expired-jwt-token',
        );
        expect(result).toBeNull();
      });
    });
  });

  describe('refreshTokens', () => {
    describe('Token Lifecycle Management - Requirement 3.1', () => {
      it('should refresh expired access tokens successfully', async () => {
        const expiredTokenEntity = {
          ...mockOAuthTokenEntity,
          expiresAt: new Date(Date.now() - 1000), // Expired
        };

        mockTokenDBUtil.getOne.mockResolvedValue(expiredTokenEntity);
        mockOAuth2Client.refreshAccessToken.mockResolvedValue({
          credentials: {
            access_token: 'new-access-token',
            refresh_token: 'new-refresh-token',
            expiry_date: Date.now() + 3600 * 1000,
          },
        });
        mockTokenDBUtil.delete.mockResolvedValue([]);
        mockTokenDBUtil.create.mockResolvedValue(mockOAuthTokenEntity);

        const result = await authService.refreshTokens('user-123');

        expect(mockTokenDBUtil.getOne).toHaveBeenCalledWith({
          criteria: { userId: 'user-123', provider: 'google' },
        });
        expect(mockOAuth2Client.setCredentials).toHaveBeenCalledWith({
          refresh_token: 'decrypted-refresh-token',
        });
        expect(mockOAuth2Client.refreshAccessToken).toHaveBeenCalled();
        expect(mockTokenDBUtil.hardDelete).toHaveBeenCalledWith({
          criteria: { userId: 'user-123', provider: 'google' },
        });
        expect(mockTokenDBUtil.create).toHaveBeenCalledWith({
          creationData: {
            userId: 'user-123',
            provider: 'google',
            accessToken: 'new-access-token',
            refreshToken: 'new-refresh-token',
            expiresAt: expect.any(Date),
            scope: 'profile email gmail.send drive.file',
          },
        });
        expect(result).toBe(true);
      });

      it('should return true for non-expired tokens', async () => {
        mockTokenDBUtil.getOne.mockResolvedValue(mockOAuthTokenEntity);

        const result = await authService.refreshTokens('user-123');

        expect(mockOAuth2Client.refreshAccessToken).not.toHaveBeenCalled();
        expect(result).toBe(true);
      });

      it('should return false when no refresh token found', async () => {
        mockTokenDBUtil.getOne.mockResolvedValue(null);

        const result = await authService.refreshTokens('user-123');

        expect(result).toBe(false);
      });

      it('should return false when token entity has no refresh token', async () => {
        const tokenWithoutRefreshToken = {
          ...mockOAuthTokenEntity,
          refreshToken: null,
        };
        mockTokenDBUtil.getOne.mockResolvedValue(tokenWithoutRefreshToken);

        const result = await authService.refreshTokens('user-123');

        expect(result).toBe(false);
      });

      it('should handle OAuth refresh errors', async () => {
        const expiredTokenEntity = {
          ...mockOAuthTokenEntity,
          expiresAt: new Date(Date.now() - 1000),
        };
        mockTokenDBUtil.getOne.mockResolvedValue(expiredTokenEntity);
        mockOAuth2Client.refreshAccessToken.mockRejectedValue(
          new Error('OAuth refresh failed'),
        );

        const result = await authService.refreshTokens('user-123');

        expect(result).toBe(false);
      });

      it('should handle missing access_token in refresh response', async () => {
        const expiredTokenEntity = {
          ...mockOAuthTokenEntity,
          expiresAt: new Date(Date.now() - 1000),
        };
        mockTokenDBUtil.getOne.mockResolvedValue(expiredTokenEntity);
        mockOAuth2Client.refreshAccessToken.mockResolvedValue({
          credentials: {
            // No access_token
          },
        });

        const result = await authService.refreshTokens('user-123');

        expect(result).toBe(false);
      });

      it('should preserve existing refresh token when new one not provided', async () => {
        const expiredTokenEntity = {
          ...mockOAuthTokenEntity,
          expiresAt: new Date(Date.now() - 1000),
        };
        mockTokenDBUtil.getOne.mockResolvedValue(expiredTokenEntity);
        mockOAuth2Client.refreshAccessToken.mockResolvedValue({
          credentials: {
            access_token: 'new-access-token',
            // No refresh_token in response
            expiry_date: Date.now() + 3600 * 1000,
          },
        });
        mockTokenDBUtil.delete.mockResolvedValue([]);
        mockTokenDBUtil.create.mockResolvedValue(mockOAuthTokenEntity);

        const result = await authService.refreshTokens('user-123');

        expect(mockTokenDBUtil.create).toHaveBeenCalledWith({
          creationData: {
            userId: 'user-123',
            provider: 'google',
            accessToken: 'new-access-token',
            refreshToken: 'decrypted-refresh-token', // Preserved original refresh token
            expiresAt: expect.any(Date),
            scope: 'profile email gmail.send drive.file',
          },
        });
        expect(result).toBe(true);
      });
    });
  });

  describe('logout', () => {
    describe('Logout Functionality - Requirement 2.1', () => {
      it('should logout user and clean up tokens successfully', async () => {
        mockTokenDBUtil.delete.mockResolvedValue([mockOAuthTokenEntity]);

        await authService.logout('user-123');

        expect(mockTokenDBUtil.hardDelete).toHaveBeenCalledWith({
          criteria: { userId: 'user-123' },
        });
      });

      it('should handle logout errors gracefully', async () => {
        mockTokenDBUtil.hardDelete.mockRejectedValue(
          new Error('Database error'),
        );

        await expect(authService.logout('user-123')).rejects.toThrow(
          'Database error',
        );
      });

      it('should complete logout even when no tokens exist', async () => {
        mockTokenDBUtil.hardDelete.mockResolvedValue(null);

        await expect(authService.logout('user-123')).resolves.toBeUndefined();
      });
    });
  });

  describe('getUserTokens', () => {
    describe('Token Lifecycle Management - Requirement 3.1', () => {
      it('should return valid tokens when not expired', async () => {
        mockTokenDBUtil.getOne.mockResolvedValue(mockOAuthTokenEntity);

        const result = await authService.getUserTokens('user-123');

        expect(mockTokenDBUtil.getOne).toHaveBeenCalledWith({
          criteria: { userId: 'user-123', provider: 'google' },
        });
        expect(result).toEqual(mockOAuthTokenEntity);
      });

      it('should auto-refresh expired tokens and return updated tokens', async () => {
        const expiredTokenEntity = {
          ...mockOAuthTokenEntity,
          expiresAt: new Date(Date.now() - 1000),
        };

        const refreshedTokenEntity = {
          ...mockOAuthTokenEntity,
          accessToken: 'new-access-token',
        };

        mockTokenDBUtil.getOne
          .mockResolvedValueOnce(expiredTokenEntity) // First call in getUserTokens
          .mockResolvedValueOnce(expiredTokenEntity) // First call in refreshTokens
          .mockResolvedValueOnce(refreshedTokenEntity); // Second call in getUserTokens after refresh

        mockOAuth2Client.refreshAccessToken.mockResolvedValue({
          credentials: {
            access_token: 'new-access-token',
            refresh_token: 'new-refresh-token',
            expiry_date: Date.now() + 3600 * 1000,
          },
        });
        mockTokenDBUtil.delete.mockResolvedValue([]);
        mockTokenDBUtil.create.mockResolvedValue(refreshedTokenEntity);

        const result = await authService.getUserTokens('user-123');

        expect(mockTokenDBUtil.getOne).toHaveBeenCalledTimes(3);
        expect(result).toEqual(refreshedTokenEntity);
      });

      it('should return null when no tokens exist', async () => {
        mockTokenDBUtil.getOne.mockResolvedValue(null);

        const result = await authService.getUserTokens('user-123');

        expect(result).toBeNull();
      });

      it('should return null when refresh fails for expired tokens', async () => {
        const expiredTokenEntity = {
          ...mockOAuthTokenEntity,
          expiresAt: new Date(Date.now() - 1000),
        };

        mockTokenDBUtil.getOne.mockResolvedValue(expiredTokenEntity);
        mockOAuth2Client.refreshAccessToken.mockRejectedValue(
          new Error('Refresh failed'),
        );

        const result = await authService.getUserTokens('user-123');

        expect(result).toBeNull();
      });
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete OAuth flow correctly', async () => {
      // OAuth callback
      mockUserDBUtil.getOne.mockResolvedValue(null);
      mockUserDBUtil.create.mockResolvedValue(mockUserEntity);
      mockTokenDBUtil.delete.mockResolvedValue([]);
      mockTokenDBUtil.create.mockResolvedValue(mockOAuthTokenEntity);

      const oauthResult = await authService.handleOAuthCallback(
        mockGoogleProfile,
        mockGoogleTokens,
      );

      // Session validation
      mockTokenService.validateJWT.mockResolvedValue(mockUserEntity);
      const sessionResult = await authService.validateSession(oauthResult.jwt);

      // Logout
      mockTokenDBUtil.delete.mockResolvedValue([mockOAuthTokenEntity]);
      await authService.logout(mockUserEntity.id);

      expect(oauthResult.user.email).toBe('test@mavericks-consulting.com');
      expect(sessionResult?.id).toBe('user-123');
      expect(mockTokenDBUtil.hardDelete).toHaveBeenLastCalledWith({
        criteria: { userId: 'user-123' },
      });
    });

    it('should handle token refresh during getUserTokens call', async () => {
      const expiredTokenEntity = {
        ...mockOAuthTokenEntity,
        expiresAt: new Date(Date.now() - 1000),
      };

      const refreshedTokenEntity = {
        ...mockOAuthTokenEntity,
        accessToken: 'refreshed-access-token',
      };

      mockTokenDBUtil.getOne
        .mockResolvedValueOnce(expiredTokenEntity)
        .mockResolvedValueOnce(expiredTokenEntity) // First call in refreshTokens
        .mockResolvedValueOnce(refreshedTokenEntity); // Second call after refresh

      mockOAuth2Client.refreshAccessToken.mockResolvedValue({
        credentials: {
          access_token: 'refreshed-access-token',
          refresh_token: 'refreshed-refresh-token',
          expiry_date: Date.now() + 3600 * 1000,
        },
      });
      mockTokenDBUtil.delete.mockResolvedValue([]);
      mockTokenDBUtil.create.mockResolvedValue(refreshedTokenEntity);

      const result = await authService.getUserTokens('user-123');

      expect(result?.accessToken).toBe('refreshed-access-token');
      expect(mockOAuth2Client.refreshAccessToken).toHaveBeenCalled();
    });
  });
});
