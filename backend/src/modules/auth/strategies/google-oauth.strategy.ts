import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
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
    });
  }

  authenticate(req: Request, options?: Record<string, unknown>): void {
    const authenticateOptions = {
      ...options,
      accessType: 'offline',
      prompt: 'consent',
    };

    return super.authenticate(req, authenticateOptions);
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: GoogleProfile,
    done: VerifyCallback,
  ): Promise<void> {
    try {
      console.log('OAuth tokens received:', {
        accessToken: accessToken ? 'present' : 'missing',
        refreshToken: refreshToken ? 'present' : 'missing',
      });
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

      // Delete existing tokens for this user/provider, then create new ones
      await this.tokenDBUtil.delete({
        criteria: { userId: user.id, provider: 'google' } as Parameters<
          TokenDBUtil['delete']
        >[0]['criteria'],
      });

      if (!accessToken) {
        throw new UnauthorizedException('No access token received from Google');
      }

      if (!refreshToken) {
        throw new UnauthorizedException(
          'No refresh token received from Google',
        );
      }

      const expiresAt = new Date(Date.now() + 3600 * 1000); // 1 hour from now

      await this.tokenDBUtil.create({
        creationData: {
          userId: user.id,
          provider: 'google',
          accessToken,
          refreshToken,
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
