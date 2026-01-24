/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ClaimDBUtil } from './claim-db.util';
import { ClaimEntity } from '../entities/claim.entity';
import { IClaimCreationData } from '../types/claim-creation-data.type';

describe('ClaimDBUtil', () => {
  let claimDBUtil: ClaimDBUtil;
  let mockRepository: {
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
  };

  const mockCategoryId = 'category-uuid-123';

  const mockClaimCreationData: IClaimCreationData = {
    userId: 'user-123',
    categoryId: mockCategoryId,
    claimName: 'Test Claim',
    month: 3,
    year: 2024,
    totalAmount: 100.5,
  };

  const mockCreatedClaim: ClaimEntity = {
    id: 'claim-123',
    userId: 'user-123',
    categoryEntity: {
      uuid: mockCategoryId,
      code: 'telco',
      name: 'Telco',
    } as never,
    claimName: 'Test Claim',
    month: 3,
    year: 2024,
    totalAmount: 100.5,
    status: 'draft' as never,
    submissionDate: null,
    user: {} as never,
    attachments: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    mockRepository = {
      create: vi.fn(),
      save: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClaimDBUtil,
        {
          provide: getRepositoryToken(ClaimEntity),
          useValue: mockRepository,
        },
      ],
    }).compile();

    claimDBUtil = module.get<ClaimDBUtil>(ClaimDBUtil);
  });

  describe('create', () => {
    it('should create a new claim successfully', async () => {
      mockRepository.create.mockReturnValue(mockCreatedClaim);
      mockRepository.save.mockResolvedValue(mockCreatedClaim);

      const result = await claimDBUtil.create({
        creationData: mockClaimCreationData,
      });

      expect(mockRepository.create).toHaveBeenCalledWith({
        userId: mockClaimCreationData.userId,
        claimName: mockClaimCreationData.claimName,
        month: mockClaimCreationData.month,
        year: mockClaimCreationData.year,
        totalAmount: mockClaimCreationData.totalAmount,
        categoryEntity: {
          uuid: mockCategoryId,
        },
      });
      expect(mockRepository.save).toHaveBeenCalledWith(mockCreatedClaim);
      expect(result).toEqual(mockCreatedClaim);
    });

    it('should create a claim with entity manager', async () => {
      const mockEntityManager = {
        getRepository: vi.fn().mockReturnValue(mockRepository),
      } as unknown as EntityManager;

      mockRepository.create.mockReturnValue(mockCreatedClaim);
      mockRepository.save.mockResolvedValue(mockCreatedClaim);

      const result = await claimDBUtil.create({
        creationData: mockClaimCreationData,
        entityManager: mockEntityManager,
      });

      expect(mockEntityManager.getRepository).toHaveBeenCalledWith(ClaimEntity);
      expect(mockRepository.create).toHaveBeenCalledWith({
        userId: mockClaimCreationData.userId,
        claimName: mockClaimCreationData.claimName,
        month: mockClaimCreationData.month,
        year: mockClaimCreationData.year,
        totalAmount: mockClaimCreationData.totalAmount,
        categoryEntity: {
          uuid: mockCategoryId,
        },
      });
      expect(mockRepository.save).toHaveBeenCalledWith(mockCreatedClaim);
      expect(result).toEqual(mockCreatedClaim);
    });

    it('should handle creation without optional claimName', async () => {
      const dataWithoutClaimName = {
        ...mockClaimCreationData,
        claimName: undefined,
      };
      const claimWithoutName = {
        ...mockCreatedClaim,
        claimName: null,
      };

      mockRepository.create.mockReturnValue(claimWithoutName);
      mockRepository.save.mockResolvedValue(claimWithoutName);

      const result = await claimDBUtil.create({
        creationData: dataWithoutClaimName,
      });

      expect(result.claimName).toBeNull();
    });
  });
});
