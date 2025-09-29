/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DataSource, EntityManager } from 'typeorm';
import { EmailService } from '../email.service';
import { ClaimDBUtil } from 'src/modules/claims/utils/claim-db.util';
import { AttachmentDBUtil } from 'src/modules/claims/utils/attachment-db.util';
import { UserDBUtil } from 'src/modules/user/utils/user-db.util';
import { GmailClient } from '../gmail-client.service';
import { EmailTemplateService } from '../email-template.service';
import { EnvironmentVariableUtil } from 'src/modules/common/utils/environment-variable.util';
import { ClaimEntity } from 'src/modules/claims/entities/claim.entity';
import { AttachmentEntity } from 'src/modules/claims/entities/attachment.entity';
import { UserEntity } from 'src/modules/user/entities/user.entity';
import { ClaimStatus } from 'src/modules/claims/enums/claim-status.enum';
import { ClaimCategory } from 'src/modules/claims/enums/claim-category.enum';
import { AttachmentStatus } from 'src/modules/claims/enums/attachment-status.enum';
import { IClaimEmailRequest, IEmailSendResponse } from '@project/types';

// Mock external dependencies
const mockDataSource = {
  transaction: vi.fn(),
};

const mockClaimDBUtil = {
  getOne: vi.fn(),
  updateWithSave: vi.fn(),
};

const mockAttachmentDBUtil = {
  findByClaimId: vi.fn(),
};

const mockUserDBUtil = {
  getOne: vi.fn(),
};

const mockGmailClient = {
  sendEmail: vi.fn(),
};

const mockEmailTemplateService = {
  generateClaimEmail: vi.fn(),
  generateSubject: vi.fn(),
};

const mockEnvironmentUtil = {
  getVariables: vi.fn(),
};

const mockEntityManager = {
  // Mock entity manager for transaction testing
} as unknown as EntityManager;

