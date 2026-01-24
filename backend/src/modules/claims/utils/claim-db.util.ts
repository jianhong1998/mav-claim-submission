import { BaseDBUtil } from 'src/modules/common/base-classes/base-db-util';
import { ClaimEntity } from '../entities/claim.entity';
import { IClaimCreationData } from '../types/claim-creation-data.type';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { ClaimCategoryEntity } from 'src/modules/claim-category/entities/claim-category.entity';

@Injectable()
export class ClaimDBUtil extends BaseDBUtil<ClaimEntity, IClaimCreationData> {
  constructor(
    @InjectRepository(ClaimEntity)
    claimRepo: Repository<ClaimEntity>,
  ) {
    super(ClaimEntity, claimRepo);
  }

  public async create(params: {
    creationData: IClaimCreationData;
    entityManager?: EntityManager;
  }): Promise<ClaimEntity> {
    const { creationData, entityManager } = params;

    const repo = entityManager?.getRepository(ClaimEntity) ?? this.repo;

    const claim = repo.create({
      userId: creationData.userId,
      claimName: creationData.claimName,
      month: creationData.month,
      year: creationData.year,
      totalAmount: creationData.totalAmount,
      categoryEntity: {
        uuid: creationData.categoryId,
      } as Partial<ClaimCategoryEntity>,
    });
    const createdClaim = await repo.save(claim);

    return createdClaim;
  }
}
