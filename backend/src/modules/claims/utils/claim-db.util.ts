import { BaseDBUtil } from 'src/modules/common/base-classes/base-db-util';
import { ClaimEntity } from '../entities/claim.entity';
import { IClaimCreationData } from '../types/claim-creation-data.type';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';

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
      categoryId: creationData.categoryId,
      claimName: creationData.claimName,
      month: creationData.month,
      year: creationData.year,
      totalAmount: creationData.totalAmount,
    });

    const createdClaim = await repo.save(claim);

    return createdClaim;
  }
}
