import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { EmailPreviewService } from '../email-preview.service';
import { ClaimDBUtil } from 'src/modules/claims/utils/claim-db.util';
import { AttachmentDBUtil } from 'src/modules/claims/utils/attachment-db.util';
import { UserDBUtil } from 'src/modules/user/utils/user-db.util';
import { EmailTemplateService } from '../email-template.service';
import { EnvironmentVariableUtil } from 'src/modules/common/utils/environment-variable.util';
import { ClaimEntity } from 'src/modules/claims/entities/claim.entity';
import { AttachmentEntity } from 'src/modules/claims/entities/attachment.entity';
import { UserEntity } from 'src/modules/user/entities/user.entity';
import { UserEmailPreferenceEntity } from 'src/modules/user/entities/user-email-preference.entity';
import { ClaimStatus } from 'src/modules/claims/enums/claim-status.enum';
import { ClaimCategory } from 'src/modules/claims/enums/claim-category.enum';
import { AttachmentStatus } from 'src/modules/claims/enums/attachment-status.enum';
import { Repository } from 'typeorm';

// Mock dependencies
const mockClaimDBUtil = {
  getOne: vi.fn(),
};

const mockAttachmentDBUtil = {
  findByClaimId: vi.fn(),
};

const mockUserDBUtil = {
  getOne: vi.fn(),
};

const mockEmailTemplateService = {
  generateClaimEmail: vi.fn(),
  generateSubject: vi.fn(),
};

const mockEnvironmentUtil = {
  getVariables: vi.fn(),
};

const mockEmailPreferenceRepository = {
  find: vi.fn(),
};

