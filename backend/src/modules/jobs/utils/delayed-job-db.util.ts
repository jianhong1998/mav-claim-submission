import { BaseDBUtil } from 'src/modules/common/base-classes/base-db-util';
import { DelayedJobEntity } from '../entities/delayed-job.entity';
import { IDelayedJobCreationData } from '../types/delayed-job-creation-data.type';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';

@Injectable()
export class DelayedJobDBUtil extends BaseDBUtil<
  DelayedJobEntity,
  IDelayedJobCreationData
> {
  constructor(
    @InjectRepository(DelayedJobEntity)
    delayedJobRepo: Repository<DelayedJobEntity>,
  ) {
    super(DelayedJobEntity, delayedJobRepo);
  }

  public async create(params: {
    creationData: IDelayedJobCreationData;
    entityManager?: EntityManager;
  }): Promise<DelayedJobEntity> {
    const { creationData, entityManager } = params;

    const repo = entityManager?.getRepository(DelayedJobEntity) ?? this.repo;

    const delayedJob = repo.create({
      ...creationData,
      priority: creationData.priority ?? 0,
      maxRetries: creationData.maxRetries ?? 3,
    });
    const createdDelayedJob = await repo.save(delayedJob);

    return createdDelayedJob;
  }
}
