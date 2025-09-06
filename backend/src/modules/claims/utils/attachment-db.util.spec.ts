/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AttachmentDBUtil } from './attachment-db.util';
import { AttachmentEntity } from '../entities/attachment.entity';
import { IAttachmentCreationData } from '../types/attachment-creation-data.type';

describe('AttachmentDBUtil', () => {
  let attachmentDBUtil: AttachmentDBUtil;
  let mockRepository: {
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
  };

  const mockAttachmentCreationData: IAttachmentCreationData = {
    claimId: 'claim-123',
    originalFilename: 'receipt.pdf',
    storedFilename: 'stored_receipt_123.pdf',
    googleDriveFileId: 'drive-file-123',
    googleDriveUrl: 'https://drive.google.com/file/d/drive-file-123/view',
    fileSize: 1024000,
    mimeType: 'application/pdf',
  };

  const mockCreatedAttachment: AttachmentEntity = {
    id: 'attachment-123',
    claimId: 'claim-123',
    originalFilename: 'receipt.pdf',
    storedFilename: 'stored_receipt_123.pdf',
    googleDriveFileId: 'drive-file-123',
    googleDriveUrl: 'https://drive.google.com/file/d/drive-file-123/view',
    fileSize: 1024000,
    mimeType: 'application/pdf',
    status: 'pending' as never,
    claim: {} as never,
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
        AttachmentDBUtil,
        {
          provide: getRepositoryToken(AttachmentEntity),
          useValue: mockRepository,
        },
      ],
    }).compile();

    attachmentDBUtil = module.get<AttachmentDBUtil>(AttachmentDBUtil);
  });

  describe('create', () => {
    it('should create a new attachment successfully', async () => {
      mockRepository.create.mockReturnValue(mockCreatedAttachment);
      mockRepository.save.mockResolvedValue(mockCreatedAttachment);

      const result = await attachmentDBUtil.create({
        creationData: mockAttachmentCreationData,
      });

      expect(mockRepository.create).toHaveBeenCalledWith(
        mockAttachmentCreationData,
      );
      expect(mockRepository.save).toHaveBeenCalledWith(mockCreatedAttachment);
      expect(result).toEqual(mockCreatedAttachment);
    });

    it('should create an attachment with entity manager', async () => {
      const mockEntityManager = {
        getRepository: vi.fn().mockReturnValue(mockRepository),
      } as unknown as EntityManager;

      mockRepository.create.mockReturnValue(mockCreatedAttachment);
      mockRepository.save.mockResolvedValue(mockCreatedAttachment);

      const result = await attachmentDBUtil.create({
        creationData: mockAttachmentCreationData,
        entityManager: mockEntityManager,
      });

      expect(mockEntityManager.getRepository).toHaveBeenCalledWith(
        AttachmentEntity,
      );
      expect(mockRepository.create).toHaveBeenCalledWith(
        mockAttachmentCreationData,
      );
      expect(mockRepository.save).toHaveBeenCalledWith(mockCreatedAttachment);
      expect(result).toEqual(mockCreatedAttachment);
    });

    it('should handle creation without optional Google Drive fields', async () => {
      const dataWithoutGoogleDrive = {
        ...mockAttachmentCreationData,
        googleDriveFileId: undefined,
        googleDriveUrl: undefined,
      };
      const attachmentWithoutGoogleDrive = {
        ...mockCreatedAttachment,
        googleDriveFileId: null,
        googleDriveUrl: null,
      };

      mockRepository.create.mockReturnValue(attachmentWithoutGoogleDrive);
      mockRepository.save.mockResolvedValue(attachmentWithoutGoogleDrive);

      const result = await attachmentDBUtil.create({
        creationData: dataWithoutGoogleDrive,
      });

      expect(result.googleDriveFileId).toBeNull();
      expect(result.googleDriveUrl).toBeNull();
    });
  });
});
