import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { AttachmentDBUtil } from 'src/modules/claims/utils/attachment-db.util';
import { ClaimDBUtil } from 'src/modules/claims/utils/claim-db.util';
import {
  GoogleDriveClient,
  DriveUploadOptions,
} from './google-drive-client.service';
import { AttachmentEntity } from 'src/modules/claims/entities/attachment.entity';
import { AttachmentStatus } from 'src/modules/claims/enums/attachment-status.enum';
import {
  IAttachmentUploadResponse,
  IAttachmentMetadata,
  IAttachmentListResponse,
  IAttachmentValidation,
  AttachmentMimeType,
} from '@project/types';

export interface FileUploadData {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  size: number;
}

/**
 * AttachmentService - Business Logic for Attachment Operations
 *
 * Responsibilities:
 * - Orchestrate complete file upload workflow
 * - Validate files before processing
 * - Manage attachment lifecycle and status
 * - Coordinate Google Drive upload with database operations
 *
 * Requirements: 1.1 - File Upload Orchestration, 1.2 - Claim Integration, 3.1 - Transaction Management
 *
 * Design: Service layer that orchestrates GoogleDriveClient and AttachmentDBUtil
 * with proper validation, error handling, and transaction management
 */
@Injectable()
export class AttachmentService {
  private readonly logger = new Logger(AttachmentService.name);

  // File validation constants
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB per spec requirement 2.1
  private readonly ALLOWED_MIME_TYPES = Object.values(AttachmentMimeType);
  private readonly MAX_FILES_PER_CLAIM = 5;

  constructor(
    private readonly attachmentDBUtil: AttachmentDBUtil,
    private readonly claimDBUtil: ClaimDBUtil,
    private readonly googleDriveClient: GoogleDriveClient,
  ) {}

  /**
   * Upload single file with complete workflow
   * Requirements: 1.1 - Complete Upload Workflow
   */
  async uploadFile(
    userId: string,
    claimId: string,
    fileData: FileUploadData,
    parentFolderId?: string,
  ): Promise<IAttachmentUploadResponse> {
    try {
      // Validate file
      const validation = this.validateFile(fileData);
      if (!validation.isValid) {
        return {
          success: false,
          error: `File validation failed: ${validation.errors?.join(', ')}`,
        };
      }

      // Get claim context for naming convention
      const claim = await this.claimDBUtil.getOne({
        criteria: { id: claimId },
        relation: { user: true },
      });

      if (!claim) {
        return {
          success: false,
          error: 'Claim not found',
        };
      }

      // Check claim file limit
      const existingAttachments = await this.attachmentDBUtil.findByClaimId({
        claimId,
      });
      if (existingAttachments.length >= this.MAX_FILES_PER_CLAIM) {
        return {
          success: false,
          error: `Maximum ${this.MAX_FILES_PER_CLAIM} files allowed per claim`,
        };
      }

      // Generate stored filename following spec naming convention
      const storedFilename = this.generateStoredFilename(
        fileData.originalName,
        claim.user.name,
        claim.category,
        claim.year,
        claim.month,
      );

      // Create database record first
      const attachment = await this.attachmentDBUtil.create({
        creationData: {
          claimId,
          originalFilename: fileData.originalName,
          storedFilename,
          fileSize: fileData.size,
          mimeType: fileData.mimeType,
        },
      });

      // Create or get claim folder in Google Drive
      const claimFolderId = await this.googleDriveClient.createClaimFolder(
        userId,
        claimId,
      );

      // Upload to Google Drive
      const driveUploadOptions: DriveUploadOptions = {
        fileName: storedFilename,
        mimeType: fileData.mimeType,
        fileBuffer: fileData.buffer,
        folderId: parentFolderId || claimFolderId,
      };

      const driveResult = await this.googleDriveClient.uploadFile(
        userId,
        driveUploadOptions,
      );

      // Update database with Google Drive information
      const updatedAttachment =
        await this.attachmentDBUtil.updateGoogleDriveInfo({
          attachmentId: attachment.id,
          googleDriveFileId: driveResult.id,
          googleDriveUrl: driveResult.webViewLink,
        });

      if (!updatedAttachment) {
        throw new InternalServerErrorException(
          'Failed to update attachment with Google Drive info',
        );
      }

      this.logger.log(
        `File uploaded successfully: ${attachment.id} -> ${driveResult.id}`,
      );

      return {
        success: true,
        attachmentId: attachment.id,
        fileId: driveResult.id,
        fileName: storedFilename,
        webViewLink: driveResult.webViewLink,
        status: AttachmentStatus.UPLOADED,
      };
    } catch (error) {
      this.logger.error(`File upload failed for claim ${claimId}:`, error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'File upload failed',
      };
    }
  }

