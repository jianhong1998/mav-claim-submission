import {
  Controller,
  Get,
  Post,
  UseGuards,
  Req,
  Res,
  HttpStatus,
  Session,
  Headers,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { IAuthResponse } from '@project/types';
import { EnvironmentVariableUtil } from '../../common/utils/environment-variable.util';
import { LoggerUtil } from 'src/modules/common/utils/logger.util';

interface AuthenticatedUser {
  googleId: string;
  email: string;
  name: string;
  picture?: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scope: string;
}

interface SessionData {
  userId?: string;
  isAuthenticated?: boolean;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly environmentVariableUtil: EnvironmentVariableUtil,
    private readonly loggerUtil: LoggerUtil,
  ) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(): Promise<void> {
    // This endpoint initiates the Google OAuth flow
    // The actual redirect is handled by Passport
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(
    @Req() req: Request & { user: AuthenticatedUser },
    @Res() res: Response,
    @Session() session: SessionData,
  ): Promise<void> {
    const logger = this.loggerUtil.createLogger(
      `${AuthController.name}.${AuthController.prototype.googleAuthCallback.name}`,
    );

    try {
      const { user, isNewUser } = await this.authService.handleOAuthCallback({
        googleId: req.user.googleId,
        email: req.user.email,
        name: req.user.name,
        picture: req.user.picture,
        accessToken: req.user.accessToken,
        refreshToken: req.user.refreshToken,
        expiresAt: req.user.expiresAt,
        scope: req.user.scope,
      });

      // Set session data
      if (session) {
        session.userId = user.id;
        session.isAuthenticated = true;
      }

      // Redirect to frontend with success status
      const variables = this.environmentVariableUtil.getVariables();
      const redirectUrl = variables.frontendBaseUrl;
      const params = new URLSearchParams({
        status: 'success',
        isNewUser: isNewUser.toString(),
      });

      res.redirect(`${redirectUrl}/auth/callback?${params.toString()}`);
    } catch (error: unknown) {
      logger.error('OAuth callback error:', error);
      const variables = this.environmentVariableUtil.getVariables();
      const redirectUrl = variables.frontendBaseUrl;
      res.redirect(
        `${redirectUrl}/auth/callback?status=error&message=Authentication failed`,
      );
    }
  }

  @Get('profile')
  async getProfile(
    @Session() session: SessionData,
    @Res() res: Response,
    @Headers('x-test-bypass') testBypass?: string,
  ): Promise<Response<IAuthResponse>> {
    const logger = this.loggerUtil.createLogger(
      `${AuthController.name}.${AuthController.prototype.getProfile.name}`,
    );

    // TODO: Temporary bypass for testing - remove in production
    if (testBypass === 'true') {
      return res.status(HttpStatus.OK).json({
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          name: 'Test User',
          picture: null,
        },
        isAuthenticated: true,
        message: 'Test user authenticated',
      });
    }

    if (!session || !session.isAuthenticated || !session.userId) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        user: null,
        isAuthenticated: false,
        message: 'Not authenticated',
      });
    }

    try {
      const profileResponse = await this.authService.getUserProfile(
        session.userId,
      );
      return res.status(HttpStatus.OK).json(profileResponse);
    } catch (error: unknown) {
      logger.error('Get profile error:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        user: null,
        isAuthenticated: false,
        message: 'Failed to get user profile',
      });
    }
  }

  @Post('logout')
  async logout(
    @Session() session: SessionData,
    @Res() res: Response,
  ): Promise<Response<{ success: boolean; message: string }>> {
    const logger = this.loggerUtil.createLogger(
      `${AuthController.name}.${AuthController.prototype.logout.name}`,
    );

    if (!session?.isAuthenticated || !session?.userId) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        success: false,
        message: 'Not authenticated',
      });
    }

    try {
      await this.authService.logout(session.userId);

      // Clear session
      if (session) {
        session.userId = undefined;
        session.isAuthenticated = false;
      }

      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error: unknown) {
      logger.error('Logout error:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to logout',
      });
    }
  }

  @Get('status')
  getAuthStatus(@Session() session: SessionData): {
    isAuthenticated: boolean;
    userId?: string;
  } {
    return {
      isAuthenticated: !!session?.isAuthenticated && !!session?.userId,
      userId: session?.userId,
    };
  }

  @Post('refresh')
  async refreshToken(
    @Session() session: SessionData,
    @Res() res: Response,
  ): Promise<Response<{ success: boolean; message: string }>> {
    const logger = this.loggerUtil.createLogger(
      `${AuthController.name}.${AuthController.prototype.refreshToken.name}`,
    );

    if (!session?.isAuthenticated || !session?.userId) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        success: false,
        message: 'Not authenticated',
      });
    }

    try {
      const refreshed = await this.authService.refreshUserToken(session.userId);

      if (!refreshed) {
        return res.status(HttpStatus.UNAUTHORIZED).json({
          success: false,
          message: 'Failed to refresh token',
        });
      }

      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Token refreshed successfully',
      });
    } catch (error: unknown) {
      logger.error('Token refresh error:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to refresh token',
      });
    }
  }
}
