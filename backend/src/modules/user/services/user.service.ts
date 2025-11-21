import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserDBUtil } from '../utils/user-db.util';
import { UserEmailPreferenceService } from './user-email-preference.service';
import { UpdateUserDto } from '../dtos/update-user.dto';
import { UserEntity } from '../entities/user.entity';

/**
 * UserService - User Profile Management
 *
 * Responsibilities:
 * - Orchestrate user profile updates
 * - Coordinate name updates and email preference updates
 * - Validate business rules before persisting changes
 *
 * Requirements: 1 - User Profile Update Endpoint, 2 - Username Customization,
 *               3 - Email Preferences Management
 *
 * Design: Service layer that orchestrates UserDBUtil and UserEmailPreferenceService
 */
@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly userDBUtil: UserDBUtil,
    private readonly userEmailPrefService: UserEmailPreferenceService,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  /**
   * Get user profile with email preferences
   * Requirements: 1 - Retrieve User Profile Data, 2 - Email Preferences Data Structure
   *
   * @param userId - User ID to retrieve
   * @returns User entity with emailPreferences relation loaded
   * @throws NotFoundException if user not found
   */
  async getUserProfile(userId: string): Promise<UserEntity> {
    this.logger.log(`Retrieving user profile for userId: ${userId}`);

    const user = await this.userDBUtil.getOne({
      criteria: { id: userId } as Parameters<
        UserDBUtil['getOne']
      >[0]['criteria'],
      relation: { emailPreferences: true },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    this.logger.log(
      `Successfully retrieved user profile for userId: ${userId}`,
    );

    return user;
  }

  /**
   * Update user profile (name and/or email preferences)
   * Requirements: 1 - User Profile Update, 2 - Username Customization,
   *               3 - Email Preferences Management
   *
   * @param userId - User ID to update
   * @param updateDto - Update data (name and/or emailPreferences)
   * @returns Updated user entity with relations
   * @throws NotFoundException if user not found
   * @throws BadRequestException if validation fails
   */
  async updateUser(
    userId: string,
    updateDto: UpdateUserDto,
  ): Promise<UserEntity> {
    this.logger.log(`Updating user profile for userId: ${userId}`);

    // Step 1: Query user (no relations needed for validation/name update)
    const user = await this.userDBUtil.getOne({
      criteria: { id: userId } as Parameters<
        UserDBUtil['getOne']
      >[0]['criteria'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Step 2: Update name if provided
    if (updateDto.name !== undefined) {
      if (updateDto.name.length < 1) {
        throw new BadRequestException('Name must be at least 1 character long');
      }
      user.name = updateDto.name;
      this.logger.debug(`Updated name for user ${userId}: ${updateDto.name}`);
    }

    // Step 3: Update email preferences if provided
    if (updateDto.emailPreferences !== undefined) {
      // Validate email preferences (no own email, no duplicates)
      this.userEmailPrefService.validateEmailPreferences(
        user.email,
        updateDto.emailPreferences,
      );

      // Update preferences using replace strategy
      await this.userEmailPrefService.updatePreferences(
        userId,
        updateDto.emailPreferences,
      );

      this.logger.debug(
        `Updated email preferences for user ${userId}: ${updateDto.emailPreferences.length} preferences`,
      );
    }

    // Step 4: Save user entity (if name was updated)
    if (updateDto.name !== undefined) {
      await this.userRepo.save(user);
      this.logger.debug(`Saved user entity for userId: ${userId}`);
    }

    // Step 5: Return fresh user with relations
    const updatedUser = await this.userDBUtil.getOne({
      criteria: { id: userId } as Parameters<
        UserDBUtil['getOne']
      >[0]['criteria'],
      relation: { emailPreferences: true },
    });

    if (!updatedUser) {
      throw new NotFoundException(
        `User with ID ${userId} not found after update`,
      );
    }

    this.logger.log(`Successfully updated user profile for userId: ${userId}`);

    return updatedUser;
  }
}
