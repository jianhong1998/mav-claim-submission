/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import CryptoJS from 'crypto-js';
import { TokenService, TokenCreationData } from './token.service';
import { OAuthTokenEntity } from 'src/modules/auth/entities/oauth-token.entity';
import { CommonModule } from 'src/modules/common/common.module';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('TokenService', () => {
  let service: TokenService;
  let repository: {
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    find: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    softRemove: ReturnType<typeof vi.fn>;
  };

  const mockToken: OAuthTokenEntity = {
    id: 'token-1',
    userId: 'user-1',
    provider: 'google',
    accessToken: 'encrypted-access-token',
    refreshToken: 'encrypted-refresh-token',
    expiresAt: new Date('2024-12-31T23:59:59Z'),
    scope: 'email profile',
    user: undefined,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    deletedAt: null,
  };

  const mockTokenCreationData: TokenCreationData = {
    userId: 'user-1',
    provider: 'google',
    accessToken: 'raw-access-token',
    refreshToken: 'raw-refresh-token',
    expiresAt: new Date('2024-12-31T23:59:59Z'),
    scope: 'email profile',
  };

  beforeEach(async () => {
    // Set environment variable BEFORE creating the service
    process.env.BACKEND_TOKEN_ENCRYPTION_KEY = 'test-encryption-key';

    const mockRepository = {
      create: vi.fn(),
      save: vi.fn(),
      findOne: vi.fn(),
      find: vi.fn(),
      count: vi.fn(),
      softRemove: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [CommonModule],
      providers: [
        TokenService,
        {
          provide: getRepositoryToken(OAuthTokenEntity),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<TokenService>(TokenService);
    repository = module.get(getRepositoryToken(OAuthTokenEntity));
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.BACKEND_TOKEN_ENCRYPTION_KEY;
  });

  describe('create', () => {
    it('should create and save a new token with encrypted values', async () => {
      const createdToken = { ...mockToken };
      repository.create.mockReturnValue(createdToken);
      repository.save.mockResolvedValue(createdToken);

      const result = await service.create({
        creationData: mockTokenCreationData,
      });

      expect(repository.create).toHaveBeenCalledWith({
        userId: mockTokenCreationData.userId,
        provider: mockTokenCreationData.provider,
        accessToken: expect.any(String) as string,
        refreshToken: expect.any(String) as string,
        expiresAt: mockTokenCreationData.expiresAt,
        scope: mockTokenCreationData.scope,
      });
      expect(repository.save).toHaveBeenCalledWith(createdToken);
      expect(result).toEqual(createdToken);
    });

    it('should use entity manager repository when provided', async () => {
      const mockEntityManager = {
        getRepository: vi.fn().mockReturnValue(repository),
      } as unknown as EntityManager;

      const createdToken = { ...mockToken };
      repository.create.mockReturnValue(createdToken);
      repository.save.mockResolvedValue(createdToken);

      await service.create({
        creationData: mockTokenCreationData,
        entityManager: mockEntityManager,
      });

      expect(mockEntityManager.getRepository).toHaveBeenCalledWith(
        OAuthTokenEntity,
      );
    });
  });

  describe('getTokenForUser', () => {
    it('should find token for user with default provider', async () => {
      vi.spyOn(service, 'getOne').mockResolvedValue(mockToken);

      const result = await service.getTokenForUser('user-1');

      expect(service.getOne).toHaveBeenCalledWith({
        criteria: { userId: 'user-1', provider: 'google' },
        relation: { user: true },
      });
      expect(result).toEqual(mockToken);
    });

    it('should find token for user with specified provider', async () => {
      vi.spyOn(service, 'getOne').mockResolvedValue(mockToken);

      const result = await service.getTokenForUser('user-1', 'google');

      expect(service.getOne).toHaveBeenCalledWith({
        criteria: { userId: 'user-1', provider: 'google' },
        relation: { user: true },
      });
      expect(result).toEqual(mockToken);
    });

    it('should return null when token not found', async () => {
      vi.spyOn(service, 'getOne').mockResolvedValue(null);

      const result = await service.getTokenForUser('user-1');

      expect(result).toBeNull();
    });
  });

  describe('updateToken', () => {
    it('should update existing token', async () => {
      const existingToken = { ...mockToken };
      const updatedToken = { ...mockToken, scope: 'updated-scope' };

      vi.spyOn(service, 'getOne').mockResolvedValue(existingToken);
      vi.spyOn(service, 'updateWithSave').mockResolvedValue([updatedToken]);

      const result = await service.updateToken({
        userId: 'user-1',
        provider: 'google',
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresAt: new Date('2025-01-01T00:00:00Z'),
        scope: 'updated-scope',
      });

      expect(service.getOne).toHaveBeenCalledWith({
        criteria: { userId: 'user-1', provider: 'google' },
        withDeleted: true,
      });
      expect(service.updateWithSave).toHaveBeenCalledWith({
        dataArray: [
          expect.objectContaining({
            accessToken: expect.any(String),
            refreshToken: expect.any(String),
            expiresAt: new Date('2025-01-01T00:00:00Z'),
            scope: 'updated-scope',
          }),
        ],
      });
      expect(result).toEqual(updatedToken);
    });

    it('should create new token when none exists', async () => {
      vi.spyOn(service, 'getOne').mockResolvedValue(null);
      vi.spyOn(service, 'create').mockResolvedValue(mockToken);

      const result = await service.updateToken({
        userId: 'user-1',
        provider: 'google',
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresAt: new Date('2025-01-01T00:00:00Z'),
        scope: 'new-scope',
      });

      expect(service.create).toHaveBeenCalledWith({
        creationData: {
          userId: 'user-1',
          provider: 'google',
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
          expiresAt: new Date('2025-01-01T00:00:00Z'),
          scope: 'new-scope',
        },
      });
      expect(result).toEqual(mockToken);
    });
  });

  describe('deleteTokenForUser', () => {
    it('should delete token and return true when successful', async () => {
      vi.spyOn(service, 'delete').mockResolvedValue([mockToken]);

      const result = await service.deleteTokenForUser('user-1');

      expect(service.delete).toHaveBeenCalledWith({
        criteria: { userId: 'user-1', provider: 'google' },
      });
      expect(result).toBe(true);
    });

    it('should return false when token not found', async () => {
      vi.spyOn(service, 'delete').mockResolvedValue(null);

      const result = await service.deleteTokenForUser('user-1');

      expect(result).toBe(false);
    });

    it('should use specified provider', async () => {
      vi.spyOn(service, 'delete').mockResolvedValue([mockToken]);

      await service.deleteTokenForUser('user-1', 'google');

      expect(service.delete).toHaveBeenCalledWith({
        criteria: { userId: 'user-1', provider: 'google' },
      });
    });
  });

  describe('isTokenExpired', () => {
    it('should return true when token is expired', () => {
      const expiredToken = {
        ...mockToken,
        expiresAt: new Date('2020-01-01T00:00:00Z'),
      };

      const result = service.isTokenExpired(expiredToken);

      expect(result).toBe(true);
    });

    it('should return false when token is not expired', () => {
      const validToken = {
        ...mockToken,
        expiresAt: new Date('2030-01-01T00:00:00Z'),
      };

      const result = service.isTokenExpired(validToken);

      expect(result).toBe(false);
    });
  });

  describe('token encryption/decryption', () => {
    it('should decrypt access token correctly', () => {
      const originalToken = 'original-access-token';
      const encryptedToken = CryptoJS.AES.encrypt(
        originalToken,
        'test-encryption-key',
      ).toString();

      const tokenWithEncrypted = {
        ...mockToken,
        accessToken: encryptedToken,
      };

      const result = service.getDecryptedAccessToken(tokenWithEncrypted);

      expect(result).toBe(originalToken);
    });

    it('should decrypt refresh token correctly', () => {
      const originalToken = 'original-refresh-token';
      const encryptedToken = CryptoJS.AES.encrypt(
        originalToken,
        'test-encryption-key',
      ).toString();

      const tokenWithEncrypted = {
        ...mockToken,
        refreshToken: encryptedToken,
      };

      const result = service.getDecryptedRefreshToken(tokenWithEncrypted);

      expect(result).toBe(originalToken);
    });
  });

  describe('getValidTokenForUser', () => {
    it('should return decrypted tokens for valid user', async () => {
      const originalAccessToken = 'original-access-token';
      const originalRefreshToken = 'original-refresh-token';

      const encryptedAccessToken = CryptoJS.AES.encrypt(
        originalAccessToken,
        'test-encryption-key',
      ).toString();
      const encryptedRefreshToken = CryptoJS.AES.encrypt(
        originalRefreshToken,
        'test-encryption-key',
      ).toString();

      const tokenWithEncrypted = {
        ...mockToken,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
      };

      vi.spyOn(service, 'getTokenForUser').mockResolvedValue(
        tokenWithEncrypted,
      );

      const result = await service.getValidTokenForUser('user-1');

      expect(result).toEqual({
        accessToken: originalAccessToken,
        refreshToken: originalRefreshToken,
      });
    });

    it('should return null when user has no token', async () => {
      vi.spyOn(service, 'getTokenForUser').mockResolvedValue(null);

      const result = await service.getValidTokenForUser('user-1');

      expect(result).toBeNull();
    });
  });

  describe('toDTO', () => {
    it('should return DTO with masked tokens', () => {
      const result = service.toDTO(mockToken);

      expect(result).toEqual({
        id: mockToken.id,
        userId: mockToken.userId,
        provider: mockToken.provider,
        accessToken: '***',
        refreshToken: '***',
        expiresAt: mockToken.expiresAt.toISOString(),
        scope: mockToken.scope,
        createdAt: mockToken.createdAt.toISOString(),
        updatedAt: mockToken.updatedAt.toISOString(),
      });
    });
  });

  describe('encryption key handling', () => {
    it('should use default key when environment variable not set', async () => {
      delete process.env.BACKEND_TOKEN_ENCRYPTION_KEY;

      const module = await Test.createTestingModule({
        imports: [CommonModule],
        providers: [
          TokenService,
          {
            provide: getRepositoryToken(OAuthTokenEntity),
            useValue: repository,
          },
        ],
      }).compile();

      expect(module).toBeTruthy();
    });
  });
});
