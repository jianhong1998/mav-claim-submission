import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import {
  Strategy,
  VerifyCallback,
  StrategyOptions,
} from 'passport-google-oauth20';
import { UserDBUtil } from 'src/modules/user/utils/user-db.util';
import { TokenDBUtil } from '../utils/token-db.util';
import { IUserCreationData } from 'src/modules/user/types/user-creation-data.type';
import { EnvironmentVariableUtil } from 'src/modules/common/utils/environment-variable.util';
import { Request } from 'express';

interface GoogleProfile {
  id: string;
  emails: Array<{ value: string; verified: boolean }>;
  name: { familyName: string; givenName: string };
  photos: Array<{ value: string }>;
}

@Injectable()
export class GoogleOAuthStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleOAuthStrategy.name);

  constructor(
    private readonly userDBUtil: UserDBUtil,
    private readonly tokenDBUtil: TokenDBUtil,
    private readonly environmentVariableUtil: EnvironmentVariableUtil,
  ) {
    const envVars = environmentVariableUtil.getVariables();

    super({
      clientID: envVars.googleClientId,
      clientSecret: envVars.googleClientSecret,
      callbackURL: envVars.googleRedirectUri,
      scope: [
        'profile',
        'email',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/drive.file',
      ],
    } satisfies StrategyOptions);
  }

  authorizationParams(): { [key: string]: string } {
    return {
      access_type: 'offline',
      prompt: 'consent', // Forces consent screen for refreshToken on re-auth
    };
  }

  authenticate(req: Request, options?: Record<string, unknown>): void {
    return super.authenticate(req, options);
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: GoogleProfile,
    done: VerifyCallback,
  ): Promise<void> {
    try {
      this.logger.debug(
        'OAuth tokens received:',
        JSON.stringify({
          accessToken: accessToken ? 'present' : 'missing',
          refreshToken: refreshToken ? 'present' : 'missing',
        }),
      );
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
        const userData: IUserCreationData = {
          email,
          name: fullName,
          picture: picture || undefined,
          googleId: profile.id,
        };

        user = await this.userDBUtil.create({
          creationData: userData,
        });
      }

      if (!accessToken) {
        throw new UnauthorizedException('No access token received from Google');
      }

      // Handle missing refresh token by checking existing tokens
      let finalRefreshToken = refreshToken;
      if (!refreshToken) {
        this.logger.warn('No refresh token received, checking existing tokens');
        const existingTokenData =
          await this.tokenDBUtil.findByUserIdWithDecryptedTokens(
            user.id,
            'google',
          );

        if (existingTokenData?.decryptedRefreshToken) {
          finalRefreshToken = existingTokenData.decryptedRefreshToken;
          this.logger.debug('Reusing existing refresh token');
        } else {
          throw new UnauthorizedException(
            'No refresh token available. Please revoke app access in Google account settings and re-authenticate.',
          );
        }
      }

      // Upsert tokens (update if exists, create if not)
      const expiresAt = new Date(Date.now() + 3600 * 1000); // 1 hour from now

      await this.tokenDBUtil.upsert({
        creationData: {
          userId: user.id,
          provider: 'google',
          accessToken,
          refreshToken: finalRefreshToken,
          expiresAt,
          scope: 'profile email gmail.send drive.file',
        },
      });

      done(null, user);
    } catch (error) {
      done(error, false);
    }
  }
}
