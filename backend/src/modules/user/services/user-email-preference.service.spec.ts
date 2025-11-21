/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { UserEmailPreferenceService } from './user-email-preference.service';
import { UserEmailPreferenceEntity } from '../entities/user-email-preference.entity';
import { EmailPreferenceDto } from '../dtos/email-preference.dto';

describe('UserEmailPreferenceService', () => {
  let service: UserEmailPreferenceService;
  let mockRepository: {
    delete: ReturnType<typeof vi.fn>;
    insert: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    // Create mock repository
    mockRepository = {
      delete: vi.fn(),
      insert: vi.fn(),
    };

    // Create service instance with mocked repository
    service = new UserEmailPreferenceService(
      mockRepository as unknown as Repository<UserEmailPreferenceEntity>,
    );
  });

  describe('validateEmailPreferences', () => {
    it('should throw BadRequestException when preferences contain user own email', () => {
      // Arrange
      const userEmail = 'user@example.com';
      const preferences: EmailPreferenceDto[] = [
        { type: 'cc', emailAddress: 'colleague@example.com' },
        { type: 'cc', emailAddress: 'user@example.com' }, // User's own email
      ];

      // Act & Assert
      expect(() => {
        service.validateEmailPreferences(userEmail, preferences);
      }).toThrow(BadRequestException);

      expect(() => {
        service.validateEmailPreferences(userEmail, preferences);
      }).toThrow('Cannot add your own email address to preferences');
    });

    it('should throw BadRequestException when duplicate emails exist in preferences', () => {
      // Arrange
      const userEmail = 'user@example.com';
      const preferences: EmailPreferenceDto[] = [
        { type: 'cc', emailAddress: 'colleague@example.com' },
        { type: 'bcc', emailAddress: 'colleague@example.com' }, // Duplicate
      ];

      // Act & Assert
      expect(() => {
        service.validateEmailPreferences(userEmail, preferences);
      }).toThrow(BadRequestException);

      expect(() => {
        service.validateEmailPreferences(userEmail, preferences);
      }).toThrow('Duplicate email addresses are not allowed');
    });

    it('should pass validation for valid preferences', () => {
      // Arrange
      const userEmail = 'user@example.com';
      const preferences: EmailPreferenceDto[] = [
        { type: 'cc', emailAddress: 'colleague1@example.com' },
        { type: 'bcc', emailAddress: 'colleague2@example.com' },
        { type: 'cc', emailAddress: 'colleague3@example.com' },
      ];

      // Act & Assert - should not throw
      expect(() => {
        service.validateEmailPreferences(userEmail, preferences);
      }).not.toThrow();
    });

    it('should pass validation for empty preferences array', () => {
      // Arrange
      const userEmail = 'user@example.com';
      const preferences: EmailPreferenceDto[] = [];

      // Act & Assert - should not throw
      expect(() => {
        service.validateEmailPreferences(userEmail, preferences);
      }).not.toThrow();
    });
  });

  describe('updatePreferences', () => {
    it('should delete all existing preferences then insert new ones', async () => {
      // Arrange
      const userId = 'user-123';
      const preferences: EmailPreferenceDto[] = [
        { type: 'cc', emailAddress: 'colleague1@example.com' },
        { type: 'bcc', emailAddress: 'colleague2@example.com' },
      ];

      mockRepository.delete.mockResolvedValue({ affected: 2 });
      mockRepository.insert.mockResolvedValue({});

      // Act
      await service.updatePreferences(userId, preferences);

      // Assert - verify delete was called first with correct userId
      expect(mockRepository.delete).toHaveBeenCalledWith({ userId });
      expect(mockRepository.delete).toHaveBeenCalledTimes(1);

      // Assert - verify insert was called with correct entities
      expect(mockRepository.insert).toHaveBeenCalledWith([
        {
          userId: 'user-123',
          type: 'cc',
          emailAddress: 'colleague1@example.com',
        },
        {
          userId: 'user-123',
          type: 'bcc',
          emailAddress: 'colleague2@example.com',
        },
      ]);
      expect(mockRepository.insert).toHaveBeenCalledTimes(1);

      // Verify delete was called before insert (call order)
      const deleteCallOrder = mockRepository.delete.mock.invocationCallOrder[0];
      const insertCallOrder = mockRepository.insert.mock.invocationCallOrder[0];
      expect(deleteCallOrder).toBeLessThan(insertCallOrder);
    });

    it('should handle empty preferences array (delete only, no insert)', async () => {
      // Arrange
      const userId = 'user-123';
      const preferences: EmailPreferenceDto[] = [];

      mockRepository.delete.mockResolvedValue({ affected: 0 });

      // Act
      await service.updatePreferences(userId, preferences);

      // Assert - verify delete was called
      expect(mockRepository.delete).toHaveBeenCalledWith({ userId });
      expect(mockRepository.delete).toHaveBeenCalledTimes(1);

      // Assert - verify insert was NOT called for empty array
      expect(mockRepository.insert).not.toHaveBeenCalled();
    });

    it('should delete existing preferences even when inserting new ones', async () => {
      // Arrange
      const userId = 'user-456';
      const preferences: EmailPreferenceDto[] = [
        { type: 'cc', emailAddress: 'new@example.com' },
      ];

      mockRepository.delete.mockResolvedValue({ affected: 3 }); // Had 3 old preferences
      mockRepository.insert.mockResolvedValue({});

      // Act
      await service.updatePreferences(userId, preferences);

      // Assert - verify delete was called (should delete all old preferences)
      expect(mockRepository.delete).toHaveBeenCalledWith({
        userId: 'user-456',
      });

      // Assert - verify new preference was inserted
      expect(mockRepository.insert).toHaveBeenCalledWith([
        {
          userId: 'user-456',
          type: 'cc',
          emailAddress: 'new@example.com',
        },
      ]);
    });
  });
});
