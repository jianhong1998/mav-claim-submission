import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClaimCategoryService } from '../claim-category-services';
import { ClaimCategoryDBUtil } from '../../utils/claim-category-db.util';
import { ClaimCategoryLimitDBUtil } from '../../utils/claim-category-limit-db.util';
import { ClaimCategoryEntity } from '../../entities/claim-category.entity';

describe('ClaimCategoryService', () => {
  let service: ClaimCategoryService;
  let mockClaimCategoryDBUtil: {
    getOne: ReturnType<typeof vi.fn>;
    getAll: ReturnType<typeof vi.fn>;
    getAllWithDeleted: ReturnType<typeof vi.fn>;
  };
  let mockClaimCategoryLimitDBUtil: object;

  const mockCategory = {
    uuid: 'category-123',
    code: 'telco',
    name: 'Telecommunications',
    isEnabled: true,
    limit: {
      type: 'monthly',
      amount: 15000, // in cents
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as ClaimCategoryEntity;

  const mockDisabledCategory = {
    uuid: 'category-456',
    code: 'fitness',
    name: 'Fitness',
    isEnabled: false,
    limit: {
      type: 'monthly',
      amount: 5000,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as ClaimCategoryEntity;

  beforeEach(() => {
    // Create mock dependencies
    mockClaimCategoryDBUtil = {
      getOne: vi.fn(),
      getAll: vi.fn(),
      getAllWithDeleted: vi.fn(),
    };

    mockClaimCategoryLimitDBUtil = {};

    // Create service instance with mocked dependencies
    service = new ClaimCategoryService(
      mockClaimCategoryDBUtil as unknown as ClaimCategoryDBUtil,
      mockClaimCategoryLimitDBUtil as unknown as ClaimCategoryLimitDBUtil,
    );
  });

  describe('getByCode', () => {
    it('should return category when found and enabled', async () => {
      // Arrange
      const code = 'telco';
      mockClaimCategoryDBUtil.getOne.mockResolvedValue(mockCategory);

      // Act
      const result = await service.getByCode(code);

      // Assert
      expect(mockClaimCategoryDBUtil.getOne).toHaveBeenCalledTimes(1);
      expect(mockClaimCategoryDBUtil.getOne).toHaveBeenCalledWith({
        criteria: { code, isEnabled: true },
      });
      expect(result).toBe(mockCategory);
      expect(result?.code).toBe('telco');
    });

    it('should return null when category not found', async () => {
      // Arrange
      const code = 'non-existent';
      mockClaimCategoryDBUtil.getOne.mockResolvedValue(null);

      // Act
      const result = await service.getByCode(code);

      // Assert
      expect(mockClaimCategoryDBUtil.getOne).toHaveBeenCalledTimes(1);
      expect(mockClaimCategoryDBUtil.getOne).toHaveBeenCalledWith({
        criteria: { code, isEnabled: true },
      });
      expect(result).toBeNull();
    });

    it('should return null when category is disabled', async () => {
      // Arrange - disabled categories won't match isEnabled: true criteria
      const code = 'fitness';
      mockClaimCategoryDBUtil.getOne.mockResolvedValue(null);

      // Act
      const result = await service.getByCode(code);

      // Assert
      expect(mockClaimCategoryDBUtil.getOne).toHaveBeenCalledTimes(1);
      expect(mockClaimCategoryDBUtil.getOne).toHaveBeenCalledWith({
        criteria: { code, isEnabled: true },
      });
      expect(result).toBeNull();
    });

    it('should only query for enabled categories', async () => {
      // Arrange
      const code = 'telco';
      mockClaimCategoryDBUtil.getOne.mockResolvedValue(mockCategory);

      // Act
      await service.getByCode(code);

      // Assert - verify isEnabled: true is always in criteria
      expect(mockClaimCategoryDBUtil.getOne).toHaveBeenCalledWith({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        criteria: expect.objectContaining({ isEnabled: true }),
      });
    });
  });

  describe('getAllCategories', () => {
    it('should return only enabled categories by default', async () => {
      // Arrange
      const enabledCategories = [mockCategory];
      mockClaimCategoryDBUtil.getAll.mockResolvedValue(enabledCategories);

      // Act
      const result = await service.getAllCategories();

      // Assert
      expect(mockClaimCategoryDBUtil.getAll).toHaveBeenCalledTimes(1);
      expect(mockClaimCategoryDBUtil.getAll).toHaveBeenCalledWith({
        criteria: { isEnabled: true },
      });
      expect(result).toEqual(enabledCategories);
      expect(result).toHaveLength(1);
    });

    it('should return both enabled and disabled categories when includeDisabled is true', async () => {
      // Arrange
      const allCategories = [mockCategory, mockDisabledCategory];
      mockClaimCategoryDBUtil.getAll.mockResolvedValue(allCategories);

      // Act
      const result = await service.getAllCategories({ includeDisabled: true });

      // Assert
      expect(mockClaimCategoryDBUtil.getAll).toHaveBeenCalledTimes(1);
      expect(mockClaimCategoryDBUtil.getAll).toHaveBeenCalledWith({
        criteria: {},
      });
      expect(result).toEqual(allCategories);
      expect(result).toHaveLength(2);
    });

    it('should return soft-deleted categories when includeDeleted is true', async () => {
      // Arrange
      const deletedCategory = {
        ...mockCategory,
        deletedAt: new Date(),
      };
      const allCategoriesIncludingDeleted = [mockCategory, deletedCategory];
      mockClaimCategoryDBUtil.getAllWithDeleted.mockResolvedValue(
        allCategoriesIncludingDeleted,
      );

      // Act
      const result = await service.getAllCategories({ includeDeleted: true });

      // Assert
      expect(mockClaimCategoryDBUtil.getAllWithDeleted).toHaveBeenCalledTimes(
        1,
      );
      expect(mockClaimCategoryDBUtil.getAllWithDeleted).toHaveBeenCalledWith({
        criteria: { isEnabled: true },
      });
      expect(result).toEqual(allCategoriesIncludingDeleted);
    });

    it('should return all categories including disabled and deleted when both params are true', async () => {
      // Arrange
      const deletedCategory = {
        ...mockCategory,
        deletedAt: new Date(),
      };
      const allCategoriesIncludingAll = [
        mockCategory,
        mockDisabledCategory,
        deletedCategory,
      ];
      mockClaimCategoryDBUtil.getAllWithDeleted.mockResolvedValue(
        allCategoriesIncludingAll,
      );

      // Act
      const result = await service.getAllCategories({
        includeDisabled: true,
        includeDeleted: true,
      });

      // Assert
      expect(mockClaimCategoryDBUtil.getAllWithDeleted).toHaveBeenCalledTimes(
        1,
      );
      expect(mockClaimCategoryDBUtil.getAllWithDeleted).toHaveBeenCalledWith({
        criteria: {},
      });
      expect(result).toEqual(allCategoriesIncludingAll);
      expect(result).toHaveLength(3);
    });

    it('should handle empty params object', async () => {
      // Arrange
      const enabledCategories = [mockCategory];
      mockClaimCategoryDBUtil.getAll.mockResolvedValue(enabledCategories);

      // Act
      const result = await service.getAllCategories({});

      // Assert
      expect(mockClaimCategoryDBUtil.getAll).toHaveBeenCalledTimes(1);
      expect(mockClaimCategoryDBUtil.getAll).toHaveBeenCalledWith({
        criteria: { isEnabled: true },
      });
      expect(result).toEqual(enabledCategories);
    });

    it('should return empty array when no categories exist', async () => {
      // Arrange
      mockClaimCategoryDBUtil.getAll.mockResolvedValue([]);

      // Act
      const result = await service.getAllCategories();

      // Assert
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should use getAllWithDeleted when includeDeleted is true, regardless of includeDisabled', async () => {
      // Arrange
      mockClaimCategoryDBUtil.getAllWithDeleted.mockResolvedValue([
        mockCategory,
      ]);

      // Act
      await service.getAllCategories({
        includeDisabled: false,
        includeDeleted: true,
      });

      // Assert
      expect(mockClaimCategoryDBUtil.getAllWithDeleted).toHaveBeenCalledTimes(
        1,
      );
      expect(mockClaimCategoryDBUtil.getAll).not.toHaveBeenCalled();
    });
  });
});
