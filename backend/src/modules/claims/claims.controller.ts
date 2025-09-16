import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ValidationPipe,
  Logger,
  NotFoundException,
  BadRequestException,
  UnprocessableEntityException,
  InternalServerErrorException,
  UnauthorizedException,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../auth/decorators/user.decorator';
import { UserEntity } from '../user/entities/user.entity';
import { ClaimDBUtil } from './utils/claim-db.util';
import { ClaimEntity } from './entities/claim.entity';
import {
  ClaimStatus,
  AttachmentMimeType,
  AttachmentStatus,
} from '@project/types';
import {
  ClaimCreateRequestDto,
  ClaimUpdateRequestDto,
  ClaimStatusUpdateDto,
  ClaimResponseDto,
  ClaimListResponseDto,
} from './dto';
import { IClaimCreationData } from './types/claim-creation-data.type';
import { IClaimMetadata } from '@project/types';

@Controller('claims')
@UseGuards(JwtAuthGuard)
export class ClaimsController {
  private readonly logger = new Logger(ClaimsController.name);

  constructor(private readonly claimDBUtil: ClaimDBUtil) {}

  /**
   * Get all claims for authenticated user with optional status filtering
   * Requirements: 1.1 - Claims CRUD API Endpoints, 4.1, 4.2 - Error Handling
   */
  @Get()
  async getClaims(
    @User() user: UserEntity,
    @Query('status') status?: ClaimStatus,
  ): Promise<ClaimListResponseDto> {
    try {
      this.logger.log(`Getting claims for user: ${user.id}, status: ${status}`);

      const criteria: { userId: string; status?: ClaimStatus } = {
        userId: user.id,
      };
      if (status) {
        criteria.status = status;
      }

      const claims = await this.claimDBUtil.getAll({
        criteria,
        relation: { attachments: true },
      });

      const claimMetadata: IClaimMetadata[] = claims.map((claim) =>
        this.mapClaimEntityToMetadata(claim),
      );

      this.logger.log(
        `Retrieved ${claimMetadata.length} claims for user: ${user.id}`,
      );

      return ClaimListResponseDto.success(claimMetadata);
    } catch (error) {
      this.logger.error(`Failed to get claims for user ${user.id}:`, error);
      this.handleDatabaseError(error, 'retrieve claims');
    }
  }

