import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { google, gmail_v1 } from 'googleapis';
import { AuthService } from 'src/modules/auth/services/auth.service';
import { TokenDBUtil } from 'src/modules/auth/utils/token-db.util';
import { IEmailSendRequest, IEmailSendResponse } from '@project/types';
import { EnvironmentVariableUtil } from 'src/modules/common/utils/environment-variable.util';

/**
 * GmailClient - Gmail API Operations
 *
 * Responsibilities:
 * - Gmail API email sending with OAuth authentication
 * - Token management and automatic refresh
 * - Error handling with exponential backoff retry
 * - Email recipient parsing and validation
 *
 * Requirements: 1.1 - Gmail API sending, 1.6-1.7 - token management, 4.1-4.4 - error handling
 *
 * Design: Abstracts Gmail API behind clean interface with automatic
 * token refresh and exponential backoff for reliability, reusing patterns from GoogleDriveClient
 */
@Injectable()
export class GmailClient {
  private readonly logger = new Logger(GmailClient.name);
  private readonly maxRetries = 3;
  private readonly baseDelayMs = 1000;
  private readonly requiredScope = 'gmail.send';

  constructor(
    private readonly authService: AuthService,
    private readonly tokenDBUtil: TokenDBUtil,
    private readonly environmentVariableUtil: EnvironmentVariableUtil,
  ) {}

  /**
   * Send email via Gmail API
   * Requirements: 1.1 - Gmail API sending, 1.6-1.7 - token management
   */
  async sendEmail(
    userId: string,
    emailRequest: IEmailSendRequest,
  ): Promise<IEmailSendResponse> {
    try {
      const gmail = await this.getGmailClient(userId);

      // Parse recipients
      const recipients = this.parseRecipients(emailRequest.to);

      // Create email message
      const emailMessage = this.createEmailMessage(emailRequest, recipients);

      // Send email with retry logic
      const result = await this.retryOperation(async () => {
        const response = await gmail.users.messages.send({
          userId: 'me',
          requestBody: {
            raw: emailMessage,
          },
        });

        return response.data;
      });

      if (!result?.id) {
        throw new InternalServerErrorException('Failed to send email');
      }

      this.logger.log(
        `Email sent successfully to ${recipients.join(', ')} with messageId: ${result.id}`,
      );

      return {
        success: true,
        messageId: result.id,
      };
    } catch (error) {
      this.logger.error(`Email sending failed for user ${userId}:`, error);
      const gmailError = this.handleGmailError(error);

      return {
        success: false,
        error: gmailError.message,
      };
    }
  }

  /**
   * Parse comma-separated email recipients
   * Requirements: 4.1 - error handling
   */
  parseRecipients(recipientString: string): string[] {
    if (!recipientString || recipientString.trim() === '') {
      throw new BadRequestException('Email recipients cannot be empty');
    }

    const recipients = recipientString
      .split(',')
      .map((email) => email.trim())
      .filter((email) => email.length > 0);

    if (recipients.length === 0) {
      throw new BadRequestException('No valid email recipients found');
    }

    // Basic email validation for each recipient
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = recipients.filter((email) => !emailRegex.test(email));

    if (invalidEmails.length > 0) {
      throw new BadRequestException(
        `Invalid email addresses: ${invalidEmails.join(', ')}`,
      );
    }

    return recipients;
  }

  /**
   * Create authenticated Gmail client
   * Requirements: 1.6-1.7 - token management
   */
  private async getGmailClient(userId: string): Promise<gmail_v1.Gmail> {
    const tokenEntity = await this.authService.getUserTokens(userId);

    if (!tokenEntity) {
      throw new BadRequestException('No valid Gmail tokens found for user');
    }

    // Validate Gmail send scope
    if (!tokenEntity.scope?.includes(this.requiredScope)) {
      throw new BadRequestException(
        'Gmail send permission not granted. Please re-authenticate.',
      );
    }

    try {
      // Decrypt tokens for API usage
      const { accessToken, refreshToken } =
        await this.tokenDBUtil.getDecryptedTokens(tokenEntity);

      const { googleClientId, googleClientSecret, googleRedirectUri } =
        this.environmentVariableUtil.getVariables();

      // Create OAuth2 client
      const oauth2Client = new google.auth.OAuth2(
        googleClientId,
        googleClientSecret,
        googleRedirectUri,
      );

      oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      // Create Gmail client
      return google.gmail({ version: 'v1', auth: oauth2Client });
    } catch (_error) {
      throw new BadRequestException('Failed to decrypt Gmail tokens for user');
    }
  }

