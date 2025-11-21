import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEmailPreferenceEntity } from '../entities/user-email-preference.entity';
import { EmailPreferenceDto } from '../dtos/email-preference.dto';

/**
 * UserEmailPreferenceService - Email Preference Management
 *
 * Responsibilities:
 * - Validate email preferences (no own email, no duplicates)
 * - Update user email preferences using simple replace strategy
 *
 * Requirements: 4 - Email Preference Validation, 5 - Email Preference Update Strategy
 *
 * Design: Simple service with delete-all + insert-all strategy for maintainability
 */
@Injectable()
export class UserEmailPreferenceService {
  private readonly logger = new Logger(UserEmailPreferenceService.name);

  constructor(
    @InjectRepository(UserEmailPreferenceEntity)
    private readonly emailPreferenceRepo: Repository<UserEmailPreferenceEntity>,
  ) {}

  /**
   * Validate email preferences
   * Requirements: 4 - Email Preference Validation
   *
   * Validates that:
   * - User's own email is not in the preferences list
   * - No duplicate email addresses exist
   *
   * @throws BadRequestException if validation fails
   */
  validateEmailPreferences(
    userEmail: string,
    preferences: EmailPreferenceDto[],
  ): void {
    // Check if user's own email is in preferences
    const hasOwnEmail = preferences.some(
      (pref) => pref.emailAddress === userEmail,
    );

    if (hasOwnEmail) {
      throw new BadRequestException(
        'Cannot add your own email address to preferences',
      );
    }

    // Check for duplicate email addresses
    const emailAddresses = preferences.map((pref) => pref.emailAddress);
    const uniqueEmails = new Set(emailAddresses);

    if (emailAddresses.length !== uniqueEmails.size) {
      throw new BadRequestException(
        'Duplicate email addresses are not allowed',
      );
    }

    this.logger.debug(
      `Email preferences validated successfully for user: ${userEmail}`,
    );
  }

  /**
   * Update user email preferences using simple replace strategy
   * Requirements: 5 - Email Preference Update Strategy
   *
   * Strategy: Delete all existing preferences, then insert new ones
   * This approach is simple, maintainable, and avoids complex diff logic
   *
   * @param userId - User ID
   * @param preferences - New email preferences to set
   */
  async updatePreferences(
    userId: string,
    preferences: EmailPreferenceDto[],
  ): Promise<void> {
    this.logger.log(`Updating email preferences for user: ${userId}`);

    // Step 1: Delete all existing preferences for this user
    await this.emailPreferenceRepo.delete({ userId });

    this.logger.debug(`Deleted existing preferences for user: ${userId}`);

    // Step 2: Insert new preferences (if any)
    if (preferences.length > 0) {
      const entities = preferences.map((pref) => ({
        userId,
        type: pref.type,
        emailAddress: pref.emailAddress,
      }));

      await this.emailPreferenceRepo.insert(entities);

      this.logger.log(
        `Inserted ${preferences.length} new preferences for user: ${userId}`,
      );
    } else {
      this.logger.log(`No preferences to insert for user: ${userId}`);
    }
  }
}
