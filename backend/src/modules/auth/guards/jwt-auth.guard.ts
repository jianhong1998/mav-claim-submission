import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import type { Request } from 'express';
import { TokenService } from '../services/token.service';
import { UserEntity } from 'src/modules/user/entities/user.entity';

export interface AuthenticatedRequest extends Request {
  user: UserEntity;
}

/**
 * JWT Authentication Guard for route protection
 * Requirements: 2.1 - User Session Management
 *
 * Validates JWT tokens and injects authenticated user into request context.
 * Supports both cookie-based and Authorization header authentication.
 *
 * Refactored to use TokenService for clean separation of concerns.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private readonly tokenService: TokenService) {}

  /**
   * Route protection logic - validates JWT token and injects user context
   * Requirements: 2.1 - User Session Management
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    try {
      // Extract JWT token from request (cookie or Authorization header)
      const token = this.tokenService.extractJWTFromRequest(request);

      if (!token) {
        this.logger.warn('No authentication token provided');
        throw new UnauthorizedException('Authentication token required');
      }

      // Validate session using TokenService
      const user = await this.tokenService.validateJWT(token);

      if (!user) {
        this.logger.warn('Invalid or expired JWT token');
        throw new UnauthorizedException('Invalid or expired session');
      }

      // Inject authenticated user into request context
      request.user = user;

      this.logger.debug(`JWT validation successful for user: ${user.email}`);
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      this.logger.error('JWT authentication error:', error);
      throw new UnauthorizedException('Authentication failed');
    }
  }
}
