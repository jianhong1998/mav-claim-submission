import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AttachmentService } from './attachment.service';
import { GoogleDriveClient } from './google-drive-client.service';
import { AttachmentDBUtil } from 'src/modules/claims/utils/attachment-db.util';
import { ClaimDBUtil } from 'src/modules/claims/utils/claim-db.util';
import { AttachmentEntity } from 'src/modules/claims/entities/attachment.entity';
import { ClaimEntity } from 'src/modules/claims/entities/claim.entity';
import { UserEntity } from 'src/modules/user/entities/user.entity';
import { AttachmentStatus } from 'src/modules/claims/enums/attachment-status.enum';
import { ClaimStatus } from 'src/modules/claims/enums/claim-status.enum';
import { AttachmentMimeType } from '@project/types';

// Mock external dependencies
const mockGoogleDriveClient = {
  createClaimFolder: vi.fn(),
  deleteFile: vi.fn(),
};

const mockAttachmentDBUtil = {
  create: vi.fn(),
  findByClaimId: vi.fn(),
  getOne: vi.fn(),
  delete: vi.fn(),
  updateGoogleDriveInfo: vi.fn(),
  updateStatus: vi.fn(),
  findByStatus: vi.fn(),
};

const mockClaimDBUtil = {
  getOne: vi.fn(),
};

