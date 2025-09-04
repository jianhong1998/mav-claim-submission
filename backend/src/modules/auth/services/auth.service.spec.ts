/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { AuthService, UserCreationData } from './auth.service';
import { TokenService } from './token.service';
import { OAuthTokenEntity } from 'src/modules/models/oauth-token.entity';
import { UserEntity } from 'src/modules/models/user.entity';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: {
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    find: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    softRemove: ReturnType<typeof vi.fn>;
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

  const mockUserCreationData: UserCreationData = {
    email: 'test@example.com',
    name: 'Test User',
    picture: 'https://example.com/picture.jpg',
    googleId: 'google-123',
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
    const mockUserRepository = {
      create: vi.fn(),
      save: vi.fn(),
      findOne: vi.fn(),
      find: vi.fn(),
      count: vi.fn(),
      softRemove: vi.fn(),
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
          provide: getRepositoryToken(UserEntity),
          useValue: mockUserRepository,
        },
        {
          provide: TokenService,
          useValue: mockTokenService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get(getRepositoryToken(UserEntity));
    tokenService = module.get(TokenService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create and save a new user', async () => {
      const createdUser = { ...mockUser };
      userRepository.create.mockReturnValue(createdUser);
      userRepository.save.mockResolvedValue(createdUser);

      const result = await service.create({
        creationData: mockUserCreationData,
      });

      expect(userRepository.create).toHaveBeenCalledWith({
        email: mockUserCreationData.email,
        name: mockUserCreationData.name,
        picture: mockUserCreationData.picture,
        googleId: mockUserCreationData.googleId,
      });
      expect(userRepository.save).toHaveBeenCalledWith(createdUser);
      expect(result).toEqual(createdUser);
    });

    it('should use entity manager repository when provided', async () => {
      const mockEntityManager = {
        getRepository: vi.fn().mockReturnValue(userRepository),
      } as unknown as EntityManager;

      const createdUser = { ...mockUser };
      userRepository.create.mockReturnValue(createdUser);
      userRepository.save.mockResolvedValue(createdUser);

      await service.create({
        creationData: mockUserCreationData,
        entityManager: mockEntityManager,
      });

      expect(mockEntityManager.getRepository).toHaveBeenCalledWith(UserEntity);
    });
  });

  describe('getUserByGoogleId', () => {
    it('should find user by Google ID', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.getUserByGoogleId('google-123');

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { googleId: 'google-123' },
        transaction: true,
        relations: undefined,
        withDeleted: undefined,
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.getUserByGoogleId('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  describe('getUserByEmail', () => {
    it('should find user by email', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.getUserByEmail('test@example.com');

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        transaction: true,
        relations: undefined,
        withDeleted: undefined,
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.getUserByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('getUserById', () => {
    it('should find user by ID with OAuth tokens relation', async () => {
      const userWithTokens = { ...mockUser, oauthTokens: [] };
      userRepository.findOne.mockResolvedValue(userWithTokens);

      const result = await service.getUserById('user-1');

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        transaction: true,
        relations: { oauthTokens: true },
        withDeleted: undefined,
      });
      expect(result).toEqual(userWithTokens);
    });
  });

  describe('findOrCreateUser', () => {
    it('should return existing user when found', async () => {
      vi.spyOn(service, 'getUserByGoogleId').mockResolvedValue(mockUser);
      vi.spyOn(service, 'updateWithSave').mockResolvedValue([mockUser]);

      const userData = {
        googleId: 'google-123',
        email: 'updated@example.com',
        name: 'Updated Name',
        picture: 'https://example.com/new-picture.jpg',
      };

      const result = await service.findOrCreateUser(userData);

      expect(service.getUserByGoogleId).toHaveBeenCalledWith('google-123');
      expect(service.updateWithSave).toHaveBeenCalledWith({
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
      vi.spyOn(service, 'create').mockResolvedValue(mockUser);

      const userData = {
        googleId: 'google-456',
        email: 'new@example.com',
        name: 'New User',
      };

      const result = await service.findOrCreateUser(userData);

      expect(service.getUserByGoogleId).toHaveBeenCalledWith('google-456');
      expect(service.create).toHaveBeenCalledWith({
        creationData: userData,
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe('handleOAuthCallback', () => {
    it('should handle new user OAuth callback', async () => {
      vi.spyOn(service, 'getUserByGoogleId').mockResolvedValue(null);
      vi.spyOn(service, 'findOrCreateUser').mockResolvedValue(mockUser);
      tokenService.updateToken.mockResolvedValue({} as any);

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
      tokenService.updateToken.mockResolvedValue({} as any);

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
      vi.spyOn(service, 'delete').mockResolvedValue([mockUser]);

      const result = await service.deleteUser('user-1');

      expect(service.delete).toHaveBeenCalledWith({
        criteria: { id: 'user-1' },
      });
      expect(result).toBe(true);
    });

    it('should return false when user not found', async () => {
      vi.spyOn(service, 'delete').mockResolvedValue(null);

      const result = await service.deleteUser('user-1');

      expect(result).toBe(false);
    });
  });
});
