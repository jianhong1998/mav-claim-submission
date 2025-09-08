/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { OAuthTokenEntity } from 'src/modules/auth/entities/oauth-token.entity';
import { UserEntity } from 'src/modules/user/entities/user.entity';
import { UserDBUtil } from 'src/modules/user/utils/user-db.util';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('AuthService', () => {
  let service: AuthService;
  let userDBUtil: {
    create: ReturnType<typeof vi.fn>;
    getOne: ReturnType<typeof vi.fn>;
    updateWithSave: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let tokenService: {
    updateToken: ReturnType<typeof vi.fn>;
    deleteTokenForUser: ReturnType<typeof vi.fn>;
    getValidTokenForUser: ReturnType<typeof vi.fn>;
    getTokenForUser: ReturnType<typeof vi.fn>;
  };

  const mockUser: UserEntity = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    picture: 'https://example.com/picture.jpg',
    googleId: 'google-123',
    oauthTokens: [],
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    deletedAt: undefined,
  };

  const mockOAuthData = {
    googleId: 'google-123',
    email: 'test@example.com',
    name: 'Test User',
    picture: 'https://example.com/picture.jpg',
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    expiresAt: new Date('2024-12-31T23:59:59Z'),
    scope: 'email profile',
  };

  beforeEach(async () => {
    const mockUserDBUtil = {
      create: vi.fn(),
      getOne: vi.fn(),
      updateWithSave: vi.fn(),
      delete: vi.fn(),
    };

    const mockTokenService = {
      updateToken: vi.fn(),
      deleteTokenForUser: vi.fn(),
      getValidTokenForUser: vi.fn(),
      getTokenForUser: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserDBUtil,
          useValue: mockUserDBUtil,
        },
        {
          provide: TokenService,
          useValue: mockTokenService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userDBUtil = module.get(UserDBUtil);
    tokenService = module.get(TokenService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserByGoogleId', () => {
    it('should find user by Google ID using UserDBUtil', async () => {
      userDBUtil.getOne.mockResolvedValue(mockUser);

      const result = await service.getUserByGoogleId('google-123');

      expect(userDBUtil.getOne).toHaveBeenCalledWith({
        criteria: { googleId: 'google-123' },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      userDBUtil.getOne.mockResolvedValue(null);

      const result = await service.getUserByGoogleId('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  describe('getUserByEmail', () => {
    it('should find user by email using UserDBUtil', async () => {
      userDBUtil.getOne.mockResolvedValue(mockUser);

      const result = await service.getUserByEmail('test@example.com');

      expect(userDBUtil.getOne).toHaveBeenCalledWith({
        criteria: { email: 'test@example.com' },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      userDBUtil.getOne.mockResolvedValue(null);

      const result = await service.getUserByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('getUserById', () => {
    it('should find user by ID with OAuth tokens relation using UserDBUtil', async () => {
      const userWithTokens = { ...mockUser, oauthTokens: [] };
      userDBUtil.getOne.mockResolvedValue(userWithTokens);

      const result = await service.getUserById('user-1');

      expect(userDBUtil.getOne).toHaveBeenCalledWith({
        criteria: { id: 'user-1' },
        relation: { oauthTokens: true },
      });
      expect(result).toEqual(userWithTokens);
    });
  });

  describe('findOrCreateUser', () => {
    it('should return existing user when found', async () => {
      vi.spyOn(service, 'getUserByGoogleId').mockResolvedValue(mockUser);
      userDBUtil.updateWithSave.mockResolvedValue([mockUser]);

      const userData = {
        googleId: 'google-123',
        email: 'updated@example.com',
        name: 'Updated Name',
        picture: 'https://example.com/new-picture.jpg',
      };

      const result = await service.findOrCreateUser(userData);

      expect(service.getUserByGoogleId).toHaveBeenCalledWith('google-123');
      expect(userDBUtil.updateWithSave).toHaveBeenCalledWith({
        dataArray: [
          expect.objectContaining({
            email: 'updated@example.com',
            name: 'Updated Name',
            picture: 'https://example.com/new-picture.jpg',
          }),
        ],
      });
      expect(result).toEqual(mockUser);
    });

    it('should create new user when not found', async () => {
      vi.spyOn(service, 'getUserByGoogleId').mockResolvedValue(null);
      userDBUtil.create.mockResolvedValue(mockUser);

      const userData = {
        googleId: 'google-456',
        email: 'new@example.com',
        name: 'New User',
      };

      const result = await service.findOrCreateUser(userData);

      expect(service.getUserByGoogleId).toHaveBeenCalledWith('google-456');
      expect(userDBUtil.create).toHaveBeenCalledWith({
        creationData: userData,
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe('handleOAuthCallback', () => {
    it('should handle new user OAuth callback', async () => {
      vi.spyOn(service, 'getUserByGoogleId').mockResolvedValue(null);
      vi.spyOn(service, 'findOrCreateUser').mockResolvedValue(mockUser);
      tokenService.updateToken.mockResolvedValue({});

      const result = await service.handleOAuthCallback(mockOAuthData);

      expect(service.getUserByGoogleId).toHaveBeenCalledWith('google-123');
      expect(service.findOrCreateUser).toHaveBeenCalledWith({
        googleId: mockOAuthData.googleId,
        email: mockOAuthData.email,
        name: mockOAuthData.name,
        picture: mockOAuthData.picture,
      });
      expect(tokenService.updateToken).toHaveBeenCalledWith({
        userId: mockUser.id,
        provider: 'google',
        accessToken: mockOAuthData.accessToken,
        refreshToken: mockOAuthData.refreshToken,
        expiresAt: mockOAuthData.expiresAt,
        scope: mockOAuthData.scope,
      });
      expect(result).toEqual({
        user: mockUser,
        isNewUser: true,
      });
    });

    it('should handle existing user OAuth callback', async () => {
      vi.spyOn(service, 'getUserByGoogleId').mockResolvedValue(mockUser);
      vi.spyOn(service, 'findOrCreateUser').mockResolvedValue(mockUser);
      tokenService.updateToken.mockResolvedValue({});

      const result = await service.handleOAuthCallback(mockOAuthData);

      expect(result).toEqual({
        user: mockUser,
        isNewUser: false,
      });
    });
  });

  describe('getUserProfile', () => {
    it('should return user profile when user exists', async () => {
      vi.spyOn(service, 'getUserById').mockResolvedValue(mockUser);

      const result = await service.getUserProfile('user-1');

      expect(service.getUserById).toHaveBeenCalledWith('user-1');
      expect(result).toEqual({
        user: {
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          picture: mockUser.picture,
          googleId: mockUser.googleId,
          createdAt: mockUser.createdAt.toISOString(),
          updatedAt: mockUser.updatedAt.toISOString(),
        },
        isAuthenticated: true,
      });
    });

    it('should return unauthenticated response when user not found', async () => {
      vi.spyOn(service, 'getUserById').mockResolvedValue(null);

      const result = await service.getUserProfile('nonexistent-user');

      expect(result).toEqual({
        user: null,
        isAuthenticated: false,
        message: 'User not found',
      });
    });
  });

  describe('logout', () => {
    it('should delete user tokens and return success', async () => {
      tokenService.deleteTokenForUser.mockResolvedValue(true);

      const result = await service.logout('user-1');

      expect(tokenService.deleteTokenForUser).toHaveBeenCalledWith('user-1');
      expect(result).toBe(true);
    });

    it('should return false when token deletion fails', async () => {
      tokenService.deleteTokenForUser.mockResolvedValue(false);

      const result = await service.logout('user-1');

      expect(result).toBe(false);
    });
  });

  describe('hasValidToken', () => {
    it('should return true when user has valid token', async () => {
      tokenService.getValidTokenForUser.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      const result = await service.hasValidToken('user-1');

      expect(tokenService.getValidTokenForUser).toHaveBeenCalledWith('user-1');
      expect(result).toBe(true);
    });

    it('should return false when user has no valid token', async () => {
      tokenService.getValidTokenForUser.mockResolvedValue(null);

      const result = await service.hasValidToken('user-1');

      expect(result).toBe(false);
    });
  });

  describe('refreshUserToken', () => {
    it('should return true when user and token exist', async () => {
      vi.spyOn(service, 'getUserById').mockResolvedValue(mockUser);
      tokenService.getTokenForUser.mockResolvedValue({} as OAuthTokenEntity);

      const result = await service.refreshUserToken('user-1');

      expect(service.getUserById).toHaveBeenCalledWith('user-1');
      expect(tokenService.getTokenForUser).toHaveBeenCalledWith('user-1');
      expect(result).toBe(true);
    });

    it('should return false when user not found', async () => {
      vi.spyOn(service, 'getUserById').mockResolvedValue(null);

      const result = await service.refreshUserToken('user-1');

      expect(result).toBe(false);
    });

    it('should return false when token not found', async () => {
      vi.spyOn(service, 'getUserById').mockResolvedValue(mockUser);
      tokenService.getTokenForUser.mockResolvedValue(null);

      const result = await service.refreshUserToken('user-1');

      expect(result).toBe(false);
    });
  });

  describe('toDTO', () => {
    it('should convert user entity to DTO', () => {
      const result = service.toDTO(mockUser);

      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        picture: mockUser.picture,
        googleId: mockUser.googleId,
        createdAt: mockUser.createdAt.toISOString(),
        updatedAt: mockUser.updatedAt.toISOString(),
      });
    });
  });

  describe('deleteUser', () => {
    it('should delete user and return true when successful', async () => {
      userDBUtil.delete.mockResolvedValue([mockUser]);

      const result = await service.deleteUser('user-1');

      expect(userDBUtil.delete).toHaveBeenCalledWith({
        criteria: { id: 'user-1' },
      });
      expect(result).toBe(true);
    });

    it('should return false when user not found', async () => {
      userDBUtil.delete.mockResolvedValue(null);

      const result = await service.deleteUser('user-1');

      expect(result).toBe(false);
    });
  });
});
