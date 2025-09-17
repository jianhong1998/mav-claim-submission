import { TokenService, JWTPayload } from './token.service';
import { UserDBUtil } from 'src/modules/user/utils/user-db.util';
import { EnvironmentVariableUtil } from 'src/modules/common/utils/environment-variable.util';
import { UserEntity } from 'src/modules/user/entities/user.entity';
import type { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import { vi, describe, it, expect, beforeEach, MockInstance } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';

vi.mock('jsonwebtoken', () => ({
  sign: vi.fn(),
  verify: vi.fn(),
  decode: vi.fn(),
}));

describe('TokenService', () => {
  let tokenService: TokenService;
  let userDBUtil: UserDBUtil;
  let environmentVariableUtil: EnvironmentVariableUtil;

  // Test data
  const mockUser: UserEntity = {
    id: 'user-123',
    email: 'test@mavericks-consulting.com',
    name: 'Test User',
    picture: 'https://example.com/photo.jpg',
    googleId: 'google-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockJWTSecret = 'test-jwt-secret';
  const mockJWTToken = 'mock.jwt.token';

  beforeEach(() => {
    // Create real instances directly
    const mockConfigService = {
      get: vi.fn().mockImplementation((key: string, defaultValue: unknown) => {
        if (key === 'BACKEND_JWT_SECRET') return mockJWTSecret;
        return defaultValue as string;
      }),
      getOrThrow: vi.fn().mockImplementation((key: string) => {
        if (key === 'BACKEND_EMAIL_RECIPIENT')
          return 'test@mavericks-consulting.com';
        return '';
      }),
    } as unknown as ConfigService;

    const mockRepository = {
      findOne: vi.fn(),
      find: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      save: vi.fn(),
      softRemove: vi.fn(),
    } as unknown as Repository<UserEntity>;

    environmentVariableUtil = new EnvironmentVariableUtil(mockConfigService);
    userDBUtil = new UserDBUtil(mockRepository);
    tokenService = new TokenService(userDBUtil, environmentVariableUtil);

    // Clear all mocks
    vi.clearAllMocks();
  });

  describe('generateJWT', () => {
    it('should generate JWT token with correct payload', () => {
      (jwt.sign as unknown as MockInstance).mockReturnValue(mockJWTToken);

      const result = tokenService.generateJWT(mockUser);

      expect(jwt.sign).toHaveBeenCalledWith(
        {
          userId: mockUser.id,
          email: mockUser.email,
        },
        mockJWTSecret,
        {
          expiresIn: '24h',
        },
      );
      expect(result).toBe(mockJWTToken);
    });

    it('should use environment JWT secret for signing', () => {
      (jwt.sign as unknown as MockInstance).mockReturnValue(mockJWTToken);

      tokenService.generateJWT(mockUser);

      expect(jwt.sign).toHaveBeenCalledWith(
        expect.any(Object),
        mockJWTSecret,
        expect.any(Object),
      );
    });
  });

  describe('validateJWT', () => {
    const mockJWTPayload: JWTPayload = {
      userId: mockUser.id,
      email: mockUser.email,
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    };

    it('should validate JWT and return user when token is valid', async () => {
      (jwt.verify as unknown as MockInstance).mockReturnValue(mockJWTPayload);
      const userSpy = vi
        .spyOn(userDBUtil, 'getOne')
        .mockResolvedValue(mockUser);

      const result = await tokenService.validateJWT(mockJWTToken);

      expect(jwt.verify).toHaveBeenCalledWith(mockJWTToken, mockJWTSecret);
      expect(userSpy).toHaveBeenCalledWith({
        criteria: { id: mockUser.id },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null when JWT verification fails', async () => {
      (jwt.verify as unknown as MockInstance).mockImplementation(() => {
        throw new Error('Invalid token');
      });
      const userSpy = vi.spyOn(userDBUtil, 'getOne');

      const result = await tokenService.validateJWT(mockJWTToken);

      expect(result).toBeNull();
      expect(userSpy).not.toHaveBeenCalled();
    });

    it('should return null when JWT payload has no userId', async () => {
      (jwt.verify as unknown as MockInstance).mockReturnValue({
        email: mockUser.email,
      } as JWTPayload);
      const userSpy = vi.spyOn(userDBUtil, 'getOne');

      const result = await tokenService.validateJWT(mockJWTToken);

      expect(result).toBeNull();
      expect(userSpy).not.toHaveBeenCalled();
    });

    it('should return null when user is not found in database', async () => {
      (jwt.verify as unknown as MockInstance).mockReturnValue(mockJWTPayload);
      const userSpy = vi.spyOn(userDBUtil, 'getOne').mockResolvedValue(null);

      const result = await tokenService.validateJWT(mockJWTToken);

      expect(result).toBeNull();
      expect(userSpy).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      (jwt.verify as unknown as MockInstance).mockReturnValue(mockJWTPayload);
      const userSpy = vi
        .spyOn(userDBUtil, 'getOne')
        .mockRejectedValue(new Error('Database error'));

      const result = await tokenService.validateJWT(mockJWTToken);

      expect(result).toBeNull();
      expect(userSpy).toHaveBeenCalled();
    });
  });

  describe('extractJWTFromRequest', () => {
    it('should extract JWT from cookie when present', () => {
      const mockRequest = {
        cookies: { jwt: mockJWTToken },
        headers: {},
      } as unknown as Request;

      const result = tokenService.extractJWTFromRequest(mockRequest);

      expect(result).toBe(mockJWTToken);
    });

    it('should extract JWT from Authorization header when cookie not present', () => {
      const mockRequest = {
        cookies: {},
        headers: { authorization: `Bearer ${mockJWTToken}` },
      } as unknown as Request;

      const result = tokenService.extractJWTFromRequest(mockRequest);

      expect(result).toBe(mockJWTToken);
    });

    it('should prioritize cookie over Authorization header', () => {
      const cookieToken = 'cookie-token';
      const headerToken = 'header-token';
      const mockRequest = {
        cookies: { jwt: cookieToken },
        headers: { authorization: `Bearer ${headerToken}` },
      } as unknown as Request;

      const result = tokenService.extractJWTFromRequest(mockRequest);

      expect(result).toBe(cookieToken);
    });

    it('should return null when no token is present', () => {
      const mockRequest = {
        cookies: {},
        headers: {},
      } as unknown as Request;

      const result = tokenService.extractJWTFromRequest(mockRequest);

      expect(result).toBeNull();
    });

    it('should return null when Authorization header has invalid format', () => {
      const mockRequest = {
        cookies: {},
        headers: { authorization: 'InvalidFormat token' },
      } as unknown as Request;

      const result = tokenService.extractJWTFromRequest(mockRequest);

      expect(result).toBeNull();
    });

    it('should handle missing cookies object', () => {
      const mockRequest = {
        headers: {},
      } as unknown as Request;

      const result = tokenService.extractJWTFromRequest(mockRequest);

      expect(result).toBeNull();
    });

    it('should handle non-string cookie values', () => {
      const mockRequest = {
        cookies: { jwt: 123 }, // Non-string value
        headers: {},
      } as unknown as Request;

      const result = tokenService.extractJWTFromRequest(mockRequest);

      expect(result).toBeNull();
    });
  });

  describe('validateSessionFromRequest', () => {
    it('should validate session from request with valid token', async () => {
      const mockRequest = {
        cookies: { jwt: mockJWTToken },
        headers: {},
      } as unknown as Request;

      const mockJWTPayload: JWTPayload = {
        userId: mockUser.id,
        email: mockUser.email,
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      (jwt.verify as unknown as MockInstance).mockReturnValue(mockJWTPayload);
      vi.spyOn(userDBUtil, 'getOne').mockResolvedValue(mockUser);

      const result = await tokenService.validateSessionFromRequest(mockRequest);

      expect(result).toEqual(mockUser);
    });

    it('should return null when no token in request', async () => {
      const mockRequest = {
        cookies: {},
        headers: {},
      } as unknown as Request;

      const result = await tokenService.validateSessionFromRequest(mockRequest);

      expect(result).toBeNull();
      expect(jwt.verify).not.toHaveBeenCalled();
    });

    it('should return null when token is invalid', async () => {
      const mockRequest = {
        cookies: { jwt: 'invalid-token' },
        headers: {},
      } as unknown as Request;

      (jwt.verify as unknown as MockInstance).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = await tokenService.validateSessionFromRequest(mockRequest);

      expect(result).toBeNull();
    });
  });

  describe('decodeJWT', () => {
    it('should decode JWT without validation', () => {
      const mockPayload = { userId: mockUser.id, email: mockUser.email };
      (jwt.decode as unknown as MockInstance).mockReturnValue(mockPayload);

      const result = tokenService.decodeJWT(mockJWTToken);

      expect(jwt.decode).toHaveBeenCalledWith(mockJWTToken);
      expect(result).toEqual(mockPayload);
    });

    it('should return null when decode fails', () => {
      (jwt.decode as unknown as MockInstance).mockImplementation(() => {
        throw new Error('Decode error');
      });

      const result = tokenService.decodeJWT(mockJWTToken);

      expect(result).toBeNull();
    });
  });

  describe('isJWTExpired', () => {
    it('should return false for non-expired token', () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      (jwt.decode as unknown as MockInstance).mockReturnValue({
        exp: futureExp,
      });

      const result = tokenService.isJWTExpired(mockJWTToken);

      expect(result).toBe(false);
    });

    it('should return true for expired token', () => {
      const pastExp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      (jwt.decode as unknown as MockInstance).mockReturnValue({ exp: pastExp });

      const result = tokenService.isJWTExpired(mockJWTToken);

      expect(result).toBe(true);
    });

    it('should return true for token without exp claim', () => {
      vi.mocked(jwt.decode).mockReturnValue({ userId: 'test' });

      const result = tokenService.isJWTExpired(mockJWTToken);

      expect(result).toBe(true);
    });

    it('should return true when decode fails', () => {
      (jwt.decode as unknown as MockInstance).mockImplementation(() => {
        throw new Error('Decode error');
      });

      const result = tokenService.isJWTExpired(mockJWTToken);

      expect(result).toBe(true);
    });
  });
});
