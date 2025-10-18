import {
  Controller,
  Get,
  Post,
  UseGuards,
  Req,
  Res,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { AuthService } from '../services/auth.service';
import { TokenDBUtil } from '../utils/token-db.util';
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
import { JwtOptionalGuard } from '../guards/jwt-optional.guard';
import { EnvironmentVariableUtil } from 'src/modules/common/utils/environment-variable.util';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly tokenDBUtil: TokenDBUtil,
    private readonly environmentVariableUtil: EnvironmentVariableUtil,
  ) {}

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
    const clientBaseUrl = new URL(
      this.environmentVariableUtil.getVariables().clientHost,
    );

    try {
      if (!req.user) {
        this.logger.warn('OAuth callback received without user data');
        const url = new URL('/login?error=auth_failed', clientBaseUrl);
        return res.redirect(url.toString());
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
        null, // OAuth tokens are already handled by the strategy
      );

      // Set JWT cookie
      res.cookie('jwt', jwt, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      });

      this.logger.log(`OAuth callback successful for user: ${user.id}`);

      // Redirect to frontend callback page to refresh auth state
      return res.redirect(new URL('/callback', clientBaseUrl).toString());
    } catch (error) {
      this.logger.error('OAuth callback error:', error);
      return res.redirect(
        new URL(`/login?error=auth_failed`, clientBaseUrl).toString(),
      );
    }
  }

  /**
   * Check authentication status
   * Requirements: 4.1 - Authentication State API
   * Note: No rate limiting on status endpoint for integration tests
   */
  @Get('status')
  @UseGuards(JwtOptionalGuard)
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
   * Get Google Drive access token for client-side uploads
   * Requirements: 2.0 - Drive Token Management Endpoint
   * Security: Rate limited, JWT authenticated, minimal scope validation
   */
  @Get('drive-token')
  @AuthGeneralRateLimit()
  @UseGuards(JwtAuthGuard)
  async getDriveToken(@User() user: UserEntity): Promise<{
    success: boolean;
    access_token?: string;
    expires_in?: number;
    token_type?: string;
    error?: string;
    errorCode?: string;
    retryAfter?: number;
  }> {
    try {
      // Get user's OAuth tokens using existing AuthService method
      const tokenEntity = await this.authService.getUserTokens(user.id);

      if (!tokenEntity) {
        this.logger.warn(
          `No valid Google Drive tokens found for user: ${user.id}`,
        );
        return {
          success: false,
          error:
            'No valid Google Drive tokens found. Please re-authenticate with Google.',
          errorCode: 'TOKEN_NOT_FOUND',
        };
      }

      // Validate token scope includes drive.file
      if (!tokenEntity.scope.includes('drive.file')) {
        this.logger.warn(
          `Insufficient Google Drive scope for user: ${user.id}, scope: ${tokenEntity.scope}`,
        );
        return {
          success: false,
          error:
            'Insufficient permissions. Google Drive access required. Please re-authenticate.',
          errorCode: 'INSUFFICIENT_SCOPE',
        };
      }

      // Check if token is expiring soon (within 5 minutes)
      const expiresInMs = tokenEntity.expiresAt.getTime() - Date.now();
      if (expiresInMs < 300000) {
        // 5 minutes
        this.logger.log(
          `Token expiring soon for user: ${user.id}, attempting refresh`,
        );

        const refreshSuccess = await this.authService.refreshTokens(user.id);
        if (!refreshSuccess) {
          this.logger.warn(`Token refresh failed for user: ${user.id}`);
          return {
            success: false,
            error:
              'Access token expired and refresh failed. Please re-authenticate with Google.',
            errorCode: 'TOKEN_REFRESH_FAILED',
          };
        }

        // Fetch the refreshed token
        const refreshedTokenEntity = await this.authService.getUserTokens(
          user.id,
        );
        if (!refreshedTokenEntity) {
          return {
            success: false,
            error:
              'Token refresh succeeded but could not retrieve new token. Please try again.',
            errorCode: 'TOKEN_REFRESH_RETRIEVAL_FAILED',
          };
        }

        // Decrypt refreshed tokens
        const { accessToken } =
          await this.tokenDBUtil.getDecryptedTokens(refreshedTokenEntity);
        const expiresIn = Math.floor(
          (refreshedTokenEntity.expiresAt.getTime() - Date.now()) / 1000,
        );

        this.logger.log(
          `Drive token refreshed and retrieved successfully for user: ${user.id}`,
        );

        return {
          success: true,
          access_token: accessToken,
          expires_in: expiresIn,
          token_type: 'Bearer',
        };
      }

      // Decrypt tokens using existing TokenDBUtil method
      const { accessToken } =
        await this.tokenDBUtil.getDecryptedTokens(tokenEntity);
      const expiresIn = Math.floor(
        (tokenEntity.expiresAt.getTime() - Date.now()) / 1000,
      );

      this.logger.log(
        `Drive token retrieved successfully for user: ${user.id}`,
      );

      return {
        success: true,
        access_token: accessToken,
        expires_in: expiresIn,
        token_type: 'Bearer',
      };
    } catch (error) {
      this.logger.error(
        `Failed to get Drive token for user ${user.id}:`,
        error,
      );

      // Handle specific error types
      if (error instanceof BadRequestException) {
        return {
          success: false,
          error: error.message,
          errorCode: 'BAD_REQUEST',
        };
      }

      // Check for database/network errors that might be temporary
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (
        errorMessage.includes('timeout') ||
        errorMessage.includes('connection')
      ) {
        return {
          success: false,
          error: 'Temporary service unavailable. Please try again in a moment.',
          errorCode: 'SERVICE_TEMPORARILY_UNAVAILABLE',
          retryAfter: 30, // seconds
        };
      }

      return {
        success: false,
        error:
          'Unable to retrieve Google Drive access token. Please try again or re-authenticate.',
        errorCode: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Logout user and clear session
   * Requirements: 4.1 - Authentication State API
   * Security: Rate limited for API protection
   */
  @Post('logout')
  @AuthGeneralRateLimit()
  @UseGuards(JwtOptionalGuard)
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
