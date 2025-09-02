import {
  Injectable,
  Logger,
  BadRequestException,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { TokenService } from 'src/modules/auth/services/token.service';
import { IEmailSendRequest, IEmailSendResponse } from '@project/types';
import { EnvironmentVariableUtil } from '../../common/utils/environment-variable.util';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly oauth2Client: OAuth2Client;

  constructor(
    private readonly tokenService: TokenService,
    private readonly environmentVariableUtil: EnvironmentVariableUtil,
  ) {
    const variables = environmentVariableUtil.getVariables();
    this.oauth2Client = new google.auth.OAuth2(
      variables.googleClientId,
      variables.googleClientSecret,
      variables.googleRedirectUri,
    );
  }

  async sendEmail(
    userId: string,
    emailData: IEmailSendRequest,
  ): Promise<IEmailSendResponse> {
    try {
      // Validate email data
      this.validateEmailData(emailData);

      // Get valid token for user
      const tokens = await this.tokenService.getValidTokenForUser(userId);
      if (!tokens) {
        throw new UnauthorizedException(
          'User not authenticated or tokens expired',
        );
      }

      // Set credentials for OAuth2 client
      this.oauth2Client.setCredentials({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
      });

      // Create Gmail API client
      const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });

      // Prepare email message
      const emailContent = this.prepareEmailContent(emailData);
      const encodedEmail = Buffer.from(emailContent).toString('base64url');

      // Send email via Gmail API
      const response = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedEmail,
        },
      });

      this.logger.log(
        `Email sent successfully to ${emailData.to}, messageId: ${response.data.id}`,
      );

      return {
        success: true,
        messageId: response.data.id || undefined,
      };
    } catch (error: unknown) {
      this.logger.error(
        `Failed to send email to ${emailData.to}:`,
        error instanceof Error ? error.message : 'Unknown error',
      );

      if (
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }

      // Handle Gmail API specific errors
      if (typeof error === 'object' && error !== null && 'code' in error) {
        const errorWithCode = error as { code: number };
        if (errorWithCode.code === 403) {
          throw new UnauthorizedException(
            'Gmail API access forbidden. Please re-authenticate.',
          );
        }

        if (errorWithCode.code === 429) {
          throw new InternalServerErrorException(
            'Gmail API quota exceeded. Please try again later.',
          );
        }
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send email',
      };
    }
  }

  private validateEmailData(emailData: IEmailSendRequest): void {
    if (!emailData.to || !this.isValidEmail(emailData.to)) {
      throw new BadRequestException('Invalid recipient email address');
    }

    if (!emailData.subject || emailData.subject.trim().length === 0) {
      throw new BadRequestException('Email subject is required');
    }

    if (!emailData.body || emailData.body.trim().length === 0) {
      throw new BadRequestException('Email body is required');
    }

    // Check for reasonable limits
    if (emailData.subject.length > 998) {
      throw new BadRequestException(
        'Email subject too long (max 998 characters)',
      );
    }

    if (emailData.body.length > 1000000) {
      throw new BadRequestException('Email body too long (max 1MB)');
    }
  }

  private isValidEmail(email: string): boolean {
    // More strict email validation that rejects consecutive dots
    const emailRegex =
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

    // Additional check for consecutive dots and other edge cases
    if (
      email.includes('..') ||
      email.startsWith('.') ||
      email.endsWith('.') ||
      email.includes('.@') ||
      email.includes('@.')
    ) {
      return false;
    }

    return emailRegex.test(email);
  }

  private prepareEmailContent(emailData: IEmailSendRequest): string {
    const { to, subject, body, isHtml = false } = emailData;

    const contentType = isHtml ? 'text/html' : 'text/plain';

    const emailLines = [
      `To: ${to}`,
      `Subject: ${subject}`,
      `Content-Type: ${contentType}; charset=utf-8`,
      '',
      body,
    ];

    return emailLines.join('\r\n');
  }

  async refreshUserToken(userId: string): Promise<boolean> {
    try {
      const tokens = await this.tokenService.getValidTokenForUser(userId);
      if (!tokens) {
        return false;
      }

      this.oauth2Client.setCredentials({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
      });

      // Attempt to refresh the token
      const { credentials } = await this.oauth2Client.refreshAccessToken();

      if (credentials.access_token && credentials.expiry_date) {
        // Update tokens in database
        await this.tokenService.updateToken({
          userId,
          provider: 'google',
          accessToken: credentials.access_token,
          refreshToken: credentials.refresh_token || tokens.refreshToken,
          expiresAt: new Date(credentials.expiry_date),
          scope: 'https://www.googleapis.com/auth/gmail.send',
        });

        this.logger.log(`Token refreshed successfully for user ${userId}`);
        return true;
      }

      return false;
    } catch (error: unknown) {
      this.logger.error(
        `Failed to refresh token for user ${userId}:`,
        error instanceof Error ? error.message : 'Unknown error',
      );
      return false;
    }
  }

  async checkGmailAccess(userId: string): Promise<boolean> {
    try {
      const tokens = await this.tokenService.getValidTokenForUser(userId);
      if (!tokens) {
        return false;
      }

      this.oauth2Client.setCredentials({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
      });

      const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });

      // Test access by getting user profile
      await gmail.users.getProfile({ userId: 'me' });

      return true;
    } catch (error: unknown) {
      this.logger.warn(
        `Gmail access check failed for user ${userId}:`,
        error instanceof Error ? error.message : 'Unknown error',
      );

      // Try to refresh token if access fails
      if (typeof error === 'object' && error !== null && 'code' in error) {
        const errorWithCode = error as { code: number };
        if (errorWithCode.code === 401) {
          return await this.refreshUserToken(userId);
        }
      }

      return false;
    }
  }
}
