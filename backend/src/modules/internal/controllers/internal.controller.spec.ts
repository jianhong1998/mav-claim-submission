import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { InternalServerErrorException } from '@nestjs/common';
import { InternalController } from './internal.controller';
import { UserDBUtil } from '../../user/utils/user-db.util';
import { UserEntity } from '../../user/entities/user.entity';
import { TEST_USER_DATA } from '@project/types';
import { TestDataResponseDTO, TestDataDeleteResponseDTO } from '../dtos';

describe('InternalController', () => {
  let controller: InternalController;
  let mockUserDBUtil: {
    create: Mock;
    getOne: Mock;
    hardDelete: Mock;
  };

  const mockUserEntity: UserEntity = {
    id: TEST_USER_DATA.id,
    email: TEST_USER_DATA.email,
    name: TEST_USER_DATA.name,
    googleId: TEST_USER_DATA.googleId,
    picture: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockUserDBUtil = {
      create: vi.fn(),
      getOne: vi.fn(),
      hardDelete: vi.fn(),
    };

    controller = new InternalController(
      mockUserDBUtil as unknown as UserDBUtil,
    );
  });

  describe('createTestData', () => {
    it('should create new user and return TestDataResponseDTO when userDBUtil.create() succeeds', async () => {
      mockUserDBUtil.create.mockResolvedValue(mockUserEntity);

      const result = await controller.createTestData();

      expect(mockUserDBUtil.create).toHaveBeenCalledWith({
        creationData: TEST_USER_DATA,
      });
      expect(mockUserDBUtil.create).toHaveBeenCalledTimes(1);
      expect(result).toBeInstanceOf(TestDataResponseDTO);
      expect(result.user.id).toBe(TEST_USER_DATA.id);
      expect(result.user.email).toBe(TEST_USER_DATA.email);
      expect(result.user.name).toBe(TEST_USER_DATA.name);
      expect(result.user.googleId).toBe(TEST_USER_DATA.googleId);
    });

    it('should return existing user when create throws duplicate error (code 23505)', async () => {
      const duplicateError = {
        code: '23505',
        message: 'duplicate key value violates unique constraint',
      };

      mockUserDBUtil.create.mockRejectedValue(duplicateError);
      mockUserDBUtil.getOne.mockResolvedValue(mockUserEntity);

      const result = await controller.createTestData();

      expect(mockUserDBUtil.create).toHaveBeenCalledWith({
        creationData: TEST_USER_DATA,
      });
      expect(mockUserDBUtil.getOne).toHaveBeenCalledWith({
        criteria: { id: TEST_USER_DATA.id },
        withDeleted: true,
      });
      expect(mockUserDBUtil.getOne).toHaveBeenCalledTimes(1);
      expect(result).toBeInstanceOf(TestDataResponseDTO);
      expect(result.user.id).toBe(TEST_USER_DATA.id);
      expect(result.user.email).toBe(TEST_USER_DATA.email);
    });

    it('should throw InternalServerErrorException when duplicate error occurs but user not found', async () => {
      const duplicateError = {
        code: '23505',
        message: 'duplicate key value violates unique constraint',
      };

      mockUserDBUtil.create.mockRejectedValue(duplicateError);
      mockUserDBUtil.getOne.mockResolvedValue(null);

      await expect(controller.createTestData()).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(controller.createTestData()).rejects.toThrow(
        'User creation failed',
      );

      expect(mockUserDBUtil.create).toHaveBeenCalled();
      expect(mockUserDBUtil.getOne).toHaveBeenCalled();
    });

    it('should re-throw error when create throws unknown error', async () => {
      const unknownError = new Error('Database connection failed');

      mockUserDBUtil.create.mockRejectedValue(unknownError);

      await expect(controller.createTestData()).rejects.toThrow(unknownError);
      expect(mockUserDBUtil.create).toHaveBeenCalledWith({
        creationData: TEST_USER_DATA,
      });
      expect(mockUserDBUtil.getOne).not.toHaveBeenCalled();
    });

    it('should re-throw error when create throws error without code property', async () => {
      const errorWithoutCode = {
        message: 'Some database error',
      };

      mockUserDBUtil.create.mockRejectedValue(errorWithoutCode);

      await expect(controller.createTestData()).rejects.toThrow();
      expect(mockUserDBUtil.create).toHaveBeenCalled();
      expect(mockUserDBUtil.getOne).not.toHaveBeenCalled();
    });

    it('should re-throw error when create throws error with different code', async () => {
      const otherError = {
        code: '23503',
        message: 'foreign key constraint violation',
      };

      mockUserDBUtil.create.mockRejectedValue(otherError);

      await expect(controller.createTestData()).rejects.toThrow();
      expect(mockUserDBUtil.create).toHaveBeenCalled();
      expect(mockUserDBUtil.getOne).not.toHaveBeenCalled();
    });
  });

  describe('deleteTestData', () => {
    it('should delete user and return success response when user exists', async () => {
      mockUserDBUtil.getOne.mockResolvedValue(mockUserEntity);
      mockUserDBUtil.hardDelete.mockResolvedValue(undefined);

      const result = await controller.deleteTestData();

      expect(mockUserDBUtil.getOne).toHaveBeenCalledWith({
        criteria: { id: TEST_USER_DATA.id },
        withDeleted: true,
      });
      expect(mockUserDBUtil.hardDelete).toHaveBeenCalledWith({
        criteria: { id: TEST_USER_DATA.id },
      });
      expect(result).toBeInstanceOf(TestDataDeleteResponseDTO);
      expect(result.deleted).toBe(true);
      expect(result.message).toBe(
        'Test user and all related data deleted successfully',
      );
    });

    it('should return idempotent response when user not found', async () => {
      mockUserDBUtil.getOne.mockResolvedValue(null);

      const result = await controller.deleteTestData();

      expect(mockUserDBUtil.getOne).toHaveBeenCalledWith({
        criteria: { id: TEST_USER_DATA.id },
        withDeleted: true,
      });
      expect(mockUserDBUtil.hardDelete).not.toHaveBeenCalled();
      expect(result).toBeInstanceOf(TestDataDeleteResponseDTO);
      expect(result.deleted).toBe(false);
      expect(result.message).toBe(
        'Test user not found (already deleted or never existed)',
      );
    });

    it('should propagate error when hardDelete fails', async () => {
      const deleteError = new Error('Database error during deletion');
      mockUserDBUtil.getOne.mockResolvedValue(mockUserEntity);
      mockUserDBUtil.hardDelete.mockRejectedValue(deleteError);

      await expect(controller.deleteTestData()).rejects.toThrow(deleteError);
      expect(mockUserDBUtil.getOne).toHaveBeenCalled();
      expect(mockUserDBUtil.hardDelete).toHaveBeenCalled();
    });

    it('should propagate error when getOne fails', async () => {
      const queryError = new Error('Database query failed');
      mockUserDBUtil.getOne.mockRejectedValue(queryError);

      await expect(controller.deleteTestData()).rejects.toThrow(queryError);
      expect(mockUserDBUtil.getOne).toHaveBeenCalled();
      expect(mockUserDBUtil.hardDelete).not.toHaveBeenCalled();
    });
  });
});
