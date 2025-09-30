import { Injectable, Logger } from '@nestjs/common';
import { GoogleDriveClient } from 'src/modules/attachments/services/google-drive-client.service';
import { AttachmentEntity } from 'src/modules/claims/entities/attachment.entity';

export interface ProcessedAttachment {
  filename: string;
  buffer: Buffer;
  mimeType: string;
  size: number;
}

export interface DriveLink {
  filename: string;
  driveUrl: string;
  size: number;
  reason: 'size-exceeded' | 'download-failed';
}

export interface ProcessedAttachments {
  attachments: ProcessedAttachment[];
  links: DriveLink[];
  totalAttachmentSize: number;
}

/**
 * AttachmentProcessorService - Email Attachment Processing
 *
 * Responsibilities:
 * - Size-based decision: attach small files (<5MB), link large files
 * - Download files from Google Drive for email attachments
 * - Apply Gmail size limits (20MB total safe limit)
 * - Fallback to Drive links on any download failure
 *
 * Requirements: email-attachments-analysis 1.2
 *
 * Design: Implements hybrid attachment strategy (ADR-003) with graceful
 * degradation. Prioritizes smallest files first to maximize attachment count.
 */
@Injectable()
export class AttachmentProcessorService {
  private readonly logger = new Logger(AttachmentProcessorService.name);
  private readonly SIZE_THRESHOLD_MB = 5;
  private readonly GMAIL_SAFE_LIMIT_MB = 20; // 5MB safety margin below 25MB

  constructor(private readonly googleDriveClient: GoogleDriveClient) {}

  /**
   * Process attachments: download small files, keep large files as links
   *
   * Decision Logic:
   * - fileSize < 5MB → attempt download → on success: attachment, on failure: link
   * - fileSize ≥ 5MB → drive link
   * - total size > 20MB → all remaining files become links
   *
   * Sorting Strategy:
   * - Process smallest files first to maximize attachment count within size limit
   */
  async processAttachments(
    userId: string,
    attachments: AttachmentEntity[],
  ): Promise<ProcessedAttachments> {
    const result: ProcessedAttachments = {
      attachments: [],
      links: [],
      totalAttachmentSize: 0,
    };

    // Sort by file size (smallest first) to maximize attachment count
    const sorted = [...attachments].sort((a, b) => a.fileSize - b.fileSize);

    for (const attachment of sorted) {
      const fileSizeMB = attachment.fileSize / (1024 * 1024);

      // Decision 1: Size threshold check
      if (fileSizeMB >= this.SIZE_THRESHOLD_MB) {
        result.links.push({
          filename: attachment.originalFilename,
          driveUrl: attachment.googleDriveUrl!,
          size: attachment.fileSize,
          reason: 'size-exceeded',
        });
        continue;
      }

      // Decision 2: Gmail total size limit check
      const projectedSize = result.totalAttachmentSize + attachment.fileSize;
      if (projectedSize > this.GMAIL_SAFE_LIMIT_MB * 1024 * 1024) {
        result.links.push({
          filename: attachment.originalFilename,
          driveUrl: attachment.googleDriveUrl!,
          size: attachment.fileSize,
          reason: 'size-exceeded',
        });
        continue;
      }

      // Decision 3: Attempt download with fallback
      try {
        const buffer = await this.googleDriveClient.downloadFile(
          userId,
          attachment.googleDriveFileId!,
        );

        result.attachments.push({
          filename: attachment.originalFilename,
          buffer,
          mimeType: attachment.mimeType,
          size: attachment.fileSize,
        });

        result.totalAttachmentSize += attachment.fileSize;
        this.logger.debug(
          `Downloaded ${attachment.originalFilename} for email attachment (${fileSizeMB.toFixed(2)}MB)`,
        );
      } catch (error) {
        this.logger.warn(
          `Failed to download ${attachment.originalFilename}, using Drive link`,
          error,
        );

        result.links.push({
          filename: attachment.originalFilename,
          driveUrl: attachment.googleDriveUrl!,
          size: attachment.fileSize,
          reason: 'download-failed',
        });
      }
    }

    this.logger.log(
      `Processed ${attachments.length} attachments: ${result.attachments.length} attached, ${result.links.length} linked (total: ${(result.totalAttachmentSize / (1024 * 1024)).toFixed(2)}MB)`,
    );

    return result;
  }
}