describe('AttachmentService', () => {
  let attachmentService: AttachmentService;

  beforeEach(() => {
    vi.clearAllMocks();
    attachmentService = new AttachmentService(
      mockAttachmentDBUtil as unknown as AttachmentDBUtil,
      mockClaimDBUtil as unknown as ClaimDBUtil,
      mockGoogleDriveClient as unknown as GoogleDriveClient,
    );
  });

  // Mock data
  const mockUser: UserEntity = {
    id: 'user-123',
    email: 'test@mavericks-consulting.com',
    name: 'Test User',
    picture: 'https://example.com/picture.jpg',
    googleId: 'google-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockClaim: ClaimEntity = {
    id: 'claim-123',
    userId: 'user-123',
    user: mockUser,
    category: 'telco',
    year: 2024,
    month: 12,
    totalAmount: 100.5,
    claimName: 'Test claim',
    status: ClaimStatus.DRAFT,
    submissionDate: null,
    attachments: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAttachment: AttachmentEntity = {
    id: 'attachment-123',
    claimId: 'claim-123',
    claim: mockClaim,
    originalFilename: 'receipt.pdf',
    storedFilename: 'test_user_telco_2024_12_1234567890.pdf',
    googleDriveFileId: 'drive-file-123',
    googleDriveUrl: 'https://drive.google.com/file/d/drive-file-123/view',
    fileSize: 1024,
    mimeType: AttachmentMimeType.PDF,
    status: AttachmentStatus.UPLOADED,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('Store File Metadata', () => {
    it('should successfully store file metadata', async () => {
      // Setup mocks
      mockClaimDBUtil.getOne.mockResolvedValue(mockClaim);
      mockAttachmentDBUtil.findByClaimId.mockResolvedValue([]);
      mockAttachmentDBUtil.create.mockResolvedValue(mockAttachment);

      const metadata = {
        originalFilename: 'receipt.pdf',
        storedFilename: 'test_user_telco_2024_12_1234567890.pdf',
        googleDriveFileId: 'drive-file-123',
        googleDriveUrl: 'https://drive.google.com/file/d/drive-file-123/view',
        fileSize: 1024,
        mimeType: AttachmentMimeType.PDF,
      };

      // Execute
      const result = await attachmentService.storeFileMetadata(
        'claim-123',
        metadata,
      );

      // Verify result
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.attachmentId).toBe('attachment-123');
        expect(result.fileId).toBe('drive-file-123');
        expect(result.status).toBe(AttachmentStatus.UPLOADED);
      }

      // Verify interactions
      expect(mockClaimDBUtil.getOne).toHaveBeenCalledWith({
        criteria: { id: 'claim-123' },
      });
      expect(mockAttachmentDBUtil.create).toHaveBeenCalledWith({
        creationData: {
          claimId: 'claim-123',
          originalFilename: 'receipt.pdf',
          storedFilename: 'test_user_telco_2024_12_1234567890.pdf',
          fileSize: 1024,
          mimeType: AttachmentMimeType.PDF,
          googleDriveFileId: 'drive-file-123',
          googleDriveUrl: 'https://drive.google.com/file/d/drive-file-123/view',
          status: AttachmentStatus.UPLOADED,
        },
      });
    });

    it('should reject metadata storage if claim not found', async () => {
      mockClaimDBUtil.getOne.mockResolvedValue(null);

      const metadata = {
        originalFilename: 'receipt.pdf',
        storedFilename: 'test_user_telco_2024_12_1234567890.pdf',
        googleDriveFileId: 'drive-file-123',
        googleDriveUrl: 'https://drive.google.com/file/d/drive-file-123/view',
        fileSize: 1024,
        mimeType: AttachmentMimeType.PDF,
      };

      const result = await attachmentService.storeFileMetadata(
        'claim-123',
        metadata,
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Claim not found');
      }
    });

    it('should reject metadata storage if maximum files per claim reached', async () => {
      mockClaimDBUtil.getOne.mockResolvedValue(mockClaim);
      // Mock 5 existing attachments (max limit)
      mockAttachmentDBUtil.findByClaimId.mockResolvedValue(
        new Array(5).fill(mockAttachment),
      );

      const metadata = {
        originalFilename: 'receipt.pdf',
        storedFilename: 'test_user_telco_2024_12_1234567890.pdf',
        googleDriveFileId: 'drive-file-123',
        googleDriveUrl: 'https://drive.google.com/file/d/drive-file-123/view',
        fileSize: 1024,
        mimeType: AttachmentMimeType.PDF,
      };

      const result = await attachmentService.storeFileMetadata(
        'claim-123',
        metadata,
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Maximum 5 files allowed per claim');
      }
    });
  });

  describe('Attachment Management', () => {
    it('should get attachments by claim ID', async () => {
      mockAttachmentDBUtil.findByClaimId.mockResolvedValue([mockAttachment]);

      const result =
        await attachmentService.getAttachmentsByClaimId('claim-123');

      expect(result.success).toBe(true);
      expect(result.attachments).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should handle errors when getting attachments by claim ID', async () => {
      mockAttachmentDBUtil.findByClaimId.mockRejectedValue(
        new Error('Database error'),
      );

      const result =
        await attachmentService.getAttachmentsByClaimId('claim-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to retrieve attachments');
    });

    it('should get single attachment by ID', async () => {
      mockAttachmentDBUtil.getOne.mockResolvedValue(mockAttachment);

      const result =
        await attachmentService.getAttachmentById('attachment-123');

      expect(result).toBeDefined();
      expect(result?.id).toBe('attachment-123');
    });

    it('should return null for non-existent attachment', async () => {
      mockAttachmentDBUtil.getOne.mockResolvedValue(null);

      const result =
        await attachmentService.getAttachmentById('attachment-123');

      expect(result).toBeNull();
    });

    it('should handle errors when getting attachment by ID', async () => {
      mockAttachmentDBUtil.getOne.mockRejectedValue(
        new Error('Database error'),
      );

      const result =
        await attachmentService.getAttachmentById('attachment-123');

      expect(result).toBeNull();
    });
  });

  describe('Attachment Deletion', () => {
    it('should successfully delete attachment', async () => {
      mockAttachmentDBUtil.getOne.mockResolvedValue(mockAttachment);
      mockGoogleDriveClient.deleteFile.mockResolvedValue(undefined);
      mockAttachmentDBUtil.delete.mockResolvedValue(undefined);

      const result = await attachmentService.deleteAttachment(
        'user-123',
        'attachment-123',
      );

      expect(result).toBe(true);
      expect(mockGoogleDriveClient.deleteFile).toHaveBeenCalledWith(
        'user-123',
        'drive-file-123',
      );
      expect(mockAttachmentDBUtil.delete).toHaveBeenCalledWith({
        criteria: { id: 'attachment-123' },
      });
    });

    it('should fail if attachment not found', async () => {
      mockAttachmentDBUtil.getOne.mockResolvedValue(null);

      const result = await attachmentService.deleteAttachment(
        'user-123',
        'attachment-123',
      );

      expect(result).toBe(false);
    });

    it('should continue with database deletion even if Google Drive deletion fails', async () => {
      mockAttachmentDBUtil.getOne.mockResolvedValue(mockAttachment);
      mockGoogleDriveClient.deleteFile.mockRejectedValue(
        new Error('Drive error'),
      );
      mockAttachmentDBUtil.delete.mockResolvedValue(undefined);

      const result = await attachmentService.deleteAttachment(
        'user-123',
        'attachment-123',
      );

      expect(result).toBe(true);
      expect(mockAttachmentDBUtil.delete).toHaveBeenCalled();
    });

    it('should handle database deletion errors', async () => {
      mockAttachmentDBUtil.getOne.mockResolvedValue(mockAttachment);
      mockGoogleDriveClient.deleteFile.mockResolvedValue(undefined);
      mockAttachmentDBUtil.delete.mockRejectedValue(
        new Error('Database error'),
      );

      const result = await attachmentService.deleteAttachment(
        'user-123',
        'attachment-123',
      );

      expect(result).toBe(false);
    });
  });

  describe('Status Management', () => {
    it('should successfully update attachment status', async () => {
      mockAttachmentDBUtil.updateStatus.mockResolvedValue(mockAttachment);

      const result = await attachmentService.updateAttachmentStatus(
        'attachment-123',
        AttachmentStatus.UPLOADED,
      );

      expect(result).toBe(true);
      expect(mockAttachmentDBUtil.updateStatus).toHaveBeenCalledWith({
        attachmentId: 'attachment-123',
        status: AttachmentStatus.UPLOADED,
      });
    });

    it('should return false if attachment not found during status update', async () => {
      mockAttachmentDBUtil.updateStatus.mockResolvedValue(null);

      const result = await attachmentService.updateAttachmentStatus(
        'attachment-123',
        AttachmentStatus.UPLOADED,
      );

      expect(result).toBe(false);
    });

    it('should handle status update errors', async () => {
      mockAttachmentDBUtil.updateStatus.mockRejectedValue(
        new Error('Database error'),
      );

      const result = await attachmentService.updateAttachmentStatus(
        'attachment-123',
        AttachmentStatus.UPLOADED,
      );

      expect(result).toBe(false);
    });

    it('should get attachments by status', async () => {
      mockAttachmentDBUtil.findByStatus.mockResolvedValue([mockAttachment]);

      const result = await attachmentService.getAttachmentsByStatus(
        AttachmentStatus.UPLOADED,
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toBe(mockAttachment);
    });

    it('should handle errors when getting attachments by status', async () => {
      mockAttachmentDBUtil.findByStatus.mockRejectedValue(
        new Error('Database error'),
      );

      const result = await attachmentService.getAttachmentsByStatus(
        AttachmentStatus.UPLOADED,
      );

      expect(result).toEqual([]);
    });
  });
});
