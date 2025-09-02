/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  UnauthorizedException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { EmailService } from './email.service';
import { TokenService } from 'src/modules/auth/services/token.service';
import { IEmailSendRequest } from '@project/types';
import { google } from 'googleapis';
import { CommonModule } from 'src/modules/common/common.module';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock googleapis
vi.mock('googleapis');
const mockGoogle = google as unknown as {
  auth: { OAuth2: ReturnType<typeof vi.fn> };
  gmail: ReturnType<typeof vi.fn>;
};

describe('EmailService', () => {
  let service: EmailService;
  let tokenService: {
    getValidTokenForUser: ReturnType<typeof vi.fn>;
    updateToken: ReturnType<typeof vi.fn>;
  };

  const mockTokens = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
  };

  const mockEmailRequest: IEmailSendRequest = {
    to: 'test@example.com',
    subject: 'Test Subject',
    body: 'Test email body',
    isHtml: false,
  };

  const mockGmailAPI = {
    users: {
      messages: {
        send: vi.fn(),
      },
      getProfile: vi.fn(),
    },
  };

  const mockOAuth2Client = {
    setCredentials: vi.fn(),
    refreshAccessToken: vi.fn(),
  };

  beforeEach(async () => {
    const mockTokenService = {
      getValidTokenForUser: vi.fn(),
      updateToken: vi.fn(),
    };

    // Mock Google OAuth2 and Gmail API
    mockGoogle.auth.OAuth2 = vi.fn().mockImplementation(() => mockOAuth2Client);
    mockGoogle.gmail = vi.fn().mockReturnValue(mockGmailAPI);

    const module: TestingModule = await Test.createTestingModule({
      imports: [CommonModule],
      providers: [
        EmailService,
        {
          provide: TokenService,
          useValue: mockTokenService,
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    tokenService = module.get(TokenService);

    // Mock environment variables
    process.env.GOOGLE_CLIENT_ID = 'test-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
    process.env.GOOGLE_REDIRECT_URI =
      'http://localhost:3001/auth/google/callback';

    // Mock logger to avoid console output in tests
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.GOOGLE_REDIRECT_URI;
  });

  describe('sendEmail', () => {
    it('should send email successfully', async () => {
      tokenService.getValidTokenForUser.mockResolvedValue(mockTokens);
      mockGmailAPI.users.messages.send.mockResolvedValue({
        data: { id: 'message-id-123' },
      });

      const result = await service.sendEmail('user-1', mockEmailRequest);

      expect(tokenService.getValidTokenForUser).toHaveBeenCalledWith('user-1');
      expect(mockOAuth2Client.setCredentials).toHaveBeenCalledWith({
        access_token: mockTokens.accessToken,
        refresh_token: mockTokens.refreshToken,
      });
      expect(mockGmailAPI.users.messages.send).toHaveBeenCalledWith({
        userId: 'me',
        requestBody: {
          raw: expect.stringMatching(/.+/),
        },
      });
      expect(result).toEqual({
        success: true,
        messageId: 'message-id-123',
      });
    });

    it('should throw UnauthorizedException when user has no valid tokens', async () => {
      tokenService.getValidTokenForUser.mockResolvedValue(null);

      await expect(
        service.sendEmail('user-1', mockEmailRequest),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException for invalid email address', async () => {
      const invalidEmailRequest = { ...mockEmailRequest, to: 'invalid-email' };

      await expect(
        service.sendEmail('user-1', invalidEmailRequest),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for empty subject', async () => {
      const invalidEmailRequest = { ...mockEmailRequest, subject: '' };

      await expect(
        service.sendEmail('user-1', invalidEmailRequest),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for empty body', async () => {
      const invalidEmailRequest = { ...mockEmailRequest, body: '' };

      await expect(
        service.sendEmail('user-1', invalidEmailRequest),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for subject too long', async () => {
      const longSubject = 'a'.repeat(1000);
      const invalidEmailRequest = { ...mockEmailRequest, subject: longSubject };

      await expect(
        service.sendEmail('user-1', invalidEmailRequest),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for body too long', async () => {
      const longBody = 'a'.repeat(1000001);
      const invalidEmailRequest = { ...mockEmailRequest, body: longBody };

      await expect(
        service.sendEmail('user-1', invalidEmailRequest),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle Gmail API 403 error', async () => {
      tokenService.getValidTokenForUser.mockResolvedValue(mockTokens);
      mockGmailAPI.users.messages.send.mockRejectedValue({ code: 403 });

      await expect(
        service.sendEmail('user-1', mockEmailRequest),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should handle Gmail API 429 error', async () => {
      tokenService.getValidTokenForUser.mockResolvedValue(mockTokens);
      mockGmailAPI.users.messages.send.mockRejectedValue({ code: 429 });

      await expect(
        service.sendEmail('user-1', mockEmailRequest),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should return failure response for generic Gmail API errors', async () => {
      tokenService.getValidTokenForUser.mockResolvedValue(mockTokens);
      mockGmailAPI.users.messages.send.mockRejectedValue(
        new Error('Generic Gmail error'),
      );

      const result = await service.sendEmail('user-1', mockEmailRequest);

      expect(result).toEqual({
        success: false,
        error: 'Generic Gmail error',
      });
    });

    it('should prepare HTML email content correctly', async () => {
      const htmlEmailRequest = { ...mockEmailRequest, isHtml: true };
      tokenService.getValidTokenForUser.mockResolvedValue(mockTokens);
      mockGmailAPI.users.messages.send.mockResolvedValue({
        data: { id: 'message-id-123' },
      });

      await service.sendEmail('user-1', htmlEmailRequest);

      const callArgs = mockGmailAPI.users.messages.send.mock.calls[0][0];
      const decodedContent = Buffer.from(
        callArgs.requestBody.raw,
        'base64url',
      ).toString();

      expect(decodedContent).toContain(
        'Content-Type: text/html; charset=utf-8',
      );
    });

    it('should prepare plain text email content correctly', async () => {
      tokenService.getValidTokenForUser.mockResolvedValue(mockTokens);
      mockGmailAPI.users.messages.send.mockResolvedValue({
        data: { id: 'message-id-123' },
      });

      await service.sendEmail('user-1', mockEmailRequest);

      const callArgs = mockGmailAPI.users.messages.send.mock.calls[0][0];
      const decodedContent = Buffer.from(
        callArgs.requestBody.raw,
        'base64url',
      ).toString();

      expect(decodedContent).toContain(
        'Content-Type: text/plain; charset=utf-8',
      );
      expect(decodedContent).toContain('To: test@example.com');
      expect(decodedContent).toContain('Subject: Test Subject');
      expect(decodedContent).toContain('Test email body');
    });
  });

  describe('refreshUserToken', () => {
    it('should refresh user token successfully', async () => {
      const mockCredentials = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expiry_date: Date.now() + 3600000, // 1 hour from now
      };

      tokenService.getValidTokenForUser.mockResolvedValue(mockTokens);
      mockOAuth2Client.refreshAccessToken.mockResolvedValue({
        credentials: mockCredentials,
      });
      tokenService.updateToken.mockResolvedValue({} as unknown);

      const result = await service.refreshUserToken('user-1');

      expect(tokenService.getValidTokenForUser).toHaveBeenCalledWith('user-1');
      expect(mockOAuth2Client.setCredentials).toHaveBeenCalledWith({
        access_token: mockTokens.accessToken,
        refresh_token: mockTokens.refreshToken,
      });
      expect(mockOAuth2Client.refreshAccessToken).toHaveBeenCalled();
      expect(tokenService.updateToken).toHaveBeenCalledWith({
        userId: 'user-1',
        provider: 'google',
        accessToken: mockCredentials.access_token,
        refreshToken: mockCredentials.refresh_token,
        expiresAt: new Date(mockCredentials.expiry_date),
        scope: 'https://www.googleapis.com/auth/gmail.send',
      });
      expect(result).toBe(true);
    });

    it('should return false when user has no valid tokens', async () => {
      tokenService.getValidTokenForUser.mockResolvedValue(null);

      const result = await service.refreshUserToken('user-1');

      expect(result).toBe(false);
    });

    it('should return false when token refresh fails', async () => {
      tokenService.getValidTokenForUser.mockResolvedValue(mockTokens);
      mockOAuth2Client.refreshAccessToken.mockRejectedValue(
        new Error('Refresh failed'),
      );

      const result = await service.refreshUserToken('user-1');

      expect(result).toBe(false);
    });

    it('should return false when refreshed credentials are incomplete', async () => {
      tokenService.getValidTokenForUser.mockResolvedValue(mockTokens);
      mockOAuth2Client.refreshAccessToken.mockResolvedValue({
        credentials: { access_token: null },
      });

      const result = await service.refreshUserToken('user-1');

      expect(result).toBe(false);
    });

    it('should use original refresh token when new one not provided', async () => {
      const mockCredentials = {
        access_token: 'new-access-token',
        refresh_token: null, // No new refresh token
        expiry_date: Date.now() + 3600000,
      };

      tokenService.getValidTokenForUser.mockResolvedValue(mockTokens);
      mockOAuth2Client.refreshAccessToken.mockResolvedValue({
        credentials: mockCredentials,
      });
      tokenService.updateToken.mockResolvedValue({} as unknown);

      await service.refreshUserToken('user-1');

      expect(tokenService.updateToken).toHaveBeenCalledWith(
        expect.objectContaining({
          refreshToken: mockTokens.refreshToken, // Should use original refresh token
        }),
      );
    });
  });

  describe('checkGmailAccess', () => {
    it('should return true when Gmail access is valid', async () => {
      tokenService.getValidTokenForUser.mockResolvedValue(mockTokens);
      mockGmailAPI.users.getProfile.mockResolvedValue({ data: {} });

      const result = await service.checkGmailAccess('user-1');

      expect(tokenService.getValidTokenForUser).toHaveBeenCalledWith('user-1');
      expect(mockOAuth2Client.setCredentials).toHaveBeenCalledWith({
        access_token: mockTokens.accessToken,
        refresh_token: mockTokens.refreshToken,
      });
      expect(mockGmailAPI.users.getProfile).toHaveBeenCalledWith({
        userId: 'me',
      });
      expect(result).toBe(true);
    });

    it('should return false when user has no valid tokens', async () => {
      tokenService.getValidTokenForUser.mockResolvedValue(null);

      const result = await service.checkGmailAccess('user-1');

      expect(result).toBe(false);
    });

    it('should try to refresh token on 401 error', async () => {
      tokenService.getValidTokenForUser.mockResolvedValue(mockTokens);
      mockGmailAPI.users.getProfile.mockRejectedValue({ code: 401 });
      vi.spyOn(service, 'refreshUserToken').mockResolvedValue(true);

      const result = await service.checkGmailAccess('user-1');

      expect(service.refreshUserToken).toHaveBeenCalledWith('user-1');
      expect(result).toBe(true);
    });

    it('should return false for non-401 API errors', async () => {
      tokenService.getValidTokenForUser.mockResolvedValue(mockTokens);
      mockGmailAPI.users.getProfile.mockRejectedValue({ code: 403 });

      const result = await service.checkGmailAccess('user-1');

      expect(result).toBe(false);
    });

    it('should return false when token refresh fails on 401 error', async () => {
      tokenService.getValidTokenForUser.mockResolvedValue(mockTokens);
      mockGmailAPI.users.getProfile.mockRejectedValue({ code: 401 });
      vi.spyOn(service, 'refreshUserToken').mockResolvedValue(false);

      const result = await service.checkGmailAccess('user-1');

      expect(result).toBe(false);
    });
  });

  describe('email validation', () => {
    const validEmails = [
      'test@example.com',
      'user.name@domain.co.uk',
      'test+tag@example.org',
      'numbers123@test.com',
    ];

    const invalidEmails = [
      'invalid-email',
      '@example.com',
      'test@',
      'test..test@example.com',
      'test @example.com',
    ];

    validEmails.forEach((email) => {
      it(`should accept valid email: ${email}`, async () => {
        const emailRequest = { ...mockEmailRequest, to: email };
        tokenService.getValidTokenForUser.mockResolvedValue(mockTokens);
        mockGmailAPI.users.messages.send.mockResolvedValue({
          data: { id: 'message-id' },
        });

        await expect(
          service.sendEmail('user-1', emailRequest),
        ).resolves.toBeDefined();
      });
    });

    invalidEmails.forEach((email) => {
      it(`should reject invalid email: ${email}`, async () => {
        const emailRequest = { ...mockEmailRequest, to: email };
        tokenService.getValidTokenForUser.mockResolvedValue(mockTokens);

        await expect(service.sendEmail('user-1', emailRequest)).rejects.toThrow(
          BadRequestException,
        );
      });
    });
  });
});
