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
});
