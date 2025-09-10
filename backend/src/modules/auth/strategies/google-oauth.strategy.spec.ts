/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { UnauthorizedException } from '@nestjs/common';
import { vi, describe, it, expect, beforeEach, Mock } from 'vitest';
import { Strategy } from 'passport-google-oauth20';
import { GoogleOAuthStrategy } from './google-oauth.strategy';
import { UserDBUtil } from 'src/modules/user/utils/user-db.util';
import { TokenDBUtil } from '../utils/token-db.util';
import { EnvironmentVariableUtil } from 'src/modules/common/utils/environment-variable.util';
import { UserEntity } from 'src/modules/user/entities/user.entity';
import { OAuthTokenEntity } from '../entities/oauth-token.entity';

// Mock the passport-google-oauth20 Strategy
vi.mock('passport-google-oauth20', () => ({
  Strategy: vi.fn(),
}));

// Mock the PassportStrategy
vi.mock('@nestjs/passport', () => ({
  PassportStrategy: vi
    .fn()
    .mockImplementation((strategy: any, _name: string) => {
      return class MockPassportStrategy {
        constructor(...args: any[]) {
          // Call the mocked Strategy constructor
          strategy(...args);
        }
      };
    }),
}));

interface GoogleProfile {
  id: string;
  emails: Array<{ value: string; verified: boolean }>;
  name: { familyName: string; givenName: string };
  photos: Array<{ value: string }>;
}

