import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { GmailClient } from '../gmail-client.service';
import { AuthService } from 'src/modules/auth/services/auth.service';
import { TokenDBUtil } from 'src/modules/auth/utils/token-db.util';
import { EnvironmentVariableUtil } from 'src/modules/common/utils/environment-variable.util';
import { google } from 'googleapis';
import { IEmailSendRequest } from '@project/types';

// Mock googleapis
vi.mock('googleapis', () => ({
  google: {
    gmail: vi.fn(),
    auth: {
      OAuth2: vi.fn(),
    },
  },
}));

// Mock external dependencies
const mockAuthService = {
  getUserTokens: vi.fn(),
};

const mockTokenDBUtil = {
  getDecryptedTokens: vi.fn(),
};

const mockEnvironmentVariableUtil = {
  getVariables: vi.fn(),
};

const mockGmailAPI = {
  users: {
    messages: {
      send: vi.fn(),
    },
  },
};

const mockOAuth2Client = {
  setCredentials: vi.fn(),
};

describe('GmailClient', () => {
  let gmailClient: GmailClient;

  // Helper function to decode base64url message safely
  const decodeEmailMessage = (rawMessage: string): string => {
    return Buffer.from(
      rawMessage.replace(/-/g, '+').replace(/_/g, '/') +
        '==='.slice(0, (4 - (rawMessage.length % 4)) % 4),
      'base64',
    ).toString('utf-8');
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock environment variables
    process.env.GOOGLE_CLIENT_ID = 'test-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
    process.env.GOOGLE_REDIRECT_URI = 'test-redirect-uri';

    // Mock Google APIs
    vi.mocked(google.gmail).mockReturnValue(mockGmailAPI as never);
    vi.mocked(google.auth.OAuth2).mockReturnValue(mockOAuth2Client as never);

    // Mock environment variable util
    mockEnvironmentVariableUtil.getVariables.mockReturnValue({
      nodeEnv: 'test',
      port: 3001,
      buildMode: 'swc',
      clientHost: 'http://localhost:3000',
      cookieDomainName: 'localhost',
      cookieSecret: 'test-secret',
      googleClientId: 'test-client-id',
      googleClientSecret: 'test-client-secret',
      googleRedirectUri: 'test-redirect-uri',
      googleDriveApiKey: 'test-api-key',
      googleDriveScope: 'drive.file',
      tokenEncryptionKey: 'test-encryption-key',
      jwtSecret: 'test-jwt-secret',
      frontendBaseUrl: 'http://localhost:3000',
      databaseHost: 'localhost',
      databasePort: 5432,
      databaseUser: 'postgres',
      databasePassword: 'postgres',
      databaseDb: 'test_db',
      emailRecipients: 'test@example.com',
    });

    // Create service instance with mocked dependencies
    gmailClient = new GmailClient(
      mockAuthService as unknown as AuthService,
      mockTokenDBUtil as unknown as TokenDBUtil,
      mockEnvironmentVariableUtil as unknown as EnvironmentVariableUtil,
    );
  });

  const mockTokenEntity = {
    id: 'token-123',
    userId: 'user-123',
    accessToken: 'encrypted_access_token',
    refreshToken: 'encrypted_refresh_token',
    scope:
      'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email',
    expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
  };

  const mockDecryptedTokens = {
    accessToken: 'decrypted_access_token',
    refreshToken: 'decrypted_refresh_token',
  };

  const mockEmailRequest: IEmailSendRequest = {
    to: 'test@example.com',
    subject: 'Test Subject',
    body: 'Test email body',
    isHtml: false,
  };

  const mockEmailRequestHtml: IEmailSendRequest = {
    to: 'test@example.com,another@example.com',
    subject: 'Test HTML Subject',
    body: '<h1>Test HTML email body</h1>',
    isHtml: true,
  };

  describe('Requirement 1.1 - Gmail API Integration', () => {
    beforeEach(() => {
      mockAuthService.getUserTokens.mockResolvedValue(mockTokenEntity);
      mockTokenDBUtil.getDecryptedTokens.mockResolvedValue(mockDecryptedTokens);
    });

    it('should send email successfully with valid request', async () => {
      const mockGmailResponse = {
        data: { id: 'message-123' },
      };
      mockGmailAPI.users.messages.send.mockResolvedValue(mockGmailResponse);

      const result = await gmailClient.sendEmail('user-123', mockEmailRequest);

      expect(result).toEqual({
        success: true,
        messageId: 'message-123',
      });

      expect(mockGmailAPI.users.messages.send).toHaveBeenCalledWith({
        userId: 'me',
        requestBody: {
          raw: expect.any(String) as string,
        },
      });
    });

    it('should send HTML email successfully', async () => {
      const mockGmailResponse = {
        data: { id: 'message-456' },
      };
      mockGmailAPI.users.messages.send.mockResolvedValue(mockGmailResponse);

      const result = await gmailClient.sendEmail(
        'user-123',
        mockEmailRequestHtml,
      );

      expect(result).toEqual({
        success: true,
        messageId: 'message-456',
      });

      // Verify the email message includes HTML content type
      const sendCall = mockGmailAPI.users.messages.send.mock.calls[0][0] as {
        userId: string;
        requestBody: { raw: string };
      };
      const rawMessage = decodeEmailMessage(sendCall.requestBody.raw);

      expect(rawMessage).toContain('Content-Type: text/html; charset=utf-8');
      expect(rawMessage).toContain('<h1>Test HTML email body</h1>');
    });

    it('should create properly formatted email message for plain text', async () => {
      const mockGmailResponse = {
        data: { id: 'message-789' },
      };
      mockGmailAPI.users.messages.send.mockResolvedValue(mockGmailResponse);

      await gmailClient.sendEmail('user-123', mockEmailRequest);

      const sendCall = mockGmailAPI.users.messages.send.mock.calls[0][0] as {
        userId: string;
        requestBody: { raw: string };
      };
      const rawMessage = decodeEmailMessage(sendCall.requestBody.raw);

      expect(rawMessage).toContain('To: test@example.com');
      expect(rawMessage).toContain('Subject: Test Subject');
      expect(rawMessage).toContain('Content-Type: text/plain; charset=utf-8');
      expect(rawMessage).toContain('MIME-Version: 1.0');
      expect(rawMessage).toContain('Test email body');
    });

    it('should handle multiple recipients correctly', async () => {
      const mockGmailResponse = {
        data: { id: 'message-multi' },
      };
      mockGmailAPI.users.messages.send.mockResolvedValue(mockGmailResponse);

      const multiRecipientRequest = {
        ...mockEmailRequest,
        to: 'user1@example.com, user2@example.com,user3@example.com',
      };

      await gmailClient.sendEmail('user-123', multiRecipientRequest);

      const sendCall = mockGmailAPI.users.messages.send.mock.calls[0][0] as {
        userId: string;
        requestBody: { raw: string };
      };
      const rawMessage = decodeEmailMessage(sendCall.requestBody.raw);

      expect(rawMessage).toContain(
        'To: user1@example.com, user2@example.com, user3@example.com',
      );
    });
  });

  describe('Requirements 1.6-1.7 - Token Management and Scope Validation', () => {
    it('should validate Gmail send scope before sending email', async () => {
      const tokenWithoutScope = {
        ...mockTokenEntity,
        scope: 'https://www.googleapis.com/auth/userinfo.email',
      };
      mockAuthService.getUserTokens.mockResolvedValue(tokenWithoutScope);

      const result = await gmailClient.sendEmail('user-123', mockEmailRequest);

      expect(result).toEqual({
        success: false,
        error: 'Gmail send permission not granted. Please re-authenticate.',
      });

      expect(mockGmailAPI.users.messages.send).not.toHaveBeenCalled();
    });

    it('should handle missing OAuth tokens', async () => {
      mockAuthService.getUserTokens.mockResolvedValue(null);

      const result = await gmailClient.sendEmail('user-123', mockEmailRequest);

      expect(result).toEqual({
        success: false,
        error: 'No valid Gmail tokens found for user',
      });

      expect(mockGmailAPI.users.messages.send).not.toHaveBeenCalled();
    });

    it('should handle token decryption errors', async () => {
      mockAuthService.getUserTokens.mockResolvedValue(mockTokenEntity);
      mockTokenDBUtil.getDecryptedTokens.mockRejectedValue(
        new Error('Decryption failed'),
      );

      const result = await gmailClient.sendEmail('user-123', mockEmailRequest);

      expect(result).toEqual({
        success: false,
        error: 'Failed to decrypt Gmail tokens for user',
      });

      expect(mockGmailAPI.users.messages.send).not.toHaveBeenCalled();
    });

    it('should properly set up OAuth2 client with decrypted tokens', async () => {
      mockAuthService.getUserTokens.mockResolvedValue(mockTokenEntity);
      mockTokenDBUtil.getDecryptedTokens.mockResolvedValue(mockDecryptedTokens);
      mockGmailAPI.users.messages.send.mockResolvedValue({
        data: { id: 'message-auth' },
      });

      await gmailClient.sendEmail('user-123', mockEmailRequest);

      expect(google.auth.OAuth2).toHaveBeenCalledWith(
        'test-client-id',
        'test-client-secret',
        'test-redirect-uri',
      );
      expect(mockOAuth2Client.setCredentials).toHaveBeenCalledWith({
        access_token: 'decrypted_access_token',
        refresh_token: 'decrypted_refresh_token',
      });
    });
  });

  describe('Requirements 4.1-4.2 - Error Handling and Retry Logic', () => {
    beforeEach(() => {
      mockAuthService.getUserTokens.mockResolvedValue(mockTokenEntity);
      mockTokenDBUtil.getDecryptedTokens.mockResolvedValue(mockDecryptedTokens);
    });

    it('should handle authentication errors (401)', async () => {
      mockGmailAPI.users.messages.send.mockRejectedValue({ code: 401 });

      const result = await gmailClient.sendEmail('user-123', mockEmailRequest);

      expect(result).toEqual({
        success: false,
        error: 'Gmail authentication failed',
      });
    });

    it('should handle permission errors (403)', async () => {
      mockGmailAPI.users.messages.send.mockRejectedValue({ code: 403 });

      const result = await gmailClient.sendEmail('user-123', mockEmailRequest);

      expect(result).toEqual({
        success: false,
        error: 'Gmail access forbidden',
      });
    });

    it('should handle quota exceeded errors (403 with specific message)', async () => {
      mockGmailAPI.users.messages.send.mockRejectedValue({
        code: 403,
        message: 'quotaExceeded',
      });

      const result = await gmailClient.sendEmail('user-123', mockEmailRequest);

      expect(result).toEqual({
        success: false,
        error: 'Gmail quota exceeded',
      });
    });

    it('should handle insufficient permissions (403 with specific message)', async () => {
      mockGmailAPI.users.messages.send.mockRejectedValue({
        code: 403,
        message: 'insufficientPermissions',
      });

      const result = await gmailClient.sendEmail('user-123', mockEmailRequest);

      expect(result).toEqual({
        success: false,
        error: 'Insufficient Gmail permissions',
      });
    });

    it('should handle rate limiting errors (429)', async () => {
      mockGmailAPI.users.messages.send.mockRejectedValue({ code: 429 });

      const result = await gmailClient.sendEmail('user-123', mockEmailRequest);

      expect(result).toEqual({
        success: false,
        error: 'Gmail rate limit exceeded, please try again later',
      });
    });

    it('should handle not found errors (404)', async () => {
      mockGmailAPI.users.messages.send.mockRejectedValue({ code: 404 });

      const result = await gmailClient.sendEmail('user-123', mockEmailRequest);

      expect(result).toEqual({
        success: false,
        error: 'Gmail resource not found',
      });
    });

    it('should handle server errors (5xx)', async () => {
      mockGmailAPI.users.messages.send.mockRejectedValue({ code: 500 });

      const result = await gmailClient.sendEmail('user-123', mockEmailRequest);

      expect(result).toEqual({
        success: false,
        error: 'Gmail service temporarily unavailable',
      });
    });

    it('should handle unknown errors', async () => {
      mockGmailAPI.users.messages.send.mockRejectedValue(
        new Error('Unknown error'),
      );

      const result = await gmailClient.sendEmail('user-123', mockEmailRequest);

      expect(result).toEqual({
        success: false,
        error: 'Gmail operation failed',
      });
    });

    it('should retry on rate limiting errors with exponential backoff', async () => {
      vi.useFakeTimers();

      // Mock 2 rate limit failures then success
      mockGmailAPI.users.messages.send
        .mockRejectedValueOnce({ code: 429 })
        .mockRejectedValueOnce({ code: 503 })
        .mockResolvedValueOnce({ data: { id: 'message-retry' } });

      const emailPromise = gmailClient.sendEmail('user-123', mockEmailRequest);

      // Fast-forward time for retries
      await vi.advanceTimersByTimeAsync(1000); // First retry after 1s
      await vi.advanceTimersByTimeAsync(2000); // Second retry after 2s

      const result = await emailPromise;

      expect(result).toEqual({
        success: true,
        messageId: 'message-retry',
      });

      expect(mockGmailAPI.users.messages.send).toHaveBeenCalledTimes(3);

      vi.useRealTimers();
    });

    it('should not retry on non-retryable errors', async () => {
      mockGmailAPI.users.messages.send.mockRejectedValue({ code: 400 });

      const result = await gmailClient.sendEmail('user-123', mockEmailRequest);

      expect(result).toEqual({
        success: false,
        error: 'Gmail operation failed',
      });

      expect(mockGmailAPI.users.messages.send).toHaveBeenCalledTimes(1);
    });

    it('should fail after maximum retry attempts', async () => {
      vi.useFakeTimers();

      mockGmailAPI.users.messages.send.mockRejectedValue({ code: 500 });

      const emailPromise = gmailClient.sendEmail('user-123', mockEmailRequest);

      // Fast-forward through all retry attempts
      await vi.advanceTimersByTimeAsync(1000); // First retry
      await vi.advanceTimersByTimeAsync(2000); // Second retry
      await vi.advanceTimersByTimeAsync(4000); // Third retry (final)

      const result = await emailPromise;

      expect(result).toEqual({
        success: false,
        error: 'Gmail service temporarily unavailable',
      });

      expect(mockGmailAPI.users.messages.send).toHaveBeenCalledTimes(3);

      vi.useRealTimers();
    });

    it('should handle missing message ID in response', async () => {
      mockGmailAPI.users.messages.send.mockResolvedValue({
        data: {}, // No ID in response
      });

      const result = await gmailClient.sendEmail('user-123', mockEmailRequest);

      expect(result).toEqual({
        success: false,
        error: 'Failed to send email',
      });
    });
  });

  describe('parseRecipients method', () => {
    it('should parse single email correctly', () => {
      const recipients = gmailClient.parseRecipients('test@example.com');
      expect(recipients).toEqual(['test@example.com']);
    });

    it('should parse multiple emails with spaces', () => {
      const recipients = gmailClient.parseRecipients(
        'user1@example.com, user2@example.com ,  user3@example.com',
      );
      expect(recipients).toEqual([
        'user1@example.com',
        'user2@example.com',
        'user3@example.com',
      ]);
    });

    it('should handle emails without spaces after commas', () => {
      const recipients = gmailClient.parseRecipients(
        'user1@example.com,user2@example.com,user3@example.com',
      );
      expect(recipients).toEqual([
        'user1@example.com',
        'user2@example.com',
        'user3@example.com',
      ]);
    });

    it('should throw error for empty recipient string', () => {
      expect(() => gmailClient.parseRecipients('')).toThrow(
        BadRequestException,
      );
      expect(() => gmailClient.parseRecipients('   ')).toThrow(
        BadRequestException,
      );
    });

    it('should throw error for null or undefined recipients', () => {
      expect(() =>
        gmailClient.parseRecipients(null as unknown as string),
      ).toThrow(BadRequestException);
      expect(() =>
        gmailClient.parseRecipients(undefined as unknown as string),
      ).toThrow(BadRequestException);
    });

    it('should throw error for no valid emails after parsing', () => {
      expect(() => gmailClient.parseRecipients(',,,')).toThrow(
        BadRequestException,
      );
      expect(() => gmailClient.parseRecipients(' , , ')).toThrow(
        BadRequestException,
      );
    });

    it('should validate email format and reject invalid emails', () => {
      expect(() => gmailClient.parseRecipients('invalid-email')).toThrow(
        BadRequestException,
      );

      expect(() =>
        gmailClient.parseRecipients('valid@example.com,invalid-email'),
      ).toThrow(BadRequestException);

      expect(() => gmailClient.parseRecipients('test@,@example.com')).toThrow(
        BadRequestException,
      );

      expect(() =>
        gmailClient.parseRecipients('test@domain,user@domain.com'),
      ).toThrow(BadRequestException);
    });

    it('should accept valid email formats', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example-domain.com',
        'user123@123domain.org',
      ];

      validEmails.forEach((email) => {
        expect(() => gmailClient.parseRecipients(email)).not.toThrow();
      });
    });

    it('should provide detailed error messages for invalid emails', () => {
      try {
        gmailClient.parseRecipients(
          'valid@example.com,invalid-email,another-invalid',
        );
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        const badRequestError = error as BadRequestException;
        expect(badRequestError.message).toContain('Invalid email addresses');
        expect(badRequestError.message).toContain('invalid-email');
        expect(badRequestError.message).toContain('another-invalid');
      }
    });
  });

  describe('Edge cases and robustness', () => {
    beforeEach(() => {
      mockAuthService.getUserTokens.mockResolvedValue(mockTokenEntity);
      mockTokenDBUtil.getDecryptedTokens.mockResolvedValue(mockDecryptedTokens);
    });

    it('should handle very long email bodies', async () => {
      const longBody = 'A'.repeat(10000);
      const longEmailRequest = {
        ...mockEmailRequest,
        body: longBody,
      };

      mockGmailAPI.users.messages.send.mockResolvedValue({
        data: { id: 'message-long' },
      });

      const result = await gmailClient.sendEmail('user-123', longEmailRequest);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('message-long');
    });

    it('should handle special characters in subject and body', async () => {
      const specialEmailRequest = {
        to: 'test@example.com',
        subject: 'Test with émojis 🚀 and ñoñô characters',
        body: 'Body with special chars: © ® ™ € £ ¥ § ¶',
        isHtml: false,
      };

      mockGmailAPI.users.messages.send.mockResolvedValue({
        data: { id: 'message-special' },
      });

      const result = await gmailClient.sendEmail(
        'user-123',
        specialEmailRequest,
      );

      expect(result.success).toBe(true);

      const sendCall = mockGmailAPI.users.messages.send.mock.calls[0][0] as {
        userId: string;
        requestBody: { raw: string };
      };
      const rawMessage = decodeEmailMessage(sendCall.requestBody.raw);

      expect(rawMessage).toContain('Test with émojis 🚀 and ñoñô characters');
      expect(rawMessage).toContain(
        'Body with special chars: © ® ™ € £ ¥ § ¶',
      );
    });

    it('should handle empty subject and body', async () => {
      const emptyEmailRequest = {
        to: 'test@example.com',
        subject: '',
        body: '',
        isHtml: false,
      };

      mockGmailAPI.users.messages.send.mockResolvedValue({
        data: { id: 'message-empty' },
      });

      const result = await gmailClient.sendEmail('user-123', emptyEmailRequest);

      expect(result.success).toBe(true);
    });

    it('should properly encode base64url for Gmail API', async () => {
      mockGmailAPI.users.messages.send.mockResolvedValue({
        data: { id: 'message-encode' },
      });

      await gmailClient.sendEmail('user-123', mockEmailRequest);

      const sendCall = mockGmailAPI.users.messages.send.mock.calls[0][0] as {
        userId: string;
        requestBody: { raw: string };
      };
      const rawMessage = sendCall.requestBody.raw;

      // Verify it's properly base64url encoded (no +, /, or = characters)
      expect(rawMessage).not.toContain('+');
      expect(rawMessage).not.toContain('/');
      expect(rawMessage).not.toContain('=');
      expect(rawMessage).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('should handle non-object errors gracefully', async () => {
      mockGmailAPI.users.messages.send.mockRejectedValue('String error');

      const result = await gmailClient.sendEmail('user-123', mockEmailRequest);

      expect(result).toEqual({
        success: false,
        error: 'Gmail operation failed',
      });
    });

    it('should handle null error gracefully', async () => {
      mockGmailAPI.users.messages.send.mockRejectedValue(null);

      const result = await gmailClient.sendEmail('user-123', mockEmailRequest);

      expect(result).toEqual({
        success: false,
        error: 'Gmail operation failed',
      });
    });

    it('should preserve NestJS exceptions when they occur', async () => {
      const badRequestError = new BadRequestException('Custom bad request');
      mockGmailAPI.users.messages.send.mockRejectedValue(badRequestError);

      const result = await gmailClient.sendEmail('user-123', mockEmailRequest);

      expect(result).toEqual({
        success: false,
        error: 'Custom bad request',
      });
    });
  });

  describe('Private method behavior validation', () => {
    beforeEach(() => {
      mockAuthService.getUserTokens.mockResolvedValue(mockTokenEntity);
      mockTokenDBUtil.getDecryptedTokens.mockResolvedValue(mockDecryptedTokens);
    });

    it('should validate scope in user tokens correctly', async () => {
      const tokenWithMultipleScopes = {
        ...mockTokenEntity,
        scope:
          'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/drive.file',
      };
      mockAuthService.getUserTokens.mockResolvedValue(tokenWithMultipleScopes);
      mockGmailAPI.users.messages.send.mockResolvedValue({
        data: { id: 'message-scope' },
      });

      const result = await gmailClient.sendEmail('user-123', mockEmailRequest);

      expect(result.success).toBe(true);
      expect(mockGmailAPI.users.messages.send).toHaveBeenCalled();
    });

    it('should handle missing scope field in token', async () => {
      const tokenWithoutScope = {
        ...mockTokenEntity,
        scope: null,
      };
      mockAuthService.getUserTokens.mockResolvedValue(tokenWithoutScope);

      const result = await gmailClient.sendEmail('user-123', mockEmailRequest);

      expect(result).toEqual({
        success: false,
        error: 'Gmail send permission not granted. Please re-authenticate.',
      });
    });

    it('should handle undefined scope field in token', async () => {
      const tokenWithUndefinedScope = {
        ...mockTokenEntity,
        scope: undefined,
      };
      mockAuthService.getUserTokens.mockResolvedValue(tokenWithUndefinedScope);

      const result = await gmailClient.sendEmail('user-123', mockEmailRequest);

      expect(result).toEqual({
        success: false,
        error: 'Gmail send permission not granted. Please re-authenticate.',
      });
    });
  });

  describe('Multipart MIME message generation (Task 3.3)', () => {
    /**
     * Helper to call private createEmailMessage method for testing
     */
    function createEmailMessageHelper(
      emailRequest: IEmailSendRequest,
      recipients: string[],
    ): string {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      return (gmailClient as any).createEmailMessage(emailRequest, recipients);
    }

    beforeEach(() => {
      mockAuthService.getUserTokens.mockResolvedValue(mockTokenEntity);
      mockTokenDBUtil.getDecryptedTokens.mockResolvedValue(mockDecryptedTokens);
    });

    describe('Simple message creation (no attachments)', () => {
      it('should create simple message when attachments array is empty', () => {
        const request: IEmailSendRequest = {
          to: 'test@example.com',
          subject: 'No Attachments',
          body: 'Simple body',
          isHtml: false,
          attachments: [],
        };

        const encoded = createEmailMessageHelper(request, ['test@example.com']);
        const decoded = decodeEmailMessage(encoded);

        expect(decoded).toContain('Content-Type: text/plain');
        expect(decoded).not.toContain('multipart/mixed');
        expect(decoded).not.toContain('boundary=');
      });

      it('should create simple message when attachments is undefined', () => {
        const request: IEmailSendRequest = {
          to: 'test@example.com',
          subject: 'No Attachments',
          body: 'Simple body',
          isHtml: false,
        };

        const encoded = createEmailMessageHelper(request, ['test@example.com']);
        const decoded = decodeEmailMessage(encoded);

        expect(decoded).not.toContain('multipart/mixed');
      });
    });

    describe('Multipart message creation (with attachments)', () => {
      it('should create multipart/mixed message with single attachment', () => {
        const request: IEmailSendRequest = {
          to: 'test@example.com',
          subject: 'With Attachment',
          body: 'Email body',
          isHtml: false,
          attachments: [
            {
              filename: 'test.pdf',
              content: Buffer.from('PDF content'),
              mimeType: 'application/pdf',
            },
          ],
        };

        const encoded = createEmailMessageHelper(request, ['test@example.com']);
        const decoded = decodeEmailMessage(encoded);

        expect(decoded).toContain('Content-Type: multipart/mixed; boundary=');
        expect(decoded).toContain('MIME-Version: 1.0');
      });

      it('should include proper MIME boundaries in multipart message', () => {
        const request: IEmailSendRequest = {
          to: 'test@example.com',
          subject: 'Test',
          body: 'Body',
          isHtml: false,
          attachments: [
            {
              filename: 'file.txt',
              content: Buffer.from('content'),
              mimeType: 'text/plain',
            },
          ],
        };

        const encoded = createEmailMessageHelper(request, ['test@example.com']);
        const decoded = decodeEmailMessage(encoded);

        const boundaryMatch = decoded.match(/boundary="([^"]+)"/);
        expect(boundaryMatch).toBeTruthy();

        const boundary = boundaryMatch![1];
        expect(decoded).toContain(`--${boundary}\r\n`);
        expect(decoded).toContain(`--${boundary}--`);
      });

      it('should base64 encode attachment content', () => {
        const content = Buffer.from('Test file content');
        const request: IEmailSendRequest = {
          to: 'test@example.com',
          subject: 'Test',
          body: 'Body',
          isHtml: false,
          attachments: [
            {
              filename: 'test.txt',
              content,
              mimeType: 'text/plain',
            },
          ],
        };

        const encoded = createEmailMessageHelper(request, ['test@example.com']);
        const decoded = decodeEmailMessage(encoded);

        const expectedBase64 = content.toString('base64');
        expect(decoded).toContain(expectedBase64);
        expect(decoded).toContain('Content-Transfer-Encoding: base64');
      });

      it('should handle multiple attachments correctly', () => {
        const request: IEmailSendRequest = {
          to: 'test@example.com',
          subject: 'Multiple Files',
          body: 'Email with attachments',
          isHtml: false,
          attachments: [
            {
              filename: 'file1.pdf',
              content: Buffer.from('PDF content 1'),
              mimeType: 'application/pdf',
            },
            {
              filename: 'file2.jpg',
              content: Buffer.from('JPEG content'),
              mimeType: 'image/jpeg',
            },
            {
              filename: 'file3.txt',
              content: Buffer.from('Text content'),
              mimeType: 'text/plain',
            },
          ],
        };

        const encoded = createEmailMessageHelper(request, ['test@example.com']);
        const decoded = decodeEmailMessage(encoded);

        expect(decoded).toContain('filename="file1.pdf"');
        expect(decoded).toContain('filename="file2.jpg"');
        expect(decoded).toContain('filename="file3.txt"');

        expect(decoded).toContain('Content-Type: application/pdf');
        expect(decoded).toContain('Content-Type: image/jpeg');
        expect(decoded).toContain('Content-Type: text/plain');

        expect(decoded).toContain(
          Buffer.from('PDF content 1').toString('base64'),
        );
        expect(decoded).toContain(
          Buffer.from('JPEG content').toString('base64'),
        );
        expect(decoded).toContain(
          Buffer.from('Text content').toString('base64'),
        );
      });

      it('should include attachment filename in Content-Disposition header', () => {
        const request: IEmailSendRequest = {
          to: 'test@example.com',
          subject: 'Test',
          body: 'Body',
          isHtml: false,
          attachments: [
            {
              filename: 'document.pdf',
              content: Buffer.from('PDF data'),
              mimeType: 'application/pdf',
            },
          ],
        };

        const encoded = createEmailMessageHelper(request, ['test@example.com']);
        const decoded = decodeEmailMessage(encoded);

        expect(decoded).toContain(
          'Content-Disposition: attachment; filename="document.pdf"',
        );
      });
    });

    describe('RFC 2822 MIME compliance', () => {
      it('should use CRLF line endings in multipart message', () => {
        const request: IEmailSendRequest = {
          to: 'test@example.com',
          subject: 'Test',
          body: 'Body',
          isHtml: false,
          attachments: [
            {
              filename: 'file.txt',
              content: Buffer.from('content'),
              mimeType: 'text/plain',
            },
          ],
        };

        const encoded = createEmailMessageHelper(request, ['test@example.com']);
        const decoded = decodeEmailMessage(encoded);

        expect(decoded).toContain('\r\n');
        expect(decoded.split('\r\n').length).toBeGreaterThan(10);
      });

      it('should properly separate MIME parts with boundaries', () => {
        const request: IEmailSendRequest = {
          to: 'test@example.com',
          subject: 'Test',
          body: 'Body text',
          isHtml: false,
          attachments: [
            {
              filename: 'file1.txt',
              content: Buffer.from('content1'),
              mimeType: 'text/plain',
            },
            {
              filename: 'file2.txt',
              content: Buffer.from('content2'),
              mimeType: 'text/plain',
            },
          ],
        };

        const encoded = createEmailMessageHelper(request, ['test@example.com']);
        const decoded = decodeEmailMessage(encoded);

        const boundaryMatch = decoded.match(/boundary="([^"]+)"/);
        const boundary = boundaryMatch![1];

        // Count boundary occurrences
        const boundaryCount = (
          decoded.match(new RegExp(`--${boundary}`, 'g')) || []
        ).length;
        expect(boundaryCount).toBe(4); // body + 2 attachments + closing = 4

        // Check closing boundary
        expect(decoded).toContain(`--${boundary}--`);
      });

      it('should generate unique boundaries for each message', () => {
        const request: IEmailSendRequest = {
          to: 'test@example.com',
          subject: 'Test',
          body: 'Body',
          isHtml: false,
          attachments: [
            {
              filename: 'file.txt',
              content: Buffer.from('content'),
              mimeType: 'text/plain',
            },
          ],
        };

        const encoded1 = createEmailMessageHelper(request, [
          'test@example.com',
        ]);
        const encoded2 = createEmailMessageHelper(request, [
          'test@example.com',
        ]);

        const decoded1 = decodeEmailMessage(encoded1);
        const decoded2 = decodeEmailMessage(encoded2);

        const boundary1 = decoded1.match(/boundary="([^"]+)"/)?.[1];
        const boundary2 = decoded2.match(/boundary="([^"]+)"/)?.[1];

        expect(boundary1).not.toBe(boundary2);
      });
    });

    describe('Edge cases for multipart messages', () => {
      it('should handle empty attachment content', () => {
        const request: IEmailSendRequest = {
          to: 'test@example.com',
          subject: 'Test',
          body: 'Body',
          isHtml: false,
          attachments: [
            {
              filename: 'empty.txt',
              content: Buffer.from(''),
              mimeType: 'text/plain',
            },
          ],
        };

        const encoded = createEmailMessageHelper(request, ['test@example.com']);
        const decoded = decodeEmailMessage(encoded);

        expect(decoded).toContain('filename="empty.txt"');
        expect(decoded).toContain('Content-Type: text/plain');
      });

      it('should handle special characters in filename', () => {
        const request: IEmailSendRequest = {
          to: 'test@example.com',
          subject: 'Test',
          body: 'Body',
          isHtml: false,
          attachments: [
            {
              filename: 'file (copy) [1].pdf',
              content: Buffer.from('content'),
              mimeType: 'application/pdf',
            },
          ],
        };

        const encoded = createEmailMessageHelper(request, ['test@example.com']);
        const decoded = decodeEmailMessage(encoded);

        expect(decoded).toContain('filename="file (copy) [1].pdf"');
      });

      it('should handle binary attachment content', () => {
        const binaryContent = Buffer.from([
          0x00, 0x01, 0x02, 0xff, 0xfe, 0xfd, 0x7f, 0x80,
        ]);
        const request: IEmailSendRequest = {
          to: 'test@example.com',
          subject: 'Binary',
          body: 'Body',
          isHtml: false,
          attachments: [
            {
              filename: 'binary.dat',
              content: binaryContent,
              mimeType: 'application/octet-stream',
            },
          ],
        };

        const encoded = createEmailMessageHelper(request, ['test@example.com']);
        const decoded = decodeEmailMessage(encoded);

        const expectedBase64 = binaryContent.toString('base64');
        expect(decoded).toContain(expectedBase64);
      });

      it('should handle large attachment content', () => {
        const largeContent = Buffer.alloc(1024 * 1024); // 1MB
        const request: IEmailSendRequest = {
          to: 'test@example.com',
          subject: 'Large',
          body: 'Body',
          isHtml: false,
          attachments: [
            {
              filename: 'large.bin',
              content: largeContent,
              mimeType: 'application/octet-stream',
            },
          ],
        };

        const encoded = createEmailMessageHelper(request, ['test@example.com']);
        const decoded = decodeEmailMessage(encoded);

        expect(decoded).toContain('filename="large.bin"');
        expect(decoded).toContain('Content-Type: application/octet-stream');
      });

      it('should handle HTML body with attachments', () => {
        const request: IEmailSendRequest = {
          to: 'test@example.com',
          subject: 'HTML with attachment',
          body: '<h1>HTML body</h1><p>Paragraph</p>',
          isHtml: true,
          attachments: [
            {
              filename: 'file.pdf',
              content: Buffer.from('content'),
              mimeType: 'application/pdf',
            },
          ],
        };

        const encoded = createEmailMessageHelper(request, ['test@example.com']);
        const decoded = decodeEmailMessage(encoded);

        expect(decoded).toContain('Content-Type: multipart/mixed');
        expect(decoded).toContain('Content-Type: text/html; charset=utf-8');
        expect(decoded).toContain('<h1>HTML body</h1>');
      });
    });
  });
});