  /**
   * Get all attachments for a claim
   * Requirements: 1.2 - Claim Integration
   */
  async getAttachmentsByClaimId(
    claimId: string,
  ): Promise<IAttachmentListResponse> {
    try {
      const attachments = await this.attachmentDBUtil.findByClaimId({
        claimId,
      });

      const attachmentMetadata: IAttachmentMetadata[] = attachments.map(
        (entity) => this.entityToMetadata(entity),
      );

      return {
        success: true,
        attachments: attachmentMetadata,
        total: attachments.length,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get attachments for claim ${claimId}:`,
        error,
      );

      return {
        success: false,
        error: 'Failed to retrieve attachments',
      };
    }
  }

  /**
   * Get single attachment by ID
   * Requirements: 1.1 - Attachment Management
   */
  async getAttachmentById(
    attachmentId: string,
  ): Promise<IAttachmentMetadata | null> {
    try {
      const attachment = await this.attachmentDBUtil.getOne({
        criteria: { id: attachmentId },
      });

      return attachment ? this.entityToMetadata(attachment) : null;
    } catch (error) {
      this.logger.error(`Failed to get attachment ${attachmentId}:`, error);
      return null;
    }
  }

  /**
   * Delete attachment (both from database and Google Drive)
   * Requirements: 1.1 - Attachment Management
   */
  async deleteAttachment(
    userId: string,
    attachmentId: string,
  ): Promise<boolean> {
    try {
      const attachment = await this.attachmentDBUtil.getOne({
        criteria: { id: attachmentId },
      });

      if (!attachment) {
        throw new BadRequestException('Attachment not found');
      }

      // Delete from Google Drive if it exists
      if (attachment.googleDriveFileId) {
        try {
          await this.googleDriveClient.deleteFile(
            userId,
            attachment.googleDriveFileId,
          );
        } catch (error) {
          // Log warning but continue with database deletion
          this.logger.warn(
            `Failed to delete Google Drive file ${attachment.googleDriveFileId}:`,
            error instanceof Error ? error.message : 'Unknown error',
          );
        }
      }

      // Soft delete from database
      await this.attachmentDBUtil.delete({
        criteria: { id: attachmentId },
      });

      this.logger.log(`Attachment deleted successfully: ${attachmentId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete attachment ${attachmentId}:`, error);
      return false;
    }
  }

  /**
   * Update attachment status
   * Requirements: 1.1 - Status Management
   */
  async updateAttachmentStatus(
    attachmentId: string,
    status: AttachmentStatus,
  ): Promise<boolean> {
    try {
      const updatedAttachment = await this.attachmentDBUtil.updateStatus({
        attachmentId,
        status,
      });

      if (!updatedAttachment) {
        this.logger.warn(
          `Attachment not found for status update: ${attachmentId}`,
        );
        return false;
      }

      this.logger.log(
        `Attachment status updated: ${attachmentId} -> ${status}`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to update attachment status ${attachmentId}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Get attachments by status
   * Requirements: 1.1 - Status Management
   */
  async getAttachmentsByStatus(
    status: AttachmentStatus,
  ): Promise<AttachmentEntity[]> {
    try {
      return await this.attachmentDBUtil.findByStatus({ status });
    } catch (error) {
      this.logger.error(
        `Failed to get attachments by status ${status}:`,
        error,
      );
      return [];
    }
  }

  /**
   * Validate file before upload
   * Requirements: 1.1 - File Validation
   */
  private validateFile(fileData: FileUploadData): IAttachmentValidation {
    const errors: string[] = [];

    // Check file size
    if (fileData.size > this.MAX_FILE_SIZE) {
      errors.push(
        `File size exceeds maximum allowed size of ${this.MAX_FILE_SIZE / (1024 * 1024)}MB`,
      );
    }

    if (fileData.size === 0) {
      errors.push('File is empty');
    }

    // Check MIME type
    if (
      !this.ALLOWED_MIME_TYPES.includes(fileData.mimeType as AttachmentMimeType)
    ) {
      errors.push(
        `File type not allowed. Allowed types: ${this.ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }

    // Check filename
    if (!fileData.originalName || fileData.originalName.trim() === '') {
      errors.push('Filename is required');
    }

    if (fileData.originalName.length > 255) {
      errors.push('Filename too long (maximum 255 characters)');
    }

    // Check for potentially dangerous file extensions
    const fileName = fileData.originalName.toLowerCase();
    const dangerousExtensions = [
      '.exe',
      '.bat',
      '.cmd',
      '.com',
      '.scr',
      '.pif',
    ];
    if (dangerousExtensions.some((ext) => fileName.endsWith(ext))) {
      errors.push('File type not allowed for security reasons');
    }

    return {
      isValid: errors.length === 0,
      fileName: fileData.originalName,
      fileSize: fileData.size,
      mimeType: fileData.mimeType as AttachmentMimeType,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Generate stored filename following spec naming convention
   * Requirements: 3.1 - {employee_name}_{category}_{year}_{month}_{timestamp}.{extension}
   */
  private generateStoredFilename(
    originalFilename: string,
    employeeName: string,
    category: string,
    year: number,
    month: number,
  ): string {
    const timestamp = Date.now().toString();
    const extension = originalFilename.substring(
      originalFilename.lastIndexOf('.'),
    );

    // Clean employee name for filename
    const cleanEmployeeName = employeeName
      .replace(/[^a-zA-Z0-9]/g, '_')
      .toLowerCase()
      .substring(0, 20);

    // Clean category for filename
    const cleanCategory = category.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();

    // Format month with leading zero
    const formattedMonth = month.toString().padStart(2, '0');

    return `${cleanEmployeeName}_${cleanCategory}_${year}_${formattedMonth}_${timestamp}${extension}`;
  }

  /**
   * Convert AttachmentEntity to IAttachmentMetadata
   * Requirements: 1.2 - Data Transformation
   */
  private entityToMetadata(entity: AttachmentEntity): IAttachmentMetadata {
    return {
      id: entity.id,
      claimId: entity.claimId,
      originalFilename: entity.originalFilename,
      storedFilename: entity.storedFilename,
      fileSize: entity.fileSize,
      mimeType: entity.mimeType as AttachmentMimeType,
      driveFileId: entity.googleDriveFileId || '',
      driveShareableUrl: entity.googleDriveUrl || '',
      status: entity.status,
      uploadedAt: entity.updatedAt.toISOString(),
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }
}
