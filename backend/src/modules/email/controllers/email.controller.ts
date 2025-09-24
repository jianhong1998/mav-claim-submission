import {
  Controller,
  Post,
  Body,
  UseGuards,
  ValidationPipe,
  Logger,
  BadRequestException,
  InternalServerErrorException,
  UnauthorizedException,
  HttpStatus,
  HttpCode,
  RequestTimeoutException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
  ApiRequestTimeoutResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { User } from '../../auth/decorators/user.decorator';
import { UserEntity } from '../../user/entities/user.entity';
import { EmailService } from '../services/email.service';
import {
  IClaimEmailRequest,
  IClaimEmailResponse,
  IClaimMetadata,
} from '@project/types';
import { IsString, IsUUID } from 'class-validator';

export class ClaimEmailRequestDto implements IClaimEmailRequest {
  @IsString()
  @IsUUID()
  claimId: string;
}

export class ClaimEmailResponseDto implements IClaimEmailResponse {
  success: boolean;
  messageId?: string;
  claim?: IClaimMetadata;
  error?: string;

  static success(data: {
    messageId: string;
    claim: IClaimMetadata;
  }): ClaimEmailResponseDto {
    return {
      success: true,
      messageId: data.messageId,
      claim: data.claim,
    };
  }

  static error(error: string): ClaimEmailResponseDto {
    return {
      success: false,
      error,
    };
  }
}

/**
 * EmailController - REST API Endpoints for Email Operations
 *
 * Responsibilities:
 * - Provide REST API endpoint for sending claim emails
 * - Handle authentication and validation for email operations
 * - Implement proper timeout handling for synchronous email operations
 * - Return structured responses with proper HTTP status codes
 *
 * Requirements: 6.1-6.2 - authentication and validation, 6.4-6.6 - error handling and responses
 *
 * Design: NestJS controller with JWT authentication, validation decorators,
 * and comprehensive Swagger documentation following existing patterns
 */
@ApiTags('Email')
@Controller('email')
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
export class EmailController {
  private readonly logger = new Logger(EmailController.name);
  private readonly EMAIL_TIMEOUT_MS = 30000; // 30 seconds

  constructor(private readonly emailService: EmailService) {}

  /**
   * Send claim email endpoint
   * Requirements: 6.1-6.6 - authentication, validation, timeout, error handling
   */
  @Post('send-claim')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send claim email',
    description:
      'Send an email for a claim submission to the configured recipients. The claim must be in draft status and owned by the authenticated user.',
  })
  @ApiBody({
    type: ClaimEmailRequestDto,
    description: 'Claim email request data',
    examples: {
      sendClaim: {
        summary: 'Send claim email example',
        description: 'Example of sending an email for a claim',
        value: {
          claimId: '123e4567-e89b-12d3-a456-426614174000',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Email sent successfully',
    type: ClaimEmailResponseDto,
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        messageId: {
          type: 'string',
          example: '18b2c4d5-1234-5678-9abc-def012345678',
          description: 'Gmail API message ID for the sent email',
        },
        claim: {
          type: 'object',
          description: 'Updated claim object with new status',
          properties: {
            id: {
              type: 'string',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            userId: {
              type: 'string',
              example: '123e4567-e89b-12d3-a456-426614174001',
            },
            category: { type: 'string', example: 'telco' },
            claimName: { type: 'string', example: 'Monthly phone bill' },
            month: { type: 'number', example: 9 },
            year: { type: 'number', example: 2025 },
            totalAmount: { type: 'number', example: 50.0 },
            status: { type: 'string', example: 'sent' },
            submissionDate: {
              type: 'string',
              example: '2025-09-17T10:00:00.000Z',
            },
            createdAt: { type: 'string', example: '2025-09-17T09:00:00.000Z' },
            updatedAt: { type: 'string', example: '2025-09-17T10:00:00.000Z' },
          },
        },
        error: { type: 'string', nullable: true },
      },
    },
  })
  @ApiBadRequestResponse({
    description:
      'Validation error - invalid request data or claim not in draft status',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'array',
          items: { type: 'string' },
          example: ['claimId must be a UUID'],
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiUnprocessableEntityResponse({
    description: 'Business rule violation - claim cannot be emailed',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 422 },
        message: {
          type: 'string',
          example: 'Cannot send email: Claim status is sent, expected draft',
        },
      },
    },
  })
  @ApiRequestTimeoutResponse({
    description: 'Email operation timed out after 30 seconds',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 408 },
        message: {
          type: 'string',
          example: 'Email sending operation timed out. Please try again.',
        },
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
          example: 'Failed to send email. Please try again.',
        },
      },
    },
  })
  async sendClaimEmail(
    @User() user: UserEntity,
    @Body(ValidationPipe) requestDto: ClaimEmailRequestDto,
  ): Promise<ClaimEmailResponseDto> {
    try {
      this.logger.log(
        `Sending claim email for claim ${requestDto.claimId} by user ${user.id}`,
      );

      // Implement timeout using Promise.race
      const emailPromise = this.emailService.sendClaimEmail(user.id, {
        claimId: requestDto.claimId,
      });

      const timeoutPromise = new Promise<IClaimEmailResponse>((_, reject) => {
        setTimeout(() => {
          reject(
            new RequestTimeoutException(
              'Email sending operation timed out. Please try again.',
            ),
          );
        }, this.EMAIL_TIMEOUT_MS);
      });

      const result = await Promise.race([emailPromise, timeoutPromise]);

      if (!result.success) {
        this.logger.warn(
          `Email sending failed for claim ${requestDto.claimId}: ${result.error}`,
        );

        // Determine appropriate HTTP status based on error type
        const errorMessage = result.error || 'Email sending failed';

        // Check for specific error patterns to return appropriate status
        if (errorMessage.includes('not found')) {
          throw new BadRequestException('Claim not found');
        }
        if (
          errorMessage.includes('Access denied') ||
          errorMessage.includes('do not own')
        ) {
          throw new UnauthorizedException(
            'Access denied: You do not own this claim',
          );
        }
        if (
          errorMessage.includes('status is') &&
          errorMessage.includes('expected draft')
        ) {
          throw new BadRequestException(errorMessage);
        }
        if (
          errorMessage.includes('authentication') ||
          errorMessage.includes('re-authenticate')
        ) {
          throw new UnauthorizedException(errorMessage);
        }

        // For other errors, return as internal server error
        throw new InternalServerErrorException(errorMessage);
      }

      this.logger.log(
        `Email sent successfully for claim ${requestDto.claimId} with messageId: ${result.messageId}`,
      );

      return ClaimEmailResponseDto.success({
        messageId: result.messageId!,
        claim: result.claim!,
      });
    } catch (error) {
      this.logger.error(
        `Email sending failed for claim ${requestDto.claimId} by user ${user.id}:`,
        error,
      );

      // Re-throw known HTTP exceptions
      if (
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException ||
        error instanceof RequestTimeoutException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }

      // Handle validation errors
      if (this.isValidationError(error)) {
        throw new BadRequestException(this.extractValidationErrors(error));
      }

      // Default error handling
      const errorMessage =
        error instanceof Error ? error.message : 'Email sending failed';
      throw new InternalServerErrorException(
        `Failed to send email: ${errorMessage}`,
      );
    }
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
}
