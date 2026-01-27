import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { BaseDBUtil } from 'src/modules/common/base-classes/base-db-util';
import { ClaimCategoryLimitEntity } from '../entities/claim-category-limit.entity';
import { IClaimCategoryLimitCreationParams } from '../types/claim-category-limit-creation.type';

@Injectable()
export class ClaimCategoryLimitDBUtil extends BaseDBUtil<
  ClaimCategoryLimitEntity,
  IClaimCategoryLimitCreationParams
> {
  public constructor(
    @InjectRepository(ClaimCategoryLimitEntity)
    protected readonly repo: Repository<ClaimCategoryLimitEntity>,
  ) {
    super(ClaimCategoryLimitEntity, repo);
  }

  public async create(params: {
    creationData: IClaimCategoryLimitCreationParams;
    entityManager?: EntityManager;
  }): Promise<ClaimCategoryLimitEntity> {
    const {
      creationData: { amount, type, category },
      entityManager,
    } = params;

    const repo =
      entityManager?.getRepository(ClaimCategoryLimitEntity) ?? this.repo;

    const limit = repo.create({
      type,
      amount,
      category,
    });

    return await repo.save(limit);
  }
}
