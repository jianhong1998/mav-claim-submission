import { Injectable } from '@nestjs/common';
import { EntityManager, Repository } from 'typeorm';
import { ClaimCategoryEntity } from '../entities/claim-category.entity';
import { BaseDBUtil } from 'src/modules/common/base-classes/base-db-util';
import { IClaimCategoryCreationParams } from '../types/claim-category-creation.type';

@Injectable()
export class ClaimCategoryDBUtil extends BaseDBUtil<
  ClaimCategoryEntity,
  IClaimCategoryCreationParams
> {
  public constructor(protected readonly repo: Repository<ClaimCategoryEntity>) {
    super(ClaimCategoryEntity, repo);
  }

  public async create(params: {
    creationData: IClaimCategoryCreationParams;
    entityManager?: EntityManager;
  }): Promise<ClaimCategoryEntity> {
    const {
      creationData: { code, name },
      entityManager,
    } = params;

    const repo = entityManager?.getRepository(ClaimCategoryEntity) ?? this.repo;

    const category = repo.create({
      code,
      name,
      isEnabled: true,
    });

    return await repo.save(category);
  }
}
