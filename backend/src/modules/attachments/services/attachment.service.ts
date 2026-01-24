import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { AttachmentDBUtil } from 'src/modules/claims/utils/attachment-db.util';
import { ClaimDBUtil } from 'src/modules/claims/utils/claim-db.util';
import { GoogleDriveClient } from './google-drive-client.service';
import { AttachmentEntity } from 'src/modules/claims/entities/attachment.entity';
import { AttachmentStatus } from 'src/modules/claims/enums/attachment-status.enum';
import { ClaimDataForFolderNaming } from 'src/shared/utils/folder-naming.util';
import {
  IAttachmentUploadResponse,
  IAttachmentMetadata,
  IAttachmentListResponse,
  AttachmentMimeType,
} from '@project/types';

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

  // Business logic constants
  private readonly MAX_FILES_PER_CLAIM = 5;

  constructor(
    private readonly attachmentDBUtil: AttachmentDBUtil,
    private readonly claimDBUtil: ClaimDBUtil,
    private readonly googleDriveClient: GoogleDriveClient,
  ) {}

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
   * Create descriptive folder for claim attachments
   * Requirements: 4.3-4.4 - Descriptive Folder Creation Integration
   */
  async createClaimFolder(
    userId: string,
    claimId: string,
  ): Promise<string | null> {
    try {
      // Get claim data for descriptive folder naming
      const claim = await this.claimDBUtil.getOne({
        criteria: { id: claimId },
      });

      if (!claim) {
        this.logger.warn(`Claim not found for folder creation: ${claimId}`);
        return null;
      }

      // Transform claim data to folder naming format
      const claimDataForFolderNaming: ClaimDataForFolderNaming = {
        id: claim.id,
        claimName: claim.claimName,
        category: claim.categoryEntity.code,
        month: claim.month,
        year: claim.year,
        createdAt: claim.createdAt,
        totalAmount: claim.totalAmount,
      };

      // Create folder with descriptive naming using enhanced GoogleDriveClient
      const folderId = await this.googleDriveClient.createClaimFolder(
        userId,
        claimId,
        claimDataForFolderNaming,
      );

      this.logger.log(
        `Descriptive folder created for claim ${claimId}: ${folderId}`,
      );
      return folderId;
    } catch (error) {
      this.logger.error(
        `Failed to create descriptive folder for claim ${claimId}:`,
        error,
      );

      // Fallback: attempt basic folder creation without descriptive naming
      try {
        const fallbackFolderId = await this.googleDriveClient.createClaimFolder(
          userId,
          claimId,
        );
        this.logger.warn(
          `Created fallback folder for claim ${claimId}: ${fallbackFolderId}`,
        );
        return fallbackFolderId;
      } catch (fallbackError) {
        this.logger.error(
          `Fallback folder creation also failed for claim ${claimId}:`,
          fallbackError,
        );
        return null;
      }
    }
  }

  /**
   * Store Google Drive file metadata after client-side upload
   * Requirements: 3.0 - Metadata-Only Backend Storage, 4.5-4.6 - Enhanced Folder Integration
   */
  async storeFileMetadata(
    claimId: string,
    metadata: {
      originalFilename: string;
      storedFilename: string;
      googleDriveFileId: string;
      googleDriveUrl: string;
      fileSize: number;
      mimeType: string;
    },
  ): Promise<IAttachmentUploadResponse> {
    try {
      // Validate claim exists
      const claim = await this.claimDBUtil.getOne({
        criteria: { id: claimId },
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

      // Create database record with Google Drive info
      // Note: File should be uploaded to descriptive folder structure created by createClaimFolder
      const attachment = await this.attachmentDBUtil.create({
        creationData: {
          claimId,
          originalFilename: metadata.originalFilename,
          storedFilename: metadata.storedFilename,
          fileSize: metadata.fileSize,
          mimeType: metadata.mimeType,
          googleDriveFileId: metadata.googleDriveFileId,
          googleDriveUrl: metadata.googleDriveUrl,
          status: AttachmentStatus.UPLOADED,
        },
      });

      this.logger.log(
        `File metadata stored successfully: ${attachment.id} -> ${metadata.googleDriveFileId}`,
      );

      return {
        success: true,
        attachmentId: attachment.id,
        fileId: metadata.googleDriveFileId,
        fileName: metadata.storedFilename,
        webViewLink: metadata.googleDriveUrl,
        status: AttachmentStatus.UPLOADED,
      };
    } catch (error) {
      this.logger.error(
        `File metadata storage failed for claim ${claimId}:`,
        error,
      );

      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'File metadata storage failed',
      };
    }
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