  /**
   * Create a new claim
   * Requirements: 1.1 - Claims CRUD API Endpoints, 4.1, 4.2 - Error Handling
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createClaim(
    @User() user: UserEntity,
    @Body(ValidationPipe) createClaimDto: ClaimCreateRequestDto,
  ): Promise<ClaimResponseDto> {
    try {
      this.logger.log(`Creating claim for user: ${user.id}`);

      // Validate business rules
      this.validateClaimBusinessRules(createClaimDto);

      const creationData: IClaimCreationData = {
        userId: user.id,
        category: createClaimDto.category,
        claimName: createClaimDto.claimName,
        month: createClaimDto.month,
        year: createClaimDto.year,
        totalAmount: createClaimDto.totalAmount,
      };

      const createdClaim = await this.claimDBUtil.create({ creationData });

      // Fetch the created claim with relations
      const claimWithRelations = await this.claimDBUtil.getOne({
        criteria: { id: createdClaim.id },
        relation: { attachments: true },
      });

      if (!claimWithRelations) {
        throw new InternalServerErrorException(
          'Failed to retrieve created claim',
        );
      }

      const claimMetadata = this.mapClaimEntityToMetadata(claimWithRelations);

      this.logger.log(`Created claim: ${createdClaim.id} for user: ${user.id}`);

      return ClaimResponseDto.success(claimMetadata);
    } catch (error) {
      this.logger.error(`Failed to create claim for user ${user.id}:`, error);
      this.handleClaimOperationError(error, 'create claim');
    }
  }

  /**
   * Update an existing claim
   * Requirements: 1.1 - Claims CRUD API Endpoints, 2.1 - Authentication and Authorization, 4.1, 4.2 - Error Handling
   */
  @Put(':id')
  async updateClaim(
    @User() user: UserEntity,
    @Param('id') id: string,
    @Body(ValidationPipe) updateClaimDto: ClaimUpdateRequestDto,
  ): Promise<ClaimResponseDto> {
    try {
      this.logger.log(`Updating claim: ${id} for user: ${user.id}`);

      // Check if claim exists and belongs to user
      const existingClaim = await this.claimDBUtil.getOne({
        criteria: { id, userId: user.id },
      });

      if (!existingClaim) {
        this.logger.warn(
          `Claim not found or unauthorized access: ${id} for user: ${user.id}`,
        );
        throw new NotFoundException('Claim not found');
      }

      // Validate business rules for updates
      this.validateClaimBusinessRules(updateClaimDto);

      // Update claim properties
      if (updateClaimDto.category !== undefined) {
        existingClaim.category = updateClaimDto.category;
      }
      if (updateClaimDto.claimName !== undefined) {
        existingClaim.claimName = updateClaimDto.claimName;
      }
      if (updateClaimDto.month !== undefined) {
        existingClaim.month = updateClaimDto.month;
      }
      if (updateClaimDto.year !== undefined) {
        existingClaim.year = updateClaimDto.year;
      }
      if (updateClaimDto.totalAmount !== undefined) {
        existingClaim.totalAmount = updateClaimDto.totalAmount;
      }
      if (updateClaimDto.status !== undefined) {
        existingClaim.status = updateClaimDto.status;
      }

      // Save updates
      const [updatedClaim] = await this.claimDBUtil.updateWithSave({
        dataArray: [existingClaim],
      });

      // Fetch updated claim with relations
      const claimWithRelations = await this.claimDBUtil.getOne({
        criteria: { id: updatedClaim.id },
        relation: { attachments: true },
      });

      if (!claimWithRelations) {
        throw new InternalServerErrorException(
          'Failed to retrieve updated claim',
        );
      }

      const claimMetadata = this.mapClaimEntityToMetadata(claimWithRelations);

      this.logger.log(`Updated claim: ${id} for user: ${user.id}`);

      return ClaimResponseDto.success(claimMetadata);
    } catch (error) {
      this.logger.error(
        `Failed to update claim ${id} for user ${user.id}:`,
        error,
      );
      this.handleClaimOperationError(error, 'update claim');
    }
  }