describe('EmailService', () => {
  let emailService: EmailService;

  beforeEach(() => {
    vi.clearAllMocks();

    // Set up transaction mock to call the callback with entity manager
    mockDataSource.transaction.mockImplementation(
      async (callback: (entityManager: EntityManager) => Promise<unknown>) => {
        return await callback(mockEntityManager);
      },
    );

    emailService = new EmailService(
      mockDataSource as unknown as DataSource,
      mockClaimDBUtil as unknown as ClaimDBUtil,
      mockAttachmentDBUtil as unknown as AttachmentDBUtil,
      mockUserDBUtil as unknown as UserDBUtil,
      mockGmailClient as unknown as GmailClient,
      mockEmailTemplateService as unknown as EmailTemplateService,
      mockEnvironmentUtil as unknown as EnvironmentVariableUtil,
    );
  });

  // Mock data
  const mockUser: UserEntity = {
    id: 'user-123',
    email: 'test@mavericks-consulting.com',
    name: 'John Doe',
    picture: 'https://example.com/picture.jpg',
    googleId: 'google-123',
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
  };

  const mockClaim: ClaimEntity = {
    id: 'claim-123',
    userId: 'user-123',
    user: mockUser,
    category: ClaimCategory.TELCO,
    claimName: 'Monthly Phone Bill',
    month: 9,
    year: 2025,
    totalAmount: 125.5,
    status: ClaimStatus.DRAFT,
    submissionDate: null,
    createdAt: new Date('2025-09-01T00:00:00Z'),
    updatedAt: new Date('2025-09-01T00:00:00Z'),
  };

  const mockAttachments: AttachmentEntity[] = [
    {
      id: 'attachment-1',
      claimId: 'claim-123',
      originalFilename: 'receipt.pdf',
      storedFilename: 'receipt_stored.pdf',
      googleDriveFileId: 'drive-file-1',
      googleDriveUrl: 'https://drive.google.com/file/d/drive-file-1/view',
      fileSize: 102400,
      mimeType: 'application/pdf',
      status: AttachmentStatus.UPLOADED,
      createdAt: new Date('2025-09-01T00:00:00Z'),
      updatedAt: new Date('2025-09-01T00:00:00Z'),
      claim: {} as ClaimEntity,
    },
  ];

  const mockEmailRequest: IClaimEmailRequest = {
    claimId: 'claim-123',
  };

  const mockEnvironmentVariables = {
    emailRecipients:
      'admin@mavericks-consulting.com,finance@mavericks-consulting.com',
  };

  describe('Requirements 3.1-3.2 - Claim Validation and Service Integration', () => {
    beforeEach(() => {
      // Reset all mocks before each test
      vi.clearAllMocks();

      // Reset dataSource.transaction mock
      mockDataSource.transaction.mockImplementation(async (callback) => {
        return await callback(mockEntityManager);
      });

      mockEnvironmentUtil.getVariables.mockReturnValue(
        mockEnvironmentVariables,
      );
      mockEmailTemplateService.generateClaimEmail.mockReturnValue(
        '<html>Email content</html>',
      );
      mockEmailTemplateService.generateSubject.mockReturnValue(
        'Claim Submission - Test',
      );
    });

    it('should successfully send claim email with complete workflow', async () => {
      // Mock successful validation with draft claim
      const freshDraftClaim = { ...mockClaim, status: ClaimStatus.DRAFT };
      mockClaimDBUtil.getOne
        .mockResolvedValueOnce(freshDraftClaim) // Initial claim lookup
        .mockResolvedValueOnce(freshDraftClaim); // Status update lookup
      mockUserDBUtil.getOne.mockResolvedValue(mockUser);
      mockAttachmentDBUtil.findByClaimId.mockResolvedValue(mockAttachments);

      // Mock successful email sending
      const mockEmailResponse: IEmailSendResponse = {
        success: true,
        messageId: 'gmail-message-123',
      };
      mockGmailClient.sendEmail.mockResolvedValue(mockEmailResponse);

      // Mock successful claim update
      const updatedClaim = {
        ...mockClaim,
        status: ClaimStatus.SENT,
        submissionDate: new Date(),
      };
      mockClaimDBUtil.updateWithSave.mockResolvedValue([updatedClaim]);

      const result = await emailService.sendClaimEmail(
        'user-123',
        mockEmailRequest,
      );

      expect(result).toEqual({
        success: true,
        messageId: 'gmail-message-123',
        claim: {
          id: updatedClaim.id,
          userId: updatedClaim.userId,
          category: updatedClaim.category,
          claimName: updatedClaim.claimName,
          month: updatedClaim.month,
          year: updatedClaim.year,
          totalAmount: Number(updatedClaim.totalAmount),
          status: updatedClaim.status,
          submissionDate: updatedClaim.submissionDate?.toISOString() || null,
          createdAt: updatedClaim.createdAt.toISOString(),
          updatedAt: updatedClaim.updatedAt.toISOString(),
        },
      });

      // Verify claim validation was called
      expect(mockClaimDBUtil.getOne).toHaveBeenCalledWith({
        criteria: { id: 'claim-123' },
        relation: { user: true },
      });
      expect(mockUserDBUtil.getOne).toHaveBeenCalledWith({
        criteria: { id: 'user-123' },
      });
      expect(mockAttachmentDBUtil.findByClaimId).toHaveBeenCalledWith({
        claimId: 'claim-123',
      });

      // Verify email generation and sending
      expect(mockEmailTemplateService.generateClaimEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'claim-123',
          category: ClaimCategory.TELCO,
          claimName: 'Monthly Phone Bill',
        }),
        mockUser,
        mockAttachments,
      );
      expect(mockEmailTemplateService.generateSubject).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'claim-123',
          category: ClaimCategory.TELCO,
          claimName: 'Monthly Phone Bill',
        }),
      );
      expect(mockGmailClient.sendEmail).toHaveBeenCalledWith('user-123', {
        to: mockEnvironmentVariables.emailRecipients,
        subject: 'Claim Submission - Test',
        body: '<html>Email content</html>',
        isHtml: true,
      });

      // Verify transaction was used for status update
      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(mockClaimDBUtil.updateWithSave).toHaveBeenCalledWith({
        dataArray: [
          expect.objectContaining({
            status: ClaimStatus.SENT,
            submissionDate: expect.any(Date),
          }),
        ],
        entityManager: mockEntityManager,
      });
    });

    it('should validate claim ownership and reject unauthorized access', async () => {
      const unauthorizedClaim = { ...mockClaim, userId: 'different-user' };
      mockClaimDBUtil.getOne.mockResolvedValue(unauthorizedClaim);

      const result = await emailService.sendClaimEmail(
        'user-123',
        mockEmailRequest,
      );

      expect(result).toEqual({
        success: false,
        error: 'Access denied: You do not own this claim',
      });

      // Should not proceed to email sending
      expect(mockGmailClient.sendEmail).not.toHaveBeenCalled();
      expect(mockDataSource.transaction).not.toHaveBeenCalled();
    });

    it('should validate claim status and reject non-draft claims', async () => {
      const sentClaim = { ...mockClaim, status: ClaimStatus.SENT };
      mockClaimDBUtil.getOne.mockResolvedValue(sentClaim);

      const result = await emailService.sendClaimEmail(
        'user-123',
        mockEmailRequest,
      );

      expect(result).toEqual({
        success: false,
        error: `Cannot send email: Claim status is ${ClaimStatus.SENT}, expected ${ClaimStatus.DRAFT} or ${ClaimStatus.FAILED}`,
      });

      expect(mockGmailClient.sendEmail).not.toHaveBeenCalled();
      expect(mockDataSource.transaction).not.toHaveBeenCalled();
    });

    it('should handle claim not found scenario', async () => {
      mockClaimDBUtil.getOne.mockResolvedValue(null);

      const result = await emailService.sendClaimEmail(
        'user-123',
        mockEmailRequest,
      );

      expect(result).toEqual({
        success: false,
        error: 'Claim not found',
      });

      expect(mockGmailClient.sendEmail).not.toHaveBeenCalled();
      expect(mockDataSource.transaction).not.toHaveBeenCalled();
    });

    it('should handle user not found scenario', async () => {
      mockClaimDBUtil.getOne.mockResolvedValue(mockClaim);
      mockUserDBUtil.getOne.mockResolvedValue(null);

      const result = await emailService.sendClaimEmail(
        'user-123',
        mockEmailRequest,
      );

      expect(result).toEqual({
        success: false,
        error: 'User not found',
      });

      expect(mockGmailClient.sendEmail).not.toHaveBeenCalled();
      expect(mockDataSource.transaction).not.toHaveBeenCalled();
    });

    it('should handle validation errors gracefully', async () => {
      mockClaimDBUtil.getOne.mockRejectedValue(
        new Error('Database connection failed'),
      );

      const result = await emailService.sendClaimEmail(
        'user-123',
        mockEmailRequest,
      );

      expect(result).toEqual({
        success: false,
        error: 'Claim validation failed',
      });

      expect(mockGmailClient.sendEmail).not.toHaveBeenCalled();
      expect(mockDataSource.transaction).not.toHaveBeenCalled();
    });
  });

  describe('Requirements 3.5-3.6 - Status Updates and Transaction Boundaries', () => {
    beforeEach(() => {
      // Reset all mocks before each test
      vi.clearAllMocks();

      // Reset dataSource.transaction mock
      mockDataSource.transaction.mockImplementation(async (callback) => {
        return await callback(mockEntityManager);
      });

      // Use fresh objects to avoid mutation issues between tests
      const freshClaim = { ...mockClaim, status: ClaimStatus.DRAFT };
      const freshUser = { ...mockUser };
      const freshAttachments = mockAttachments.map((att) => ({ ...att }));

      mockClaimDBUtil.getOne.mockResolvedValue(freshClaim);
      mockUserDBUtil.getOne.mockResolvedValue(freshUser);
      mockAttachmentDBUtil.findByClaimId.mockResolvedValue(freshAttachments);
      mockEnvironmentUtil.getVariables.mockReturnValue(
        mockEnvironmentVariables,
      );
      mockEmailTemplateService.generateClaimEmail.mockReturnValue(
        '<html>Email content</html>',
      );
      mockEmailTemplateService.generateSubject.mockReturnValue(
        'Claim Submission - Test',
      );
    });

    it('should update claim status to SENT when email succeeds', async () => {
      const mockEmailResponse: IEmailSendResponse = {
        success: true,
        messageId: 'gmail-message-123',
      };
      mockGmailClient.sendEmail.mockResolvedValue(mockEmailResponse);

      const updatedClaim = {
        ...mockClaim,
        status: ClaimStatus.SENT,
        submissionDate: new Date(),
      };
      mockClaimDBUtil.updateWithSave.mockResolvedValue([updatedClaim]);

      const result = await emailService.sendClaimEmail(
        'user-123',
        mockEmailRequest,
      );

      expect(result.success).toBe(true);
      expect(result.claim?.status).toBe(ClaimStatus.SENT);

      // Verify transaction was used
      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(mockClaimDBUtil.updateWithSave).toHaveBeenCalledWith({
        dataArray: [
          expect.objectContaining({
            status: ClaimStatus.SENT,
            submissionDate: expect.any(Date),
          }),
        ],
        entityManager: mockEntityManager,
      });
    });

    it('should update claim status to FAILED when email fails', async () => {
      const mockEmailResponse: IEmailSendResponse = {
        success: false,
        error: 'Gmail quota exceeded',
      };
      mockGmailClient.sendEmail.mockResolvedValue(mockEmailResponse);

      // Use fresh draft claim for validation and lookup
      const freshDraftClaim = { ...mockClaim, status: ClaimStatus.DRAFT };
      const failedClaim = { ...mockClaim, status: ClaimStatus.FAILED };
      mockClaimDBUtil.getOne
        .mockResolvedValueOnce(freshDraftClaim) // Initial validation
        .mockResolvedValueOnce(freshDraftClaim); // Status update lookup
      mockClaimDBUtil.updateWithSave.mockResolvedValue([failedClaim]);

      const result = await emailService.sendClaimEmail(
        'user-123',
        mockEmailRequest,
      );

      expect(result).toEqual({
        success: false,
        error: 'Gmail quota exceeded',
      });

      // Verify claim was marked as failed
      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(mockClaimDBUtil.updateWithSave).toHaveBeenCalledWith({
        dataArray: [
          expect.objectContaining({
            status: ClaimStatus.FAILED,
          }),
        ],
        entityManager: mockEntityManager,
      });
    });

    it('should handle transaction rollback when status update fails', async () => {
      const mockEmailResponse: IEmailSendResponse = {
        success: true,
        messageId: 'gmail-message-123',
      };
      mockGmailClient.sendEmail.mockResolvedValue(mockEmailResponse);

      // Mock transaction failure
      mockDataSource.transaction.mockRejectedValue(
        new Error('Transaction deadlock'),
      );

      const result = await emailService.sendClaimEmail(
        'user-123',
        mockEmailRequest,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Transaction deadlock');

      // Verify rollback scenario - should attempt to mark claim as failed
      expect(mockDataSource.transaction).toHaveBeenCalled();
    });

    it('should handle claim not found during status update', async () => {
      const mockEmailResponse: IEmailSendResponse = {
        success: true,
        messageId: 'gmail-message-123',
      };
      mockGmailClient.sendEmail.mockResolvedValue(mockEmailResponse);

      // Mock claim not found in transaction
      const freshDraftClaim = { ...mockClaim, status: ClaimStatus.DRAFT };
      mockClaimDBUtil.getOne
        .mockResolvedValueOnce(freshDraftClaim) // Initial validation
        .mockResolvedValueOnce(null); // Transaction lookup fails

      mockDataSource.transaction.mockImplementation(async (callback) => {
        const result = await callback(mockEntityManager);
        return result;
      });

      const result = await emailService.sendClaimEmail(
        'user-123',
        mockEmailRequest,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should handle update failure during transaction', async () => {
      const mockEmailResponse: IEmailSendResponse = {
        success: true,
        messageId: 'gmail-message-123',
      };
      mockGmailClient.sendEmail.mockResolvedValue(mockEmailResponse);

      // Mock update failure
      const freshDraftClaim = { ...mockClaim, status: ClaimStatus.DRAFT };
      mockClaimDBUtil.getOne
        .mockResolvedValueOnce(freshDraftClaim) // Initial validation
        .mockResolvedValueOnce(freshDraftClaim); // Transaction lookup succeeds
      mockClaimDBUtil.updateWithSave.mockResolvedValue([]); // Empty array indicates failure

      mockDataSource.transaction.mockImplementation(async (callback) => {
        const result = await callback(mockEntityManager);
        return result;
      });

      const result = await emailService.sendClaimEmail(
        'user-123',
        mockEmailRequest,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to update claim status');
    });
  });

  describe('Error Propagation and Recovery', () => {
    beforeEach(() => {
      // Reset all mocks before each test
      vi.clearAllMocks();

      // Reset dataSource.transaction mock
      mockDataSource.transaction.mockImplementation(async (callback) => {
        return await callback(mockEntityManager);
      });

      // Use fresh objects to avoid mutation issues between tests
      const freshClaim = { ...mockClaim, status: ClaimStatus.DRAFT };
      const freshUser = { ...mockUser };
      const freshAttachments = mockAttachments.map((att) => ({ ...att }));

      mockClaimDBUtil.getOne.mockResolvedValue(freshClaim);
      mockUserDBUtil.getOne.mockResolvedValue(freshUser);
      mockAttachmentDBUtil.findByClaimId.mockResolvedValue(freshAttachments);
      mockEnvironmentUtil.getVariables.mockReturnValue(
        mockEnvironmentVariables,
      );
      mockEmailTemplateService.generateClaimEmail.mockReturnValue(
        '<html>Email content</html>',
      );
      mockEmailTemplateService.generateSubject.mockReturnValue(
        'Claim Submission - Test',
      );
    });

    it('should handle unexpected errors during email generation', async () => {
      mockEmailTemplateService.generateClaimEmail.mockImplementation(() => {
        throw new Error('Template rendering failed');
      });

      const result = await emailService.sendClaimEmail(
        'user-123',
        mockEmailRequest,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Template rendering failed');

      // Should not call email sending
      expect(mockGmailClient.sendEmail).not.toHaveBeenCalled();
    });

    it('should handle network timeout during email sending', async () => {
      mockGmailClient.sendEmail.mockRejectedValue(new Error('Network timeout'));

      const result = await emailService.sendClaimEmail(
        'user-123',
        mockEmailRequest,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network timeout');
    });

    it('should attempt status recovery when main workflow fails', async () => {
      // Mock claim in draft status for recovery attempt
      const draftClaim = { ...mockClaim, status: ClaimStatus.DRAFT };
      mockClaimDBUtil.getOne
        .mockResolvedValueOnce(draftClaim) // Initial validation
        .mockResolvedValueOnce(draftClaim); // Recovery lookup

      // Mock unexpected error during workflow
      mockGmailClient.sendEmail.mockRejectedValue(
        new Error('Unexpected error'),
      );

      // Mock recovery status update
      const failedClaim = { ...mockClaim, status: ClaimStatus.FAILED };
      mockClaimDBUtil.updateWithSave.mockResolvedValue([failedClaim]);

      const result = await emailService.sendClaimEmail(
        'user-123',
        mockEmailRequest,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unexpected error');

      // Verify recovery attempt was made
      expect(mockClaimDBUtil.getOne).toHaveBeenCalledWith({
        criteria: { id: 'claim-123' },
      });
      expect(mockDataSource.transaction).toHaveBeenCalled();
    });

    it('should handle recovery failure gracefully', async () => {
      // Mock claim in draft status for recovery attempt
      const draftClaim = { ...mockClaim, status: ClaimStatus.DRAFT };
      mockClaimDBUtil.getOne
        .mockResolvedValueOnce(draftClaim) // Initial validation
        .mockResolvedValueOnce(draftClaim); // Recovery lookup

      // Mock unexpected error during workflow
      mockGmailClient.sendEmail.mockRejectedValue(
        new Error('Unexpected error'),
      );

      // Mock recovery failure
      mockDataSource.transaction.mockRejectedValue(
        new Error('Recovery failed'),
      );

      const result = await emailService.sendClaimEmail(
        'user-123',
        mockEmailRequest,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unexpected error');

      // Should handle recovery failure without throwing
      expect(mockDataSource.transaction).toHaveBeenCalled();
    });

    it('should not attempt recovery for already sent claims', async () => {
      // Mock claim in sent status - no recovery needed
      const draftClaim = { ...mockClaim, status: ClaimStatus.DRAFT };
      const sentClaim = { ...mockClaim, status: ClaimStatus.SENT };
      mockClaimDBUtil.getOne
        .mockResolvedValueOnce(draftClaim) // Initial validation
        .mockResolvedValueOnce(sentClaim); // Recovery lookup

      // Mock unexpected error during workflow
      mockGmailClient.sendEmail.mockRejectedValue(
        new Error('Unexpected error'),
      );

      const result = await emailService.sendClaimEmail(
        'user-123',
        mockEmailRequest,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unexpected error');

      // Should not attempt status update for already sent claim
      expect(mockClaimDBUtil.updateWithSave).not.toHaveBeenCalled();
    });
  });

  describe('Service Integration and Data Flow', () => {
    beforeEach(() => {
      // Reset all mocks before each test
      vi.clearAllMocks();

      // Reset dataSource.transaction mock
      mockDataSource.transaction.mockImplementation(async (callback) => {
        return await callback(mockEntityManager);
      });

      // Use fresh objects to avoid mutation issues between tests
      const freshClaim = { ...mockClaim, status: ClaimStatus.DRAFT };
      const freshUser = { ...mockUser };
      const freshAttachments = mockAttachments.map((att) => ({ ...att }));

      mockClaimDBUtil.getOne.mockResolvedValue(freshClaim);
      mockUserDBUtil.getOne.mockResolvedValue(freshUser);
      mockAttachmentDBUtil.findByClaimId.mockResolvedValue(freshAttachments);
      mockEnvironmentUtil.getVariables.mockReturnValue(
        mockEnvironmentVariables,
      );
      mockEmailTemplateService.generateClaimEmail.mockReturnValue(
        '<html>Email content</html>',
      );
      mockEmailTemplateService.generateSubject.mockReturnValue(
        'Claim Submission - Test',
      );
    });

    it('should pass correct data between services', async () => {
      const mockEmailResponse: IEmailSendResponse = {
        success: true,
        messageId: 'gmail-message-123',
      };
      mockGmailClient.sendEmail.mockResolvedValue(mockEmailResponse);

      const updatedClaim = {
        ...mockClaim,
        status: ClaimStatus.SENT,
        submissionDate: new Date(),
      };
      mockClaimDBUtil.updateWithSave.mockResolvedValue([updatedClaim]);

      await emailService.sendClaimEmail('user-123', mockEmailRequest);

      // Verify EmailTemplateService receives correct data
      expect(mockEmailTemplateService.generateClaimEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'claim-123',
          category: ClaimCategory.TELCO,
          claimName: 'Monthly Phone Bill',
        }),
        expect.objectContaining({
          id: 'user-123',
          email: 'test@mavericks-consulting.com',
          name: 'John Doe',
        }),
        expect.arrayContaining([
          expect.objectContaining({
            id: 'attachment-1',
            originalFilename: 'receipt.pdf',
          }),
        ]),
      );

      // Verify GmailClient receives correct email data
      expect(mockGmailClient.sendEmail).toHaveBeenCalledWith('user-123', {
        to: 'admin@mavericks-consulting.com,finance@mavericks-consulting.com',
        subject: expect.any(String),
        body: expect.any(String),
        isHtml: true,
      });
    });

    it('should handle empty attachments array', async () => {
      mockAttachmentDBUtil.findByClaimId.mockResolvedValue([]);

      const mockEmailResponse: IEmailSendResponse = {
        success: true,
        messageId: 'gmail-message-123',
      };
      mockGmailClient.sendEmail.mockResolvedValue(mockEmailResponse);

      const updatedClaim = {
        ...mockClaim,
        status: ClaimStatus.SENT,
        submissionDate: new Date(),
      };
      mockClaimDBUtil.updateWithSave.mockResolvedValue([updatedClaim]);

      const result = await emailService.sendClaimEmail(
        'user-123',
        mockEmailRequest,
      );

      expect(result.success).toBe(true);
      expect(mockEmailTemplateService.generateClaimEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'claim-123',
          category: ClaimCategory.TELCO,
          claimName: 'Monthly Phone Bill',
        }),
        mockUser,
        [], // Empty attachments array
      );
    });

    it('should handle null attachments from database', async () => {
      mockAttachmentDBUtil.findByClaimId.mockResolvedValue(null);

      const mockEmailResponse: IEmailSendResponse = {
        success: true,
        messageId: 'gmail-message-123',
      };
      mockGmailClient.sendEmail.mockResolvedValue(mockEmailResponse);

      const updatedClaim = {
        ...mockClaim,
        status: ClaimStatus.SENT,
        submissionDate: new Date(),
      };
      mockClaimDBUtil.updateWithSave.mockResolvedValue([updatedClaim]);

      const result = await emailService.sendClaimEmail(
        'user-123',
        mockEmailRequest,
      );

      expect(result.success).toBe(true);
      expect(mockEmailTemplateService.generateClaimEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'claim-123',
          category: ClaimCategory.TELCO,
          claimName: 'Monthly Phone Bill',
        }),
        mockUser,
        [], // Null converted to empty array
      );
    });

    it('should use environment variables for email recipients', async () => {
      const customRecipients = 'custom@example.com,test@example.com';
      mockEnvironmentUtil.getVariables.mockReturnValue({
        emailRecipients: customRecipients,
      });

      const mockEmailResponse: IEmailSendResponse = {
        success: true,
        messageId: 'gmail-message-123',
      };
      mockGmailClient.sendEmail.mockResolvedValue(mockEmailResponse);

      const updatedClaim = {
        ...mockClaim,
        status: ClaimStatus.SENT,
        submissionDate: new Date(),
      };
      mockClaimDBUtil.updateWithSave.mockResolvedValue([updatedClaim]);

      await emailService.sendClaimEmail('user-123', mockEmailRequest);

      expect(mockGmailClient.sendEmail).toHaveBeenCalledWith('user-123', {
        to: customRecipients,
        subject: expect.any(String),
        body: expect.any(String),
        isHtml: true,
      });
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    beforeEach(() => {
      // Reset all mocks before each test
      vi.clearAllMocks();

      // Reset dataSource.transaction mock
      mockDataSource.transaction.mockImplementation(async (callback) => {
        return await callback(mockEntityManager);
      });

      // Reset all database utility mocks to default values
      mockClaimDBUtil.getOne.mockReset();
      mockUserDBUtil.getOne.mockReset();
      mockAttachmentDBUtil.findByClaimId.mockReset();
      mockClaimDBUtil.updateWithSave.mockReset();
      mockGmailClient.sendEmail.mockReset();

      mockEnvironmentUtil.getVariables.mockReturnValue(
        mockEnvironmentVariables,
      );
      mockEmailTemplateService.generateClaimEmail.mockReturnValue(
        '<html>Email content</html>',
      );
      mockEmailTemplateService.generateSubject.mockReturnValue(
        'Claim Submission - Test',
      );
    });
    it('should handle invalid validation result structure', async () => {
      // Create fresh claim object to avoid mutation from other tests
      const freshClaim = {
        ...mockClaim,
        status: ClaimStatus.DRAFT, // Ensure status is draft
      };

      // Mock a scenario where validation succeeds but returns incomplete data
      mockClaimDBUtil.getOne.mockResolvedValue(freshClaim);
      mockUserDBUtil.getOne.mockResolvedValue(null); // This makes user undefined

      const result = await emailService.sendClaimEmail(
        'user-123',
        mockEmailRequest,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });

    it('should handle extremely long claim names and email content', async () => {
      const longNameClaim = {
        ...mockClaim,
        claimName: 'A'.repeat(1000), // Very long claim name
        status: ClaimStatus.DRAFT, // Ensure status is draft
      };

      // Set up mocks specific to this test
      mockClaimDBUtil.getOne
        .mockResolvedValueOnce(longNameClaim) // Initial validation
        .mockResolvedValueOnce(longNameClaim); // Status update lookup
      mockUserDBUtil.getOne.mockResolvedValue(mockUser);
      mockAttachmentDBUtil.findByClaimId.mockResolvedValue(mockAttachments);

      const longEmailContent =
        '<html>' + 'Very long email content'.repeat(1000) + '</html>';
      mockEmailTemplateService.generateClaimEmail.mockReturnValue(
        longEmailContent,
      );
      mockEmailTemplateService.generateSubject.mockReturnValue('Long subject');

      const mockEmailResponse: IEmailSendResponse = {
        success: true,
        messageId: 'gmail-message-123',
      };
      mockGmailClient.sendEmail.mockResolvedValue(mockEmailResponse);

      const updatedClaim = {
        ...longNameClaim,
        status: ClaimStatus.SENT,
        submissionDate: new Date(),
      };
      mockClaimDBUtil.updateWithSave.mockResolvedValue([updatedClaim]);

      const result = await emailService.sendClaimEmail(
        'user-123',
        mockEmailRequest,
      );

      expect(result.success).toBe(true);
      expect(mockGmailClient.sendEmail).toHaveBeenCalledWith('user-123', {
        to: mockEnvironmentVariables.emailRecipients,
        subject: 'Long subject',
        body: longEmailContent,
        isHtml: true,
      });
    });

    it('should handle concurrent access scenarios gracefully', async () => {
      // Create fresh claim object to avoid mutation from other tests
      const freshClaim = {
        ...mockClaim,
        status: ClaimStatus.DRAFT, // Ensure status is draft
      };

      // Set up mocks specific to this test
      mockClaimDBUtil.getOne
        .mockResolvedValueOnce(freshClaim) // Initial validation
        .mockResolvedValueOnce(freshClaim); // Recovery lookup
      mockUserDBUtil.getOne.mockResolvedValue(mockUser);
      mockAttachmentDBUtil.findByClaimId.mockResolvedValue(mockAttachments);

      const mockEmailResponse: IEmailSendResponse = {
        success: true,
        messageId: 'gmail-message-123',
      };
      mockGmailClient.sendEmail.mockResolvedValue(mockEmailResponse);

      // Override the transaction mock to simulate deadlock
      mockDataSource.transaction.mockReset();
      mockDataSource.transaction.mockRejectedValue(
        new Error('deadlock detected'),
      );

      const result = await emailService.sendClaimEmail(
        'user-123',
        mockEmailRequest,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('deadlock detected');
    });
  });
});
