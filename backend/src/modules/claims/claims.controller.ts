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
  ParseUUIDPipe,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  UnprocessableEntityException,
  InternalServerErrorException,
  UnauthorizedException,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiUnprocessableEntityResponse,
  ApiInternalServerErrorResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../auth/decorators/user.decorator';
import { UserEntity } from '../user/entities/user.entity';
import { ClaimDBUtil } from './utils/claim-db.util';
import { ClaimEntity } from './entities/claim.entity';
import {
  ClaimStatus,
  AttachmentMimeType,
  AttachmentStatus,
  IPreviewEmailResponse,
} from '@project/types';
import { ClaimCategoryService } from '../claim-category/services/claim-category-services';
import { ClaimCategoryEntity } from '../claim-category/entities/claim-category.entity';
import {
  ClaimCreateRequestDto,
  ClaimUpdateRequestDto,
  ClaimStatusUpdateDto,
  ClaimResponseDto,
  ClaimListResponseDto,
} from './dto';
import { IClaimCreationData } from './types/claim-creation-data.type';
import { IClaimMetadata, IClaimEmailRequest } from '@project/types';
import { EmailService } from '../email/services/email.service';
import { EmailPreviewService } from '../email/services/email-preview.service';

@ApiTags('Claims')
@Controller('claims')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
@ApiCookieAuth('jwt')
@ApiUnauthorizedResponse({
  description: 'Authentication required - invalid or missing JWT token',
  schema: {
    type: 'object',
    properties: {
      statusCode: { type: 'number', example: 401 },
      message: { type: 'string', example: 'Unauthorized' },
    },
  },
})
export class ClaimsController {
  private readonly logger = new Logger(ClaimsController.name);

  constructor(
    private readonly claimDBUtil: ClaimDBUtil,
    private readonly emailService: EmailService,
    private readonly emailPreviewService: EmailPreviewService,
    private readonly claimCategoryService: ClaimCategoryService,
  ) {}

