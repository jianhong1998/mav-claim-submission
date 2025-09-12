import {
  Controller,
  Get,
  Post,
  UseGuards,
  Req,
  Res,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { AuthService } from '../services/auth.service';
import {
  AuthenticatedResponseDTO,
  UnauthenticatedResponseDTO,
  AuthStatusResponseDTO,
} from '../dtos/auth-response.dto';
import { UserEntity } from 'src/modules/user/entities/user.entity';
import { IUser } from '@project/types';
import { User, UserOptional } from '../decorators/user.decorator';
import {
  OAuthProtected,
  AuthGeneralRateLimit,
} from '../decorators/rate-limit.decorator';
import {
  type AuthenticatedRequest,
  JwtAuthGuard,
} from '../guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  /**
   * Initiate Google OAuth flow
   * Requirements: 4.1 - Authentication State API
   * Security: Rate limited to prevent OAuth abuse
   */
  @Get('google')
  @OAuthProtected('initiate')
  @UseGuards(AuthGuard('google'))
  initiateGoogleAuth(): void {
    // This will be handled by the GoogleOAuthStrategy with custom options
  }

  /**
   * Handle Google OAuth callback
   * Requirements: 4.1 - Authentication State API
   * Security: Rate limited to prevent OAuth callback abuse
   */
  @Get('google/callback')
  @OAuthProtected('callback')
  @UseGuards(AuthGuard('google'))
  async handleGoogleCallback(
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ): Promise<void> {
    try {
      if (!req.user) {
        this.logger.warn('OAuth callback received without user data');
        return res.redirect(
          `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=auth_failed`,
        );
      }

      const { user, jwt } = await this.authService.handleOAuthCallback(
        {
          id: req.user.googleId,
          emails: [{ value: req.user.email, verified: true }],
          name: {
            givenName: req.user.name.split(' ')[0] || '',
            familyName: req.user.name.split(' ').slice(1).join(' ') || '',
          },
          photos: req.user.picture ? [{ value: req.user.picture }] : [],
        },
        {
          access_token: 'handled_by_strategy',
          refresh_token: 'handled_by_strategy',
          expires_in: 3600,
          scope: 'profile email gmail.send drive.file',
        },
      );

      // Set JWT cookie
      res.cookie('jwt', jwt, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      });

      this.logger.log(`OAuth callback successful for user: ${user.id}`);

      // Redirect to frontend
      return res.redirect(process.env.FRONTEND_URL || 'http://localhost:3000');
    } catch (error) {
      this.logger.error('OAuth callback error:', error);
      return res.redirect(
        `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=auth_failed`,
      );
    }
  }

  /**
   * Check authentication status
   * Requirements: 4.1 - Authentication State API
   * Note: No rate limiting on status endpoint for integration tests
   */
  @Get('status')
  getAuthStatus(
    @UserOptional() user: UserEntity | null,
  ): AuthStatusResponseDTO {
    if (!user) {
      return new AuthStatusResponseDTO({
        isAuthenticated: false,
      });
    }

    const userDTO = this.mapUserEntityToDTO(user);

    return new AuthStatusResponseDTO({
      isAuthenticated: true,
      user: userDTO,
    });
  }

  /**
   * Get current user profile
   * Requirements: 4.1 - Authentication State API
   * Security: Rate limited for API protection
   */
  @Get('profile')
  @AuthGeneralRateLimit()
  @UseGuards(JwtAuthGuard)
  getUserProfile(@User() user: UserEntity): AuthenticatedResponseDTO {
    const userDTO = this.mapUserEntityToDTO(user);

    return new AuthenticatedResponseDTO({
      user: userDTO,
      message: 'Profile retrieved successfully',
    });
  }

  /**
   * Logout user and clear session
   * Requirements: 4.1 - Authentication State API
   * Security: Rate limited for API protection
   */
  @Post('logout')
  @AuthGeneralRateLimit()
  async logout(
    @UserOptional() user: UserEntity | null,
    @Res() res: Response,
  ): Promise<void> {
    try {
      if (user) {
        await this.authService.logout(user.id);
        this.logger.log(`User logged out: ${user.email}`);
      }

      // Clear JWT cookie
      res.clearCookie('jwt');

      res.status(HttpStatus.OK).json(
        new UnauthenticatedResponseDTO({
          message: 'Logged out successfully',
        }),
      );
    } catch (error) {
      this.logger.error('Logout error:', error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
        new UnauthenticatedResponseDTO({
          message: 'Logout failed',
        }),
      );
    }
  }

  /**
   * Convert UserEntity to IUser DTO
   */
  private mapUserEntityToDTO(user: UserEntity): IUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture,
      googleId: user.googleId,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}
