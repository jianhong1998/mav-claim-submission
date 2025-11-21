import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserEntity } from '../entities/user.entity';
import { UpdateUserDto } from '../dtos/update-user.dto';

/**
 * UserController PATCH /:userId Endpoint Tests
 *
 * Tests the updateUser endpoint covering:
 * - Successful profile updates when userId matches authenticated user
 * - Authorization enforcement (403 for other users)
 * - Proper delegation to UserService
 * - Correct return values
 *
 * Test Categories:
 * - Successful update scenarios
 * - Authorization validation
 * - Service delegation
 */
describe('UserController - PATCH /:userId Endpoint', () => {
  let controller: UserController;
  let mockUserService: {
    updateUser: Mock;
  };

  const mockCurrentUser: UserEntity = {
    id: 'user-123',
    googleId: 'google-123',
    email: 'test@mavericks-consulting.com',
    name: 'Test User',
    picture: 'https://example.com/picture.jpg',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUpdatedUser = {
    ...mockCurrentUser,
    name: 'Updated Name',
    emailPreferences: [
      {
        id: 'pref-1',
        userId: 'user-123',
        type: 'cc' as const,
        emailAddress: 'manager@example.com',
        user: mockCurrentUser,
      },
    ],
  } as UserEntity;

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();

    // Create service mocks
    mockUserService = {
      updateUser: vi.fn(),
    };

    // Create controller instance with mocked dependencies
    controller = new UserController(mockUserService as never);
  });

  describe('updateUser - Successful Scenarios', () => {
    it('should successfully update user profile when userId matches currentUser.id', async () => {
      const userId = 'user-123';
      const updateDto: UpdateUserDto = {
        name: 'Updated Name',
      };

      mockUserService.updateUser.mockResolvedValue(mockUpdatedUser);

      // Execute
      const result = await controller.updateUser(
        userId,
        mockCurrentUser,
        updateDto,
      );

      // Assertions
      expect(mockUserService.updateUser).toHaveBeenCalledTimes(1);
      expect(mockUserService.updateUser).toHaveBeenCalledWith(
        userId,
        updateDto,
      );
      expect(result).toEqual(mockUpdatedUser);
    });

    it('should successfully update email preferences when userId matches currentUser.id', async () => {
      const userId = 'user-123';
      const updateDto: UpdateUserDto = {
        emailPreferences: [
          { type: 'cc', emailAddress: 'manager@example.com' },
          { type: 'bcc', emailAddress: 'finance@example.com' },
        ],
      };

      mockUserService.updateUser.mockResolvedValue(mockUpdatedUser);

      // Execute
      const result = await controller.updateUser(
        userId,
        mockCurrentUser,
        updateDto,
      );

      // Assertions
      expect(mockUserService.updateUser).toHaveBeenCalledTimes(1);
      expect(mockUserService.updateUser).toHaveBeenCalledWith(
        userId,
        updateDto,
      );
      expect(result).toEqual(mockUpdatedUser);
    });

    it('should successfully update both name and email preferences', async () => {
      const userId = 'user-123';
      const updateDto: UpdateUserDto = {
        name: 'Updated Name',
        emailPreferences: [{ type: 'cc', emailAddress: 'manager@example.com' }],
      };

      mockUserService.updateUser.mockResolvedValue(mockUpdatedUser);

      // Execute
      const result = await controller.updateUser(
        userId,
        mockCurrentUser,
        updateDto,
      );

      // Assertions
      expect(mockUserService.updateUser).toHaveBeenCalledTimes(1);
      expect(mockUserService.updateUser).toHaveBeenCalledWith(
        userId,
        updateDto,
      );
      expect(result).toEqual(mockUpdatedUser);
    });

    it('should return updated user data from service', async () => {
      const userId = 'user-123';
      const updateDto: UpdateUserDto = { name: 'New Name' };

      const expectedUser: UserEntity = {
        ...mockCurrentUser,
        name: 'New Name',
      };

      mockUserService.updateUser.mockResolvedValue(expectedUser);

      // Execute
      const result = await controller.updateUser(
        userId,
        mockCurrentUser,
        updateDto,
      );

      // Assertions
      expect(result).toBe(expectedUser);
      expect(result.name).toBe('New Name');
    });
  });

  describe('updateUser - Authorization Validation', () => {
    it('should throw ForbiddenException when userId does not match currentUser.id', async () => {
      const userId = 'user-456'; // Different user ID
      const updateDto: UpdateUserDto = {
        name: 'Updated Name',
      };

      // Execute and expect exception
      await expect(
        controller.updateUser(userId, mockCurrentUser, updateDto),
      ).rejects.toThrow(ForbiddenException);

      // Verify service was never called
      expect(mockUserService.updateUser).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException with correct error message for unauthorized update', async () => {
      const userId = 'user-999';
      const updateDto: UpdateUserDto = { name: 'Hacker Name' };

      // Execute and catch exception
      await expect(
        controller.updateUser(userId, mockCurrentUser, updateDto),
      ).rejects.toThrow('Cannot update other users');

      // Verify service was never called
      expect(mockUserService.updateUser).not.toHaveBeenCalled();
    });

    it('should perform authorization check before calling service', async () => {
      const userId = 'user-different';
      const updateDto: UpdateUserDto = { name: 'Test' };

      // Mock service to track if it was called
      mockUserService.updateUser.mockResolvedValue(mockUpdatedUser);

      // Execute and expect exception
      await expect(
        controller.updateUser(userId, mockCurrentUser, updateDto),
      ).rejects.toThrow(ForbiddenException);

      // Verify service was NEVER called because authorization failed first
      expect(mockUserService.updateUser).not.toHaveBeenCalled();
    });
  });

  describe('updateUser - Service Delegation', () => {
    it('should call userService.updateUser with correct parameters', async () => {
      const userId = 'user-123';
      const updateDto: UpdateUserDto = {
        name: 'John Doe',
        emailPreferences: [{ type: 'cc', emailAddress: 'boss@example.com' }],
      };

      mockUserService.updateUser.mockResolvedValue(mockUpdatedUser);

      // Execute
      await controller.updateUser(userId, mockCurrentUser, updateDto);

      // Verify exact parameters passed to service
      expect(mockUserService.updateUser).toHaveBeenCalledWith(
        userId,
        updateDto,
      );
    });

    it('should pass through service response without modification', async () => {
      const userId = 'user-123';
      const updateDto: UpdateUserDto = { name: 'Test User' };

      const serviceResponse: UserEntity = {
        ...mockCurrentUser,
        name: 'Test User',
        emailPreferences: [],
      };

      mockUserService.updateUser.mockResolvedValue(serviceResponse);

      // Execute
      const result = await controller.updateUser(
        userId,
        mockCurrentUser,
        updateDto,
      );

      // Verify result is exactly what service returned
      expect(result).toBe(serviceResponse);
    });
  });

  describe('updateUser - Edge Cases', () => {
    it('should allow update with empty emailPreferences array', async () => {
      const userId = 'user-123';
      const updateDto: UpdateUserDto = {
        emailPreferences: [],
      };

      mockUserService.updateUser.mockResolvedValue(mockUpdatedUser);

      // Execute
      const result = await controller.updateUser(
        userId,
        mockCurrentUser,
        updateDto,
      );

      // Assertions
      expect(mockUserService.updateUser).toHaveBeenCalledWith(
        userId,
        updateDto,
      );
      expect(result).toEqual(mockUpdatedUser);
    });

    it('should handle service throwing errors', async () => {
      const userId = 'user-123';
      const updateDto: UpdateUserDto = { name: 'Test' };

      // Mock service to throw error
      mockUserService.updateUser.mockRejectedValue(new Error('Database error'));

      // Execute and expect error to propagate
      await expect(
        controller.updateUser(userId, mockCurrentUser, updateDto),
      ).rejects.toThrow('Database error');
    });
  });
});
