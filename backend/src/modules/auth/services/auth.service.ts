import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { UserDBUtil } from 'src/modules/user/utils/user-db.util';
import { TokenDBUtil } from '../utils/token-db.util';
import { UserEntity } from 'src/modules/user/entities/user.entity';
import { OAuthTokenEntity } from '../entities/oauth-token.entity';
import { google } from 'googleapis';
import { TokenService } from './token.service';

export interface GoogleProfile {
  id: string;
  emails: Array<{ value: string; verified: boolean }>;
  name: { familyName: string; givenName: string };
  photos: Array<{ value: string }>;
}

export interface GoogleTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
}

/**
 * AuthService - OAuth and User Management
 *
 * Responsibilities:
 * - Google OAuth flow processing
 * - OAuth token storage and refresh
 * - User creation and management
 * - OAuth session lifecycle
 *
 * Requirements: 1.1 - OAuth Flow, 3.1 - Token Management
 *
 * Note: JWT functionality moved to TokenService for clean separation of concerns
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userDBUtil: UserDBUtil,
    private readonly tokenDBUtil: TokenDBUtil,
    private readonly tokenService: TokenService,
  ) {}

  /**
   * Handle OAuth callback - Process successful OAuth authentication
   * Requirements: 2.1 - User Session Management
   */
  async handleOAuthCallback(
    profile: GoogleProfile,
    tokens: GoogleTokens,
  ): Promise<{ user: UserEntity; jwt: string }> {
    try {
      const email = profile.emails?.[0]?.value;

      if (!email) {
        throw new UnauthorizedException('No email found in Google profile');
      }

      // Domain validation - hard requirement
      if (!email.endsWith('@mavericks-consulting.com')) {
        throw new UnauthorizedException(
          'Access denied: Only @mavericks-consulting.com accounts are allowed',
        );
      }

      const fullName = `${profile.name.givenName} ${profile.name.familyName}`;
      const picture = profile.photos?.[0]?.value || null;

      // Find or create user
      let user = await this.userDBUtil.getOne({
        criteria: { email } as Parameters<UserDBUtil['getOne']>[0]['criteria'],
      });

      if (!user) {
        user = await this.userDBUtil.create({
          creationData: {
            email,
            name: fullName,
            picture: picture || undefined,
            googleId: profile.id,
          },
        });
      }

      // Store/update OAuth tokens
      await this.storeTokens(user.id, tokens);

      // Generate JWT session token using TokenService
      const jwt = this.tokenService.generateJWT(user);

      this.logger.log(`OAuth callback successful for user: ${email}`);

      return { user, jwt };
    } catch (error) {
      this.logger.error('OAuth callback error:', error);
      throw error;
    }
  }

  /**
   * Refresh OAuth tokens when expired
   * Requirements: 3.1 - Token Management and Refresh
   */
  async refreshTokens(userId: string): Promise<boolean> {
    try {
      const tokenEntity = await this.tokenDBUtil.getOne({
        criteria: {
          userId,
          provider: 'google',
        } as Parameters<TokenDBUtil['getOne']>[0]['criteria'],
      });

      if (!tokenEntity || !tokenEntity.refreshToken) {
        this.logger.warn(`No refresh token found for user: ${userId}`);
        return false;
      }

      // Check if token is actually expired
      if (tokenEntity.expiresAt > new Date()) {
        this.logger.debug(`Token not expired for user: ${userId}`);
        return true;
      }

      // Use Google OAuth2 client to refresh token
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
      );

      const { refreshToken: decryptedRefreshToken } =
        await this.tokenDBUtil.getDecryptedTokens(tokenEntity);

      oauth2Client.setCredentials({
        refresh_token: decryptedRefreshToken,
      });

      const { credentials } = await oauth2Client.refreshAccessToken();

      if (credentials.access_token) {
        // Update token in database
        await this.tokenDBUtil.delete({
          criteria: {
            userId,
            provider: 'google',
          } as Parameters<TokenDBUtil['delete']>[0]['criteria'],
        });

        await this.tokenDBUtil.create({
          creationData: {
            userId,
            provider: 'google',
            accessToken: credentials.access_token,
            refreshToken: credentials.refresh_token || decryptedRefreshToken,
            expiresAt: new Date(
              Date.now() + (credentials.expiry_date || 3600 * 1000),
            ),
            scope: tokenEntity.scope,
          },
        });

        this.logger.log(`Tokens refreshed successfully for user: ${userId}`);
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error(`Token refresh failed for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Logout user and invalidate session
   * Requirements: 2.1 - User Session Management
   */
  async logout(userId: string): Promise<void> {
    try {
      // Soft delete OAuth tokens to invalidate them
      await this.tokenDBUtil.delete({
        criteria: {
          userId,
        } as Parameters<TokenDBUtil['delete']>[0]['criteria'],
      });

      this.logger.log(`User logged out successfully: ${userId}`);
    } catch (error) {
      this.logger.error(`Logout failed for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get user's valid OAuth tokens
   * Requirements: 3.1 - Token Management and Refresh
   */
  async getUserTokens(userId: string): Promise<OAuthTokenEntity | null> {
    const tokenEntity = await this.tokenDBUtil.getOne({
      criteria: {
        userId,
        provider: 'google',
      } as Parameters<TokenDBUtil['getOne']>[0]['criteria'],
    });

    if (!tokenEntity) {
      return null;
    }

    // Auto-refresh if expired
    if (tokenEntity.expiresAt <= new Date()) {
      const refreshSuccess = await this.refreshTokens(userId);
      if (!refreshSuccess) {
        return null;
      }

      // Fetch updated tokens
      return await this.tokenDBUtil.getOne({
        criteria: {
          userId,
          provider: 'google',
        } as Parameters<TokenDBUtil['getOne']>[0]['criteria'],
      });
    }

    return tokenEntity;
  }

  /**
   * Validate JWT token and return associated user
   * Requirements: 2.1 - User Session Management
   */
  async validateSession(jwtToken: string): Promise<UserEntity | null> {
    return this.tokenService.validateJWT(jwtToken);
  }

  /**
   * Store OAuth tokens securely in database
   * Requirements: 3.1 - Token Management and Refresh
   */
  private async storeTokens(
    userId: string,
    tokens: GoogleTokens,
  ): Promise<void> {
    // Delete existing tokens for this user/provider
    await this.tokenDBUtil.delete({
      criteria: {
        userId,
        provider: 'google',
      } as Parameters<TokenDBUtil['delete']>[0]['criteria'],
    });

    // Calculate expiration time
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // Create new token record
    await this.tokenDBUtil.create({
      creationData: {
        userId,
        provider: 'google',
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
        scope: tokens.scope || 'profile email gmail.send drive.file',
      },
    });
  }
}