  /**
   * Get all claims for authenticated user with optional status filtering
   * Requirements: 1.1 - Claims CRUD API Endpoints, 4.1, 4.2 - Error Handling
   */
  @Get()
  @ApiOperation({
    summary: 'Get all claims',
    description:
      'Retrieve all claims for the authenticated user with optional status filtering',
  })
  @ApiQuery({
    name: 'status',
    enum: ClaimStatus,
    required: false,
    description: 'Filter claims by status (draft, sent, paid, failed)',
    example: ClaimStatus.DRAFT,
  })
  @ApiResponse({
    status: 200,
    description: 'Claims retrieved successfully',
    type: ClaimListResponseDto,
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        claims: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                example: '123e4567-e89b-12d3-a456-426614174000',
              },
              userId: {
                type: 'string',
                example: '123e4567-e89b-12d3-a456-426614174001',
              },
              category: {
                type: 'string',
                example: 'telco',
              },
              claimName: { type: 'string', example: 'Monthly phone bill' },
              month: { type: 'number', example: 9 },
              year: { type: 'number', example: 2025 },
              totalAmount: { type: 'number', example: 50.0 },
              status: {
                type: 'string',
                enum: Object.values(ClaimStatus),
                example: 'draft',
              },
              submissionDate: {
                type: 'string',
                nullable: true,
                example: '2025-09-17T10:00:00.000Z',
              },
              attachments: { type: 'array', items: { type: 'object' } },
              createdAt: {
                type: 'string',
                example: '2025-09-17T09:00:00.000Z',
              },
              updatedAt: {
                type: 'string',
                example: '2025-09-17T09:00:00.000Z',
              },
            },
          },
        },
        error: { type: 'string', nullable: true },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid query parameters',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Invalid status parameter' },
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Database or server error',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 500 },
        message: {
          type: 'string',
          example: 'Failed to retrieve claims. Please try again.',
        },
      },
    },
  })
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
        relation: { attachments: true, categoryEntity: true },
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
  @ApiOperation({
    summary: 'Create a new claim',
    description: 'Create a new expense claim for the authenticated user',
  })
  @ApiBody({
    type: ClaimCreateRequestDto,
    description: 'Claim data for creation',
    examples: {
      telco: {
        summary: 'Telco claim example',
        description: 'Example of creating a telco expense claim',
        value: {
          category: 'telco',
          claimName: 'Monthly phone bill',
          month: 9,
          year: 2025,
          totalAmount: 50.0,
        },
      },
      fitness: {
        summary: 'Fitness claim example',
        description: 'Example of creating a fitness expense claim',
        value: {
          category: 'fitness',
          claimName: 'Gym membership',
          month: 9,
          year: 2025,
          totalAmount: 80.0,
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Claim created successfully',
    type: ClaimResponseDto,
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        claim: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            userId: {
              type: 'string',
              example: '123e4567-e89b-12d3-a456-426614174001',
            },
            category: {
              type: 'string',
              example: 'telco',
            },
            claimName: { type: 'string', example: 'Monthly phone bill' },
            month: { type: 'number', example: 9 },
            year: { type: 'number', example: 2025 },
            totalAmount: { type: 'number', example: 50.0 },
            status: {
              type: 'string',
              enum: Object.values(ClaimStatus),
              example: 'draft',
            },
            submissionDate: { type: 'string', nullable: true, example: null },
            attachments: {
              type: 'array',
              items: { type: 'object' },
              example: [],
            },
            createdAt: { type: 'string', example: '2025-09-17T09:00:00.000Z' },
            updatedAt: { type: 'string', example: '2025-09-17T09:00:00.000Z' },
          },
        },
        error: { type: 'string', nullable: true },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Validation error - invalid request data',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'array',
          items: { type: 'string' },
          example: [
            'Category must be one of: telco, fitness, dental, company-event, company-lunch, company-dinner, others',
            'Total amount must be greater than 0',
          ],
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiUnprocessableEntityResponse({
    description:
      'Business rule violation - monthly limit exceeded or other validation error',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 422 },
        message: {
          type: 'string',
          example:
            'TELCO monthly limit of $150.00 exceeded. Current: $120.00, Proposed: $50.00, Total: $170.00',
        },
        error: { type: 'string', example: 'Unprocessable Entity' },
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Database or server error',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 500 },
        message: {
          type: 'string',
          example: 'Failed to create claim. Please try again.',
        },
      },
    },
  })
  async createClaim(
    @User() user: UserEntity,
    @Body(ValidationPipe) createClaimDto: ClaimCreateRequestDto,
  ): Promise<ClaimResponseDto> {
    try {
      this.logger.log(`Creating claim for user: ${user.id}`);

      // Validate business rules
      this.validateClaimBusinessRules(createClaimDto);

      // Lookup and validate category
      const category = await this.claimCategoryService.getByCode(
        createClaimDto.category,
      );
      if (!category) {
        throw new BadRequestException(
          `Invalid category: ${createClaimDto.category}`,
        );
      }

      // Validate category limit (unified monthly/yearly logic)
      await this.validateCategoryLimit(
        user.id,
        category,
        createClaimDto.month,
        createClaimDto.year,
        createClaimDto.totalAmount,
      );

      const creationData: IClaimCreationData = {
        userId: user.id,
        categoryId: category.uuid,
        claimName: createClaimDto.claimName,
        month: createClaimDto.month,
        year: createClaimDto.year,
        totalAmount: createClaimDto.totalAmount,
      };

      const createdClaim = await this.claimDBUtil.create({ creationData });

      // Fetch the created claim with relations
      const claimWithRelations = await this.claimDBUtil.getOne({
        criteria: { id: createdClaim.id },
        relation: { attachments: true, categoryEntity: true },
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
  @ApiOperation({
    summary: 'Update an existing claim',
    description: 'Update an existing claim owned by the authenticated user',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique identifier of the claim to update',
    type: 'string',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({
    type: ClaimUpdateRequestDto,
    description: 'Updated claim data (all fields are optional)',
    examples: {
      partial: {
        summary: 'Partial update example',
        description: 'Example of updating only specific fields',
        value: {
          claimName: 'Updated claim name',
          totalAmount: 75.0,
        },
      },
      full: {
        summary: 'Full update example',
        description: 'Example of updating all fields',
        value: {
          category: 'fitness',
          claimName: 'Updated gym membership',
          month: 10,
          year: 2025,
          totalAmount: 85.0,
          status: 'draft',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Claim updated successfully',
    type: ClaimResponseDto,
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        claim: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            userId: {
              type: 'string',
              example: '123e4567-e89b-12d3-a456-426614174001',
            },
            category: {
              type: 'string',
              example: 'fitness',
            },
            claimName: { type: 'string', example: 'Updated gym membership' },
            month: { type: 'number', example: 10 },
            year: { type: 'number', example: 2025 },
            totalAmount: { type: 'number', example: 85.0 },
            status: {
              type: 'string',
              enum: Object.values(ClaimStatus),
              example: 'draft',
            },
            submissionDate: { type: 'string', nullable: true, example: null },
            attachments: { type: 'array', items: { type: 'object' } },
            createdAt: { type: 'string', example: '2025-09-17T09:00:00.000Z' },
            updatedAt: { type: 'string', example: '2025-09-17T09:30:00.000Z' },
          },
        },
        error: { type: 'string', nullable: true },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Validation error - invalid request data',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'array',
          items: { type: 'string' },
          example: [
            'Total amount must be greater than 0',
            'Month must be between 1 and 12',
          ],
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Claim not found or not owned by user',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Claim not found' },
      },
    },
  })
  @ApiUnprocessableEntityResponse({
    description:
      'Business rule violation - monthly limit exceeded or other validation error',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 422 },
        message: {
          type: 'string',
          example:
            'TELCO monthly limit of $150.00 exceeded. Current: $120.00, Proposed: $50.00, Total: $170.00',
        },
        error: { type: 'string', example: 'Unprocessable Entity' },
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Database or server error',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 500 },
        message: {
          type: 'string',
          example: 'Failed to update claim. Please try again.',
        },
      },
    },
  })
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
        relation: { categoryEntity: true },
      });

      if (!existingClaim) {
        this.logger.warn(
          `Claim not found or unauthorized access: ${id} for user: ${user.id}`,
        );
        throw new NotFoundException('Claim not found');
      }

      // Validate business rules for updates
      this.validateClaimBusinessRules(updateClaimDto);

      // Lookup category if being updated
      if (!existingClaim.categoryEntity)
        throw new Error(`Claim category is not fetched.`);
      let category = existingClaim.categoryEntity;
      if (updateClaimDto.category !== undefined) {
        const newCategory = await this.claimCategoryService.getByCode(
          updateClaimDto.category,
        );
        if (!newCategory) {
          throw new BadRequestException(
            `Invalid category: ${updateClaimDto.category}`,
          );
        }
        category = newCategory;
      }

      // Validate category limit
      await this.validateCategoryLimit(
        user.id,
        category,
        updateClaimDto.month ?? existingClaim.month,
        updateClaimDto.year ?? existingClaim.year,
        updateClaimDto.totalAmount ?? Number(existingClaim.totalAmount),
        existingClaim.id,
      );

      // Update claim properties
      if (updateClaimDto.category !== undefined) {
        existingClaim.categoryEntity = category;
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
        relation: { attachments: true, categoryEntity: true },
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
  @ApiOperation({
    summary: 'Delete a claim',
    description:
      'Delete an existing claim owned by the authenticated user. Claims with status "paid" cannot be deleted.',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique identifier of the claim to delete',
    type: 'string',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiNoContentResponse({
    description: 'Claim deleted successfully',
  })
  @ApiNotFoundResponse({
    description: 'Claim not found or not owned by user',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Claim not found' },
      },
    },
  })
  @ApiUnprocessableEntityResponse({
    description: 'Business rule violation - cannot delete paid claim',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 422 },
        message: {
          type: 'string',
          example: 'Cannot delete a claim that has been paid',
        },
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Database or server error',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 500 },
        message: {
          type: 'string',
          example: 'Failed to delete claim. Please try again.',
        },
      },
    },
  })
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
  @ApiOperation({
    summary: 'Update claim status',
    description:
      'Update the status of an existing claim with business rule validation for status transitions. Supports bidirectional transitions between paid and sent status for workflow corrections.',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique identifier of the claim to update status',
    type: 'string',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({
    type: ClaimStatusUpdateDto,
    description: 'Status update data',
    examples: {
      submit: {
        summary: 'Submit claim',
        description: 'Change claim status from draft to sent',
        value: {
          status: 'sent',
        },
      },
      markPaid: {
        summary: 'Mark as paid',
        description: 'Change claim status to paid',
        value: {
          status: 'paid',
        },
      },
      returnToDraft: {
        summary: 'Return to draft',
        description: 'Change claim status back to draft',
        value: {
          status: 'draft',
        },
      },
      markSentFromPaid: {
        summary: 'Mark as sent (from paid)',
        description:
          'Change claim status from paid back to sent for workflow corrections',
        value: {
          status: 'sent',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Claim status updated successfully',
    type: ClaimResponseDto,
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        claim: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            userId: {
              type: 'string',
              example: '123e4567-e89b-12d3-a456-426614174001',
            },
            category: {
              type: 'string',
              example: 'telco',
            },
            claimName: { type: 'string', example: 'Monthly phone bill' },
            month: { type: 'number', example: 9 },
            year: { type: 'number', example: 2025 },
            totalAmount: { type: 'number', example: 50.0 },
            status: {
              type: 'string',
              enum: Object.values(ClaimStatus),
              example: 'sent',
            },
            submissionDate: {
              type: 'string',
              nullable: true,
              example: '2025-09-17T10:00:00.000Z',
            },
            attachments: { type: 'array', items: { type: 'object' } },
            createdAt: { type: 'string', example: '2025-09-17T09:00:00.000Z' },
            updatedAt: { type: 'string', example: '2025-09-17T10:00:00.000Z' },
          },
        },
        error: { type: 'string', nullable: true },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Validation error - invalid status value',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'array',
          items: { type: 'string' },
          example: ['Status must be one of: draft, sent, paid, failed'],
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Claim not found or not owned by user',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Claim not found' },
      },
    },
  })
  @ApiUnprocessableEntityResponse({
    description: 'Invalid status transition',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 422 },
        message: {
          type: 'string',
          example: 'Invalid status transition from sent to failed',
        },
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Database or server error',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 500 },
        message: {
          type: 'string',
          example: 'Failed to update claim status. Please try again.',
        },
      },
    },
  })
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
        relation: { attachments: true, categoryEntity: true },
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
   * Resend claim email
   * Requirements: Requirement 2 - Resend Claim Email
   */
  @Post(':id/resend')
  @ApiOperation({
    summary: 'Resend claim email',
    description:
      'Resend an email for a claim that is in sent or failed status. The claim must be owned by the authenticated user.',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique identifier of the claim to resend email',
    type: 'string',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Email resent successfully',
    type: ClaimResponseDto,
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        claim: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            userId: {
              type: 'string',
              example: '123e4567-e89b-12d3-a456-426614174001',
            },
            category: {
              type: 'string',
              example: 'telco',
            },
            claimName: { type: 'string', example: 'Monthly phone bill' },
            month: { type: 'number', example: 9 },
            year: { type: 'number', example: 2025 },
            totalAmount: { type: 'number', example: 50.0 },
            status: {
              type: 'string',
              enum: Object.values(ClaimStatus),
              example: 'sent',
            },
            submissionDate: {
              type: 'string',
              nullable: true,
              example: '2025-09-17T10:00:00.000Z',
            },
            attachments: { type: 'array', items: { type: 'object' } },
            createdAt: { type: 'string', example: '2025-09-17T09:00:00.000Z' },
            updatedAt: { type: 'string', example: '2025-09-17T10:00:00.000Z' },
          },
        },
        error: { type: 'string', nullable: true },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid request - claim not in sent or failed status',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'string',
          example:
            'Cannot resend email: Claim status is draft, expected sent or failed',
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Claim not found or not owned by user',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Claim not found' },
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Email service error or server error',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 500 },
        message: {
          type: 'string',
          example: 'Failed to resend claim email. Please try again.',
        },
      },
    },
  })
  async resendClaimEmail(
    @User() user: UserEntity,
    @Param('id') id: string,
  ): Promise<ClaimResponseDto> {
    try {
      this.logger.log(`Resending email for claim: ${id} for user: ${user.id}`);

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

      // Validate claim status - only sent or failed claims can be resent
      if (
        existingClaim.status !== ClaimStatus.SENT &&
        existingClaim.status !== ClaimStatus.FAILED
      ) {
        throw new BadRequestException(
          `Cannot resend email: Claim status is ${existingClaim.status}, expected ${ClaimStatus.SENT} or ${ClaimStatus.FAILED}`,
        );
      }

      // Use EmailService to resend the email
      const emailRequest: IClaimEmailRequest = {
        claimId: id,
      };

      const emailResult = await this.emailService.sendClaimEmail(
        user.id,
        emailRequest,
      );

      if (!emailResult.success) {
        this.logger.error(
          `Email resend failed for claim ${id}: ${emailResult.error}`,
        );
        throw new InternalServerErrorException(
          emailResult.error || 'Failed to resend claim email',
        );
      }

      // Fetch the updated claim with relations
      const claimWithRelations = await this.claimDBUtil.getOne({
        criteria: { id },
        relation: { attachments: true, categoryEntity: true },
      });

      if (!claimWithRelations) {
        throw new InternalServerErrorException(
          'Failed to retrieve updated claim',
        );
      }

      const claimMetadata = this.mapClaimEntityToMetadata(claimWithRelations);

      this.logger.log(
        `Email resent successfully for claim: ${id} for user: ${user.id}`,
      );

      return ClaimResponseDto.success(claimMetadata);
    } catch (error) {
      this.logger.error(
        `Failed to resend email for claim ${id} for user ${user.id}:`,
        error,
      );
      this.handleClaimOperationError(error, 'resend claim email');
    }
  }

  /**
   * Preview email content for a draft claim
   * Requirements: Requirement 6 - API endpoint for previewing email content
   * Endpoint: GET /api/claims/:id/preview
   */
  @Get(':id/preview')
  @ApiOperation({
    summary: 'Preview claim email',
    description:
      'Generate a preview of the email that would be sent for a claim submission. The claim must be in draft status and owned by the authenticated user. No actual email is sent.',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique identifier of the claim to preview',
    type: 'string',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Email preview generated successfully',
    schema: {
      type: 'object',
      properties: {
        subject: {
          type: 'string',
          example: 'John Doe - Claim Submission: Gym Membership (January 2025)',
          description: 'Email subject line',
        },
        htmlBody: {
          type: 'string',
          example: '<html>...</html>',
          description: 'HTML content of the email',
        },
        recipients: {
          type: 'array',
          items: { type: 'string' },
          example: ['finance@mavericks-consulting.com'],
          description: 'Primary recipient email addresses',
        },
        cc: {
          type: 'array',
          items: { type: 'string' },
          example: ['manager@mavericks-consulting.com'],
          description: 'CC email addresses from user preferences',
        },
        bcc: {
          type: 'array',
          items: { type: 'string' },
          example: [],
          description: 'BCC email addresses from user preferences',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description:
      'Validation error - invalid claim ID format or claim not in draft status',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'string',
          example: 'Cannot preview email: Claim status is sent, expected draft',
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user does not own the claim',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 },
        message: {
          type: 'string',
          example: 'Access denied: You do not own this claim',
        },
        error: { type: 'string', example: 'Forbidden' },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Claim not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: {
          type: 'string',
          example: 'Claim not found',
        },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Server error during preview generation',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 500 },
        message: {
          type: 'string',
          example: 'Failed to generate email preview. Please try again.',
        },
      },
    },
  })
  async getClaimPreview(
    @User() user: UserEntity,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<IPreviewEmailResponse> {
    try {
      this.logger.log(
        `Generating email preview for claim ${id} by user ${user.id}`,
      );

      const preview = await this.emailPreviewService.generatePreview(
        user.id,
        id,
      );

      this.logger.log(`Email preview generated successfully for claim ${id}`);

      return preview;
    } catch (error) {
      this.logger.error(
        `Email preview generation failed for claim ${id} by user ${user.id}:`,
        error,
      );

      // Re-throw known HTTP exceptions
      if (
        error instanceof BadRequestException ||
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      // Default error handling
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Email preview generation failed';
      throw new InternalServerErrorException(
        `Failed to generate email preview: ${errorMessage}`,
      );
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
      [ClaimStatus.PAID]: [ClaimStatus.SENT], // Allow paid → sent for workflow corrections
    };

    const allowedTransitions = validTransitions[currentStatus] || [];
    if (!allowedTransitions.includes(newStatus)) {
      throw new UnprocessableEntityException(
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
      );
    }
  }

  /**
   * Validate monthly claim limit for specified category
   * Requirements: 1.1 - Create claim validation, 1.2 - Update claim validation, 3 - Error messages
   * @param userId - User ID for claim ownership
   * @param category - Claim category to validate
   * @param month - Month for the claim (1-12)
   * @param year - Year for the claim
   * @param newAmount - Amount being added/updated
   * @param excludeClaimId - Optional claim ID to exclude from calculation (for updates)
   * @throws UnprocessableEntityException if monthly limit would be exceeded
   */
  /**
   * Unified category limit validation for both monthly and yearly limits
   * Requirements: 1.1 - Create claim validation, 1.2 - Update claim validation, 3 - Error messages
   * @param userId - User ID for claim ownership
   * @param category - ClaimCategoryEntity with limit relation
   * @param month - Month for the claim
   * @param year - Year for the claim
   * @param newAmount - Amount being added/updated
   * @param excludeClaimId - Optional claim ID to exclude from calculation (for updates)
   * @throws UnprocessableEntityException if limit would be exceeded
   */
  private async validateCategoryLimit(
    userId: string,
    category: ClaimCategoryEntity,
    month: number,
    year: number,
    newAmount: number,
    excludeClaimId?: string,
  ): Promise<void> {
    const limit = category.limit;
    if (!limit) {
      // Unlimited category
      return;
    }

    // Build criteria based on limit type
    const criteria: {
      userId: string;
      categoryEntity: { uuid: string };
      month?: number;
      year: number;
    } = {
      userId,
      categoryEntity: { uuid: category.uuid },
      year,
    };

    if (limit.type === 'monthly') {
      criteria.month = month;
    }

    // Fetch existing claims
    const existingClaims = await this.claimDBUtil.getAll({
      criteria: criteria as Record<string, unknown>,
    });

    // Filter out the claim being updated if excludeClaimId provided
    const relevantClaims = excludeClaimId
      ? existingClaims.filter((c) => c.id !== excludeClaimId)
      : existingClaims;

    // Sum existing claim amounts
    const existingTotal = relevantClaims.reduce(
      (sum, claim) => sum + Number(claim.totalAmount),
      0,
    );

    // Calculate total with new amount
    const total = existingTotal + newAmount;

    // Convert cents to dollars for limit comparison
    const limitInDollars = limit.amount / 100;

    // Throw exception if limit exceeded
    if (total > limitInDollars) {
      const periodType = limit.type === 'monthly' ? 'monthly' : 'yearly';
      const errorMessage = `${category.name} ${periodType} limit of SGD ${limitInDollars.toFixed(2)} exceeded. Current: SGD ${existingTotal.toFixed(2)}, Proposed: SGD ${newAmount.toFixed(2)}, Total: SGD ${total.toFixed(2)}`;
      this.logger.warn(
        `${periodType} limit validation failed for user ${userId}: ${errorMessage}`,
      );
      throw new UnprocessableEntityException(errorMessage);
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
      category: claim.categoryEntity.code,
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
