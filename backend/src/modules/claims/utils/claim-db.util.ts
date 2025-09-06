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

    const claim = repo.create(creationData);
    const createdClaim = await repo.save(claim);

    return createdClaim;
  }
}