  /**
   * Create RFC 2822 compliant email message
   * Requirements: 1.1 - Gmail API sending
   */
  private createEmailMessage(
    emailRequest: IEmailSendRequest,
    recipients: string[],
  ): string {
    const { subject, body, isHtml = false } = emailRequest;

    // Build email headers
    const headers = [
      `To: ${recipients.join(', ')}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
    ];

    if (isHtml) {
      headers.push('Content-Type: text/html; charset=utf-8');
    } else {
      headers.push('Content-Type: text/plain; charset=utf-8');
    }

    // Combine headers and body
    const emailContent = headers.join('\r\n') + '\r\n\r\n' + body;

    // Encode to base64url as required by Gmail API
    return Buffer.from(emailContent, 'utf-8')
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  /**
   * Retry operation with exponential backoff
   * Requirements: 4.1-4.4 - error handling and retry logic
   */
  private async retryOperation<T>(
    operation: () => Promise<T>,
    attempt = 1,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= this.maxRetries) {
        throw error;
      }

      // Only retry on rate limiting or temporary errors
      if (this.isRetryableError(error)) {
        const delay = this.baseDelayMs * Math.pow(2, attempt - 1);
        this.logger.warn(
          `Gmail operation failed, retrying in ${delay}ms (attempt ${attempt}/${this.maxRetries})`,
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.retryOperation(operation, attempt + 1);
      }

      throw error;
    }
  }

  /**
   * Check if error is retryable
   * Requirements: 4.1-4.4 - error handling
   */
  private isRetryableError(error: unknown): boolean {
    const retryableCodes = [429, 500, 502, 503, 504];
    return this.hasErrorCode(error, retryableCodes);
  }

  /**
   * Type-safe error code checker
   */
  private hasErrorCode(error: unknown, codes: number | number[]): boolean {
    if (typeof error !== 'object' || error === null) {
      return false;
    }

    const errorObj = error as { code?: unknown };
    if (typeof errorObj.code !== 'number') {
      return false;
    }

    const codeArray = Array.isArray(codes) ? codes : [codes];
    return codeArray.includes(errorObj.code);
  }

  /**
   * Handle and transform Gmail API errors
   * Requirements: 4.1-4.4 - error handling
   */
  private handleGmailError(error: unknown): Error {
    // If it's already a NestJS exception, preserve it
    if (
      error instanceof BadRequestException ||
      error instanceof InternalServerErrorException
    ) {
      return error;
    }

    if (this.hasErrorCode(error, 401)) {
      return new BadRequestException('Gmail authentication failed');
    }

    if (this.hasErrorCode(error, 403)) {
      const errorMessage = this.getErrorMessage(error);
      if (errorMessage?.includes('quotaExceeded')) {
        return new BadRequestException('Gmail quota exceeded');
      }
      if (errorMessage?.includes('insufficientPermissions')) {
        return new BadRequestException('Insufficient Gmail permissions');
      }
      return new BadRequestException('Gmail access forbidden');
    }

    if (this.hasErrorCode(error, 404)) {
      return new BadRequestException('Gmail resource not found');
    }

    if (this.hasErrorCode(error, 429)) {
      return new BadRequestException(
        'Gmail rate limit exceeded, please try again later',
      );
    }

    // Generic server errors
    if (this.hasErrorCodeRange(error, 500, 599)) {
      return new InternalServerErrorException(
        'Gmail service temporarily unavailable',
      );
    }

    // Default error handling
    this.logger.error('Unexpected Gmail error:', error);
    return new InternalServerErrorException('Gmail operation failed');
  }

  /**
   * Get error message from error object safely
   */
  private getErrorMessage(error: unknown): string | null {
    if (typeof error !== 'object' || error === null) {
      return null;
    }

    const errorObj = error as { message?: unknown };
    return typeof errorObj.message === 'string' ? errorObj.message : null;
  }

  /**
   * Check if error code is within range
   */
  private hasErrorCodeRange(error: unknown, min: number, max: number): boolean {
    if (typeof error !== 'object' || error === null) {
      return false;
    }

    const errorObj = error as { code?: unknown };
    if (typeof errorObj.code !== 'number') {
      return false;
    }

    return errorObj.code >= min && errorObj.code <= max;
  }
}
