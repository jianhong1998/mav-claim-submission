import { Injectable, Logger } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import type { Request } from 'express';
import { UserEntity } from 'src/modules/user/entities/user.entity';
import { UserDBUtil } from 'src/modules/user/utils/user-db.util';
import { EnvironmentVariableUtil } from 'src/modules/common/utils/environment-variable.util';

export interface JWTPayload extends jwt.JwtPayload {
  userId: string;
  email: string;
}

/**
 * TokenService - Centralized JWT token management
 *
 * Responsibilities:
 * - JWT token generation for user sessions
 * - JWT token validation and verification
 * - JWT token extraction from HTTP requests
 * - User session validation through JWT
 *
 * Requirements: 2.1 - User Session Management
 */
@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    private readonly userDBUtil: UserDBUtil,
    private readonly environmentVariableUtil: EnvironmentVariableUtil,
  ) {}

  /**
   * Generate JWT token for user session
   * Requirements: 2.1 - User Session Management
   */
  generateJWT(user: UserEntity): string {
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
    };

    return jwt.sign(
      payload,
      this.environmentVariableUtil.getVariables().jwtSecret,
      {
        expiresIn: '24h', // 24 hours
      },
    );
  }

  /**
   * Validate JWT token and return associated user
   * Requirements: 2.1 - User Session Management
   */
  async validateJWT(jwtToken: string): Promise<UserEntity | null> {
    try {
      const decoded = jwt.verify(
        jwtToken,
        this.environmentVariableUtil.getVariables().jwtSecret,
      ) as JWTPayload;

      if (!decoded.userId) {
        return null;
      }

      const user = await this.userDBUtil.getOne({
        criteria: { id: decoded.userId } as Parameters<
          UserDBUtil['getOne']
        >[0]['criteria'],
      });

      if (!user) {
        return null;
      }

      return user;
    } catch (error) {
      this.logger.warn('JWT validation failed:', (error as Error).message);
      return null;
    }
  }

  /**
   * Extract JWT token from HTTP request (cookie or Authorization header)
   *
   * Supports both authentication methods:
   * 1. HTTP-only cookie (primary method for web apps)
   * 2. Authorization Bearer header (for API clients)
   *
   * Requirements: 2.1 - User Session Management
   */
  extractJWTFromRequest(req: Request): string | null {
    // Try to get token from cookie first (primary method)
    const cookieToken = (req as Request & { cookies?: { jwt?: string } })
      .cookies?.jwt;
    if (cookieToken && typeof cookieToken === 'string') {
      return cookieToken;
    }

    // Try to get token from Authorization header (fallback)
    const authHeader = req.headers.authorization;
    if (
      authHeader &&
      typeof authHeader === 'string' &&
      authHeader.startsWith('Bearer ')
    ) {
      return authHeader.substring(7);
    }

    return null;
  }

  /**
   * Validate user session using JWT token from request
   *
   * Combines token extraction and validation in one call
   * Requirements: 2.1 - User Session Management
   */
  async validateSessionFromRequest(req: Request): Promise<UserEntity | null> {
    const token = this.extractJWTFromRequest(req);

    if (!token) {
      return null;
    }

    return this.validateJWT(token);
  }

  /**
   * Decode JWT payload without validation (for debugging/logging)
   *
   * Note: This does NOT validate the token signature or expiration
   * Only use for non-security-critical operations like logging
   */
  decodeJWT(token: string): JWTPayload | null {
    try {
      return jwt.decode(token) as JWTPayload;
    } catch (error) {
      this.logger.warn('JWT decode failed:', (error as Error).message);
      return null;
    }
  }

  /**
   * Check if JWT token is expired without full validation
   *
   * Useful for determining if token refresh is needed
   */
  isJWTExpired(token: string): boolean {
    try {
      const decoded = jwt.decode(token) as JWTPayload;
      if (!decoded || !decoded.exp) {
        return true;
      }
      return Date.now() >= decoded.exp * 1000;
    } catch (_error) {
      return true;
    }
  }
}
