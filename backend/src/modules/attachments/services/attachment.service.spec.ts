/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { AttachmentService, FileUploadData } from './attachment.service';
import {
  GoogleDriveClient,
  DriveUploadResult,
} from './google-drive-client.service';
import { AttachmentDBUtil } from 'src/modules/claims/utils/attachment-db.util';
import { ClaimDBUtil } from 'src/modules/claims/utils/claim-db.util';
import { AttachmentEntity } from 'src/modules/claims/entities/attachment.entity';
import { ClaimEntity } from 'src/modules/claims/entities/claim.entity';
import { UserEntity } from 'src/modules/auth/entities/user.entity';
import { AttachmentStatus } from 'src/modules/claims/enums/attachment-status.enum';
import { AttachmentMimeType } from '@project/types';

// Mock external dependencies
const mockGoogleDriveClient = {
  uploadFile: vi.fn(),
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

    // Create service instance with mocked dependencies
    attachmentService = new AttachmentService(
      mockAttachmentDBUtil as any,
      mockClaimDBUtil as any,
      mockGoogleDriveClient as any,
    );
  });

  const mockUser: UserEntity = {
    id: 'user-123',
    email: 'john.doe@mavericks-consulting.com',
    name: 'John Doe',
    picture: null,
    googleId: 'google-123',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  } as UserEntity;

  const mockClaim: ClaimEntity = {
    id: 'claim-123',
    userId: 'user-123',
    category: 'telco',
    year: 2024,
    month: 9,
    amount: 100.0,
    status: 'draft',
    user: mockUser,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  } as ClaimEntity;

  const mockAttachment: AttachmentEntity = {
    id: 'attachment-123',
    claimId: 'claim-123',
    originalFilename: 'receipt.pdf',
    storedFilename: 'john_doe_telco_2024_09_1234567890.pdf',
    fileSize: 1024,
    mimeType: AttachmentMimeType.PDF,
    googleDriveFileId: 'drive-file-123',
    googleDriveUrl: 'https://drive.google.com/file/d/drive-file-123/view',
    status: AttachmentStatus.UPLOADED,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  } as AttachmentEntity;

  const mockFileData: FileUploadData = {
    buffer: Buffer.from('mock file content'),
    originalName: 'receipt.pdf',
    mimeType: AttachmentMimeType.PDF,
    size: 1024,
  };

  const mockDriveResult: DriveUploadResult = {
    id: 'drive-file-123',
    name: 'john_doe_telco_2024_09_1234567890.pdf',
    webViewLink: 'https://drive.google.com/file/d/drive-file-123/view',
    size: '1024',
    uploadedAt: new Date('2024-01-01'),
  };

  describe('File Upload Workflow', () => {
    it('should successfully upload file with complete workflow', async () => {
      // Setup mocks
      mockClaimDBUtil.getOne.mockResolvedValue(mockClaim);
      mockAttachmentDBUtil.findByClaimId.mockResolvedValue([]);
      mockAttachmentDBUtil.create.mockResolvedValue(mockAttachment);
      mockGoogleDriveClient.createClaimFolder.mockResolvedValue('folder-123');
      mockGoogleDriveClient.uploadFile.mockResolvedValue(mockDriveResult);
      mockAttachmentDBUtil.updateGoogleDriveInfo.mockResolvedValue(
        mockAttachment,
      );

      // Execute
      const result = await attachmentService.uploadFile(
        'user-123',
        'claim-123',
        mockFileData,
      );

      // Verify result
      expect(result.success).toBe(true);
      expect(result.attachmentId).toBe('attachment-123');
      expect(result.fileId).toBe('drive-file-123');
      expect(result.status).toBe(AttachmentStatus.UPLOADED);

      // Verify interactions
      expect(mockClaimDBUtil.getOne).toHaveBeenCalledWith({
        criteria: { id: 'claim-123' },
        relation: { user: true },
      });
      expect(mockAttachmentDBUtil.create).toHaveBeenCalled();
      expect(mockGoogleDriveClient.createClaimFolder).toHaveBeenCalledWith(
        'user-123',
        'claim-123',
      );
      expect(mockGoogleDriveClient.uploadFile).toHaveBeenCalled();
      expect(mockAttachmentDBUtil.updateGoogleDriveInfo).toHaveBeenCalled();
    });

    it('should handle file upload with parent folder ID', async () => {
      mockClaimDBUtil.getOne.mockResolvedValue(mockClaim);
      mockAttachmentDBUtil.findByClaimId.mockResolvedValue([]);
      mockAttachmentDBUtil.create.mockResolvedValue(mockAttachment);
      mockGoogleDriveClient.uploadFile.mockResolvedValue(mockDriveResult);
      mockAttachmentDBUtil.updateGoogleDriveInfo.mockResolvedValue(
        mockAttachment,
      );

      const result = await attachmentService.uploadFile(
        'user-123',
        'claim-123',
        mockFileData,
        'parent-folder-123',
      );

      expect(result.success).toBe(true);
      expect(mockGoogleDriveClient.uploadFile).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          folderId: 'parent-folder-123',
        }),
      );
    });

    it('should handle errors gracefully during upload', async () => {
      mockClaimDBUtil.getOne.mockResolvedValue(mockClaim);
      mockAttachmentDBUtil.findByClaimId.mockResolvedValue([]);
      mockAttachmentDBUtil.create.mockResolvedValue(mockAttachment);
      mockGoogleDriveClient.createClaimFolder.mockResolvedValue('folder-123');
      mockGoogleDriveClient.uploadFile.mockRejectedValue(
        new Error('Drive API error'),
      );

      const result = await attachmentService.uploadFile(
        'user-123',
        'claim-123',
        mockFileData,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Drive API error');
    });
  });

  describe('File Validation', () => {
    it('should reject files that are too large', async () => {
      const largeFileData: FileUploadData = {
        ...mockFileData,
        size: 10 * 1024 * 1024, // 10MB - exceeds 5MB limit
      };

      const result = await attachmentService.uploadFile(
        'user-123',
        'claim-123',
        largeFileData,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('File validation failed');
      expect(result.error).toContain('exceeds maximum allowed size');
    });

    it('should reject empty files', async () => {
      const emptyFileData: FileUploadData = {
        ...mockFileData,
        size: 0,
      };

      const result = await attachmentService.uploadFile(
        'user-123',
        'claim-123',
        emptyFileData,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('File is empty');
    });

    it('should reject files with disallowed MIME types', async () => {
      const disallowedFileData: FileUploadData = {
        ...mockFileData,
        mimeType: 'application/x-executable', // Not in allowed MIME types
      };

      const result = await attachmentService.uploadFile(
        'user-123',
        'claim-123',
        disallowedFileData,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('File type not allowed');
    });

    it('should reject files with dangerous extensions', async () => {
      const dangerousFileData: FileUploadData = {
        ...mockFileData,
        originalName: 'malware.exe',
      };

      const result = await attachmentService.uploadFile(
        'user-123',
        'claim-123',
        dangerousFileData,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain(
        'File type not allowed for security reasons',
      );
    });

    it('should reject files with empty or overly long filenames', async () => {
      const emptyFilenameData: FileUploadData = {
        ...mockFileData,
        originalName: '',
      };

      let result = await attachmentService.uploadFile(
        'user-123',
        'claim-123',
        emptyFilenameData,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Filename is required');

      const longFilenameData: FileUploadData = {
        ...mockFileData,
        originalName: 'a'.repeat(300) + '.pdf', // Exceeds 255 character limit
      };

      result = await attachmentService.uploadFile(
        'user-123',
        'claim-123',
        longFilenameData,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Filename too long');
    });

    it('should accept valid file types', async () => {
      mockClaimDBUtil.getOne.mockResolvedValue(mockClaim);
      mockAttachmentDBUtil.findByClaimId.mockResolvedValue([]);
      mockAttachmentDBUtil.create.mockResolvedValue(mockAttachment);
      mockGoogleDriveClient.createClaimFolder.mockResolvedValue('folder-123');
      mockGoogleDriveClient.uploadFile.mockResolvedValue(mockDriveResult);
      mockAttachmentDBUtil.updateGoogleDriveInfo.mockResolvedValue(
        mockAttachment,
      );

      // Test different valid MIME types
      const validMimeTypes = [
        AttachmentMimeType.PDF,
        AttachmentMimeType.JPEG,
        AttachmentMimeType.PNG,
      ];

      for (const mimeType of validMimeTypes) {
        const validFileData: FileUploadData = {
          ...mockFileData,
          mimeType,
        };

        const result = await attachmentService.uploadFile(
          'user-123',
          'claim-123',
          validFileData,
        );

        expect(result.success).toBe(true);
      }
    });
  });

  describe('Business Logic Validation', () => {
    it('should reject upload if claim not found', async () => {
      mockClaimDBUtil.getOne.mockResolvedValue(null);

      const result = await attachmentService.uploadFile(
        'user-123',
        'claim-123',
        mockFileData,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Claim not found');
    });

    it('should reject upload if maximum files per claim reached', async () => {
      const existingAttachments = Array(5).fill(mockAttachment); // 5 files already exist
      mockClaimDBUtil.getOne.mockResolvedValue(mockClaim);
      mockAttachmentDBUtil.findByClaimId.mockResolvedValue(existingAttachments);

      const result = await attachmentService.uploadFile(
        'user-123',
        'claim-123',
        mockFileData,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Maximum 5 files allowed per claim');
    });

    it('should handle database update failure', async () => {
      mockClaimDBUtil.getOne.mockResolvedValue(mockClaim);
      mockAttachmentDBUtil.findByClaimId.mockResolvedValue([]);
      mockAttachmentDBUtil.create.mockResolvedValue(mockAttachment);
      mockGoogleDriveClient.createClaimFolder.mockResolvedValue('folder-123');
      mockGoogleDriveClient.uploadFile.mockResolvedValue(mockDriveResult);
      mockAttachmentDBUtil.updateGoogleDriveInfo.mockResolvedValue(null); // Update fails

      const result = await attachmentService.uploadFile(
        'user-123',
        'claim-123',
        mockFileData,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain(
        'Failed to update attachment with Google Drive info',
      );
    });
  });

  describe('Attachment Management', () => {
    it('should get attachments by claim ID', async () => {
      const attachments = [mockAttachment];
      mockAttachmentDBUtil.findByClaimId.mockResolvedValue(attachments);

      const result =
        await attachmentService.getAttachmentsByClaimId('claim-123');

      expect(result.success).toBe(true);
      expect(result.attachments).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.attachments![0].id).toBe('attachment-123');
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

      expect(result).not.toBeNull();
      expect(result?.id).toBe('attachment-123');
    });

    it('should return null for non-existent attachment', async () => {
      mockAttachmentDBUtil.getOne.mockResolvedValue(null);

      const result = await attachmentService.getAttachmentById('non-existent');

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
        AttachmentStatus.PROCESSING,
      );

      expect(result).toBe(true);
      expect(mockAttachmentDBUtil.updateStatus).toHaveBeenCalledWith({
        attachmentId: 'attachment-123',
        status: AttachmentStatus.PROCESSING,
      });
    });

    it('should return false if attachment not found during status update', async () => {
      mockAttachmentDBUtil.updateStatus.mockResolvedValue(null);

      const result = await attachmentService.updateAttachmentStatus(
        'attachment-123',
        AttachmentStatus.PROCESSING,
      );

      expect(result).toBe(false);
    });

    it('should handle status update errors', async () => {
      mockAttachmentDBUtil.updateStatus.mockRejectedValue(
        new Error('Database error'),
      );

      const result = await attachmentService.updateAttachmentStatus(
        'attachment-123',
        AttachmentStatus.PROCESSING,
      );

      expect(result).toBe(false);
    });

    it('should get attachments by status', async () => {
      const attachments = [mockAttachment];
      mockAttachmentDBUtil.findByStatus.mockResolvedValue(attachments);

      const result = await attachmentService.getAttachmentsByStatus(
        AttachmentStatus.UPLOADED,
      );

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('attachment-123');
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

  describe('Filename Generation', () => {
    it('should generate proper stored filename following naming convention', async () => {
      mockClaimDBUtil.getOne.mockResolvedValue(mockClaim);
      mockAttachmentDBUtil.findByClaimId.mockResolvedValue([]);
      mockAttachmentDBUtil.create.mockImplementation((params) => {
        // Verify the stored filename follows the convention
        const storedFilename = params.creationData.storedFilename;
        expect(storedFilename).toMatch(/^john_doe_telco_2024_09_\d+\.pdf$/);
        return Promise.resolve(mockAttachment);
      });
      mockGoogleDriveClient.createClaimFolder.mockResolvedValue('folder-123');
      mockGoogleDriveClient.uploadFile.mockResolvedValue(mockDriveResult);
      mockAttachmentDBUtil.updateGoogleDriveInfo.mockResolvedValue(
        mockAttachment,
      );

      await attachmentService.uploadFile('user-123', 'claim-123', mockFileData);

      expect(mockAttachmentDBUtil.create).toHaveBeenCalled();
    });

    it('should handle special characters in employee name', async () => {
      const specialCharacterClaim = {
        ...mockClaim,
        user: {
          ...mockUser,
          name: "John O'Connor-Smith Jr.",
        },
      };

      mockClaimDBUtil.getOne.mockResolvedValue(specialCharacterClaim);
      mockAttachmentDBUtil.findByClaimId.mockResolvedValue([]);
      mockAttachmentDBUtil.create.mockImplementation((params) => {
        const storedFilename = params.creationData.storedFilename;
        // Should clean special characters and limit length
        expect(storedFilename).toMatch(/^john_o_connor_smith_.+$/);
        return Promise.resolve(mockAttachment);
      });
      mockGoogleDriveClient.createClaimFolder.mockResolvedValue('folder-123');
      mockGoogleDriveClient.uploadFile.mockResolvedValue(mockDriveResult);
      mockAttachmentDBUtil.updateGoogleDriveInfo.mockResolvedValue(
        mockAttachment,
      );

      await attachmentService.uploadFile('user-123', 'claim-123', mockFileData);

      expect(mockAttachmentDBUtil.create).toHaveBeenCalled();
    });
  });

  describe('Data Transformation', () => {
    it('should properly transform AttachmentEntity to IAttachmentMetadata', async () => {
      mockAttachmentDBUtil.getOne.mockResolvedValue(mockAttachment);

      const result =
        await attachmentService.getAttachmentById('attachment-123');

      expect(result).not.toBeNull();
      expect(result).toMatchObject({
        id: 'attachment-123',
        claimId: 'claim-123',
        originalFilename: 'receipt.pdf',
        storedFilename: 'john_doe_telco_2024_09_1234567890.pdf',
        fileSize: 1024,
        mimeType: AttachmentMimeType.PDF,
        driveFileId: 'drive-file-123',
        driveShareableUrl:
          'https://drive.google.com/file/d/drive-file-123/view',
        status: AttachmentStatus.UPLOADED,
      });
      expect(result?.uploadedAt).toBeDefined();
      expect(result?.createdAt).toBeDefined();
      expect(result?.updatedAt).toBeDefined();
    });

    it('should handle attachments without Google Drive info', async () => {
      const attachmentWithoutDriveInfo = {
        ...mockAttachment,
        googleDriveFileId: null,
        googleDriveUrl: null,
      };
      mockAttachmentDBUtil.getOne.mockResolvedValue(attachmentWithoutDriveInfo);

      const result =
        await attachmentService.getAttachmentById('attachment-123');

      expect(result?.driveFileId).toBe('');
      expect(result?.driveShareableUrl).toBe('');
    });
  });
});
