import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Logger,
  BadRequestException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { User } from 'src/modules/auth/decorators/user.decorator';
import { UserEntity } from 'src/modules/user/entities/user.entity';
import { AttachmentService } from '../services/attachment.service';
import {
  IAttachmentListResponse,
  IAttachmentUploadResponse,
} from '@project/types';
import { AuthGeneralRateLimit } from 'src/modules/auth/decorators/rate-limit.decorator';
import { AttachmentStatus } from 'src/modules/claims/enums/attachment-status.enum';
import { AttachmentMetadataDto } from '../dtos/attachment-metadata.dto';

export class AttachmentResponseDto {
  success: boolean;
  message?: string;
  data?: unknown;
  error?: string;
}

/**
 * AttachmentController - HTTP API for Attachment Operations
 *
 * Responsibilities:
 * - Provide REST endpoints for attachment metadata management
 * - Validate requests and return proper HTTP responses
 * - Implement proper authentication and authorization
 * - Handle attachment listing and deletion operations
 *
 * Requirements: 1.1 - REST API Implementation, 4.1 - HTTP Interface
 *
 * Design: RESTful controller following NestJS patterns with proper
 * validation, error handling, and HTTP status codes
 */
@Controller('attachments')
@UseGuards(JwtAuthGuard)
@AuthGeneralRateLimit()
export class AttachmentController {
  private readonly logger = new Logger(AttachmentController.name);

  constructor(private readonly attachmentService: AttachmentService) {}

  /**
   * Create descriptive Google Drive folder for claim attachments
   * Requirements: Folder Creation API Integration
   */
  @Post('folder/:claimId')
  async createClaimFolder(
    @Param('claimId', ParseUUIDPipe) claimId: string,
    @User() user: UserEntity,
  ): Promise<{ success: boolean; folderId?: string; error?: string }> {
    try {
      this.logger.debug(`Creating folder for claim: ${claimId}`);

      const folderId = await this.attachmentService.createClaimFolder(
        user.id,
        claimId,
      );

      if (!folderId) {
        this.logger.warn(`Failed to create folder for claim: ${claimId}`);
        return {
          success: false,
          error: 'Failed to create claim folder',
        };
      }

      this.logger.debug(
        `Folder created successfully for claim ${claimId}: ${folderId}`,
      );
      return {
        success: true,
        folderId,
      };
    } catch (error) {
      this.logger.error(`Folder creation failed for claim ${claimId}:`, error);
      return {
        success: false,
        error: 'Folder creation failed',
      };
    }
  }

  /**
   * Store Google Drive file metadata after client-side upload
   * Requirements: 3.0 - Metadata-Only Backend Storage
   */
  @Post('metadata')
  async storeFileMetadata(
    @Body() attachmentMetadata: AttachmentMetadataDto,
  ): Promise<IAttachmentUploadResponse> {
    try {
      this.logger.debug(
        `Storing file metadata for claim: ${attachmentMetadata.claimId}`,
      );

      const result = await this.attachmentService.storeFileMetadata(
        attachmentMetadata.claimId,
        {
          originalFilename: attachmentMetadata.originalFilename,
          storedFilename: attachmentMetadata.storedFilename,
          googleDriveFileId: attachmentMetadata.googleDriveFileId,
          googleDriveUrl: attachmentMetadata.googleDriveUrl,
          fileSize: attachmentMetadata.fileSize,
          mimeType: attachmentMetadata.mimeType,
        },
      );

      this.logger.debug(
        `File metadata storage result: ${result.success ? 'success' : 'failed'}`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to store file metadata for claim ${attachmentMetadata.claimId}:`,
        error,
      );

      return {
        success: false,
        error: 'Failed to store file metadata',
      };
    }
  }

  /**
   * Get all attachments for a specific claim
   * Requirements: 1.2 - Claim Integration API
   */
  @Get('claim/:claimId')
  async getAttachmentsByClaimId(
    @Param('claimId', ParseUUIDPipe) claimId: string,
  ): Promise<IAttachmentListResponse> {
    try {
      this.logger.debug(`Fetching attachments for claim: ${claimId}`);

      const result =
        await this.attachmentService.getAttachmentsByClaimId(claimId);

      this.logger.debug(
        `Found ${result.total || 0} attachments for claim ${claimId}`,
      );

      return result;
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
   * Requirements: 1.1 - Attachment Management API
   */
  @Get(':attachmentId')
  async getAttachmentById(
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
  ): Promise<AttachmentResponseDto> {
    try {
      this.logger.debug(`Fetching attachment: ${attachmentId}`);

      const attachment =
        await this.attachmentService.getAttachmentById(attachmentId);

      if (!attachment) {
        return {
          success: false,
          error: 'Attachment not found',
        };
      }

      return {
        success: true,
        data: attachment,
      };
    } catch (error) {
      this.logger.error(`Failed to get attachment ${attachmentId}:`, error);

      return {
        success: false,
        error: 'Failed to retrieve attachment',
      };
    }
  }

  /**
   * Delete attachment (soft delete from database, hard delete from Google Drive)
   * Requirements: 1.1 - Attachment Management API
   */
  @Delete(':attachmentId')
  async deleteAttachment(
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
    @User() user: UserEntity,
  ): Promise<AttachmentResponseDto> {
    try {
      this.logger.log(`Delete request for attachment: ${attachmentId}`);

      const deleted = await this.attachmentService.deleteAttachment(
        user.id,
        attachmentId,
      );

      if (deleted) {
        this.logger.log(`Attachment deleted successfully: ${attachmentId}`);
        return {
          success: true,
          message: 'Attachment deleted successfully',
        };
      } else {
        return {
          success: false,
          error: 'Failed to delete attachment or attachment not found',
        };
      }
    } catch (error) {
      this.logger.error(`Failed to delete attachment ${attachmentId}:`, error);

      return {
        success: false,
        error: 'Failed to delete attachment',
      };
    }
  }

  /**
   * Get attachments by status (admin/debugging endpoint)
   * Requirements: 1.1 - Status Management API
   */
  @Get('status/:status')
  async getAttachmentsByStatus(
    @Param('status') status: string,
  ): Promise<AttachmentResponseDto> {
    try {
      // Validate status parameter
      const validStatuses = ['pending', 'uploaded', 'failed'];
      if (!validStatuses.includes(status)) {
        throw new BadRequestException(
          `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        );
      }

      this.logger.debug(`Fetching attachments with status: ${status}`);

      const attachments = await this.attachmentService.getAttachmentsByStatus(
        status as AttachmentStatus,
      );

      return {
        success: true,
        data: {
          attachments,
          count: attachments.length,
          status,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to get attachments by status ${status}:`,
        error,
      );

      return {
        success: false,
        error: 'Failed to retrieve attachments by status',
      };
    }
  }

  /**
   * Health check endpoint for attachment service
   * Requirements: 4.1 - Service Health API
   */
  @Get('health/check')
  healthCheck(): AttachmentResponseDto {
    return {
      success: true,
      message: 'Attachment service is operational',
      data: {
        timestamp: new Date().toISOString(),
        service: 'AttachmentController',
        status: 'healthy',
      },
    };
  }
}
