import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthenticatedRequest } from '../guards/jwt-auth.guard';
import { UserEntity } from 'src/modules/user/entities/user.entity';

/**
 * Custom parameter decorator to extract authenticated user entity from request
 *
 * This decorator expects the user to be attached to the request object
 * by the JwtAuthGuard that validates JWT tokens.
 *
 * Usage with required authentication:
 * @Get('profile')
 * @UseGuards(JwtAuthGuard)
 * async getUserProfile(@User() user: UserEntity) {
 *   // user is guaranteed to exist when JwtAuthGuard passes
 *   return user;
 * }
 *
 * Usage for optional authentication:
 * @Get('public-endpoint')
 * async getPublicData(@UserOptional() user: UserEntity | null) {
 *   // user may be null if no valid token provided
 *   if (user) {
 *     return getPersonalizedData(user);
 *   }
 *   return getPublicData();
 * }
 *
 * Requirements: 2.1 - User Session Management
 */
export const User = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UserEntity => {
    const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    // User will be set by JwtAuthGuard
    const user = req.user;
    if (!user) throw new UnauthorizedException('Login required.');
    return user;
  },
);

/**
 * Optional user decorator for endpoints that don't require authentication
 * but can provide personalized responses if authenticated
 */
export const UserOptional = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UserEntity | null => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.user ?? null;
  },
);