describe('GoogleOAuthStrategy', () => {
  let googleStrategy: GoogleOAuthStrategy;
  let mockUserDBUtil: {
    getOne: Mock;
    create: Mock;
  };
  let mockTokenDBUtil: {
    getOne: Mock;
    create: Mock;
    delete: Mock;
  };
  let mockEnvironmentVariableUtil: {
    getVariables: Mock;
  };
  let mockDone: Mock;
  let mockStrategyConstructor: Mock;

  const mockEnvironmentVariables = {
    googleClientId: 'test-client-id',
    googleClientSecret: 'test-client-secret',
    googleRedirectUri: 'http://localhost:3001/auth/google/callback',
  };

  const mockValidProfile: GoogleProfile = {
    id: 'google-123',
    emails: [{ value: 'john.doe@mavericks-consulting.com', verified: true }],
    name: { familyName: 'Doe', givenName: 'John' },
    photos: [{ value: 'https://example.com/photo.jpg' }],
  };

  const mockUserEntity: UserEntity = {
    id: 'user-123',
    email: 'john.doe@mavericks-consulting.com',
    name: 'John Doe',
    picture: 'https://example.com/photo.jpg',
    googleId: 'google-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as UserEntity;

  const mockOAuthTokenEntity: OAuthTokenEntity = {
    id: 'token-123',
    userId: 'user-123',
    provider: 'google',
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
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
    };

    mockEnvironmentVariableUtil = {
      getVariables: vi.fn().mockReturnValue(mockEnvironmentVariables),
    };

    mockDone = vi.fn();
    mockStrategyConstructor = Strategy as Mock;

    // Instantiate GoogleOAuthStrategy
    googleStrategy = new GoogleOAuthStrategy(
      mockUserDBUtil as UserDBUtil,
      mockTokenDBUtil as TokenDBUtil,
      mockEnvironmentVariableUtil as EnvironmentVariableUtil,
    );
  });

  describe('OAuth Flow Configuration - Requirement 1.1', () => {
    it('should initialize with correct OAuth configuration', () => {
      expect(mockEnvironmentVariableUtil.getVariables).toHaveBeenCalled();
      expect(mockStrategyConstructor).toHaveBeenCalledWith({
        clientID: 'test-client-id',
        clientSecret: 'test-client-secret',
        callbackURL: 'http://localhost:3001/auth/google/callback',
        scope: [
          'profile',
          'email',
          'https://www.googleapis.com/auth/gmail.send',
          'https://www.googleapis.com/auth/drive.file',
        ],
      });
    });

    it('should extend PassportStrategy properly', () => {
      // Verify that the strategy instance exists and can be created
      expect(googleStrategy).toBeDefined();
      expect(googleStrategy).toBeInstanceOf(GoogleOAuthStrategy);
    });

    it('should configure proper OAuth scopes for Gmail and Drive access', () => {
      const expectedScopes = [
        'profile',
        'email',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/drive.file',
      ];

      expect(mockStrategyConstructor).toHaveBeenCalledWith(
        expect.objectContaining({
          scope: expectedScopes,
        }),
      );
    });

    it('should handle missing environment variables gracefully', () => {
      mockEnvironmentVariableUtil.getVariables.mockReturnValue({
        googleClientId: undefined,
        googleClientSecret: undefined,
        googleRedirectUri: undefined,
      });

      expect(() => {
        new GoogleOAuthStrategy(
          mockUserDBUtil as UserDBUtil,
          mockTokenDBUtil as TokenDBUtil,
          mockEnvironmentVariableUtil as EnvironmentVariableUtil,
        );
      }).not.toThrow();

      expect(mockStrategyConstructor).toHaveBeenCalledWith({
        clientID: undefined,
        clientSecret: undefined,
        callbackURL: undefined,
        scope: [
          'profile',
          'email',
          'https://www.googleapis.com/auth/gmail.send',
          'https://www.googleapis.com/auth/drive.file',
        ],
      });
    });
  });

  describe('Domain Validation - Requirement 1.3', () => {
    it('should accept valid @mavericks-consulting.com emails', async () => {
      mockUserDBUtil.getOne.mockResolvedValue(mockUserEntity);
      mockTokenDBUtil.delete.mockResolvedValue([]);
      mockTokenDBUtil.create.mockResolvedValue(mockOAuthTokenEntity);

      await googleStrategy.validate(
        'access-token',
        'refresh-token',
        mockValidProfile,
        mockDone,
      );

      expect(mockDone).toHaveBeenCalledWith(null, mockUserEntity);
      expect(mockDone).not.toHaveBeenCalledWith(
        expect.any(UnauthorizedException),
        false,
      );
    });

    it('should reject non-@mavericks-consulting.com emails', async () => {
      const invalidProfile: GoogleProfile = {
        ...mockValidProfile,
        emails: [{ value: 'john.doe@gmail.com', verified: true }],
      };

      await googleStrategy.validate(
        'access-token',
        'refresh-token',
        invalidProfile,
        mockDone,
      );

      expect(mockDone).toHaveBeenCalledWith(
        expect.any(UnauthorizedException),
        false,
      );
      expect(mockDone).toHaveBeenCalledWith(
        expect.objectContaining({
          message:
            'Access denied: Only @mavericks-consulting.com accounts are allowed',
        }),
        false,
      );
    });

    it('should reject emails from similar but incorrect domains', async () => {
      const testCases = [
        'john.doe@mavericks-consulting.org',
        'john.doe@fake-mavericks-consulting.com',
        'john.doe@mavericks-consulting.com.fake',
        'john.doe@submavericks-consulting.com',
      ];

      for (const email of testCases) {
        const invalidProfile: GoogleProfile = {
          ...mockValidProfile,
          emails: [{ value: email, verified: true }],
        };

        await googleStrategy.validate(
          'access-token',
          'refresh-token',
          invalidProfile,
          mockDone,
        );

        expect(mockDone).toHaveBeenCalledWith(
          expect.any(UnauthorizedException),
          false,
        );
      }
    });

    it('should reject uppercase emails due to case sensitivity', async () => {
      const upperCaseProfile: GoogleProfile = {
        ...mockValidProfile,
        emails: [
          { value: 'JOHN.DOE@MAVERICKS-CONSULTING.COM', verified: true },
        ],
      };

      await googleStrategy.validate(
        'access-token',
        'refresh-token',
        upperCaseProfile,
        mockDone,
      );

      expect(mockDone).toHaveBeenCalledWith(
        expect.any(UnauthorizedException),
        false,
      );
      expect(mockDone).toHaveBeenCalledWith(
        expect.objectContaining({
          message:
            'Access denied: Only @mavericks-consulting.com accounts are allowed',
        }),
        false,
      );
    });

    it('should reject profiles with no email', async () => {
      const profileWithoutEmail: GoogleProfile = {
        ...mockValidProfile,
        emails: [],
      };

      await googleStrategy.validate(
        'access-token',
        'refresh-token',
        profileWithoutEmail,
        mockDone,
      );

      expect(mockDone).toHaveBeenCalledWith(
        expect.any(UnauthorizedException),
        false,
      );
      expect(mockDone).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'No email found in Google profile',
        }),
        false,
      );
    });

    it('should reject profiles with null/undefined email arrays', async () => {
      const profileWithNullEmails: GoogleProfile = {
        ...mockValidProfile,
        emails: null as any,
      };

      await googleStrategy.validate(
        'access-token',
        'refresh-token',
        profileWithNullEmails,
        mockDone,
      );

      expect(mockDone).toHaveBeenCalledWith(
        expect.any(UnauthorizedException),
        false,
      );
    });

    it('should reject profiles with empty string emails', async () => {
      const profileWithEmptyEmail: GoogleProfile = {
        ...mockValidProfile,
        emails: [{ value: '', verified: true }],
      };

      await googleStrategy.validate(
        'access-token',
        'refresh-token',
        profileWithEmptyEmail,
        mockDone,
      );

      expect(mockDone).toHaveBeenCalledWith(
        expect.any(UnauthorizedException),
        false,
      );
    });
  });

  describe('Profile Processing - Requirement 1.1', () => {
    it('should correctly extract user information from valid profile', async () => {
      mockUserDBUtil.getOne.mockResolvedValue(null);
      mockUserDBUtil.create.mockResolvedValue(mockUserEntity);
      mockTokenDBUtil.delete.mockResolvedValue([]);
      mockTokenDBUtil.create.mockResolvedValue(mockOAuthTokenEntity);

      await googleStrategy.validate(
        'access-token',
        'refresh-token',
        mockValidProfile,
        mockDone,
      );

      expect(mockUserDBUtil.create).toHaveBeenCalledWith({
        creationData: {
          email: 'john.doe@mavericks-consulting.com',
          name: 'John Doe',
          picture: 'https://example.com/photo.jpg',
          googleId: 'google-123',
        },
      });
    });

    it('should handle profiles without photos', async () => {
      const profileWithoutPhoto: GoogleProfile = {
        ...mockValidProfile,
        photos: [],
      };

      mockUserDBUtil.getOne.mockResolvedValue(null);
      mockUserDBUtil.create.mockResolvedValue({
        ...mockUserEntity,
        picture: null,
      });
      mockTokenDBUtil.delete.mockResolvedValue([]);
      mockTokenDBUtil.create.mockResolvedValue(mockOAuthTokenEntity);

      await googleStrategy.validate(
        'access-token',
        'refresh-token',
        profileWithoutPhoto,
        mockDone,
      );

      expect(mockUserDBUtil.create).toHaveBeenCalledWith({
        creationData: {
          email: 'john.doe@mavericks-consulting.com',
          name: 'John Doe',
          picture: undefined,
          googleId: 'google-123',
        },
      });
    });

    it('should handle profiles with null photos array', async () => {
      const profileWithNullPhotos: GoogleProfile = {
        ...mockValidProfile,
        photos: null as any,
      };

      mockUserDBUtil.getOne.mockResolvedValue(null);
      mockUserDBUtil.create.mockResolvedValue({
        ...mockUserEntity,
        picture: null,
      });
      mockTokenDBUtil.delete.mockResolvedValue([]);
      mockTokenDBUtil.create.mockResolvedValue(mockOAuthTokenEntity);

      await googleStrategy.validate(
        'access-token',
        'refresh-token',
        profileWithNullPhotos,
        mockDone,
      );

      expect(mockUserDBUtil.create).toHaveBeenCalledWith({
        creationData: {
          email: 'john.doe@mavericks-consulting.com',
          name: 'John Doe',
          picture: undefined,
          googleId: 'google-123',
        },
      });
    });

    it('should construct full name correctly from first and last names', async () => {
      const profileWithDifferentName: GoogleProfile = {
        ...mockValidProfile,
        name: { familyName: 'Smith', givenName: 'Jane' },
      };

      mockUserDBUtil.getOne.mockResolvedValue(null);
      mockUserDBUtil.create.mockResolvedValue({
        ...mockUserEntity,
        name: 'Jane Smith',
      });
      mockTokenDBUtil.delete.mockResolvedValue([]);
      mockTokenDBUtil.create.mockResolvedValue(mockOAuthTokenEntity);

      await googleStrategy.validate(
        'access-token',
        'refresh-token',
        profileWithDifferentName,
        mockDone,
      );

      expect(mockUserDBUtil.create).toHaveBeenCalledWith({
        creationData: expect.objectContaining({
          name: 'Jane Smith',
        }),
      });
    });

    it('should handle existing users without creating duplicates', async () => {
      mockUserDBUtil.getOne.mockResolvedValue(mockUserEntity);
      mockTokenDBUtil.delete.mockResolvedValue([]);
      mockTokenDBUtil.create.mockResolvedValue(mockOAuthTokenEntity);

      await googleStrategy.validate(
        'access-token',
        'refresh-token',
        mockValidProfile,
        mockDone,
      );

      expect(mockUserDBUtil.create).not.toHaveBeenCalled();
      expect(mockUserDBUtil.getOne).toHaveBeenCalledWith({
        criteria: { email: 'john.doe@mavericks-consulting.com' },
      });
      expect(mockDone).toHaveBeenCalledWith(null, mockUserEntity);
    });
  });

  describe('OAuth Token Management - Requirement 1.1', () => {
    it('should create OAuth tokens with correct parameters', async () => {
      mockUserDBUtil.getOne.mockResolvedValue(mockUserEntity);
      mockTokenDBUtil.delete.mockResolvedValue([]);
      mockTokenDBUtil.create.mockResolvedValue(mockOAuthTokenEntity);

      await googleStrategy.validate(
        'access-token-123',
        'refresh-token-456',
        mockValidProfile,
        mockDone,
      );

      expect(mockTokenDBUtil.create).toHaveBeenCalledWith({
        creationData: {
          userId: 'user-123',
          provider: 'google',
          accessToken: 'access-token-123',
          refreshToken: 'refresh-token-456',
          expiresAt: expect.any(Date),
          scope: 'profile email gmail.send drive.file',
        },
      });
    });

    it('should set token expiration to 1 hour from creation', async () => {
      const beforeTime = Date.now();

      mockUserDBUtil.getOne.mockResolvedValue(mockUserEntity);
      mockTokenDBUtil.delete.mockResolvedValue([]);
      mockTokenDBUtil.create.mockResolvedValue(mockOAuthTokenEntity);

      await googleStrategy.validate(
        'access-token',
        'refresh-token',
        mockValidProfile,
        mockDone,
      );

      const afterTime = Date.now();
      const callArgs = mockTokenDBUtil.create.mock.calls[0][0];
      const expiresAt = callArgs.creationData.expiresAt as Date;
      const expirationTime = expiresAt.getTime();

      // Should be approximately 1 hour (3600000ms) from now
      expect(expirationTime).toBeGreaterThanOrEqual(
        beforeTime + 3600000 - 1000,
      ); // Allow 1s tolerance
      expect(expirationTime).toBeLessThanOrEqual(afterTime + 3600000 + 1000);
    });

    it('should delete existing tokens before creating new ones', async () => {
      mockUserDBUtil.getOne.mockResolvedValue(mockUserEntity);
      mockTokenDBUtil.delete.mockResolvedValue([mockOAuthTokenEntity]);
      mockTokenDBUtil.create.mockResolvedValue(mockOAuthTokenEntity);

      await googleStrategy.validate(
        'access-token',
        'refresh-token',
        mockValidProfile,
        mockDone,
      );

      expect(mockTokenDBUtil.delete).toHaveBeenCalledWith({
        criteria: { userId: 'user-123', provider: 'google' },
      });
      expect(mockTokenDBUtil.delete).toHaveBeenCalledBefore(
        mockTokenDBUtil.create,
      );
    });

    it('should handle token deletion errors gracefully', async () => {
      mockUserDBUtil.getOne.mockResolvedValue(mockUserEntity);
      mockTokenDBUtil.delete.mockRejectedValue(new Error('Delete failed'));
      mockTokenDBUtil.create.mockResolvedValue(mockOAuthTokenEntity);

      await googleStrategy.validate(
        'access-token',
        'refresh-token',
        mockValidProfile,
        mockDone,
      );

      expect(mockDone).toHaveBeenCalledWith(expect.any(Error), false);
    });
  });

  describe('Error Handling', () => {
    it('should handle user creation database errors', async () => {
      mockUserDBUtil.getOne.mockResolvedValue(null);
      mockUserDBUtil.create.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await googleStrategy.validate(
        'access-token',
        'refresh-token',
        mockValidProfile,
        mockDone,
      );

      expect(mockDone).toHaveBeenCalledWith(expect.any(Error), false);
    });

    it('should handle user lookup database errors', async () => {
      mockUserDBUtil.getOne.mockRejectedValue(new Error('User lookup failed'));

      await googleStrategy.validate(
        'access-token',
        'refresh-token',
        mockValidProfile,
        mockDone,
      );

      expect(mockDone).toHaveBeenCalledWith(expect.any(Error), false);
    });

    it('should handle token creation database errors', async () => {
      mockUserDBUtil.getOne.mockResolvedValue(mockUserEntity);
      mockTokenDBUtil.delete.mockResolvedValue([]);
      mockTokenDBUtil.create.mockRejectedValue(
        new Error('Token creation failed'),
      );

      await googleStrategy.validate(
        'access-token',
        'refresh-token',
        mockValidProfile,
        mockDone,
      );

      expect(mockDone).toHaveBeenCalledWith(expect.any(Error), false);
    });

    it('should handle malformed profile objects gracefully', async () => {
      const malformedProfile = {
        id: null,
        emails: [{ value: 'test@mavericks-consulting.com', verified: true }],
        name: null,
        photos: null,
      } as any;

      mockUserDBUtil.getOne.mockResolvedValue(null);
      mockUserDBUtil.create.mockResolvedValue(mockUserEntity);
      mockTokenDBUtil.delete.mockResolvedValue([]);
      mockTokenDBUtil.create.mockResolvedValue(mockOAuthTokenEntity);

      await googleStrategy.validate(
        'access-token',
        'refresh-token',
        malformedProfile,
        mockDone,
      );

      // Should complete without throwing, but may have called done with an error
      expect(mockDone).toHaveBeenCalled();
    });

    it('should handle network/connectivity errors during OAuth process', async () => {
      // Simulate a network error during user lookup
      mockUserDBUtil.getOne.mockRejectedValue(new Error('ECONNREFUSED'));

      await googleStrategy.validate(
        'access-token',
        'refresh-token',
        mockValidProfile,
        mockDone,
      );

      expect(mockDone).toHaveBeenCalledWith(expect.any(Error), false);
    });

    it('should handle concurrent validation requests safely', async () => {
      mockUserDBUtil.getOne.mockResolvedValue(null);
      mockUserDBUtil.create.mockResolvedValue(mockUserEntity);
      mockTokenDBUtil.delete.mockResolvedValue([]);
      mockTokenDBUtil.create.mockResolvedValue(mockOAuthTokenEntity);

      // Simulate concurrent validation calls
      const promise1 = googleStrategy.validate(
        'access-token-1',
        'refresh-token-1',
        mockValidProfile,
        vi.fn(),
      );

      const promise2 = googleStrategy.validate(
        'access-token-2',
        'refresh-token-2',
        mockValidProfile,
        vi.fn(),
      );

      await Promise.all([promise1, promise2]);

      // Both should complete without throwing
      expect(mockUserDBUtil.getOne).toHaveBeenCalledTimes(2);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete OAuth flow for new user', async () => {
      mockUserDBUtil.getOne.mockResolvedValue(null);
      mockUserDBUtil.create.mockResolvedValue(mockUserEntity);
      mockTokenDBUtil.delete.mockResolvedValue([]);
      mockTokenDBUtil.create.mockResolvedValue(mockOAuthTokenEntity);

      await googleStrategy.validate(
        'access-token',
        'refresh-token',
        mockValidProfile,
        mockDone,
      );

      // Verify the complete flow
      expect(mockUserDBUtil.getOne).toHaveBeenCalledWith({
        criteria: { email: 'john.doe@mavericks-consulting.com' },
      });
      expect(mockUserDBUtil.create).toHaveBeenCalledWith({
        creationData: {
          email: 'john.doe@mavericks-consulting.com',
          name: 'John Doe',
          picture: 'https://example.com/photo.jpg',
          googleId: 'google-123',
        },
      });
      expect(mockTokenDBUtil.delete).toHaveBeenCalledWith({
        criteria: { userId: 'user-123', provider: 'google' },
      });
      expect(mockTokenDBUtil.create).toHaveBeenCalledWith({
        creationData: {
          userId: 'user-123',
          provider: 'google',
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          expiresAt: expect.any(Date),
          scope: 'profile email gmail.send drive.file',
        },
      });
      expect(mockDone).toHaveBeenCalledWith(null, mockUserEntity);
    });

    it('should handle complete OAuth flow for existing user', async () => {
      mockUserDBUtil.getOne.mockResolvedValue(mockUserEntity);
      mockTokenDBUtil.delete.mockResolvedValue([mockOAuthTokenEntity]);
      mockTokenDBUtil.create.mockResolvedValue(mockOAuthTokenEntity);

      await googleStrategy.validate(
        'new-access-token',
        'new-refresh-token',
        mockValidProfile,
        mockDone,
      );

      expect(mockUserDBUtil.create).not.toHaveBeenCalled(); // Should not create new user
      expect(mockTokenDBUtil.delete).toHaveBeenCalled(); // Should delete old tokens
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
      expect(mockDone).toHaveBeenCalledWith(null, mockUserEntity);
    });
  });
});
