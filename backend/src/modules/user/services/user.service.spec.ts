/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { UserService } from './user.service';
import { UserDBUtil } from '../utils/user-db.util';
import { UserEmailPreferenceService } from './user-email-preference.service';
import { UserEntity } from '../entities/user.entity';
import { UpdateUserDto } from '../dtos/update-user.dto';
import { EmailPreferenceDto } from '../dtos/email-preference.dto';

describe('UserService', () => {
  let service: UserService;
  let mockUserDBUtil: {
    getOne: ReturnType<typeof vi.fn>;
  };
  let mockUserEmailPrefService: {
    validateEmailPreferences: ReturnType<typeof vi.fn>;
    updatePreferences: ReturnType<typeof vi.fn>;
  };
  let mockUserRepo: {
    save: ReturnType<typeof vi.fn>;
  };

  const mockUser = {
    id: 'user-123',
    email: 'user@mavericks-consulting.com',
    name: 'Original Name',
    emailPreferences: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as UserEntity;

  beforeEach(() => {
    // Create mock dependencies
    mockUserDBUtil = {
      getOne: vi.fn(),
    };

    mockUserEmailPrefService = {
      validateEmailPreferences: vi.fn(),
      updatePreferences: vi.fn(),
    };

    mockUserRepo = {
      save: vi.fn(),
    };

    // Create service instance with mocked dependencies
    service = new UserService(
      mockUserDBUtil as unknown as UserDBUtil,
      mockUserEmailPrefService as unknown as UserEmailPreferenceService,
      mockUserRepo as unknown as Repository<UserEntity>,
    );
  });

  describe('updateUser', () => {
    it('should update user name when provided', async () => {
      // Arrange
      const userId = 'user-123';
      const updateDto: UpdateUserDto = {
        name: 'Updated Name',
      };

      const updatedUser = { ...mockUser, name: 'Updated Name' };

      mockUserDBUtil.getOne
        .mockResolvedValueOnce(mockUser) // Initial query
        .mockResolvedValueOnce(updatedUser); // Final query with relations

      mockUserRepo.save.mockResolvedValue(updatedUser);

      // Act
      const result = await service.updateUser(userId, updateDto);

      // Assert
      expect(mockUserDBUtil.getOne).toHaveBeenCalledTimes(2);
      expect(mockUserDBUtil.getOne).toHaveBeenNthCalledWith(1, {
        criteria: { id: userId },
        relation: { emailPreferences: true },
      });
      expect(mockUserRepo.save).toHaveBeenCalledTimes(1);
      expect(mockUserRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Updated Name' }),
      );
      expect(result.name).toBe('Updated Name');
    });

    it('should update email preferences when provided via userEmailPrefService', async () => {
      // Arrange
      const userId = 'user-123';
      const emailPreferences: EmailPreferenceDto[] = [
        { type: 'cc', emailAddress: 'colleague@example.com' },
        { type: 'bcc', emailAddress: 'manager@example.com' },
      ];
      const updateDto: UpdateUserDto = {
        emailPreferences,
      };

      const updatedUser = { ...mockUser, emailPreferences };

      mockUserDBUtil.getOne
        .mockResolvedValueOnce(mockUser) // Initial query
        .mockResolvedValueOnce(updatedUser); // Final query with relations

      mockUserEmailPrefService.validateEmailPreferences.mockReturnValue(
        undefined,
      );
      mockUserEmailPrefService.updatePreferences.mockResolvedValue(undefined);

      // Act
      const result = await service.updateUser(userId, updateDto);

      // Assert
      expect(
        mockUserEmailPrefService.validateEmailPreferences,
      ).toHaveBeenCalledWith(mockUser.email, emailPreferences);
      expect(
        mockUserEmailPrefService.validateEmailPreferences,
      ).toHaveBeenCalledTimes(1);
      expect(mockUserEmailPrefService.updatePreferences).toHaveBeenCalledWith(
        userId,
        emailPreferences,
      );
      expect(mockUserEmailPrefService.updatePreferences).toHaveBeenCalledTimes(
        1,
      );
      expect(result).toBe(updatedUser);
    });

    it('should throw BadRequestException for empty name', async () => {
      // Arrange
      const userId = 'user-123';
      const updateDto: UpdateUserDto = {
        name: '', // Empty name
      };

      mockUserDBUtil.getOne.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(service.updateUser(userId, updateDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.updateUser(userId, updateDto)).rejects.toThrow(
        'Name must be at least 1 character long',
      );

      // Verify save was NOT called
      expect(mockUserRepo.save).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when user not found', async () => {
      // Arrange
      const userId = 'non-existent-user';
      const updateDto: UpdateUserDto = {
        name: 'New Name',
      };

      mockUserDBUtil.getOne.mockResolvedValueOnce(null); // User not found

      // Act & Assert
      await expect(service.updateUser(userId, updateDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.updateUser(userId, updateDto)).rejects.toThrow(
        `User with ID ${userId} not found`,
      );

      // Verify save was NOT called
      expect(mockUserRepo.save).not.toHaveBeenCalled();
      // Verify email preference service was NOT called
      expect(
        mockUserEmailPrefService.validateEmailPreferences,
      ).not.toHaveBeenCalled();
      expect(mockUserEmailPrefService.updatePreferences).not.toHaveBeenCalled();
    });

    it('should return user with emailPreferences relation', async () => {
      // Arrange
      const userId = 'user-123';
      const updateDto: UpdateUserDto = {
        name: 'Updated Name',
      };

      const emailPreferencesData = [
        {
          id: 'pref-1',
          userId: 'user-123',
          type: 'cc' as const,
          emailAddress: 'colleague@example.com',
        },
        {
          id: 'pref-2',
          userId: 'user-123',
          type: 'bcc' as const,
          emailAddress: 'manager@example.com',
        },
      ];

      const updatedUserWithPreferences = {
        ...mockUser,
        name: 'Updated Name',
        emailPreferences: emailPreferencesData,
      };

      mockUserDBUtil.getOne
        .mockResolvedValueOnce(mockUser) // Initial query
        .mockResolvedValueOnce(updatedUserWithPreferences); // Final query with relations

      mockUserRepo.save.mockResolvedValue(updatedUserWithPreferences);

      // Act
      const result = await service.updateUser(userId, updateDto);

      // Assert - verify final query includes emailPreferences relation
      expect(mockUserDBUtil.getOne).toHaveBeenNthCalledWith(2, {
        criteria: { id: userId },
        relation: { emailPreferences: true },
      });

      // Assert - verify returned user has emailPreferences
      expect(result.emailPreferences).toBeDefined();
      expect(result.emailPreferences).toHaveLength(2);
      expect(result.emailPreferences).toEqual(emailPreferencesData);
    });

    it('should update both name and email preferences together', async () => {
      // Arrange
      const userId = 'user-123';
      const emailPreferences: EmailPreferenceDto[] = [
        { type: 'cc', emailAddress: 'colleague@example.com' },
      ];
      const updateDto: UpdateUserDto = {
        name: 'Updated Name',
        emailPreferences,
      };

      const updatedUser = {
        ...mockUser,
        name: 'Updated Name',
        emailPreferences,
      };

      mockUserDBUtil.getOne
        .mockResolvedValueOnce(mockUser) // Initial query
        .mockResolvedValueOnce(updatedUser); // Final query with relations

      mockUserEmailPrefService.validateEmailPreferences.mockReturnValue(
        undefined,
      );
      mockUserEmailPrefService.updatePreferences.mockResolvedValue(undefined);
      mockUserRepo.save.mockResolvedValue(updatedUser);

      // Act
      const result = await service.updateUser(userId, updateDto);

      // Assert - verify both operations were performed
      expect(mockUserRepo.save).toHaveBeenCalledTimes(1);
      expect(
        mockUserEmailPrefService.validateEmailPreferences,
      ).toHaveBeenCalledTimes(1);
      expect(mockUserEmailPrefService.updatePreferences).toHaveBeenCalledTimes(
        1,
      );
      expect(result.name).toBe('Updated Name');
    });

    it('should not call save when only email preferences are updated', async () => {
      // Arrange
      const userId = 'user-123';
      const emailPreferences: EmailPreferenceDto[] = [
        { type: 'cc', emailAddress: 'colleague@example.com' },
      ];
      const updateDto: UpdateUserDto = {
        emailPreferences,
      };

      const updatedUser = { ...mockUser, emailPreferences };

      mockUserDBUtil.getOne
        .mockResolvedValueOnce(mockUser) // Initial query
        .mockResolvedValueOnce(updatedUser); // Final query with relations

      mockUserEmailPrefService.validateEmailPreferences.mockReturnValue(
        undefined,
      );
      mockUserEmailPrefService.updatePreferences.mockResolvedValue(undefined);

      // Act
      await service.updateUser(userId, updateDto);

      // Assert - save should NOT be called when only email preferences updated
      expect(mockUserRepo.save).not.toHaveBeenCalled();
      expect(
        mockUserEmailPrefService.validateEmailPreferences,
      ).toHaveBeenCalledTimes(1);
      expect(mockUserEmailPrefService.updatePreferences).toHaveBeenCalledTimes(
        1,
      );
    });
  });
});
