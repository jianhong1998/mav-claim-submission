import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import {
  Strategy,
  VerifyCallback,
  StrategyOptions,
} from 'passport-google-oauth20';
import { EnvironmentVariableUtil } from '../../common/utils/environment-variable.util';
import { LoggerUtil } from '../../common/utils/logger.util';

export interface IPassportUser {
  googleId: string;
  email: string;
  name: string;
  picture?: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  scope: string;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger: Logger;

  constructor(
    private environmentVariableUtil: EnvironmentVariableUtil,
    private loggerUtil: LoggerUtil,
  ) {
    const variables = environmentVariableUtil.getVariables();
    const clientID = variables.googleClientId;
    const clientSecret = variables.googleClientSecret;
    const callbackURL = variables.googleRedirectUri;

    if (!clientID || !clientSecret || !callbackURL) {
      throw new Error(
        'Google OAuth configuration is missing. Please set BACKEND_GOOGLE_CLIENT_ID, BACKEND_GOOGLE_CLIENT_SECRET, and BACKEND_GOOGLE_REDIRECT_URI environment variables.',
      );
    }

    super({
      clientID,
      clientSecret,
      callbackURL,
      scope: [
        'email',
        'profile',
        'https://www.googleapis.com/auth/gmail.send',
        variables.googleDriveScope,
      ],
    } as StrategyOptions);

    this.logger = this.loggerUtil.createLogger('GoogleStrategy');
  }

  validate(
    accessToken: string,
    refreshToken: string,
    profile: unknown,
    done: VerifyCallback,
  ): IPassportUser {
    this.logger.log('Starting Google OAuth validation');

    try {
      // Type guard for profile object
      const profileData = profile as {
        id: string;
        emails?: { value: string }[];
        name?: { givenName?: string; familyName?: string };
        photos?: { value: string }[];
        _json?: { expires_in?: number };
      };

      this.logger.debug(`Processing profile for Google ID: ${profileData.id}`);

      // Validate required profile data
      if (!profileData.id) {
        this.logger.error(
          'Google profile validation failed: missing profile ID',
        );
        throw new Error('Google profile ID is missing');
      }

      const email = profileData.emails?.[0]?.value;
      if (!email) {
        this.logger.error('Google profile validation failed: missing email');
        throw new Error('Google profile email is missing');
      }

      const givenName = profileData.name?.givenName || '';
      const familyName = profileData.name?.familyName || '';
      const fullName = `${givenName} ${familyName}`.trim();
      if (!fullName) {
        this.logger.error('Google profile validation failed: missing name');
        throw new Error('Google profile name is missing');
      }

      // Calculate token expiry with improved fallback handling
      const expiresInSeconds = this.calculateTokenExpiry(
        profileData._json?.expires_in,
      );
      const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

      this.logger.debug(`Token expires at: ${expiresAt.toISOString()}`);

      // Handle missing refresh token scenario
      if (!refreshToken) {
        this.logger.warn('No refresh token received from Google OAuth');
      }

      const variables = this.environmentVariableUtil.getVariables();
      const user: IPassportUser = {
        googleId: profileData.id,
        email,
        name: fullName,
        picture: profileData.photos?.[0]?.value,
        accessToken,
        refreshToken,
        expiresAt,
        scope: `email profile https://www.googleapis.com/auth/gmail.send ${variables.googleDriveScope}`,
      };

      this.logger.log(`Google OAuth validation successful for user: ${email}`);
      done(null, user);
      return user;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Google OAuth validation failed: ${errorMessage}`,
        errorStack,
      );
      done(error as Error, false);
      throw error;
    }
  }

  private calculateTokenExpiry(expiresIn?: number): number {
    if (expiresIn && expiresIn > 0) {
      this.logger.debug(
        `Using Google-provided expires_in: ${expiresIn} seconds`,
      );
      return expiresIn;
    }

    // Default to 1 hour (3600 seconds) if not provided or invalid
    const defaultExpiry = 3600;
    this.logger.debug(`Using default token expiry: ${defaultExpiry} seconds`);
    return defaultExpiry;
  }
}
