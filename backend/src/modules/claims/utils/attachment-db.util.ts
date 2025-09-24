import { BaseDBUtil } from 'src/modules/common/base-classes/base-db-util';
import { AttachmentEntity } from '../entities/attachment.entity';
import { IAttachmentCreationData } from '../types/attachment-creation-data.type';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { AttachmentStatus } from '../enums/attachment-status.enum';

@Injectable()
export class AttachmentDBUtil extends BaseDBUtil<
  AttachmentEntity,
  IAttachmentCreationData
> {
  constructor(
    @InjectRepository(AttachmentEntity)
    attachmentRepo: Repository<AttachmentEntity>,
  ) {
    super(AttachmentEntity, attachmentRepo);
  }

  public async create(params: {
    creationData: IAttachmentCreationData;
    entityManager?: EntityManager;
  }): Promise<AttachmentEntity> {
    const { creationData, entityManager } = params;

    const repo = entityManager?.getRepository(AttachmentEntity) ?? this.repo;

    const attachment = repo.create(creationData);
    const createdAttachment = await repo.save(attachment);

    return createdAttachment;
  }

  public async findByClaimId(params: {
    claimId: string;
    entityManager?: EntityManager;
  }): Promise<AttachmentEntity[]> {
    return await this.getAll({
      entityManager: params.entityManager,
      criteria: { claimId: params.claimId },
    });
  }

  public async findByStatus(params: {
    status: AttachmentStatus;
    entityManager?: EntityManager;
  }): Promise<AttachmentEntity[]> {
    return await this.getAll({
      entityManager: params.entityManager,
      criteria: { status: params.status },
    });
  }

  public async updateStatus(params: {
    attachmentId: string;
    status: AttachmentStatus;
    entityManager?: EntityManager;
  }): Promise<AttachmentEntity | null> {
    const { attachmentId, status, entityManager } = params;
    const repo = entityManager?.getRepository(AttachmentEntity) ?? this.repo;

    const attachment = await this.getOne({
      criteria: { id: attachmentId },
      entityManager,
    });

    if (!attachment) return null;

    attachment.status = status;
    return await repo.save(attachment);
  }

  public async updateGoogleDriveInfo(params: {
    attachmentId: string;
    googleDriveFileId: string;
    googleDriveUrl: string;
    entityManager?: EntityManager;
  }): Promise<AttachmentEntity | null> {
    const { attachmentId, googleDriveFileId, googleDriveUrl, entityManager } =
      params;
    const repo = entityManager?.getRepository(AttachmentEntity) ?? this.repo;

    const attachment = await this.getOne({
      criteria: { id: attachmentId },
      entityManager,
    });

    if (!attachment) return null;

    attachment.googleDriveFileId = googleDriveFileId;
    attachment.googleDriveUrl = googleDriveUrl;
    attachment.status = AttachmentStatus.UPLOADED;

    return await repo.save(attachment);
  }
}
