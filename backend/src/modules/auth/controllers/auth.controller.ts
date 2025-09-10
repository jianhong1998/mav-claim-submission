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
import type { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { TokenService } from '../services/token.service';
import {
  AuthenticatedResponseDTO,
  UnauthenticatedResponseDTO,
  AuthStatusResponseDTO,
} from '../dtos/auth-response.dto';
import { UserEntity } from 'src/modules/user/entities/user.entity';
import { IUser } from '@project/types';

interface AuthenticatedRequest extends Request {
  user?: UserEntity;
}

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly tokenService: TokenService,
  ) {}

  /**
   * Initiate Google OAuth flow
   * Requirements: 4.1 - Authentication State API
   */
  @Get('google')
  @UseGuards(AuthGuard('google'))
  initiateGoogleAuth(): void {
    // This endpoint initiates the OAuth flow
    // The actual handling is done by the GoogleOAuthStrategy
  }

  /**
   * Handle Google OAuth callback
   * Requirements: 4.1 - Authentication State API
   */
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async handleGoogleCallback(
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ): Promise<void> {
    try {
      if (!req.user) {
        this.logger.warn('OAuth callback received without user data');
        return res.redirect('/login?error=auth_failed');
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

      this.logger.log(`OAuth callback successful for user: ${user.email}`);

      // Redirect to frontend
      return res.redirect(process.env.FRONTEND_URL || 'http://localhost:3000');
    } catch (error) {
      this.logger.error('OAuth callback error:', error);
      return res.redirect('/login?error=auth_failed');
    }
  }

  /**
   * Check authentication status
   * Requirements: 4.1 - Authentication State API
   */
  @Get('status')
  async getAuthStatus(@Req() req: Request): Promise<AuthStatusResponseDTO> {
    const user = await this.tokenService.validateSessionFromRequest(req);

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
   */
  @Get('profile')
  async getUserProfile(
    @Req() req: Request,
  ): Promise<AuthenticatedResponseDTO | UnauthenticatedResponseDTO> {
    const user = await this.tokenService.validateSessionFromRequest(req);

    if (!user) {
      const token = this.tokenService.extractJWTFromRequest(req);
      const message = !token
        ? 'No authentication token provided'
        : 'Invalid or expired session';

      return new UnauthenticatedResponseDTO({
        message,
      });
    }

    const userDTO = this.mapUserEntityToDTO(user);

    return new AuthenticatedResponseDTO({
      user: userDTO,
      message: 'Profile retrieved successfully',
    });
  }

  /**
   * Logout user and clear session
   * Requirements: 4.1 - Authentication State API
   */
  @Post('logout')
  async logout(@Req() req: Request, @Res() res: Response): Promise<void> {
    try {
      const user = await this.tokenService.validateSessionFromRequest(req);

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