describe('EmailPreviewService', () => {
  let emailPreviewService: EmailPreviewService;

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
      fileSize: 102400, // ~100KB
      mimeType: 'application/pdf',
      status: AttachmentStatus.UPLOADED,
      createdAt: new Date('2025-09-01T00:00:00Z'),
      updatedAt: new Date('2025-09-01T00:00:00Z'),
      claim: {} as ClaimEntity,
    },
    {
      id: 'attachment-2',
      claimId: 'claim-123',
      originalFilename: 'invoice.jpg',
      storedFilename: 'invoice_stored.jpg',
      googleDriveFileId: 'drive-file-2',
      googleDriveUrl: 'https://drive.google.com/file/d/drive-file-2/view',
      fileSize: 6291456, // ~6MB (over 5MB threshold)
      mimeType: 'image/jpeg',
      status: AttachmentStatus.UPLOADED,
      createdAt: new Date('2025-09-01T00:00:00Z'),
      updatedAt: new Date('2025-09-01T00:00:00Z'),
      claim: {} as ClaimEntity,
    },
  ];

  const mockCcPreference: UserEmailPreferenceEntity = {
    id: 'pref-cc-1',
    userId: 'user-123',
    emailAddress: 'manager@mavericks-consulting.com',
    type: 'cc',
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
    user: mockUser,
  };

  const mockBccPreference: UserEmailPreferenceEntity = {
    id: 'pref-bcc-1',
    userId: 'user-123',
    emailAddress: 'accounting@mavericks-consulting.com',
    type: 'bcc',
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
    user: mockUser,
  };

  const mockEnvironmentVariables = {
    emailRecipients:
      'finance@mavericks-consulting.com,admin@mavericks-consulting.com',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockClaimDBUtil.getOne.mockResolvedValue(mockClaim);
    mockUserDBUtil.getOne.mockResolvedValue(mockUser);
    mockAttachmentDBUtil.findByClaimId.mockResolvedValue(mockAttachments);
    mockEmailPreferenceRepository.find.mockResolvedValue([]);
    mockEnvironmentUtil.getVariables.mockReturnValue(mockEnvironmentVariables);
    mockEmailTemplateService.generateClaimEmail.mockReturnValue(
      '<html><body>Email Content</body></html>',
    );
    mockEmailTemplateService.generateSubject.mockReturnValue(
      'Claim for Telecommunications (09/2025) ($125.50)',
    );

    emailPreviewService = new EmailPreviewService(
      mockClaimDBUtil as unknown as ClaimDBUtil,
      mockUserDBUtil as unknown as UserDBUtil,
      mockAttachmentDBUtil as unknown as AttachmentDBUtil,
      mockEmailTemplateService as unknown as EmailTemplateService,
      mockEnvironmentUtil as unknown as EnvironmentVariableUtil,
      mockEmailPreferenceRepository as unknown as Repository<UserEmailPreferenceEntity>,
    );
  });

  describe('Test Suite 1: Successful Preview Generation', () => {
    it('should generate preview for valid draft claim', async () => {
      const result = await emailPreviewService.generatePreview(
        'user-123',
        'claim-123',
      );

      expect(result).toBeDefined();
      expect(result.subject).toBeDefined();
      expect(result.htmlBody).toBeDefined();
      expect(result.recipients).toBeDefined();
      expect(result.cc).toBeDefined();
      expect(result.bcc).toBeDefined();
    });

    it('should include subject line matching actual email format', async () => {
      const result = await emailPreviewService.generatePreview(
        'user-123',
        'claim-123',
      );

      // Subject should be: "{userName} - {generated subject from EmailTemplateService}"
      expect(result.subject).toBe(
        'John Doe - Claim for Telecommunications (09/2025) ($125.50)',
      );
    });

    it('should include HTML body with claim data', async () => {
      const mockHtml =
        '<html><body><h1>Claim Submission</h1><p>Category: Telecommunications</p></body></html>';
      mockEmailTemplateService.generateClaimEmail.mockReturnValue(mockHtml);

      const result = await emailPreviewService.generatePreview(
        'user-123',
        'claim-123',
      );

      expect(result.htmlBody).toBe(mockHtml);
    });

    it('should include primary recipients from environment', async () => {
      const result = await emailPreviewService.generatePreview(
        'user-123',
        'claim-123',
      );

      expect(result.recipients).toEqual([
        'finance@mavericks-consulting.com',
        'admin@mavericks-consulting.com',
      ]);
    });

    it('should include CC emails from user preferences', async () => {
      mockEmailPreferenceRepository.find.mockResolvedValue([mockCcPreference]);

      const result = await emailPreviewService.generatePreview(
        'user-123',
        'claim-123',
      );

      expect(result.cc).toEqual(['manager@mavericks-consulting.com']);
    });

    it('should include BCC emails from user preferences', async () => {
      mockEmailPreferenceRepository.find.mockResolvedValue([mockBccPreference]);

      const result = await emailPreviewService.generatePreview(
        'user-123',
        'claim-123',
      );

      expect(result.bcc).toEqual(['accounting@mavericks-consulting.com']);
    });

    it('should handle empty CC/BCC arrays when no preferences exist', async () => {
      mockEmailPreferenceRepository.find.mockResolvedValue([]);

      const result = await emailPreviewService.generatePreview(
        'user-123',
        'claim-123',
      );

      expect(result.cc).toEqual([]);
      expect(result.bcc).toEqual([]);
    });

    it('should correctly separate CC and BCC preferences', async () => {
      mockEmailPreferenceRepository.find.mockResolvedValue([
        mockCcPreference,
        mockBccPreference,
      ]);

      const result = await emailPreviewService.generatePreview(
        'user-123',
        'claim-123',
      );

      expect(result.cc).toEqual(['manager@mavericks-consulting.com']);
      expect(result.bcc).toEqual(['accounting@mavericks-consulting.com']);
    });

    it('should handle multiple CC and BCC preferences', async () => {
      const multipleCcPreferences: UserEmailPreferenceEntity[] = [
        { ...mockCcPreference, id: 'cc-1', emailAddress: 'cc1@example.com' },
        { ...mockCcPreference, id: 'cc-2', emailAddress: 'cc2@example.com' },
      ];
      const multipleBccPreferences: UserEmailPreferenceEntity[] = [
        { ...mockBccPreference, id: 'bcc-1', emailAddress: 'bcc1@example.com' },
        { ...mockBccPreference, id: 'bcc-2', emailAddress: 'bcc2@example.com' },
      ];

      mockEmailPreferenceRepository.find.mockResolvedValue([
        ...multipleCcPreferences,
        ...multipleBccPreferences,
      ]);

      const result = await emailPreviewService.generatePreview(
        'user-123',
        'claim-123',
      );

      expect(result.cc).toEqual(['cc1@example.com', 'cc2@example.com']);
      expect(result.bcc).toEqual(['bcc1@example.com', 'bcc2@example.com']);
    });
  });

  describe('Test Suite 2: Validation Errors', () => {
    it('should throw NotFoundException when claim does not exist', async () => {
      mockClaimDBUtil.getOne.mockResolvedValue(null);

      await expect(
        emailPreviewService.generatePreview('user-123', 'claim-123'),
      ).rejects.toThrow(NotFoundException);

      await expect(
        emailPreviewService.generatePreview('user-123', 'claim-123'),
      ).rejects.toThrow('Claim not found');
    });

    it('should throw ForbiddenException when user does not own the claim', async () => {
      const claimOwnedByDifferentUser = {
        ...mockClaim,
        userId: 'different-user',
      };
      mockClaimDBUtil.getOne.mockResolvedValue(claimOwnedByDifferentUser);

      await expect(
        emailPreviewService.generatePreview('user-123', 'claim-123'),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        emailPreviewService.generatePreview('user-123', 'claim-123'),
      ).rejects.toThrow('Access denied: You do not own this claim');
    });

    it('should throw BadRequestException when claim status is SENT', async () => {
      const sentClaim = { ...mockClaim, status: ClaimStatus.SENT };
      mockClaimDBUtil.getOne.mockResolvedValue(sentClaim);

      await expect(
        emailPreviewService.generatePreview('user-123', 'claim-123'),
      ).rejects.toThrow(BadRequestException);

      await expect(
        emailPreviewService.generatePreview('user-123', 'claim-123'),
      ).rejects.toThrow(
        `Cannot preview email: Claim status is ${ClaimStatus.SENT}, expected ${ClaimStatus.DRAFT}`,
      );
    });

    it('should throw BadRequestException when claim status is PAID', async () => {
      const paidClaim = { ...mockClaim, status: ClaimStatus.PAID };
      mockClaimDBUtil.getOne.mockResolvedValue(paidClaim);

      await expect(
        emailPreviewService.generatePreview('user-123', 'claim-123'),
      ).rejects.toThrow(BadRequestException);

      await expect(
        emailPreviewService.generatePreview('user-123', 'claim-123'),
      ).rejects.toThrow(
        `Cannot preview email: Claim status is ${ClaimStatus.PAID}, expected ${ClaimStatus.DRAFT}`,
      );
    });

    it('should throw BadRequestException when claim status is FAILED', async () => {
      const failedClaim = { ...mockClaim, status: ClaimStatus.FAILED };
      mockClaimDBUtil.getOne.mockResolvedValue(failedClaim);

      await expect(
        emailPreviewService.generatePreview('user-123', 'claim-123'),
      ).rejects.toThrow(BadRequestException);

      await expect(
        emailPreviewService.generatePreview('user-123', 'claim-123'),
      ).rejects.toThrow(
        `Cannot preview email: Claim status is ${ClaimStatus.FAILED}, expected ${ClaimStatus.DRAFT}`,
      );
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockUserDBUtil.getOne.mockResolvedValue(null);

      await expect(
        emailPreviewService.generatePreview('user-123', 'claim-123'),
      ).rejects.toThrow(NotFoundException);

      await expect(
        emailPreviewService.generatePreview('user-123', 'claim-123'),
      ).rejects.toThrow('User not found');
    });
  });

  describe('Test Suite 3: Data Queries', () => {
    it('should query ClaimDBUtil with correct claim ID', async () => {
      await emailPreviewService.generatePreview('user-123', 'claim-123');

      expect(mockClaimDBUtil.getOne).toHaveBeenCalledWith({
        criteria: { id: 'claim-123' },
      });
    });

    it('should query UserDBUtil with authenticated user ID', async () => {
      await emailPreviewService.generatePreview('user-123', 'claim-123');

      expect(mockUserDBUtil.getOne).toHaveBeenCalledWith({
        criteria: { id: 'user-123' },
      });
    });

    it('should query AttachmentDBUtil with claim ID', async () => {
      await emailPreviewService.generatePreview('user-123', 'claim-123');

      expect(mockAttachmentDBUtil.findByClaimId).toHaveBeenCalledWith({
        claimId: 'claim-123',
      });
    });

    it('should query UserEmailPreferenceEntity repository with user ID', async () => {
      await emailPreviewService.generatePreview('user-123', 'claim-123');

      expect(mockEmailPreferenceRepository.find).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
      });
    });

    it('should query EnvironmentVariableUtil for email recipients', async () => {
      await emailPreviewService.generatePreview('user-123', 'claim-123');

      expect(mockEnvironmentUtil.getVariables).toHaveBeenCalled();
    });
  });

  describe('Test Suite 4: Template Rendering', () => {
    it('should call EmailTemplateService.generateClaimEmail with correct params', async () => {
      await emailPreviewService.generatePreview('user-123', 'claim-123');

      expect(mockEmailTemplateService.generateClaimEmail).toHaveBeenCalledWith(
        mockClaim,
        mockUser,
        mockAttachments,
      );
    });

    it('should pass undefined as processedAttachments parameter', async () => {
      await emailPreviewService.generatePreview('user-123', 'claim-123');

      // Verify generateClaimEmail is called with only 3 arguments (claim, user, attachments)
      // The 4th argument (processedAttachments) should NOT be passed
      expect(mockEmailTemplateService.generateClaimEmail).toHaveBeenCalledTimes(
        1,
      );
      const callArgs =
        mockEmailTemplateService.generateClaimEmail.mock.calls[0];
      expect(callArgs.length).toBe(3);
      expect(callArgs[0]).toBe(mockClaim);
      expect(callArgs[1]).toBe(mockUser);
      expect(callArgs[2]).toBe(mockAttachments);
    });

    it('should call EmailTemplateService.generateSubject with claim', async () => {
      await emailPreviewService.generatePreview('user-123', 'claim-123');

      expect(mockEmailTemplateService.generateSubject).toHaveBeenCalledWith(
        mockClaim,
      );
    });

    it('should use generated subject with user name prefix', async () => {
      mockEmailTemplateService.generateSubject.mockReturnValue(
        'Claim for Fitness & Wellness (01/2025) ($50.00)',
      );

      const result = await emailPreviewService.generatePreview(
        'user-123',
        'claim-123',
      );

      expect(result.subject).toBe(
        'John Doe - Claim for Fitness & Wellness (01/2025) ($50.00)',
      );
    });
  });

  describe('Edge Cases and Additional Scenarios', () => {
    it('should handle empty attachments array', async () => {
      mockAttachmentDBUtil.findByClaimId.mockResolvedValue([]);

      const result = await emailPreviewService.generatePreview(
        'user-123',
        'claim-123',
      );

      expect(result).toBeDefined();
      expect(mockEmailTemplateService.generateClaimEmail).toHaveBeenCalledWith(
        mockClaim,
        mockUser,
        [],
      );
    });

    it('should handle null attachments from database', async () => {
      mockAttachmentDBUtil.findByClaimId.mockResolvedValue(null);

      const result = await emailPreviewService.generatePreview(
        'user-123',
        'claim-123',
      );

      expect(result).toBeDefined();
      // Service should pass empty array or handle null gracefully
      expect(mockEmailTemplateService.generateClaimEmail).toHaveBeenCalled();
    });

    it('should handle single recipient in environment variable', async () => {
      mockEnvironmentUtil.getVariables.mockReturnValue({
        emailRecipients: 'single@mavericks-consulting.com',
      });

      const result = await emailPreviewService.generatePreview(
        'user-123',
        'claim-123',
      );

      expect(result.recipients).toEqual(['single@mavericks-consulting.com']);
    });

    it('should handle email recipients with extra whitespace', async () => {
      mockEnvironmentUtil.getVariables.mockReturnValue({
        emailRecipients:
          ' email1@test.com , email2@test.com , email3@test.com ',
      });

      const result = await emailPreviewService.generatePreview(
        'user-123',
        'claim-123',
      );

      expect(result.recipients).toEqual([
        'email1@test.com',
        'email2@test.com',
        'email3@test.com',
      ]);
    });

    it('should filter out empty strings from email recipients', async () => {
      mockEnvironmentUtil.getVariables.mockReturnValue({
        emailRecipients: 'email1@test.com,,email2@test.com,',
      });

      const result = await emailPreviewService.generatePreview(
        'user-123',
        'claim-123',
      );

      expect(result.recipients).toEqual(['email1@test.com', 'email2@test.com']);
    });

    it('should handle claim with null claimName', async () => {
      const claimWithNullName = { ...mockClaim, claimName: null };
      mockClaimDBUtil.getOne.mockResolvedValue(claimWithNullName);

      const result = await emailPreviewService.generatePreview(
        'user-123',
        'claim-123',
      );

      expect(result).toBeDefined();
      expect(mockEmailTemplateService.generateClaimEmail).toHaveBeenCalledWith(
        claimWithNullName,
        mockUser,
        mockAttachments,
      );
    });

    it('should handle various claim categories', async () => {
      const categories = [
        ClaimCategory.FITNESS,
        ClaimCategory.DENTAL,
        ClaimCategory.COMPANY_EVENT,
        ClaimCategory.COMPANY_LUNCH,
        ClaimCategory.OTHERS,
      ];

      for (const category of categories) {
        const claimWithCategory = { ...mockClaim, category };
        mockClaimDBUtil.getOne.mockResolvedValue(claimWithCategory);

        const result = await emailPreviewService.generatePreview(
          'user-123',
          'claim-123',
        );
        expect(result).toBeDefined();
      }
    });

    it('should handle claims with various amount values', async () => {
      const amounts = [0, 0.01, 100, 1000.5, 9999.99];

      for (const amount of amounts) {
        const claimWithAmount = { ...mockClaim, totalAmount: amount };
        mockClaimDBUtil.getOne.mockResolvedValue(claimWithAmount);

        const result = await emailPreviewService.generatePreview(
          'user-123',
          'claim-123',
        );
        expect(result).toBeDefined();
      }
    });
  });

  describe('Performance and Integration Verification', () => {
    it('should not call any external APIs (no Drive API, no Gmail API)', async () => {
      // This test verifies that the preview service only queries database and renders templates
      // No external service calls should be made

      await emailPreviewService.generatePreview('user-123', 'claim-123');

      // Verify only database utilities and template service are called
      expect(mockClaimDBUtil.getOne).toHaveBeenCalledTimes(1);
      expect(mockUserDBUtil.getOne).toHaveBeenCalledTimes(1);
      expect(mockAttachmentDBUtil.findByClaimId).toHaveBeenCalledTimes(1);
      expect(mockEmailPreferenceRepository.find).toHaveBeenCalledTimes(1);
      expect(mockEnvironmentUtil.getVariables).toHaveBeenCalledTimes(1);
      expect(mockEmailTemplateService.generateClaimEmail).toHaveBeenCalledTimes(
        1,
      );
      expect(mockEmailTemplateService.generateSubject).toHaveBeenCalledTimes(1);

      // No Gmail or Drive client should be involved
      // (These would need to be separate mock objects if they were dependencies)
    });

    it('should execute all database queries in correct order', async () => {
      const callOrder: string[] = [];

      mockClaimDBUtil.getOne.mockImplementation(() => {
        callOrder.push('claimDBUtil.getOne');
        return Promise.resolve(mockClaim);
      });

      mockUserDBUtil.getOne.mockImplementation(() => {
        callOrder.push('userDBUtil.getOne');
        return Promise.resolve(mockUser);
      });

      mockAttachmentDBUtil.findByClaimId.mockImplementation(() => {
        callOrder.push('attachmentDBUtil.findByClaimId');
        return Promise.resolve(mockAttachments);
      });

      mockEmailPreferenceRepository.find.mockImplementation(() => {
        callOrder.push('emailPreferenceRepository.find');
        return Promise.resolve([]);
      });

      await emailPreviewService.generatePreview('user-123', 'claim-123');

      // Verify order: claim → user → attachments → preferences
      expect(callOrder).toEqual([
        'claimDBUtil.getOne',
        'userDBUtil.getOne',
        'attachmentDBUtil.findByClaimId',
        'emailPreferenceRepository.find',
      ]);
    });
  });
});
