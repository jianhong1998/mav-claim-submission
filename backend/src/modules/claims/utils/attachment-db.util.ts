import { BaseDBUtil } from 'src/modules/common/base-classes/base-db-util';
import { AttachmentEntity } from '../entities/attachment.entity';
import { IAttachmentCreationData } from '../types/attachment-creation-data.type';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';

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
}
