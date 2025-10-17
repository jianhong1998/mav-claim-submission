import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type IEnvironmentVariableList = {
  // App Operation Related
  nodeEnv: string;
  port: number;
  buildMode: string;
  clientHost: string;
  cookieDomainName: string;
  cookieSecret: string;

  // Auth Related
  googleClientId: string;
  googleClientSecret: string;
  googleRedirectUri: string;
  googleDriveApiKey: string;
  googleDriveScope: string;
  tokenEncryptionKey: string;
  jwtSecret: string;

  // Database Related
  databaseHost: string;
  databasePort: number;
  databaseUser: string;
  databasePassword: string;
  databaseDb: string;

  // Email Related
  emailRecipients: string;
};

type IFeatureFlagList = {
  // Feature Flag Related
  enableApiTestMode: boolean;
};

@Injectable()
export class EnvironmentVariableUtil {
  private environmentVariableList: IEnvironmentVariableList | undefined;
  private featureFlagList: IFeatureFlagList | undefined;

  constructor(private readonly configService: ConfigService) {}

  private validateEmailRecipients(emailRecipients: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRecipients.trim()) {
      throw new Error('BACKEND_EMAIL_RECIPIENT cannot be empty');
    }

    const emails = emailRecipients
      .split(',')
      .map((email) => email.trim())
      .filter((email) => email.length > 0);

    if (emails.length === 0) {
      throw new Error(
        'BACKEND_EMAIL_RECIPIENT must contain at least one valid email address',
      );
    }

    for (const email of emails) {
      if (!emailRegex.test(email)) {
        throw new Error(
          `Invalid email format in BACKEND_EMAIL_RECIPIENT: ${email}`,
        );
      }
    }
  }

  private getValidatedEmailRecipients(): string {
    const emailRecipients: string = this.configService.getOrThrow(
      'BACKEND_EMAIL_RECIPIENT',
    );
    this.validateEmailRecipients(emailRecipients);
    return emailRecipients;
  }

  public getVariables(): IEnvironmentVariableList {
    if (this.environmentVariableList) return this.environmentVariableList;

    this.environmentVariableList = {
      nodeEnv: this.configService.get('NODE_ENV', 'dev'),
      buildMode: this.configService.get('BACKEND_BUILD_MODE', 'swc'),
      port: this.configService.get<number>('BACKEND_PORT', 3001),
      clientHost: this.configService.get(
        'BACKEND_CLIENT_HOST',
        'http://localhost:3000',
      ),
      cookieSecret: this.configService.get('BACKEND_COOKIE_SECRET', 'secret'),
      cookieDomainName: this.configService.get(
        'BACKEND_COOKIE_DOMAIN_NAME',
        'localhost',
      ),
      googleClientId: this.configService.getOrThrow(
        'BACKEND_GOOGLE_CLIENT_ID',
        '',
      ),
      googleClientSecret: this.configService.getOrThrow(
        'BACKEND_GOOGLE_CLIENT_SECRET',
        '',
      ),
      googleRedirectUri: this.configService.getOrThrow(
        'BACKEND_GOOGLE_REDIRECT_URI',
        '',
      ),
      googleDriveApiKey: this.configService.getOrThrow(
        'BACKEND_GOOGLE_DRIVE_API_KEY',
        '',
      ),
      googleDriveScope: this.configService.get(
        'BACKEND_GOOGLE_DRIVE_SCOPE',
        'https://www.googleapis.com/auth/drive.file',
      ),
      tokenEncryptionKey: this.configService.getOrThrow(
        'BACKEND_TOKEN_ENCRYPTION_KEY',
        '',
      ),
      jwtSecret: this.configService.get(
        'BACKEND_JWT_SECRET',
        'mav-claim-jwt-secret-default-key',
      ),
      databaseHost: this.configService.get('DATABASE_HOST', 'localhost'),
      databasePort: this.configService.get<number>('DATABASE_PORT', 5432),
      databaseUser: this.configService.get('DATABASE_USER', 'postgres'),
      databasePassword: this.configService.get('DATABASE_PASSWORD', 'postgres'),
      databaseDb: this.configService.get(
        'DATABASE_DB',
        'invoice_management_app_db',
      ),
      emailRecipients: this.getValidatedEmailRecipients(),
    };

    return this.environmentVariableList;
  }

  public getFeatureFlags(): IFeatureFlagList {
    if (!this.featureFlagList) {
      this.featureFlagList = {
        enableApiTestMode:
          this.configService.get<string>(
            'BACKEND_ENABLE_API_TEST_MODE',
            'false',
          ) === 'true',
      };
    }

    return this.featureFlagList;
  }
}
