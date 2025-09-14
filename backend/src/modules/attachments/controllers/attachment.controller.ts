import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Logger,
  BadRequestException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

interface MulterFile {
  buffer?: Buffer;
  originalname?: string;
  mimetype?: string;
  size?: number;
}

interface ValidatedFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { User } from 'src/modules/auth/decorators/user.decorator';
import { UserEntity } from 'src/modules/user/entities/user.entity';
import {
  AttachmentService,
  FileUploadData,
} from '../services/attachment.service';
import {
  IAttachmentUploadResponse,
  IAttachmentListResponse,
} from '@project/types';
import { AuthGeneralRateLimit } from 'src/modules/auth/decorators/rate-limit.decorator';
import { AttachmentStatus } from 'src/modules/claims/enums/attachment-status.enum';
import { AttachmentUploadDto } from '../dtos/attachment-upload.dto';

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
 * - Handle file upload requests with multipart/form-data
 * - Provide REST endpoints for attachment management
 * - Validate requests and return proper HTTP responses
 * - Implement proper authentication and authorization
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
   * Upload single file to Google Drive
   * Requirements: 1.1 - File Upload API
   *
   * @param file - Uploaded file from multipart form
   * @param uploadDto - Upload metadata (claimId, parentFolderId)
   * @param user - Authenticated user from JWT
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: MulterFile,
    @Body() uploadDto: AttachmentUploadDto,
    @User() user: UserEntity,
  ): Promise<IAttachmentUploadResponse> {
    try {
      if (!file) {
        throw new BadRequestException('No file provided');
      }

      if (!uploadDto.claimId) {
        throw new BadRequestException('Claim ID is required');
      }

      // Validate UUID format for claimId
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(uploadDto.claimId)) {
        throw new BadRequestException('Invalid claim ID format');
      }

      // Type guard and validate file properties
      const validatedFile = this.validateFileProperties(file);

      const fileData: FileUploadData = {
        buffer: validatedFile.buffer,
        originalName: validatedFile.originalname,
        mimeType: validatedFile.mimetype,
        size: validatedFile.size,
      };

      this.logger.log(
        `File upload request: ${validatedFile.originalname} (${validatedFile.size} bytes) for claim ${uploadDto.claimId}`,
      );

      const result = await this.attachmentService.uploadFile(
        user.id,
        uploadDto.claimId,
        fileData,
        uploadDto.parentFolderId,
      );

      if (result.success) {
        this.logger.log(`File upload successful: ${result.attachmentId}`);
      } else {
        this.logger.warn(`File upload failed: ${result.error}`);
      }

      return result;
    } catch (error) {
      this.logger.error(`File upload error:`, error);
      throw error;
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

  /**
   * Type guard to validate file properties
   */
  private validateFileProperties(file: MulterFile): ValidatedFile {
    if (
      !file.buffer ||
      !file.originalname ||
      !file.mimetype ||
      file.size === undefined
    ) {
      throw new BadRequestException('Invalid file data');
    }

    return {
      buffer: file.buffer,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    };
  }
}
