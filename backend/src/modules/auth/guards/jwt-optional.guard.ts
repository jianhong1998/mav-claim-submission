import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
} from '@nestjs/common';
import type { Request } from 'express';
import { TokenService } from '../services/token.service';
import { UserEntity } from 'src/modules/user/entities/user.entity';

export interface OptionalAuthRequest extends Request {
  user?: UserEntity;
}

/**
 * Optional JWT Authentication Guard
 *
 * Attempts to validate JWT tokens but allows request to proceed
 * even if no token is present or validation fails.
 * Used for endpoints that can provide personalized responses for authenticated users
 * but still function for anonymous users.
 */
@Injectable()
export class JwtOptionalGuard implements CanActivate {
  private readonly logger = new Logger(JwtOptionalGuard.name);

  constructor(private readonly tokenService: TokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<OptionalAuthRequest>();

    try {
      const token = this.tokenService.extractJWTFromRequest(request);

      if (!token) {
        return true;
      }

      const user = await this.tokenService.validateJWT(token);

      if (user) {
        request.user = user;
        this.logger.debug(
          `Optional JWT validation successful for user: ${user.email}`,
        );
      }

      return true;
    } catch (_error) {
      this.logger.debug(
        'Optional JWT validation failed, proceeding as anonymous',
      );
      return true;
    }
  }
}