  /**
   * Delete a claim
   * Requirements: 1.1 - Claims CRUD API Endpoints, 2.1 - Authentication and Authorization, 4.1, 4.2 - Error Handling
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteClaim(
    @User() user: UserEntity,
    @Param('id') id: string,
  ): Promise<void> {
    try {
      this.logger.log(`Deleting claim: ${id} for user: ${user.id}`);

      // Check if claim exists and belongs to user
      const existingClaim = await this.claimDBUtil.getOne({
        criteria: { id, userId: user.id },
      });

      if (!existingClaim) {
        this.logger.warn(
          `Claim not found or unauthorized access: ${id} for user: ${user.id}`,
        );
        throw new NotFoundException('Claim not found');
      }

      // Check if claim can be deleted (business rule)
      if (existingClaim.status === ClaimStatus.PAID) {
        throw new UnprocessableEntityException(
          'Cannot delete a claim that has been paid',
        );
      }

      // Soft delete the claim
      await this.claimDBUtil.delete({
        criteria: { id, userId: user.id },
      });

      this.logger.log(`Deleted claim: ${id} for user: ${user.id}`);
    } catch (error) {
      this.logger.error(
        `Failed to delete claim ${id} for user ${user.id}:`,
        error,
      );
      this.handleClaimOperationError(error, 'delete claim');
    }
  }

  /**
   * Update claim status
   * Requirements: 1.1 - Claims CRUD API Endpoints, 2.1 - Authentication and Authorization, 4.1, 4.2 - Error Handling
   */
  @Put(':id/status')
  async updateClaimStatus(
    @User() user: UserEntity,
    @Param('id') id: string,
    @Body(ValidationPipe) statusUpdateDto: ClaimStatusUpdateDto,
  ): Promise<ClaimResponseDto> {
    try {
      this.logger.log(
        `Updating claim status: ${id} to ${statusUpdateDto.status} for user: ${user.id}`,
      );

      // Check if claim exists and belongs to user
      const existingClaim = await this.claimDBUtil.getOne({
        criteria: { id, userId: user.id },
      });

      if (!existingClaim) {
        this.logger.warn(
          `Claim not found or unauthorized access: ${id} for user: ${user.id}`,
        );
        throw new NotFoundException('Claim not found');
      }

      // Validate status transition
      this.validateStatusTransition(
        existingClaim.status,
        statusUpdateDto.status,
      );

      // Update status
      existingClaim.status = statusUpdateDto.status;

      // Set submission date when status changes to sent
      if (statusUpdateDto.status === ClaimStatus.SENT) {
        existingClaim.submissionDate = new Date();
      }

      // Save updates
      const [updatedClaim] = await this.claimDBUtil.updateWithSave({
        dataArray: [existingClaim],
      });

      // Fetch updated claim with relations
      const claimWithRelations = await this.claimDBUtil.getOne({
        criteria: { id: updatedClaim.id },
        relation: { attachments: true },
      });

      if (!claimWithRelations) {
        throw new InternalServerErrorException(
          'Failed to retrieve updated claim',
        );
      }

      const claimMetadata = this.mapClaimEntityToMetadata(claimWithRelations);

      this.logger.log(
        `Updated claim status: ${id} to ${statusUpdateDto.status} for user: ${user.id}`,
      );

      return ClaimResponseDto.success(claimMetadata);
    } catch (error) {
      this.logger.error(
        `Failed to update claim status ${id} for user ${user.id}:`,
        error,
      );
      this.handleClaimOperationError(error, 'update claim status');
    }
  }

  /**
   * Validate business rules for claim data
   * Requirements: 3.1 - Data Validation and Business Rules
   */
  private validateClaimBusinessRules(
    claimData: ClaimCreateRequestDto | ClaimUpdateRequestDto,
  ): void {
    // Validate amount limits (example business rule)
    if (claimData.totalAmount !== undefined && claimData.totalAmount <= 0) {
      throw new UnprocessableEntityException(
        'Claim amount must be greater than zero',
      );
    }

    if (claimData.totalAmount !== undefined && claimData.totalAmount > 10000) {
      throw new UnprocessableEntityException(
        'Claim amount exceeds maximum limit of $10,000',
      );
    }

    // Validate date constraints
    if (
      claimData.year !== undefined &&
      claimData.year > new Date().getFullYear()
    ) {
      throw new UnprocessableEntityException(
        'Cannot create claims for future years',
      );
    }

    if (
      claimData.month !== undefined &&
      (claimData.month < 1 || claimData.month > 12)
    ) {
      throw new BadRequestException('Month must be between 1 and 12');
    }
  }

  /**
   * Validate status transition rules
   * Requirements: 3.1 - Data Validation and Business Rules
   */
  private validateStatusTransition(
    currentStatus: ClaimStatus,
    newStatus: ClaimStatus,
  ): void {
    const validTransitions: Record<ClaimStatus, ClaimStatus[]> = {
      [ClaimStatus.DRAFT]: [ClaimStatus.SENT],
      [ClaimStatus.SENT]: [
        ClaimStatus.PAID,
        ClaimStatus.DRAFT,
        ClaimStatus.FAILED,
      ],
      [ClaimStatus.FAILED]: [ClaimStatus.DRAFT, ClaimStatus.SENT],
      [ClaimStatus.PAID]: [], // No transitions allowed from paid
    };

    const allowedTransitions = validTransitions[currentStatus] || [];
    if (!allowedTransitions.includes(newStatus)) {
      throw new UnprocessableEntityException(
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
      );
    }
  }

