/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { DelayedJobDBUtil } from './delayed-job-db.util';
import { DelayedJobEntity } from '../entities/delayed-job.entity';
import { IDelayedJobCreationData } from '../types/delayed-job-creation-data.type';
import { JobType } from '../enums/job-type.enum';

describe('DelayedJobDBUtil', () => {
  let delayedJobDBUtil: DelayedJobDBUtil;
  let mockRepository: {
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
  };

  const mockDelayedJobCreationData: IDelayedJobCreationData = {
    type: JobType.SEND_EMAIL,
    payload: { claimId: 'claim-123', recipientEmail: 'admin@company.com' },
    priority: 1,
    maxRetries: 5,
    scheduledAt: new Date('2024-03-15T10:00:00Z'),
  };

  const mockCreatedDelayedJob: DelayedJobEntity = {
    id: 'job-123',
    type: JobType.SEND_EMAIL,
    status: 'pending' as never,
    payload: { claimId: 'claim-123', recipientEmail: 'admin@company.com' },
    priority: 1,
    retryCount: 0,
    maxRetries: 5,
    scheduledAt: new Date('2024-03-15T10:00:00Z'),
    startedAt: null,
    completedAt: null,
    failedAt: null,
    errorMessage: null,
    result: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockRepository = {
      create: vi.fn(),
      save: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DelayedJobDBUtil,
        {
          provide: getRepositoryToken(DelayedJobEntity),
          useValue: mockRepository,
        },
      ],
    }).compile();

    delayedJobDBUtil = module.get<DelayedJobDBUtil>(DelayedJobDBUtil);
  });

  describe('create', () => {
    it('should create a new delayed job successfully', async () => {
      mockRepository.create.mockReturnValue(mockCreatedDelayedJob);
      mockRepository.save.mockResolvedValue(mockCreatedDelayedJob);

      const result = await delayedJobDBUtil.create({
        creationData: mockDelayedJobCreationData,
      });

      expect(mockRepository.create).toHaveBeenCalledWith({
        ...mockDelayedJobCreationData,
        priority: 1,
        maxRetries: 5,
      });
      expect(mockRepository.save).toHaveBeenCalledWith(mockCreatedDelayedJob);
      expect(result).toEqual(mockCreatedDelayedJob);
    });

    it('should create a delayed job with entity manager', async () => {
      const mockEntityManager = {
        getRepository: vi.fn().mockReturnValue(mockRepository),
      } as unknown as EntityManager;

      mockRepository.create.mockReturnValue(mockCreatedDelayedJob);
      mockRepository.save.mockResolvedValue(mockCreatedDelayedJob);

      const result = await delayedJobDBUtil.create({
        creationData: mockDelayedJobCreationData,
        entityManager: mockEntityManager,
      });

      expect(mockEntityManager.getRepository).toHaveBeenCalledWith(
        DelayedJobEntity,
      );
      expect(mockRepository.create).toHaveBeenCalledWith({
        ...mockDelayedJobCreationData,
        priority: 1,
        maxRetries: 5,
      });
      expect(mockRepository.save).toHaveBeenCalledWith(mockCreatedDelayedJob);
      expect(result).toEqual(mockCreatedDelayedJob);
    });

    it('should apply default values for priority and maxRetries', async () => {
      const dataWithDefaults = {
        type: JobType.SEND_EMAIL,
        payload: { claimId: 'claim-123' },
      };
      const jobWithDefaults = {
        ...mockCreatedDelayedJob,
        priority: 0,
        maxRetries: 3,
      };

      mockRepository.create.mockReturnValue(jobWithDefaults);
      mockRepository.save.mockResolvedValue(jobWithDefaults);

      const result = await delayedJobDBUtil.create({
        creationData: dataWithDefaults,
      });

      expect(mockRepository.create).toHaveBeenCalledWith({
        ...dataWithDefaults,
        priority: 0,
        maxRetries: 3,
      });
      expect(result.priority).toBe(0);
      expect(result.maxRetries).toBe(3);
    });

    it('should handle creation without optional scheduledAt field', async () => {
      const dataWithoutScheduledAt = {
        type: JobType.SEND_EMAIL,
        payload: { claimId: 'claim-123' },
        priority: 2,
      };

      mockRepository.create.mockReturnValue(mockCreatedDelayedJob);
      mockRepository.save.mockResolvedValue(mockCreatedDelayedJob);

      const result = await delayedJobDBUtil.create({
        creationData: dataWithoutScheduledAt,
      });

      expect(mockRepository.create).toHaveBeenCalledWith({
        ...dataWithoutScheduledAt,
        priority: 2,
        maxRetries: 3,
      });
      expect(result).toEqual(mockCreatedDelayedJob);
    });
  });
});
