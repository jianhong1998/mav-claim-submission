/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { DataSource, EntityManager } from 'typeorm';
import { EmailService } from '../email.service';
import { ClaimDBUtil } from 'src/modules/claims/utils/claim-db.util';
import { AttachmentDBUtil } from 'src/modules/claims/utils/attachment-db.util';
import { UserDBUtil } from 'src/modules/user/utils/user-db.util';
import { GmailClient } from '../gmail-client.service';
import { EmailTemplateService } from '../email-template.service';
import { EnvironmentVariableUtil } from 'src/modules/common/utils/environment-variable.util';
import { ClaimStatus } from 'src/modules/claims/enums/claim-status.enum';
import { ClaimCategory } from 'src/modules/claims/enums/claim-category.enum';
import { AttachmentStatus } from 'src/modules/claims/enums/attachment-status.enum';
import { IEmailSendResponse } from '@project/types';

describe('EmailService Integration Tests', () => {
  let emailService: EmailService;
  let mockDataSource: { transaction: Mock };
  let mockClaimDBUtil: {
    getOne: Mock;
    updateWithSave: Mock;
  };
  let mockAttachmentDBUtil: { findByClaimId: Mock };
  let mockUserDBUtil: { getOne: Mock };
  let mockGmailClient: { sendEmail: Mock };
  let mockEmailTemplateService: {
    generateClaimEmail: Mock;
    generateSubject: Mock;
  };
  let mockEnvironmentUtil: { getVariables: Mock };

  // Helper functions to create fresh mock objects for each test
  const createMockClaim = () => ({
    id: 'claim-123',
    userId: 'user-123',
    user: {
      id: 'user-123',
      email: 'test@mavericks-consulting.com',
      name: 'John Doe',
    },
    category: ClaimCategory.TELCO,
    claimName: 'Monthly Phone Bill',
    month: 9,
    year: 2025,
    totalAmount: 125.5,
    status: ClaimStatus.DRAFT,
    submissionDate: null,
    createdAt: new Date('2025-09-01T00:00:00Z'),
    updatedAt: new Date('2025-09-01T00:00:00Z'),
  });

  const createMockUser = () => ({
    id: 'user-123',
    email: 'test@mavericks-consulting.com',
    name: 'John Doe',
    picture: 'https://example.com/picture.jpg',
    googleId: 'google-123',
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
  });

  const createMockAttachments = () => [
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
    },
  ];

  beforeEach(() => {
    // Create fresh mocks for each test
    mockDataSource = {
      transaction: vi.fn(),
    };

    mockClaimDBUtil = {
      getOne: vi.fn(),
      updateWithSave: vi.fn(),
    };

    mockAttachmentDBUtil = {
      findByClaimId: vi.fn(),
    };

    mockUserDBUtil = {
      getOne: vi.fn(),
    };

    mockGmailClient = {
      sendEmail: vi.fn(),
    };

    mockEmailTemplateService = {
      generateClaimEmail: vi.fn(),
      generateSubject: vi.fn(),
    };

    mockEnvironmentUtil = {
      getVariables: vi.fn(),
    };

    // Set up default successful responses
    mockEnvironmentUtil.getVariables.mockReturnValue({
      emailRecipients: 'admin@mavericks-consulting.com',
    });

    mockEmailTemplateService.generateClaimEmail.mockReturnValue(
      '<html>Email content</html>',
    );
    mockEmailTemplateService.generateSubject.mockReturnValue(
      'Claim Submission - Test',
    );

    // Mock transaction to call callback immediately
    mockDataSource.transaction.mockImplementation(
      async (callback: (manager: EntityManager) => Promise<unknown>) => {
        return await callback({} as EntityManager);
      },
    );

    // Create service instance
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

  describe('Requirements 3.1-3.2 - Claim Validation and Service Integration', () => {
    it('should successfully coordinate complete email sending workflow', async () => {
      // Setup valid claim validation with fresh objects
      const mockClaim = createMockClaim();
      const mockUser = createMockUser();
      const mockAttachments = createMockAttachments();

      mockClaimDBUtil.getOne.mockResolvedValue(mockClaim);
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
        submissionDate: new Date('2025-09-17T00:00:00Z'),
      };
      mockClaimDBUtil.updateWithSave.mockResolvedValue([updatedClaim]);

      const result = await emailService.sendClaimEmail('user-123', {
        claimId: 'claim-123',
      });

      // Verify successful response
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('gmail-message-123');
      expect(result.claim?.status).toBe(ClaimStatus.SENT);

      // Verify service coordination
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
      expect(mockEmailTemplateService.generateClaimEmail).toHaveBeenCalledWith(
        mockClaim,
        mockUser,
        mockAttachments,
      );
      expect(mockGmailClient.sendEmail).toHaveBeenCalledWith('user-123', {
        to: 'admin@mavericks-consulting.com',
        subject: 'Claim Submission - Test',
        body: '<html>Email content</html>',
        isHtml: true,
      });
      expect(mockDataSource.transaction).toHaveBeenCalled();
    });

    it('should validate claim ownership before processing', async () => {
      const unauthorizedClaim = {
        ...createMockClaim(),
        userId: 'different-user',
      };
      mockClaimDBUtil.getOne.mockResolvedValue(unauthorizedClaim);

      const result = await emailService.sendClaimEmail('user-123', {
        claimId: 'claim-123',
      });

      expect(result).toEqual({
        success: false,
        error: 'Access denied: You do not own this claim',
      });

      // Should not proceed to service integration
      expect(mockGmailClient.sendEmail).not.toHaveBeenCalled();
      expect(mockDataSource.transaction).not.toHaveBeenCalled();
    });

    it('should validate claim status before processing', async () => {
      const sentClaim = { ...createMockClaim(), status: ClaimStatus.SENT };
      mockClaimDBUtil.getOne.mockResolvedValue(sentClaim);

      const result = await emailService.sendClaimEmail('user-123', {
        claimId: 'claim-123',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot send email: Claim status is');

      // Should not proceed to service integration
      expect(mockGmailClient.sendEmail).not.toHaveBeenCalled();
      expect(mockDataSource.transaction).not.toHaveBeenCalled();
    });
  });

  describe('Requirements 3.5-3.6 - Status Updates and Transaction Boundaries', () => {
    beforeEach(() => {
      // Set up successful validation for transaction tests with fresh objects
      mockClaimDBUtil.getOne.mockResolvedValue(createMockClaim());
      mockUserDBUtil.getOne.mockResolvedValue(createMockUser());
      mockAttachmentDBUtil.findByClaimId.mockResolvedValue(
        createMockAttachments(),
      );
    });

    it('should update claim status to SENT within transaction when email succeeds', async () => {
      const mockEmailResponse: IEmailSendResponse = {
        success: true,
        messageId: 'gmail-message-123',
      };
      mockGmailClient.sendEmail.mockResolvedValue(mockEmailResponse);

      const updatedClaim = {
        ...createMockClaim(),
        status: ClaimStatus.SENT,
        submissionDate: new Date('2025-09-17T00:00:00Z'),
      };
      mockClaimDBUtil.updateWithSave.mockResolvedValue([updatedClaim]);

      const result = await emailService.sendClaimEmail('user-123', {
        claimId: 'claim-123',
      });

      expect(result.success).toBe(true);
      expect(result.claim?.status).toBe(ClaimStatus.SENT);

      // Verify transaction was used for status update
      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(mockClaimDBUtil.updateWithSave).toHaveBeenCalledWith({
        dataArray: [
          expect.objectContaining({
            status: ClaimStatus.SENT,
            submissionDate: expect.any(Date),
          }),
        ],
        entityManager: expect.any(Object),
      });
    });

    it('should update claim status to FAILED within transaction when email fails', async () => {
      const mockEmailResponse: IEmailSendResponse = {
        success: false,
        error: 'Gmail quota exceeded',
      };
      mockGmailClient.sendEmail.mockResolvedValue(mockEmailResponse);

      const failedClaim = { ...createMockClaim(), status: ClaimStatus.FAILED };
      mockClaimDBUtil.updateWithSave.mockResolvedValue([failedClaim]);

      const result = await emailService.sendClaimEmail('user-123', {
        claimId: 'claim-123',
      });

      expect(result).toEqual({
        success: false,
        error: 'Gmail quota exceeded',
      });

      // Verify transaction boundary for failure case
      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(mockClaimDBUtil.updateWithSave).toHaveBeenCalledWith({
        dataArray: [
          expect.objectContaining({
            status: ClaimStatus.FAILED,
          }),
        ],
        entityManager: expect.any(Object),
      });
    });

    it('should handle transaction rollback scenarios', async () => {
      const mockEmailResponse: IEmailSendResponse = {
        success: true,
        messageId: 'gmail-message-123',
      };
      mockGmailClient.sendEmail.mockResolvedValue(mockEmailResponse);

      // Mock transaction failure
      mockDataSource.transaction.mockRejectedValue(
        new Error('Transaction deadlock'),
      );

      const result = await emailService.sendClaimEmail('user-123', {
        claimId: 'claim-123',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Transaction deadlock');

      // Verify transaction was attempted
      expect(mockDataSource.transaction).toHaveBeenCalled();
    });
  });

  describe('Error Propagation and Service Integration', () => {
    beforeEach(() => {
      mockClaimDBUtil.getOne.mockResolvedValue(createMockClaim());
      mockUserDBUtil.getOne.mockResolvedValue(createMockUser());
      mockAttachmentDBUtil.findByClaimId.mockResolvedValue(
        createMockAttachments(),
      );
    });

    it('should handle template service errors', async () => {
      mockEmailTemplateService.generateClaimEmail.mockImplementation(() => {
        throw new Error('Template rendering failed');
      });

      const result = await emailService.sendClaimEmail('user-123', {
        claimId: 'claim-123',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Template rendering failed');

      // Should not proceed to email sending
      expect(mockGmailClient.sendEmail).not.toHaveBeenCalled();
    });

    it('should handle Gmail service errors', async () => {
      mockGmailClient.sendEmail.mockRejectedValue(new Error('Network timeout'));

      const result = await emailService.sendClaimEmail('user-123', {
        claimId: 'claim-123',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network timeout');
    });

    it('should attempt error recovery for workflow failures', async () => {
      // Reset all mocks to avoid interference from beforeEach
      mockClaimDBUtil.getOne.mockReset();
      mockUserDBUtil.getOne.mockReset();
      mockAttachmentDBUtil.findByClaimId.mockReset();

      // Mock unexpected error during workflow
      mockGmailClient.sendEmail.mockRejectedValue(
        new Error('Unexpected error'),
      );

      // Set up initial validation - claim is found with user relation, user lookup, and attachments
      const initialClaim = createMockClaim();
      initialClaim.user = createMockUser();
      mockClaimDBUtil.getOne.mockResolvedValueOnce(initialClaim); // Initial validation
      mockUserDBUtil.getOne.mockResolvedValueOnce(createMockUser());
      mockAttachmentDBUtil.findByClaimId.mockResolvedValueOnce(
        createMockAttachments(),
      );

      // Transaction will try to get claim to update status after Gmail error
      mockClaimDBUtil.getOne.mockResolvedValueOnce(createMockClaim()); // Transaction lookup for failed status

      // Set up recovery scenario - current claim is in draft state
      const draftClaim = { ...createMockClaim(), status: ClaimStatus.DRAFT };
      mockClaimDBUtil.getOne.mockResolvedValueOnce(draftClaim); // Recovery lookup

      // Recovery transaction will also get claim for update
      mockClaimDBUtil.getOne.mockResolvedValueOnce(createMockClaim()); // Recovery transaction lookup

      // Mock recovery status update
      const failedClaim = { ...createMockClaim(), status: ClaimStatus.FAILED };
      mockClaimDBUtil.updateWithSave.mockResolvedValue([failedClaim]);

      const result = await emailService.sendClaimEmail('user-123', {
        claimId: 'claim-123',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unexpected error');

      // Verify recovery attempt was made - recovery lookup should include the specific criteria
      expect(mockClaimDBUtil.getOne).toHaveBeenCalledWith({
        criteria: { id: 'claim-123' },
      });
      expect(mockDataSource.transaction).toHaveBeenCalled();
    });
  });

  describe('Service Data Flow Integration', () => {
    beforeEach(() => {
      mockClaimDBUtil.getOne.mockResolvedValue(createMockClaim());
      mockUserDBUtil.getOne.mockResolvedValue(createMockUser());
    });

    it('should handle empty attachments in service flow', async () => {
      mockAttachmentDBUtil.findByClaimId.mockResolvedValue([]);

      const mockEmailResponse: IEmailSendResponse = {
        success: true,
        messageId: 'gmail-message-123',
      };
      mockGmailClient.sendEmail.mockResolvedValue(mockEmailResponse);

      const updatedClaim = {
        ...createMockClaim(),
        status: ClaimStatus.SENT,
        submissionDate: new Date('2025-09-17T00:00:00Z'),
      };
      mockClaimDBUtil.updateWithSave.mockResolvedValue([updatedClaim]);

      const result = await emailService.sendClaimEmail('user-123', {
        claimId: 'claim-123',
      });

      expect(result.success).toBe(true);
      expect(mockEmailTemplateService.generateClaimEmail).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'claim-123' }),
        expect.objectContaining({ id: 'user-123' }),
        [], // Empty attachments array
      );
    });

    it('should pass environment configuration through service flow', async () => {
      const customRecipients = 'custom@example.com,test@example.com';
      mockEnvironmentUtil.getVariables.mockReturnValue({
        emailRecipients: customRecipients,
      });

      mockAttachmentDBUtil.findByClaimId.mockResolvedValue(
        createMockAttachments(),
      );

      const mockEmailResponse: IEmailSendResponse = {
        success: true,
        messageId: 'gmail-message-123',
      };
      mockGmailClient.sendEmail.mockResolvedValue(mockEmailResponse);

      const updatedClaim = {
        ...createMockClaim(),
        status: ClaimStatus.SENT,
        submissionDate: new Date('2025-09-17T00:00:00Z'),
      };
      mockClaimDBUtil.updateWithSave.mockResolvedValue([updatedClaim]);

      await emailService.sendClaimEmail('user-123', { claimId: 'claim-123' });

      expect(mockGmailClient.sendEmail).toHaveBeenCalledWith('user-123', {
        to: customRecipients,
        subject: 'Claim Submission - Test',
        body: '<html>Email content</html>',
        isHtml: true,
      });
    });
  });
});