  /**
   * Handle claim operation errors with proper HTTP status codes
   * Requirements: 4.1, 4.2 - Error Handling and HTTP Status Codes
   */
  private handleClaimOperationError(error: unknown, operation: string): never {
    // Re-throw known HTTP exceptions
    if (
      error instanceof NotFoundException ||
      error instanceof BadRequestException ||
      error instanceof UnprocessableEntityException ||
      error instanceof UnauthorizedException
    ) {
      throw error;
    }

    // Handle validation errors
    if (this.isValidationError(error)) {
      throw new BadRequestException(this.extractValidationErrors(error));
    }

    // Handle database constraint errors
    if (this.isDatabaseConstraintError(error)) {
      throw new UnprocessableEntityException(
        'Operation violates business constraints',
      );
    }

    // Log sensitive error details but don't expose them
    this.logger.error(`Database error during ${operation}:`, error);
    throw new InternalServerErrorException(
      `Failed to ${operation}. Please try again.`,
    );
  }

  /**
   * Handle database errors for read operations
   * Requirements: 4.1, 4.2 - Error Handling and HTTP Status Codes
   */
  private handleDatabaseError(error: unknown, operation: string): never {
    this.logger.error(`Database error during ${operation}:`, error);
    throw new InternalServerErrorException(
      `Failed to ${operation}. Please try again.`,
    );
  }

  /**
   * Check if error is a validation error
   */
  private isValidationError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'name' in error &&
      (error as { name: string }).name === 'ValidationError'
    );
  }

  /**
   * Check if error is a database constraint error
   */
  private isDatabaseConstraintError(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) {
      return false;
    }

    const errorObj = error as { code?: string; message?: string };
    const hasConstraintCode =
      errorObj.code === '23505' || errorObj.code === '23503';
    const hasConstraintMessage =
      errorObj.message &&
      (errorObj.message.includes('constraint') ||
        errorObj.message.includes('unique') ||
        errorObj.message.includes('foreign key'));

    return Boolean(hasConstraintCode || hasConstraintMessage);
  }

  /**
   * Extract validation error messages
   */
  private extractValidationErrors(error: unknown): string {
    if (typeof error === 'object' && error !== null && 'message' in error) {
      const errorObj = error as { message: unknown };
      if (typeof errorObj.message === 'string') {
        return errorObj.message;
      }
    }
    return 'Validation failed';
  }

  /**
   * Convert ClaimEntity to IClaimMetadata
   */
  private mapClaimEntityToMetadata(claim: ClaimEntity): IClaimMetadata {
    return {
      id: claim.id,
      userId: claim.userId,
      category: claim.category,
      claimName: claim.claimName,
      month: claim.month,
      year: claim.year,
      totalAmount: Number(claim.totalAmount),
      status: claim.status,
      submissionDate: claim.submissionDate?.toISOString() || null,
      attachments:
        claim.attachments?.map((attachment) => ({
          id: attachment.id,
          claimId: attachment.claimId,
          originalFilename: attachment.originalFilename,
          storedFilename: attachment.storedFilename,
          driveFileId: attachment.googleDriveFileId || '',
          driveShareableUrl: attachment.googleDriveUrl || '',
          fileSize: attachment.fileSize,
          mimeType: attachment.mimeType as AttachmentMimeType,
          status: attachment.status,
          uploadedAt:
            attachment.status === AttachmentStatus.UPLOADED
              ? attachment.updatedAt.toISOString()
              : attachment.createdAt.toISOString(),
          createdAt: attachment.createdAt.toISOString(),
          updatedAt: attachment.updatedAt.toISOString(),
        })) || [],
      createdAt: claim.createdAt.toISOString(),
      updatedAt: claim.updatedAt.toISOString(),
    };
  }
}
