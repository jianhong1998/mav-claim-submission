import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  ForbiddenException,
  Logger,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { User } from '../../auth/decorators/user.decorator';
import { UserEntity } from '../entities/user.entity';
import { UserService } from '../services/user.service';
import { UpdateUserDto } from '../dtos/update-user.dto';

/**
 * UserController - REST API Endpoints for User Profile Management
 *
 * Responsibilities:
 * - Provide REST API endpoint for updating user profiles
 * - Handle authentication and authorization for profile updates
 * - Enforce authorization rule: users can only update their own profiles
 * - Delegate business logic to UserService
 *
 * Requirements: 1 - User Profile Update Endpoint
 *
 * Design: NestJS controller with JWT authentication, authorization checks,
 * and comprehensive Swagger documentation following existing patterns
 */
@ApiTags('Users')
@Controller('users')
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
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(private readonly userService: UserService) {}

  /**
   * Get user profile endpoint
   * Requirements: 1 - Retrieve User Profile Data, 3 - Authorization and Security,
   *               4 - API Response Format
   */
  @Get(':userId')
  @ApiOperation({
    summary: 'Get user profile',
    description:
      'Retrieve user profile including display name and email preferences for claim submissions. Users can only access their own profile.',
  })
  @ApiParam({
    name: 'userId',
    description: 'User ID to retrieve (must match authenticated user)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Profile retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          example: '123e4567-e89b-12d3-a456-426614174000',
        },
        email: { type: 'string', example: 'user@mavericks-consulting.com' },
        name: { type: 'string', example: 'John Doe' },
        picture: { type: 'string', nullable: true },
        googleId: { type: 'string', example: '1234567890' },
        emailPreferences: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              type: { type: 'string', enum: ['cc', 'bcc'] },
              emailAddress: { type: 'string' },
            },
          },
        },
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' },
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Authorization error - cannot access other users',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 },
        message: { type: 'string', example: 'Cannot access other users' },
        error: { type: 'string', example: 'Forbidden' },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'User not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'User with ID ... not found' },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  async getUser(
    @Param('userId') userId: string,
    @User() currentUser: UserEntity,
  ): Promise<UserEntity> {
    this.logger.log(
      `Profile retrieval request for userId: ${userId} by user: ${currentUser.id}`,
    );

    // Authorization check: users can only access their own profile
    if (currentUser.id !== userId) {
      this.logger.warn(
        `Authorization failed: User ${currentUser.id} attempted to access user ${userId}`,
      );
      throw new ForbiddenException('Cannot access other users');
    }

    // Delegate to service layer
    const user = await this.userService.getUserProfile(userId);

    this.logger.log(`Profile retrieved successfully for userId: ${userId}`);

    return user;
  }

  /**
   * Update user profile endpoint
   * Requirements: 1 - User Profile Update Endpoint, 2 - Username Customization,
   *               3 - Email Preferences Management
   */
  @Patch(':userId')
  @ApiOperation({
    summary: 'Update user profile',
    description:
      'Update user profile including display name and email preferences for claim submissions. Users can only update their own profile.',
  })
  @ApiParam({
    name: 'userId',
    description: 'User ID to update (must match authenticated user)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({
    type: UpdateUserDto,
    description: 'User profile update data',
    examples: {
      updateName: {
        summary: 'Update display name',
        description: 'Example of updating only the display name',
        value: {
          name: 'John Doe',
        },
      },
      updateEmailPreferences: {
        summary: 'Update email preferences',
        description: 'Example of updating only email preferences',
        value: {
          emailPreferences: [
            { type: 'cc', emailAddress: 'manager@example.com' },
            { type: 'bcc', emailAddress: 'finance@example.com' },
          ],
        },
      },
      updateBoth: {
        summary: 'Update name and email preferences',
        description: 'Example of updating both name and email preferences',
        value: {
          name: 'John Doe',
          emailPreferences: [
            { type: 'cc', emailAddress: 'manager@example.com' },
            { type: 'bcc', emailAddress: 'finance@example.com' },
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    schema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          example: '123e4567-e89b-12d3-a456-426614174000',
        },
        email: { type: 'string', example: 'user@mavericks-consulting.com' },
        name: { type: 'string', example: 'John Doe' },
        picture: { type: 'string', nullable: true },
        googleId: { type: 'string', example: '1234567890' },
        emailPreferences: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              type: { type: 'string', enum: ['cc', 'bcc'] },
              emailAddress: { type: 'string' },
            },
          },
        },
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' },
      },
    },
  })
  @ApiBadRequestResponse({
    description:
      'Validation error - invalid request data or business rule violation',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          oneOf: [
            {
              type: 'array',
              items: { type: 'string' },
              example: ['Name must be at least 1 character long'],
            },
            {
              type: 'string',
              example:
                'Email preferences cannot contain your own email address',
            },
          ],
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Authorization error - cannot update other users',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 },
        message: { type: 'string', example: 'Cannot update other users' },
        error: { type: 'string', example: 'Forbidden' },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'User not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'User with ID ... not found' },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  async updateUser(
    @Param('userId') userId: string,
    @User() currentUser: UserEntity,
    @Body(ValidationPipe) updateDto: UpdateUserDto,
  ): Promise<UserEntity> {
    this.logger.log(
      `Profile update request for userId: ${userId} by user: ${currentUser.id}`,
    );

    // Authorization check: users can only update their own profile
    if (currentUser.id !== userId) {
      this.logger.warn(
        `Authorization failed: User ${currentUser.id} attempted to update user ${userId}`,
      );
      throw new ForbiddenException('Cannot update other users');
    }

    // Delegate to service layer
    const updatedUser = await this.userService.updateUser(userId, updateDto);

    this.logger.log(`Profile updated successfully for userId: ${userId}`);

    return updatedUser;
  }
}
